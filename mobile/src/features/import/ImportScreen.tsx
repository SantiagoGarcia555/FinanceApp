import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import { ArrowLeft, Check, CopyCheck, FileUp, Share2, Sprout, TriangleAlert } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ApiError } from '../../api'
import { confirmImport, inspectImport, previewImport, type UploadFile } from '../../api/import'
import type { CategoryResponse, ImportInspectResponse, ImportPreviewResponse, ImportRowPreview } from '../../api/types'
import { Screen } from '../../components/Screen'
import { Button, Chip, IconButton, Rise, SelectField } from '../../components/ui'
import { useSlow } from '../../hooks/useSlow'
import { formatMoney, formatRelativeDay, formatShortDate } from '../../lib/format'
import { colors, radius, shadows, space, tabularNums, type, withAlpha } from '../../theme'
import {
  buildConfirmRows,
  defaultSelection,
  fileFromPicker,
  foreignCurrency,
  importableRows,
  initialMapping,
  plural,
  roleOf,
  toggleRow,
  validateFile,
  validateMapping,
  type Mapping,
} from './importFlow'

type Step =
  | { kind: 'upload' }
  | { kind: 'map'; file: UploadFile; inspect: ImportInspectResponse }
  | { kind: 'review'; file: UploadFile; preview: ImportPreviewResponse; categoryId: string | null }
  | { kind: 'done'; count: number }

const STEP_INFO = {
  upload: { n: 1, title: 'Importa tu extracto' },
  map: { n: 2, title: 'Confirma las columnas' },
  review: { n: 3, title: 'Revisa antes de importar' },
} as const

/** Alto aproximado del pie fijo de la revisión (dos botones + márgenes). */
const FOOTER_HEIGHT = 168

const errorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback)

export interface ImportScreenProps {
  categories: CategoryResponse[]
  /** Archivo que llegó con "Compartir con Tino": se lee apenas abre la pantalla. */
  initialFile?: UploadFile | null
  /** Se importaron movimientos: recargar dashboard y lista. */
  onImported: () => void
  onBack: () => void
  onSeeMovements: () => void
  onGoHome: () => void
}

/** Importador de extractos (1.3.5) = /importar de la web: archivo → columnas → revisar → listo. */
export function ImportScreen({ categories, initialFile, onImported, onBack, onSeeMovements, onGoHome }: ImportScreenProps) {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<Step>({ kind: 'upload' })
  const initialError = initialFile ? validateFile(initialFile) : null
  const [busy, setBusy] = useState(() => Boolean(initialFile) && !initialError)
  const [error, setError] = useState<string | null>(initialError)
  const slow = useSlow(busy)

  // Archivo compartido desde otra app: se inspecciona al montar.
  useEffect(() => {
    if (!initialFile || validateFile(initialFile)) return
    let alive = true
    inspectImport(initialFile)
      .then((inspect) => alive && setStep({ kind: 'map', file: initialFile, inspect }))
      .catch((e: unknown) => alive && setError(errorMessage(e, 'No pudimos leer el archivo.')))
      .finally(() => alive && setBusy(false))
    return () => {
      alive = false
    }
  }, [initialFile])

  async function run(task: () => Promise<void>, fallback: string) {
    setError(null)
    setBusy(true)
    try {
      await task()
    } catch (e) {
      setError(errorMessage(e, fallback))
    } finally {
      setBusy(false)
    }
  }

  async function pickFile() {
    setError(null)
    // '*/*': muchos gestores de archivos de Android etiquetan los CSV como octet-stream; filtramos nosotros.
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false })
    if (result.canceled || !result.assets[0]) return
    const file = fileFromPicker(result.assets[0])
    const invalid = validateFile(file)
    if (invalid) return setError(invalid)
    await run(async () => setStep({ kind: 'map', file, inspect: await inspectImport(file) }), 'No pudimos leer el archivo.')
  }

  const restart = () => {
    setError(null)
    setStep({ kind: 'upload' })
  }

  if (step.kind === 'done') {
    return (
      <Screen contentStyle={styles.doneContent}>
        <Rise style={styles.done}>
          <View style={styles.doneIcon}>
            <Sprout size={40} color={colors.progress} />
          </View>
          <Text accessibilityRole="header" style={[type.h1, { color: colors.fg }]}>
            ¡Listo!
          </Text>
          <Text accessibilityLiveRegion="polite" style={[type.body, styles.center, { color: colors.fgMuted }]}>
            Importaste {plural(step.count, 'movimiento', 'movimientos')}. Tu resumen ya está al día.
          </Text>
        </Rise>
        <View style={styles.actions}>
          <Button label="Ver movimientos" block onPress={onSeeMovements} />
          <Button label="Ir al inicio" variant="secondary" block onPress={onGoHome} />
          <Button label="Importar otro archivo" variant="secondary" size="sm" block onPress={restart} />
        </View>
      </Screen>
    )
  }

  const info = STEP_INFO[step.kind]
  const header = (
    <>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Volver" variant="ghost" onPress={onBack} style={styles.back} />
        <View style={styles.headerTexts}>
          <Text style={[type.caption, { color: colors.fgMuted }]}>Paso {info.n} de 3</Text>
          <Text accessibilityRole="header" style={[type.h1, { color: colors.fg }]}>
            {info.title}
          </Text>
        </View>
      </View>
      <FormError message={error} />
      {slow && (
        <Text accessibilityLiveRegion="polite" style={[type.bodySm, { color: colors.fgMuted }]}>
          Despertando el servidor… puede tardar hasta un minuto.
        </Text>
      )}
    </>
  )

  if (step.kind === 'review') {
    return (
      <ReviewStep
        header={header}
        preview={step.preview}
        busy={busy}
        bottomInset={insets.bottom}
        onBack={restart}
        onConfirm={(selected) =>
          run(async () => {
            const result = await confirmImport(buildConfirmRows(step.preview.rows, selected, step.categoryId))
            onImported()
            setStep({ kind: 'done', count: result.importedCount })
          }, 'No pudimos guardar los movimientos.')
        }
      />
    )
  }

  return (
    <Screen>
      {header}
      {step.kind === 'upload' && <UploadStep busy={busy} onPick={pickFile} />}
      {step.kind === 'map' && (
        <MapStep
          // Al cambiar de hoja cambian columnas y sugerencias: se monta de nuevo con el estado inicial.
          key={step.inspect.sheet ?? ''}
          file={step.file}
          inspect={step.inspect}
          categories={categories}
          busy={busy}
          onBack={restart}
          onSheet={(sheet) =>
            run(async () => setStep({ kind: 'map', file: step.file, inspect: await inspectImport(step.file, sheet) }), 'No pudimos leer esa hoja.')
          }
          onNext={(mapping, categoryId, invert) =>
            run(async () => {
              // El signo lo invierte la API, así la detección de duplicados compara contra los montos ya corregidos.
              const preview = await previewImport(step.file, mapping, { sheet: step.inspect.sheet, invertSign: invert })
              setStep({ kind: 'review', file: step.file, preview, categoryId })
            }, 'No pudimos interpretar el archivo con esas columnas.')
          }
        />
      )}
    </Screen>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <View accessibilityRole="alert" style={styles.alert}>
      <TriangleAlert size={18} color={colors.fgAccent} />
      <Text style={[type.bodySm, styles.flex, { color: colors.fg }]}>{message}</Text>
    </View>
  )
}

// ---------- Paso 1: archivo ----------

function UploadStep({ busy, onPick }: { busy: boolean; onPick: () => void }) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Elegir archivo del extracto"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPick}
        style={({ pressed }) => [styles.drop, pressed && styles.dropPressed, busy && styles.dim]}
      >
        <View style={styles.dropIcon}>
          <FileUp size={28} color={colors.iconBrand} />
        </View>
        <Text style={[type.h3, { color: colors.fg }]}>{busy ? 'Leyendo tu archivo…' : 'Elige tu extracto'}</Text>
        <Text style={[type.bodySm, styles.center, { color: colors.fgMuted }]}>
          Toca para buscar el archivo CSV o Excel (.xlsx) que descargaste de tu banco.
        </Text>
      </Pressable>

      <View style={styles.card}>
        <View style={styles.cardTitle}>
          <Share2 size={18} color={colors.iconBrand} />
          <Text style={[type.label, { color: colors.fg }]}>Desde otra app</Text>
        </View>
        <Text style={[type.bodySm, { color: colors.fgMuted }]}>
          En el correo o en la app de tu banco, toca <Text style={{ color: colors.fg }}>Compartir</Text> sobre el extracto y elige{' '}
          <Text style={{ color: colors.fg }}>Tino</Text>. Lo abrimos directo aquí.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[type.label, { color: colors.fg }]}>¿Dónde lo descargo?</Text>
        <Text style={[type.bodySm, { color: colors.fgMuted }]}>
          En la banca en línea busca <Text style={{ color: colors.fg }}>Movimientos</Text> o <Text style={{ color: colors.fg }}>Extractos</Text> y
          exporta en CSV o Excel. Sirve tal cual lo entrega el banco: encontramos la tabla aunque tenga tus datos arriba, entendemos fechas
          día/mes (incluso sin año) y montos como “$ -38.900”, y marcamos los movimientos que ya tienes para no duplicarlos.
        </Text>
      </View>
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
  file: UploadFile
  inspect: ImportInspectResponse
  categories: CategoryResponse[]
  busy: boolean
  onBack: () => void
  onSheet: (sheet: string) => void
  onNext: (mapping: Mapping, categoryId: string | null, invert: boolean) => void
}) {
  const [mapping, setMapping] = useState<Mapping>(() => initialMapping(inspect))
  const [categoryId, setCategoryId] = useState('')
  const [invert, setInvert] = useState(inspect.suggestInvertSign)
  const [error, setError] = useState<string | null>(null)
  const foreign = foreignCurrency(inspect)
  const columnOptions = useMemo(() => inspect.headers.map((h) => ({ value: h, label: h })), [inspect.headers])
  const categoryOptions = useMemo(
    () => [{ value: '', label: 'Sin categoría (las clasificas después)' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories],
  )

  function next() {
    const invalid = validateMapping(mapping)
    setError(invalid)
    if (!invalid) onNext(mapping, categoryId || null, invert)
  }

  const column = (key: keyof Mapping, label: string) => (
    <SelectField
      label={label}
      options={columnOptions}
      value={mapping[key] || null}
      placeholder="Elegir columna…"
      onChange={(value) => setMapping((m) => ({ ...m, [key]: value }))}
    />
  )

  return (
    <>
      <Text style={[type.bodySm, { color: colors.fgMuted }]}>
        Archivo: <Text style={[type.label, { color: colors.fg }]}>{file.name}</Text>. Ya elegimos las columnas que reconocimos; revisa que
        estén bien.
        {inspect.periodStart && inspect.periodEnd && (
          <>
            {' '}
            Periodo: <Text style={{ color: colors.fg }}>{formatShortDate(inspect.periodStart)}</Text> a{' '}
            <Text style={{ color: colors.fg }}>{formatShortDate(inspect.periodEnd)}</Text>.
          </>
        )}
      </Text>

      {inspect.sheets.length > 1 && (
        <SelectField
          label="Hoja del archivo"
          options={inspect.sheets.map((s) => ({ value: s, label: s }))}
          value={inspect.sheet}
          onChange={(sheet) => !busy && sheet !== inspect.sheet && onSheet(sheet)}
        />
      )}

      {foreign && (
        <FormError
          message={`Esta hoja está en ${foreign}. Por ahora solo importamos movimientos en pesos (COP)${inspect.sheets.length > 1 ? ': elige la hoja en pesos.' : '.'}`}
        />
      )}

      <SampleTable inspect={inspect} mapping={mapping} />

      <View style={styles.fields}>
        {column('date', 'Fecha')}
        {column('amount', 'Monto')}
        {column('description', 'Descripción')}
        <SelectField label="Categoría para todos (opcional)" options={categoryOptions} value={categoryId} onChange={setCategoryId} />
      </View>

      <CheckRow
        checked={invert}
        onToggle={() => setInvert((v) => !v)}
        title="Invertir signos"
        detail={
          inspect.suggestInvertSign
            ? 'Lo marcamos porque parece un extracto de tarjeta de crédito: ahí las compras vienen en positivo y los pagos en negativo.'
            : 'Márcalo si tu banco muestra los gastos en positivo y los abonos en negativo.'
        }
        style={styles.card}
      />

      <FormError message={error} />

      <View style={styles.actions}>
        <Button label={busy ? 'Revisando…' : 'Revisar movimientos'} block loading={busy} disabled={Boolean(foreign)} onPress={next} />
        <Button label="Elegir otro archivo" variant="secondary" block disabled={busy} onPress={onBack} />
      </View>
    </>
  )
}

/** Primeras filas del archivo, por columnas (así cada columna tiene un ancho parejo). Se desliza de lado. */
function SampleTable({ inspect, mapping }: { inspect: ImportInspectResponse; mapping: Mapping }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.table} contentContainerStyle={styles.tableContent}>
      {inspect.headers.map((header, j) => {
        const role = roleOf(mapping, header)
        const fg = role ? colors.fg : colors.fgMuted
        return (
          <View key={`${header}-${j}`} style={styles.column}>
            <View style={styles.th}>
              <Text style={[type.caption, { color: colors.fgBrand }]}>{role ?? ' '}</Text>
              <Text style={[type.labelSm, { color: fg }]} numberOfLines={1}>
                {header}
              </Text>
            </View>
            {inspect.sampleRows.map((row, i) => (
              <Text key={i} style={[type.bodySm, styles.td, { color: fg }]} numberOfLines={1}>
                {row[j] ?? ''}
              </Text>
            ))}
          </View>
        )
      })}
    </ScrollView>
  )
}

function CheckRow({
  checked,
  onToggle,
  title,
  detail,
  disabled,
  style,
}: {
  checked: boolean
  onToggle: () => void
  title: string
  detail?: string
  disabled?: boolean
  style?: object
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={[styles.checkRow, style]}
    >
      <CheckBox checked={checked} disabled={disabled} />
      <View style={styles.flex}>
        <Text style={[type.label, { color: colors.fg }]}>{title}</Text>
        {detail && <Text style={[type.bodySm, { color: colors.fgMuted }]}>{detail}</Text>}
      </View>
    </Pressable>
  )
}

function CheckBox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <View style={[styles.box, checked && styles.boxOn, disabled && styles.dim]}>
      {checked && <Check size={14} strokeWidth={3} color={colors.fgOnBrand} />}
    </View>
  )
}

// ---------- Paso 3: revisar ----------

function ReviewStep({
  header,
  preview,
  busy,
  bottomInset,
  onBack,
  onConfirm,
}: {
  /** Encabezado del asistente (título, error, aviso de servidor lento). */
  header: ReactNode
  preview: ImportPreviewResponse
  busy: boolean
  bottomInset: number
  onBack: () => void
  onConfirm: (selected: Set<number>) => void
}) {
  const importable = useMemo(() => importableRows(preview.rows), [preview])
  const [selected, setSelected] = useState(() => defaultSelection(preview.rows))
  const allSelected = importable.length > 0 && importable.every((r) => selected.has(r.rowNumber))
  const count = importable.filter((r) => selected.has(r.rowNumber)).length

  return (
    // El botón "Importar" queda fijo abajo (fuera del scroll); la lista deja espacio para que no la tape.
    <View style={styles.root}>
      <Screen contentStyle={{ paddingBottom: bottomInset + FOOTER_HEIGHT }}>
      {header}
      <View style={styles.chips}>
        <Chip tone="positive">{preview.validRows} válidas</Chip>
        {preview.duplicateRows > 0 && (
          <Chip tone="progress" icon={CopyCheck}>
            {preview.duplicateRows} ya registradas
          </Chip>
        )}
        {preview.errorRows > 0 && (
          <Chip tone="alert" icon={TriangleAlert}>
            {preview.errorRows} con error
          </Chip>
        )}
      </View>

      <View style={styles.notes}>
        {preview.duplicateRows > 0 && (
          <Note>Dejamos sin marcar los que parecen repetidos (misma fecha, monto y descripción). Márcalos si sí quieres importarlos.</Note>
        )}
        {preview.yearInferredRows > 0 && (
          <Note>
            {preview.yearInferredRows === preview.totalRows ? 'Las fechas' : `${preview.yearInferredRows} fechas`} del extracto no traen año.{' '}
            {preview.periodStart && preview.periodEnd
              ? `Lo tomamos del periodo (${formatShortDate(preview.periodStart)} a ${formatShortDate(preview.periodEnd)}).`
              : 'Asumimos el año más reciente sin pasar de hoy.'}{' '}
            Revisa que esté bien.
          </Note>
        )}
        {preview.ignoredRows > 0 && (
          <Note>
            Saltamos {plural(preview.ignoredRows, 'fila que no es un movimiento', 'filas que no son movimientos')} (datos del cliente,
            resúmenes o encabezados repetidos).
          </Note>
        )}
      </View>

      {importable.length > 0 && (
        <CheckRow
          checked={allSelected}
          onToggle={() => setSelected(allSelected ? new Set() : new Set(importable.map((r) => r.rowNumber)))}
          title="Seleccionar todas las válidas"
        />
      )}

      <View style={styles.list}>
        {preview.rows.map((row, i) => (
          <PreviewRow
            key={row.rowNumber}
            row={row}
            last={i === preview.rows.length - 1}
            checked={selected.has(row.rowNumber)}
            onToggle={() => setSelected((s) => toggleRow(s, row.rowNumber))}
          />
        ))}
      </View>
      </Screen>

      <View style={[styles.footer, { paddingBottom: bottomInset + space[4] }]}>
        <Button
          label={busy ? 'Importando…' : count === 0 ? 'Elige al menos uno' : `Importar ${plural(count, 'movimiento', 'movimientos')}`}
          block
          loading={busy}
          disabled={count === 0}
          onPress={() => onConfirm(selected)}
        />
        <Button label="Empezar de nuevo" variant="secondary" block disabled={busy} onPress={onBack} />
      </View>
    </View>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <Text style={[type.bodySm, { color: colors.fgMuted }]}>{children}</Text>
}

function PreviewRow({ row, last, checked, onToggle }: { row: ImportRowPreview; last: boolean; checked: boolean; onToggle: () => void }) {
  const disabled = Boolean(row.error) || row.date == null || row.amount == null
  const amount = row.amount
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityHint={row.error ? `Fila ${row.rowNumber}: ${row.error}` : undefined}
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.rowPressed]}
    >
      <CheckBox checked={checked} disabled={disabled} />
      <View style={styles.flex}>
        <Text style={[type.label, { color: disabled ? colors.fgMuted : colors.fg }]} numberOfLines={1}>
          {row.description || 'Sin descripción'}
        </Text>
        {row.error ? (
          <Text style={[type.bodySm, { color: colors.fgAccent }]}>
            Fila {row.rowNumber}: {row.error}
          </Text>
        ) : (
          <Text style={[type.bodySm, { color: colors.fgMuted }]}>
            {row.date ? (row.yearInferred ? formatShortDate(row.date) : formatRelativeDay(row.date)) : ''}
            {row.isDuplicate && <Text style={{ color: colors.fgAccent }}> · ya registrado</Text>}
          </Text>
        )}
      </View>
      {amount != null && (
        <Text style={[type.label, tabularNums, { color: amount > 0 ? colors.fgBrand : colors.fg }, disabled && styles.dim]}>
          {formatMoney(amount, { signed: true })}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  center: { textAlign: 'center' },
  dim: { opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  back: { marginLeft: -space[3], marginTop: -2 },
  headerTexts: { flex: 1, gap: 2 },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: space[4],
    boxShadow: shadows.card,
  },
  card: { gap: space[2], borderRadius: radius.lg, backgroundColor: colors.surface, padding: space[5], boxShadow: shadows.card },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  drop: {
    alignItems: 'center',
    gap: space[3],
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space[6],
    paddingVertical: space[8],
  },
  dropPressed: { borderColor: colors.brand, backgroundColor: withAlpha(colors.brandSubtle, 0.5) },
  dropIcon: { width: 56, height: 56, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSubtle },
  fields: { gap: space[4] },
  actions: { gap: space[2] },
  table: { flexGrow: 0, borderRadius: radius.lg, backgroundColor: colors.surface, boxShadow: shadows.card },
  tableContent: { paddingHorizontal: space[2] },
  column: { minWidth: 96, maxWidth: 200 },
  th: { paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: colors.subtle },
  td: { paddingHorizontal: space[3], paddingVertical: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingHorizontal: space[1] },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  boxOn: { borderColor: colors.brand, backgroundColor: colors.brand },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  notes: { gap: space[2] },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: space[4], paddingVertical: space[1], boxShadow: shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowPressed: { opacity: 0.7 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space[2],
    paddingHorizontal: space[5],
    paddingTop: space[3],
    backgroundColor: withAlpha(colors.canvas, 0.96),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  doneContent: { justifyContent: 'center', paddingBottom: space[8] },
  done: { alignItems: 'center', gap: space[4] },
  doneIcon: { width: 80, height: 80, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
})
