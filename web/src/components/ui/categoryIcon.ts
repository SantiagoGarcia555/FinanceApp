import {
  Briefcase,
  Bus,
  CircleDashed,
  Clapperboard,
  CreditCard,
  GraduationCap,
  HeartPulse,
  House,
  Lightbulb,
  PawPrint,
  PiggyBank,
  Shirt,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

/** Claves de `Category.Icon` (backend/Data/SeedCategories.cs) → ícono Lucide + nombre para el selector. */
export const CATEGORY_ICONS: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: 'food', label: 'Comida', icon: Utensils },
  { key: 'transport', label: 'Transporte', icon: Bus },
  { key: 'home', label: 'Hogar', icon: House },
  { key: 'utilities', label: 'Servicios', icon: Lightbulb },
  { key: 'health', label: 'Salud', icon: HeartPulse },
  { key: 'education', label: 'Educación', icon: GraduationCap },
  { key: 'entertainment', label: 'Ocio', icon: Clapperboard },
  { key: 'clothing', label: 'Ropa', icon: Shirt },
  { key: 'savings', label: 'Ahorro', icon: PiggyBank },
  { key: 'debt', label: 'Deudas', icon: CreditCard },
  { key: 'pets', label: 'Mascotas', icon: PawPrint },
  { key: 'income', label: 'Ingresos', icon: Briefcase },
  { key: 'other', label: 'Otros', icon: CircleDashed },
]

const byKey = Object.fromEntries(CATEGORY_ICONS.map((i) => [i.key, i.icon])) as Record<string, LucideIcon>

export function categoryIcon(key: string | null | undefined): LucideIcon {
  return (key && byKey[key]) || CircleDashed
}
