/*
 * Tokens de diseño — identidad "Raíz × Aurora" (librería v1), versión React Native.
 *
 * Fuente de verdad: Figma (variables) → web/src/styles/tokens.css. Este archivo es
 * un espejo 1:1 y `tests/tokens.test.mts` falla si se desincroniza de tokens.css.
 *
 * Nombres = alias cortos de Tailwind en la web, en camelCase:
 *   bg-canvas → colors.canvas · text-fg-muted → colors.fgMuted · border-line → colors.line
 *
 * Sin imports: lo carga Node directamente en el test de paridad.
 */

/** 1. Primitivos (--raiz-*). NO usar directo en componentes. */
export const primitives = {
  crema100: '#fffdf9',
  crema200: '#f6efe4',
  arena200: '#efe3ce',
  arena300: '#e8d5b5',
  arena500: '#8a7b6b',
  tinta900: '#2a211b',
  bosque100: '#dce3d6',
  bosque700: '#1f3d2b',
  terracota100: '#f7dccf',
  terracota500: '#d9653b',
  sol100: '#fbe9c4',
  sol400: '#f2b33d',
} as const

const p = primitives

/**
 * 2. Semánticos (modo Claro). Color como dato:
 * bosque = a favor / ingresos / IA · terracota = alerta · sol = progreso / metas.
 * Un modo oscuro futuro solo redefine este objeto.
 */
export const colors = {
  // Fondos
  canvas: p.crema200,
  surface: p.crema100,
  subtle: p.arena200,
  decor: p.arena300,
  brand: p.bosque700,
  brandSubtle: p.bosque100,
  accent: p.terracota500,
  accentSubtle: p.terracota100,
  progress: p.sol400,
  progressSubtle: p.sol100,
  // Texto
  fg: p.tinta900,
  fgMuted: p.arena500,
  fgBrand: p.bosque700,
  fgAccent: p.terracota500,
  fgOnBrand: p.crema200,
  fgOnAccent: p.crema100,
  // Íconos
  icon: p.tinta900,
  iconMuted: p.arena500,
  iconBrand: p.bosque700,
  iconOnBrand: p.crema200,
  iconOnAccent: p.crema100,
  iconOnProgress: p.bosque700,
  // Bordes
  line: p.arena300,
  lineOnBrand: p.crema200,
} as const

export type ColorToken = keyof typeof colors

/** Escala de espaciado = Tailwind (space[4] = 16 = p-4). */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 32,
  full: 9999,
} as const

/**
 * Sombras como `boxShadow` (RN 0.76+ con la Nueva Arquitectura lo soporta en Android e iOS),
 * mismos valores que la web para que se vean igual.
 */
export const shadows = {
  card: '0 12px 32px -4px rgb(90 58 30 / 0.12)',
  fab: '0 8px 18px -2px rgb(217 101 59 / 0.4)',
  ia: '0 14px 30px -8px rgb(31 61 43 / 0.35)',
} as const

/** Equivalente a `bg-fg/80` de Tailwind: '#2a211b' + 0.8 → 'rgba(42, 33, 27, 0.8)'. */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Fondo del modal (backdrop) — igual que la web: rgb(42 33 27 / 0.45). */
export const overlay = withAlpha(p.tinta900, 0.45)
