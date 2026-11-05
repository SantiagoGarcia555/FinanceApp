// Formato para Colombia (es-CO, COP sin decimales).

const integer = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

const MINUS = '−' // signo menos tipográfico (no guion)

/** 2847500 → "2.847.500" (sin símbolo; el hero muestra el "$" aparte). */
export function formatNumber(value: number): string {
  return integer.format(Math.round(value))
}

/**
 * Monto en pesos. Con `signed`, antepone − o +:
 * -38900 → "−$38.900", 5200000 → "+$5.200.000".
 */
export function formatMoney(value: number, { signed = false } = {}): string {
  const body = `$${integer.format(Math.round(Math.abs(value)))}`
  if (!signed) return value < 0 ? `${MINUS}${body}` : body
  return `${value < 0 ? MINUS : '+'}${body}`
}

/** Montos cortos para chips y leyendas: 640000 → "$640k", 1200000 → "$1,2 M". */
export function formatCompactMoney(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? MINUS : ''
  if (abs >= 1_000_000) return `${sign}$${oneDecimal.format(abs / 1_000_000)} M`
  if (abs >= 1_000) return `${sign}$${integer.format(Math.round(abs / 1_000))}k`
  return `${sign}$${integer.format(abs)}`
}

/** 12.43 → "12,4%" */
export function formatPercent(value: number): string {
  return `${oneDecimal.format(value)}%`
}

/** Convierte "2026-11-05" o "2026-11-05T00:00:00Z" en fecha local sin corrimiento de zona. */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const dayMonth = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })

/** "Hoy", "Ayer" o "30 oct". */
export function formatRelativeDay(iso: string, now = new Date()): string {
  const date = parseDateOnly(iso)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  // formatToParts evita el "de" que es-CO inserta ("30 de oct" → "30 oct")
  const parts = dayMonth.formatToParts(date)
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  const monthShort = (parts.find((p) => p.type === 'month')?.value ?? '').replace('.', '')
  return `${day} ${monthShort}`
}

const longDate = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })

/** "Miércoles, 5 nov" */
export function formatToday(now = new Date()): string {
  const parts = longDate.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  const weekday = get('weekday')
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${get('day')} ${get('month').replace('.', '')}`
}

const weekdayDayMonth = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })

/** Encabezado de grupo por día: "Hoy", "Ayer" o "Lunes 3 nov". */
export function formatDayHeading(iso: string, now = new Date()): string {
  const relative = formatRelativeDay(iso, now)
  if (relative === 'Hoy' || relative === 'Ayer') return relative
  const parts = weekdayDayMonth.formatToParts(parseDateOnly(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  const weekday = get('weekday')
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${get('day')} ${get('month').replace('.', '')}`
}

/** Date → "Noviembre 2026" */
export function formatMonthYear(date: Date): string {
  const text = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(date).replace(' de ', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Date → "2026-11-05" (fecha local, sin zona). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-11" → "Noviembre" */
export function formatMonthName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const name = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(y, m - 1, 1))
  return name.charAt(0).toUpperCase() + name.slice(1)
}
