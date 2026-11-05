import { useId, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { ApiError } from '../../api/client'
import { createTransaction, deleteTransaction, updateTransaction } from '../../api/transactions'
import type { CategoryResponse, TransactionResponse } from '../../api/types'
import { Button, SegmentedControl, SelectField, Sheet, TextField } from '../../components/ui'
import { cn } from '../../lib/cn'
import { formatNumber, toIsoDate } from '../../lib/format'
import { FormError } from '../auth/AuthLayout'

type Kind = 'expense' | 'income'

const KIND_OPTIONS = [
  { value: 'expense' as const, label: 'Gasto' },
  { value: 'income' as const, label: 'Ingreso' },
]

const MAX_DIGITS = 12 // hasta 999.999.999.999

interface TransactionSheetProps {
  open: boolean
  /** Cambia en cada apertura para reiniciar el formulario. */
  formKey: number
  editing: TransactionResponse | null
  categories: CategoryResponse[]
  onClose: () => void
  onSaved: () => void
}

export function TransactionSheet({ open, formKey, editing, categories, onClose, onSaved }: TransactionSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}>
      {open && <TransactionForm key={formKey} editing={editing} categories={categories} onSaved={onSaved} />}
    </Sheet>
  )
}

function TransactionForm({ editing, categories, onSaved }: { editing: TransactionResponse | null; categories: CategoryResponse[]; onSaved: () => void }) {
  const amountId = useId()
  const [kind, setKind] = useState<Kind>(editing && editing.amount > 0 ? 'income' : 'expense')
  const [digits, setDigits] = useState(editing ? String(Math.round(Math.abs(editing.amount))) : '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '')
  const [date, setDate] = useState(() => (editing ? editing.date.slice(0, 10) : toIsoDate(new Date())))
  const [errors, setErrors] = useState<{ amount?: string; description?: string; date?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function changeKind(next: Kind) {
    setKind(next)
    // Al pasar a ingreso sin categoría, sugerir "Ingresos" (categoría del sistema con ícono "income")
    if (next === 'income' && !categoryId) {
      const income = categories.find((c) => c.icon === 'income')
      if (income) setCategoryId(income.id)
    }
  }

  function fail(error: unknown) {
    setFormError(error instanceof ApiError ? error.message : 'Algo salió mal. Intenta de nuevo.')
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const amount = Number(digits || '0')
    const next: typeof errors = {}
    if (amount <= 0) next.amount = 'Escribe un monto mayor a cero.'
    if (!description.trim()) next.description = 'Cuéntanos qué fue (p. ej. "Mercado").'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Elige una fecha.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return

    const request = {
      accountId: editing?.accountId,
      categoryId: categoryId || null,
      amount: kind === 'expense' ? -amount : amount,
      currency: editing?.currency ?? 'COP',
      description: description.trim(),
      date,
    }

    setBusy('save')
    try {
      if (editing) await updateTransaction(editing.id, request)
      else await createTransaction(request)
      onSaved()
    } catch (error) {
      fail(error)
      setBusy(null)
    }
  }

  async function onDelete() {
    if (!editing) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setBusy('delete')
    try {
      await deleteTransaction(editing.id)
      onSaved()
    } catch (error) {
      fail(error)
      setBusy(null)
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormError message={formError} />

      <SegmentedControl label="Tipo de movimiento" options={KIND_OPTIONS} value={kind} onChange={changeKind} stretch />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={amountId} className="type-label">
          Monto
        </label>
        <div
          className={cn(
            'flex items-baseline gap-1.5 border-b-2 pb-1 transition-colors focus-within:border-brand',
            errors.amount ? 'border-accent' : 'border-line',
            kind === 'income' && 'text-fg-brand',
          )}
        >
          <span aria-hidden className="shrink-0 font-display text-[30px] font-light whitespace-nowrap text-fg-muted">
            {kind === 'expense' ? '−$' : '+$'}
          </span>
          <input
            id={amountId}
            inputMode="numeric"
            autoComplete="off"
            data-autofocus={!editing || undefined}
            placeholder="0"
            value={digits ? formatNumber(Number(digits)) : ''}
            onChange={(e) => {
              setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS))
              setErrors((er) => ({ ...er, amount: undefined }))
            }}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? `${amountId}-error` : undefined}
            className="w-full min-w-0 bg-transparent font-display text-[40px] leading-[52px] font-semibold tabular-nums outline-none placeholder:text-fg-muted/50"
          />
        </div>
        {errors.amount && (
          <p id={`${amountId}-error`} className="type-body-sm text-fg-accent">
            {errors.amount}
          </p>
        )}
      </div>

      <TextField
        label="Descripción"
        placeholder={kind === 'expense' ? 'Mercado, Uber, arriendo…' : 'Nómina, venta, regalo…'}
        maxLength={200}
        value={description}
        onChange={(e) => {
          setDescription(e.target.value)
          setErrors((er) => ({ ...er, description: undefined }))
        }}
        error={errors.description}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" disabled={busy !== null} className="w-full">
          {busy === 'save' ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar movimiento'}
        </Button>
        {editing && (
          <Button
            variant="secondary"
            icon={Trash2}
            onClick={onDelete}
            disabled={busy !== null}
            className={cn('w-full', confirmDelete && 'border-accent text-fg-accent')}
          >
            {busy === 'delete' ? 'Eliminando…' : confirmDelete ? 'Toca de nuevo para eliminar' : 'Eliminar movimiento'}
          </Button>
        )}
      </div>
    </form>
  )
}
