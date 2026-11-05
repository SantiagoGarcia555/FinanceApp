import { cn } from '../../lib/cn'

/** "Santiago García" → "SG" */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn('type-label inline-grid size-11 shrink-0 place-items-center rounded-full bg-accent text-fg-on-accent', className)}
    >
      {initialsOf(name)}
    </span>
  )
}
