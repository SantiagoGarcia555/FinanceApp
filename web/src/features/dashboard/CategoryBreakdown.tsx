import type { CategorySummary } from '../../api/types'
import { categoryIcon, ProgressBar } from '../../components/ui'
import { formatCompactMoney } from '../../lib/format'

const MAX_ITEMS = 5

/** US-12: gasto total del mes por categoría (top 5 + "Otras"), con su peso sobre el total. */
export function CategoryBreakdown({ categories }: { categories: CategorySummary[] }) {
  const total = categories.reduce((acc, c) => acc + c.total, 0)
  if (total <= 0) return null

  const top = categories.slice(0, MAX_ITEMS)
  const rest = categories.slice(MAX_ITEMS).reduce((acc, c) => acc + c.total, 0)
  const items = rest > 0 ? [...top, { categoryId: null, categoryName: 'Otras', icon: 'other', total: rest }] : top

  return (
    <ul className="flex flex-col gap-4">
      {items.map((c) => {
        const Icon = categoryIcon(c.icon)
        const share = (c.total / total) * 100
        return (
          <li key={c.categoryId ?? c.categoryName} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle text-icon">
                <Icon size={16} />
              </span>
              <span className="type-body-sm min-w-0 flex-1 truncate">{c.categoryName}</span>
              <span className="type-label tabular-nums">{formatCompactMoney(c.total)}</span>
              <span className="type-caption w-9 text-right text-fg-muted tabular-nums">{Math.round(share)}%</span>
            </div>
            <ProgressBar value={share} tone="neutral" label={`${c.categoryName}: ${Math.round(share)}% del gasto del mes`} />
          </li>
        )
      })}
    </ul>
  )
}
