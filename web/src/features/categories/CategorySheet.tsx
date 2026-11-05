import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { createCategory, deleteOrHideCategory, updateCategory } from '../../api/categories'
import { ApiError } from '../../api/client'
import type { CategoryResponse } from '../../api/types'
import { Button, CATEGORY_ICONS, Sheet, TextField } from '../../components/ui'
import { cn } from '../../lib/cn'
import { FormError } from '../auth/AuthLayout'

interface CategorySheetProps {
  open: boolean
  formKey: number
  /** Solo categorías propias se editan. */
  editing: CategoryResponse | null
  onClose: () => void
  onSaved: () => void
}

export function CategorySheet({ open, formKey, editing, onClose, onSaved }: CategorySheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
      {open && <CategoryForm key={formKey} editing={editing} onSaved={onSaved} />}
    </Sheet>
  )
}

function CategoryForm({ editing, onSaved }: { editing: CategoryResponse | null; onSaved: () => void }) {
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? 'other')
  const [nameError, setNameError] = useState<string>()
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function fail(error: unknown) {
    if (error instanceof ApiError && error.status === 409) setNameError('Ya tienes una categoría con ese nombre.')
    else setFormError(error instanceof ApiError ? error.message : 'Algo salió mal. Intenta de nuevo.')
    setBusy(null)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!name.trim()) return setNameError('Escribe un nombre.')
    setBusy('save')
    try {
      const request = { name: name.trim(), icon }
      if (editing) await updateCategory(editing.id, request)
      else await createCategory(request)
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
      await deleteOrHideCategory(editing.id)
      onSaved()
    } catch (error) {
      fail(error)
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormError message={formError} />

      <TextField
        label="Nombre"
        maxLength={50}
        placeholder="Gimnasio, Bebé, Moto…"
        data-autofocus
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setNameError(undefined)
        }}
        error={nameError}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="type-label mb-1.5">Ícono</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {CATEGORY_ICONS.map(({ key, label, icon: Icon }) => {
            const selected = key === icon
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => setIcon(key)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border-[1.5px] px-1 py-2.5 transition',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                  selected ? 'border-brand bg-brand-subtle text-fg-brand' : 'border-transparent bg-subtle text-fg-muted hover:text-fg',
                )}
              >
                <Icon aria-hidden size={20} />
                <span className="type-caption">{label}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" disabled={busy !== null} className="w-full">
          {busy === 'save' ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
        {editing && (
          <>
            <Button
              variant="secondary"
              icon={Trash2}
              onClick={onDelete}
              disabled={busy !== null}
              className={cn('w-full', confirmDelete && 'border-accent text-fg-accent')}
            >
              {busy === 'delete' ? 'Eliminando…' : confirmDelete ? 'Toca de nuevo para eliminar' : 'Eliminar categoría'}
            </Button>
            {confirmDelete && (
              <p className="type-body-sm text-center text-fg-muted" role="status">
                Sus movimientos quedarán sin categoría y se eliminará su presupuesto, si tiene uno.
              </p>
            )}
          </>
        )}
      </div>
    </form>
  )
}
