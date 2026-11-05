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

/** Claves de `Category.Icon` (backend/Data/SeedCategories.cs) → ícono Lucide. */
const byKey: Record<string, LucideIcon> = {
  food: Utensils,
  transport: Bus,
  home: House,
  utilities: Lightbulb,
  health: HeartPulse,
  education: GraduationCap,
  entertainment: Clapperboard,
  clothing: Shirt,
  savings: PiggyBank,
  debt: CreditCard,
  pets: PawPrint,
  income: Briefcase,
  other: CircleDashed,
}

export function categoryIcon(key: string | null | undefined): LucideIcon {
  return (key && byKey[key]) || CircleDashed
}
