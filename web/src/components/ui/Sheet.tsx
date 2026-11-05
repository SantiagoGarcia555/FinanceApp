import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

/**
 * Hoja inferior modal (bottom sheet) sobre <dialog> nativo: trae foco atrapado,
 * cierre con Esc y fondo inerte sin librerías. En pantallas anchas se centra.
 */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal enfoca el primer elemento (el botón Cerrar); el contenido puede pedir otro foco inicial
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // clic en el fondo (fuera del contenido) cierra
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        'animate-sheet-in m-0 mx-auto mt-auto w-full max-w-md bg-transparent p-0 text-fg',
        'max-h-[92dvh] backdrop:bg-[rgb(42_33_27/0.45)] sm:my-auto',
        className,
      )}
    >
      <div className="flex max-h-[92dvh] flex-col overflow-y-auto rounded-t-xl bg-surface px-5 pt-3 pb-8 shadow-card sm:rounded-xl">
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-decor sm:hidden" />
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="type-h2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-10 place-items-center rounded-full text-icon-muted hover:bg-subtle hover:text-icon focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X aria-hidden size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
