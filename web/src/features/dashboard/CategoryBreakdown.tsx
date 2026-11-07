import { categoryIcon, ProgressBar } from '../../components/ui'
import { formatCompactMoney } from '../../lib/format'
import type { BreakdownItem } from '../../../../shared/dashboard'

/** US-12: gasto total del mes por categoría (top 5 + "Otras", ver categoryBreakdown), con su peso sobre el total. */
export function CategoryBreakdown({ items }: { items: BreakdownItem[] }) {
  if (items.length === 0) return null

  return (
    <ul className="flex flex-col gap-4">
      {items.map((c) => {
        const Icon = categoryIcon(c.icon)
        return (
          <li key={c.categoryId ?? c.categoryName} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle text-icon">
                <Icon size={16} />
              </span>
              <span className="type-body-sm min-w-0 flex-1 truncate">{c.categoryName}</span>
              <span className="type-label tabular-nums">{formatCompactMoney(c.total)}</span>
              <span className="type-caption w-9 text-right text-fg-muted tabular-nums">{Math.round(c.share)}%</span>
            </div>
            <ProgressBar value={c.share} tone="neutral" label={`${c.categoryName}: ${Math.round(c.share)}% del gasto del mes`} />
          </li>
        )
      })}
    </ul>
  )
}
