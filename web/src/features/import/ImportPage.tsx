import { useId, useMemo, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CopyCheck, FileUp, Sprout } from 'lucide-react'
import { ApiError } from '../../api/client'
import { confirmImport, inspectImport, previewImport } from '../../api/import'
import type { CategoryResponse, ImportInspectResponse, ImportPreviewResponse, ImportRowPreview } from '../../api/types'
import { Button, Chip, SelectField } from '../../components/ui'
import { cn } from '../../lib/cn'
import { formatMoney, formatRelativeDay, formatShortDate } from '../../lib/format'
import { FormError } from '../auth/AuthLayout'
import { useTransactions } from '../transactions/TransactionsContext'

const MAX_BYTES = 10_000_000 // igual que [RequestSizeLimit] en la API

type Mapping = { date: string; amount: string; description: string }

type Step =
  | { kind: 'upload' }
  | { kind: 'map'; file: File; inspect: ImportInspectResponse }
  | { kind: 'review'; file: File; preview: ImportPreviewResponse; categoryId: string }
  | { kind: 'done'; count: number }

const STEP_INFO = {
  upload: { n: 1, title: 'Importa tu extracto' },
  map: { n: 2, title: 'Confirma las columnas' },
  review: { n: 3, title: 'Revisa antes de importar' },
} as const

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function ImportPage() {
  const { categories, notifyChanged } = useTransactions()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ kind: 'upload' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File) {
    setError(null)
    if (!/\.(csv|xlsx)$/i.test(file.name)) return setError('Ese formato no lo leemos todavía. Usa un archivo .csv o .xlsx.')
    if (file.size > MAX_BYTES) return setError('El archivo pesa más de 10 MB. Exporta un rango de fechas más corto.')
    setBusy(true)
    try {
      setStep({ kind: 'map', file, inspect: await inspectImport(file) })
    } catch (e) {
      setError(errorMessage(e, 'No pudimos leer el archivo.'))
    } finally {
      setBusy(false)
    }
  }

  /** Libros con varias hojas (p. ej. tarjeta: PESOS / DOLARES): vuelve a inspeccionar la hoja elegida. */
  async function onSheet(file: File, sheet: string) {
    setError(null)
    setBusy(true)
    try {
      setStep({ kind: 'map', file, inspect: await inspectImport(file, sheet) })
    } catch (e) {
      setError(errorMessage(e, 'No pudimos leer esa hoja.'))
    } finally {
      setBusy(false)
    }
  }

  async function onMapped(file: File, sheet: string | null, mapping: Mapping, categoryId: string, invert: boolean) {
    setError(null)
    setBusy(true)
    try {
      // El signo lo invierte la API, así la detección de duplicados compara contra los montos ya corregidos.
      const preview = await previewImport(file, mapping, { sheet, invertSign: invert })
      setStep({ kind: 'review', file, preview, categoryId })
    } catch (e) {
      setError(errorMessage(e, 'No pudimos interpretar el archivo con esas columnas.'))
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm(rows: ImportRowPreview[], categoryId: string) {
    setError(null)
    setBusy(true)
    try {
      const result = await confirmImport(
        rows.map((r) => ({
          date: r.date!.slice(0, 10),
          amount: r.amount!,
          description: r.description!,
          categoryId: categoryId || null,
        })),
      )
      notifyChanged()
      setStep({ kind: 'done', count: result.importedCount })
    } catch (e) {
      setError(errorMessage(e, 'No pudimos guardar los movimientos.'))
    } finally {
      setBusy(false)
    }
  }

  const restart = () => {
    setError(null)
    setStep({ kind: 'upload' })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-6 pb-36 md:max-w-2xl">
      {step.kind !== 'done' && (
        <header className="flex flex-col gap-1">
          <p className="type-caption text-fg-muted">Paso {STEP_INFO[step.kind].n} de 3</p>
          <h1 className="type-h1">{STEP_INFO[step.kind].title}</h1>
        </header>
      )}

      <FormError message={error} />

      {step.kind === 'upload' && <UploadStep busy={busy} onFile={onFile} />}
      {step.kind === 'map' && (
        <MapStep
          // Al cambiar de hoja cambian columnas y sugerencias: se monta de nuevo con el estado inicial.
          key={step.inspect.sheet ?? ''}
          file={step.file}
          inspect={step.inspect}
          categories={categories}
          busy={busy}
          onBack={restart}
          onSheet={(sheet) => onSheet(step.file, sheet)}
          onNext={(mapping, categoryId, invert) => onMapped(step.file, step.inspect.sheet, mapping, categoryId, invert)}
        />
      )}
      {step.kind === 'review' && (
        <ReviewStep
          preview={step.preview}
          busy={busy}
          onBack={() => setStep({ kind: 'upload' })}
          onConfirm={(rows) => onConfirm(rows, step.categoryId)}
        />
      )}
      {step.kind === 'done' && (
        <section className="mt-10 flex flex-col items-center gap-4 text-center">
          <span aria-hidden className="grid size-20 place-items-center rounded-full bg-brand text-progress">
            <Sprout size={40} />
          </span>
          <h1 className="type-h1">¡Listo!</h1>
          <p className="type-body text-fg-muted" role="status">
            Importaste {step.count} {step.count === 1 ? 'movimiento' : 'movimientos'}. Tu resumen ya está al día.
          </p>
          <div className="flex flex-col gap-2 self-stretch">
            <Button onClick={() => navigate('/movimientos')}>Ver movimientos</Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Ir al inicio
            </Button>
            <button type="button" onClick={restart} className="type-label py-2 text-fg-accent hover:underline">
              Importar otro archivo
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

// ---------- Paso 1: subir ----------

function UploadStep({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-surface px-6 py-10 text-center transition',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
          dragging ? 'border-brand bg-brand-subtle/50' : 'border-line hover:border-brand',
          busy && 'pointer-events-none opacity-60',
        )}
      >
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-brand-subtle text-icon-brand">
          <FileUp size={28} />
        </span>
        <span className="type-h3">{busy ? 'Leyendo tu archivo…' : 'Sube tu extracto'}</span>
        <span className="type-body-sm text-fg-muted">
          Arrastra aquí el archivo CSV o Excel (.xlsx) que descargaste de tu banco, o toca para elegirlo.
        </span>
        <input
          id={inputId}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // permite volver a elegir el mismo archivo
            if (file) onFile(file)
          }}
        />
      </label>

      <section className="flex flex-col gap-2 rounded-lg bg-surface p-5 shadow-card">
        <h2 className="type-label">¿Dónde lo descargo?</h2>
        <p className="type-body-sm text-fg-muted">
          En la banca en línea de tu banco busca <span className="text-fg">Movimientos</span> o <span className="text-fg">Extractos</span> y
          elige exportar en CSV o Excel. El extracto tal cual lo entrega el banco sirve: encontramos la tabla de movimientos aunque tenga
          datos tuyos arriba, entendemos fechas día/mes (incluso sin año) y montos como “$ -38.900”, y marcamos los movimientos que ya tienes
          para no duplicarlos.
        </p>
      </section>
    </>
  )
}

// ---------- Paso 2: columnas ----------

function MapStep({
  file,
  inspect,
  categories,
  busy,
  onBack,
  onSheet,
  onNext,
}: {
  file: File
  inspect: ImportInspectResponse
  categories: CategoryResponse[]
  busy: boolean
  onBack: () => void
  onSheet: (sheet: string) => void
  onNext: (mapping: Mapping, categoryId: string, invert: boolean) => void
}) {
  const [mapping, setMapping] = useState<Mapping>({
    date: inspect.suggestedDateColumn ?? '',
    amount: inspect.suggestedAmountColumn ?? '',
    description: inspect.suggestedDescriptionColumn ?? '',
  })
  const [categoryId, setCategoryId] = useState('')
  const [invert, setInvert] = useState(inspect.suggestInvertSign)
  const [error, setError] = useState<string | null>(null)
  // La API rechaza otras monedas: el dashboard suma todo como pesos.
  const foreignCurrency = inspect.detectedCurrency && inspect.detectedCurrency !== 'COP' ? inspect.detectedCurrency : null

  const roleOf = (header: string) =>
    header === mapping.date ? 'Fecha' : header === mapping.amount ? 'Monto' : header === mapping.description ? 'Descripción' : null

  function next() {
    const values = [mapping.date, mapping.amount, mapping.description]
    if (values.some((v) => !v)) return setError('Elige una columna para fecha, monto y descripción.')
    if (new Set(values).size !== 3) return setError('Cada dato debe venir de una columna distinta.')
    setError(null)
    onNext(mapping, categoryId, invert)
  }

  const select = (key: keyof Mapping, label: string) => (
    <SelectField label={label} value={mapping[key]} onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}>
      <option value="">Elegir columna…</option>
      {inspect.headers.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </SelectField>
  )

  return (
    <>
      <p className="type-body-sm text-fg-muted">
        Archivo: <span className="type-label text-fg">{file.name}</span>. Ya elegimos las columnas que reconocimos; revisa que estén bien.
        {inspect.periodStart && inspect.periodEnd && (
          <>
            {' '}
            Periodo del extracto: <span className="text-fg">{formatShortDate(inspect.periodStart)}</span> a{' '}
            <span className="text-fg">{formatShortDate(inspect.periodEnd)}</span>.
          </>
        )}
      </p>

      {inspect.sheets.length > 1 && (
        <SelectField
          label="Hoja del archivo"
          value={inspect.sheet ?? ''}
          disabled={busy}
          onChange={(e) => onSheet(e.target.value)}
        >
          {inspect.sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      )}

      {foreignCurrency && (
        <p role="alert" className="type-body-sm flex items-start gap-2 rounded-md bg-surface p-4 shadow-card">
          <AlertTriangle aria-hidden size={18} className="mt-0.5 shrink-0 text-fg-accent" />
          <span>
            Esta hoja está en <span className="type-label">{foreignCurrency}</span>. Por ahora solo importamos movimientos en pesos (COP)
            {inspect.sheets.length > 1 ? ': elige la hoja en pesos.' : '.'}
          </span>
        </p>
      )}

      <div className="overflow-x-auto rounded-lg bg-surface shadow-card">
        <table className="type-body-sm w-full text-left">
          <caption className="sr-only">Primeras filas del archivo</caption>
          <thead className="bg-subtle">
            <tr>
              {inspect.headers.map((h) => {
                const role = roleOf(h)
                return (
                  <th key={h} scope="col" className="px-3 py-2 align-bottom whitespace-nowrap">
                    {role && <span className="type-caption block text-fg-brand">{role}</span>}
                    <span className={cn('type-label-sm', role ? 'text-fg' : 'text-fg-muted')}>{h}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {inspect.sampleRows.map((row, i) => (
              <tr key={i} className="border-t border-line">
                {row.map((cell, j) => (
                  <td key={j} className={cn('px-3 py-2 whitespace-nowrap', roleOf(inspect.headers[j]) ? 'text-fg' : 'text-fg-muted')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {select('date', 'Fecha')}
        {select('amount', 'Monto')}
        {select('description', 'Descripción')}
      </div>

      <SelectField label="Categoría para todos (opcional)" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">Sin categoría (las clasificas después)</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>

      <label className="flex items-start gap-3 rounded-md bg-surface p-4 shadow-card">
        <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} className="mt-1 size-4 accent-[var(--color-bg-brand)]" />
        <span className="flex flex-col">
          <span className="type-label">Invertir signos</span>
          <span className="type-body-sm text-fg-muted">
            {inspect.suggestInvertSign
              ? 'Lo marcamos porque parece un extracto de tarjeta de crédito: ahí las compras vienen en positivo y los pagos en negativo.'
              : 'Márcalo si tu banco muestra los gastos en positivo y los abonos en negativo.'}
          </span>
        </span>
      </label>

      <FormError message={error} />

      <div className="flex flex-col gap-2">
        <Button onClick={next} disabled={busy || Boolean(foreignCurrency)}>
          {busy ? 'Revisando…' : 'Revisar movimientos'}
        </Button>
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          Elegir otro archivo
        </Button>
      </div>
    </>
  )
}

// ---------- Paso 3: revisar ----------

function ReviewStep({
  preview,
  busy,
  onBack,
  onConfirm,
}: {
  preview: ImportPreviewResponse
  busy: boolean
  onBack: () => void
  onConfirm: (rows: ImportRowPreview[]) => void
}) {
  const importable = useMemo(() => preview.rows.filter((r) => !r.error), [preview])
  // Por defecto: todas las válidas que no parecen duplicadas
  const [selected, setSelected] = useState<Set<number>>(() => new Set(importable.filter((r) => !r.isDuplicate).map((r) => r.rowNumber)))

  const toggle = (rowNumber: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })

  const allSelected = importable.length > 0 && importable.every((r) => selected.has(r.rowNumber))
  const chosen = importable.filter((r) => selected.has(r.rowNumber))

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Chip tone="positive">{preview.validRows} válidas</Chip>
        {preview.duplicateRows > 0 && (
          <Chip tone="progress" icon={CopyCheck}>
            {preview.duplicateRows} ya registradas
          </Chip>
        )}
        {preview.errorRows > 0 && (
          <Chip tone="alert" icon={AlertTriangle}>
            {preview.errorRows} con error
          </Chip>
        )}
      </div>

      {preview.duplicateRows > 0 && (
        <p className="type-body-sm text-fg-muted">Dejamos sin marcar los movimientos que parecen repetidos (misma fecha, monto y descripción). Márcalos si sí quieres importarlos.</p>
      )}

      {preview.yearInferredRows > 0 && (
        <p className="type-body-sm text-fg-muted">
          {preview.yearInferredRows === preview.totalRows ? 'Las fechas' : `${preview.yearInferredRows} fechas`} del extracto no traen año.{' '}
          {preview.periodStart && preview.periodEnd
            ? `Lo tomamos del periodo del extracto (${formatShortDate(preview.periodStart)} a ${formatShortDate(preview.periodEnd)}).`
            : 'Asumimos el año más reciente sin pasar de hoy.'}{' '}
          Revisa que esté bien antes de importar.
        </p>
      )}

      {preview.ignoredRows > 0 && (
        <p className="type-body-sm text-fg-muted">
          Saltamos {preview.ignoredRows} {preview.ignoredRows === 1 ? 'fila que no es un movimiento' : 'filas que no son movimientos'} (datos del
          cliente, resúmenes o encabezados repetidos en cada página).
        </p>
      )}

      {importable.length > 0 && (
        <label className="flex items-center gap-3 px-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(importable.map((r) => r.rowNumber)))}
            className="size-4 accent-[var(--color-bg-brand)]"
          />
          <span className="type-label">Seleccionar todas las válidas</span>
        </label>
      )}

      <ul className="rounded-lg bg-surface px-4 py-1.5 shadow-card">
        {preview.rows.map((r) => {
          const amount = r.amount
          const disabled = Boolean(r.error)
          return (
            <li key={r.rowNumber} className="border-b border-line/60 last:border-0">
              <label className={cn('flex items-center gap-3 py-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.has(r.rowNumber)}
                  onChange={() => toggle(r.rowNumber)}
                  className="size-4 shrink-0 accent-[var(--color-bg-brand)]"
                  aria-describedby={r.error ? `fila-${r.rowNumber}-error` : undefined}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn('type-label truncate', disabled && 'text-fg-muted')}>{r.description || 'Sin descripción'}</span>
                  {r.error ? (
                    <span id={`fila-${r.rowNumber}-error`} className="type-body-sm text-fg-accent">
                      Fila {r.rowNumber}: {r.error}
                    </span>
                  ) : (
                    <span className="type-body-sm text-fg-muted">
                      {r.date ? (r.yearInferred ? formatShortDate(r.date) : formatRelativeDay(r.date)) : ''}
                      {r.isDuplicate && <span className="text-fg-accent"> · ya registrado</span>}
                    </span>
                  )}
                </span>
                {amount != null && (
                  <span className={cn('type-label shrink-0 tabular-nums', amount > 0 ? 'text-fg-brand' : 'text-fg', disabled && 'opacity-50')}>
                    {formatMoney(amount, { signed: true })}
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-28 z-10 flex flex-col gap-2 rounded-lg bg-canvas/90 py-2 backdrop-blur">
        <Button onClick={() => onConfirm(chosen)} disabled={busy || chosen.length === 0}>
          {busy ? 'Importando…' : `Importar ${chosen.length} ${chosen.length === 1 ? 'movimiento' : 'movimientos'}`}
        </Button>
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          Empezar de nuevo
        </Button>
      </div>
    </>
  )
}
