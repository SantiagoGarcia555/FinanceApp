// Contratos de la API (espejo de backend/FinanceApp.Api/Dtos, serializados en camelCase).

export interface CategorySummary {
  categoryId: string | null
  categoryName: string
  icon: string | null
  /** Total gastado en la categoría, en POSITIVO (el backend aplica Math.Abs). */
  total: number
}

// ---------- Auth (api/auth) ----------

export interface UserResponse {
  id: string
  email: string
  name: string
  preferredCurrency: string
}

export interface AuthResponse {
  accessToken: string
  /**
   * null en web: con `X-Auth-Transport: cookie` la API lo entrega en una cookie HttpOnly.
   * Solo los clientes móviles lo reciben aquí (rotativo: cada uso lo revoca).
   */
  refreshToken: string | null
  accessTokenExpiresAt: string
  user: UserResponse
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  preferredCurrency?: string
}

// ---------- Categorías (api/categories) ----------

export interface CategoryResponse {
  id: string
  name: string
  icon: string | null
  isSystemDefined: boolean
  isHidden: boolean
}

/** GET api/dashboard/summary?month=yyyy-MM */
export interface MonthlySummaryResponse {
  month: string // "yyyy-MM"
  totalIncome: number
  /** Negativo (gastos con signo). Usar Math.abs para mostrarlo. */
  totalExpense: number
  balance: number
  expensesByCategory: CategorySummary[]
}

export interface MonthlyTrendPoint {
  month: string
  totalIncome: number
  totalExpense: number
  balance: number
}

/** GET api/dashboard/trend?months=N */
export interface TrendResponse {
  months: MonthlyTrendPoint[]
}

/** Elemento de GET api/transactions */
export interface TransactionResponse {
  id: string
  accountId: string
  accountName: string | null
  categoryId: string | null
  categoryName: string | null
  /** Negativo = gasto, positivo = ingreso. */
  amount: number
  currency: string
  description: string
  /** Fecha pura (columna `date` en Postgres), serializada como ISO. */
  date: string
  source: string
  createdAt: string
}

/** Cuerpo de POST/PUT api/transactions. accountId opcional: se usa la cuenta por defecto. */
export interface TransactionRequest {
  accountId?: string | null
  categoryId?: string | null
  /** Con signo: negativo = gasto, positivo = ingreso. No puede ser 0. */
  amount: number
  currency?: string
  description: string
  /** yyyy-MM-dd */
  date: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}
