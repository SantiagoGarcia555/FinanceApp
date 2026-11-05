import { Link } from 'react-router-dom'

export interface SectionHeaderProps {
  title: string
  /** Acción opcional a la derecha ("Ver todo"). */
  action?: { label: string; to: string }
  id?: string
}

export function SectionHeader({ title, action, id }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 id={id} className="type-h2">
        {title}
      </h2>
      {action && (
        <Link
          to={action.to}
          className="type-label rounded-sm text-fg-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
