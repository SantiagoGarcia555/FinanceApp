import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { createBudget, deleteBudget, updateBudget } from '../../api/budgets'
import { ApiError } from '../../api/client'
import type { BudgetPeriod, BudgetResponse, CategoryResponse } from '../../api/types'
import { Button, SegmentedControl, SelectField, Sheet, TextField } from '../../components/ui'
import { cn } from '../../lib/cn'
import { formatNumber } from '../../lib/format'
import { FormError } from '../auth/AuthLayout'

const PERIOD_OPTIONS = [
  { value: 'monthly' as const, label: 'Mensual' },
  { value: 'yearly' as const, label: 'Anual' },
]

interface BudgetSheetProps {
  open: boolean
  formKey: number
  editing: BudgetResponse | null
  /** Categorías de gasto disponibles (sin "Ingresos"). */
  categories: CategoryResponse[]
  existing: BudgetResponse[]
  onClose: () => void
  onSaved: () => void
}

export function BudgetSheet({ open, formKey, editing, categories, existing, onClose, onSaved }: BudgetSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={editing ? `Presupuesto de ${editing.categoryName}` : 'Nuevo presupuesto'}>
      {open && <BudgetForm key={formKey} editing={editing} categories={categories} existing={existing} onSaved={onSaved} />}
    </Sheet>
  )
}

function BudgetForm({
  editing,
  categories,
  existing,
  onSaved,
}: {
  editing: BudgetResponse | null
  categories: CategoryResponse[]
  existing: BudgetResponse[]
  onSaved: () => void
}) {
  const [period, setPeriod] = useState<BudgetPeriod>(editing?.period ?? 'monthly')
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '')
  const [digits, setDigits] = useState(editing ? String(Math.round(editing.limitAmount)) : '')
  const [errors, setErrors] = useState<{ category?: string; amount?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Al crear, no ofrecer categorías que ya tienen presupuesto en ese periodo
  const available = categories.filter((c) => !existing.some((b) => b.categoryId === c.id && b.period === period))

  function fail(error: unknown) {
    setFormError(error instanceof ApiError ? error.message : 'Algo salió mal. Intenta de nuevo.')
    setBusy(null)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const limitAmount = Number(digits || '0')
    const next: typeof errors = {}
    if (!editing && !categoryId) next.category = 'Elige una categoría.'
    if (limitAmount <= 0) next.amount = 'Escribe un límite mayor a cero.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return

    setBusy('save')
    try {
      if (editing) await updateBudget(editing.id, { limitAmount, period })
      else await createBudget({ categoryId, limitAmount, period })
      onSaved()
    } catch (error) {
      fail(error)
    }
  }

  async function onDelete() {
    if (!editing) return
    if (!confirmDelete) return setConfirmDelete(true)
    setBusy('delete')
    try {
      await deleteBudget(editing.id)
      onSaved()
    } catch (error) {
      fail(error)
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormError message={formError} />

      <SegmentedControl label="Periodo" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} stretch />

      {!editing && (
        <SelectField label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.category}>
          <option value="">Elegir categoría…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      )}

      <TextField
        label={period === 'monthly' ? 'Límite al mes' : 'Límite al año'}
        inputMode="numeric"
        autoComplete="off"
        placeholder="$ 0"
        data-autofocus
        value={digits ? `$ ${formatNumber(Number(digits))}` : ''}
        onChange={(e) => {
          setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12))
          setErrors((er) => ({ ...er, amount: undefined }))
        }}
        error={errors.amount}
        hint="Te avisaremos cuando te acerques a este monto."
      />

      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" disabled={busy !== null} className="w-full">
          {busy === 'save' ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear presupuesto'}
        </Button>
        {editing && (
          <Button
            variant="secondary"
            icon={Trash2}
            onClick={onDelete}
            disabled={busy !== null}
            className={cn('w-full', confirmDelete && 'border-accent text-fg-accent')}
          >
            {busy === 'delete' ? 'Eliminando…' : confirmDelete ? 'Toca de nuevo para eliminar' : 'Eliminar presupuesto'}
          </Button>
        )}
      </div>
    </form>
  )
}
