import { Sprout } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

// Figma › Componentes › Insight IA. Voz de la IA: Fraunces itálica sobre bosque.
export interface InsightCardProps {
  message: string
  title?: string
  /** "ahora", "hace 2 h"… */
  time?: string
  primaryAction: { label: string; onClick?: () => void }
  secondaryAction?: { label: string; onClick?: () => void }
  className?: string
}

export function InsightCard({ message, title = 'Tino te sugiere', time, primaryAction, secondaryAction, className }: InsightCardProps) {
  return (
    <section aria-label={title} className={cn('flex flex-col gap-3 rounded-lg bg-brand p-5 text-fg-on-brand shadow-ia', className)}>
      <header className="flex items-center gap-2">
        <span aria-hidden className="grid size-[30px] shrink-0 place-items-center rounded-full bg-progress text-icon-on-progress">
          <Sprout size={18} strokeWidth={2} />
        </span>
        <span className="type-label flex-1">{title}</span>
        {time && <span className="type-caption opacity-60">{time}</span>}
      </header>
      <p className="type-quote">“{message}”</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="accent" onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
        {secondaryAction && (
          <Button variant="on-brand" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </section>
  )
}
