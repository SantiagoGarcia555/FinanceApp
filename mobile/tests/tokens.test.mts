/*
 * Paridad web ↔ móvil de la identidad visual.
 * Corre con el runner de Node (sin Jest): `npm test` → node --test tests/
 * Node ejecuta TypeScript directo (type stripping), por eso tokens.ts no tiene imports.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { colors, primitives, radius, shadows, space, withAlpha } from '../src/theme/tokens.ts'

const root = new URL('../../', import.meta.url)
const css = readFileSync(new URL('web/src/styles/tokens.css', root), 'utf8')

const inlineMatch = /@theme inline\s*\{([\s\S]*?)\}/.exec(css)
assert.ok(inlineMatch, 'no se encontró @theme inline en tokens.css')
const inlineTheme = { block: inlineMatch[0], body: inlineMatch[1] }

/**
 * Declaraciones `--nombre: valor;` de :root y @theme, SIN el bloque @theme inline: ahí hay
 * alias con el mismo nombre que el semántico (--color-icon-brand: var(--color-icon-brand)).
 */
const decls = new Map<string, string>()
for (const m of css.replace(inlineTheme.block, '').matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) decls.set(m[1], m[2].trim())

function resolve(value: string, seen = new Set<string>()): string {
  const ref = /^var\(--([a-z0-9-]+)\)$/.exec(value)?.[1]
  if (!ref) return value
  assert.ok(!seen.has(ref), `ciclo en var(--${ref})`)
  const next = decls.get(ref)
  assert.ok(next, `var(--${ref}) no está definida en tokens.css`)
  return resolve(next, new Set(seen).add(ref))
}

const camel = (kebab: string) => kebab.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())

/** Alias de Tailwind del bloque `@theme inline` (bg-canvas, text-fg-muted…). */
function themeAliases(): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of inlineTheme.body.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) out.set(camel(m[1]), resolve(m[2].trim()))
  return out
}

test('primitivos: mismos hex que --raiz-*', () => {
  const web = Object.fromEntries(
    [...decls].filter(([k]) => k.startsWith('raiz-')).map(([k, v]) => [camel(k.slice(5)).replace(/-/g, ''), v.toLowerCase()]),
  )
  assert.deepEqual({ ...primitives }, web)
})

test('colores semánticos: mismas claves y valores que los alias de Tailwind', () => {
  assert.deepEqual({ ...colors }, Object.fromEntries(themeAliases()))
})

test('espaciado y radios', () => {
  for (const [k, v] of Object.entries(space)) assert.equal(`${v}px`, decls.get(`space-${k}`), `space-${k}`)
  for (const k of ['sm', 'md', 'lg', 'xl'] as const) assert.equal(`${radius[k]}px`, decls.get(`radius-${k}`), `radius-${k}`)
})

test('sombras', () => {
  for (const [k, v] of Object.entries(shadows)) assert.equal(v, decls.get(`shadow-${k}`), `shadow-${k}`)
})

test('withAlpha convierte hex a rgba', () => {
  assert.equal(withAlpha('#2a211b', 0.8), 'rgba(42, 33, 27, 0.8)')
  assert.equal(withAlpha('#ffffff', 1), 'rgba(255, 255, 255, 1)')
})
