import type { ReactNode } from 'react'
import { ArrowUpRight, Bell, Plus, Sprout, Utensils, Briefcase } from 'lucide-react'
import { Avatar, BudgetRing, Button, Chip, IconButton, InsightCard, LegendItem, SectionHeader, TransactionRow } from '../components/ui'

// Catálogo vivo de fundamentos y componentes (equivale a la página "Componentes" de Figma).

const swatches = [
  'canvas',
  'surface',
  'subtle',
  'decor',
  'brand',
  'brand-subtle',
  'accent',
  'accent-subtle',
  'progress',
  'progress-subtle',
] as const

// Clases literales para que Tailwind las detecte.
const swatchClass: Record<(typeof swatches)[number], string> = {
  canvas: 'bg-canvas',
  surface: 'bg-surface',
  subtle: 'bg-subtle',
  decor: 'bg-decor',
  brand: 'bg-brand',
  'brand-subtle': 'bg-brand-subtle',
  accent: 'bg-accent',
  'accent-subtle': 'bg-accent-subtle',
  progress: 'bg-progress',
  'progress-subtle': 'bg-progress-subtle',
}

const typeStyles = [
  ['type-monto', '2.847.500'],
  ['type-h1', 'Hola, Santiago'],
  ['type-h2', 'Movimientos'],
  ['type-h3', 'Noviembre'],
  ['type-quote', '“Si cocinas 2 de cada 4, ahorras $186.000 al mes.”'],
  ['type-body', 'Texto de cuerpo para descripciones y formularios.'],
  ['type-body-sm', 'Domicilio · Hoy'],
  ['type-label', 'Crear meta de ahorro'],
  ['type-caption', 'Proyección fin de mes'],
] as const

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="type-h2">{title}</h2>
      {children}
    </section>
  )
}

export function FoundationsPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-5 py-10">
      <header className="flex flex-col gap-1">
        <p className="type-caption text-fg-muted">Finance APP · Fundamentos y componentes</p>
        <h1 className="type-h1">Raíz × Aurora</h1>
      </header>

      <Block title="Color">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {swatches.map((name) => (
            <div key={name} className="flex flex-col gap-2">
              <div className={`h-16 rounded-md border border-line ${swatchClass[name]}`} />
              <span className="type-label-sm">{name}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Tipografía">
        <div className="flex flex-col gap-3 rounded-lg bg-surface p-5 shadow-card">
          {typeStyles.map(([cls, sample]) => (
            <div key={cls} className="flex flex-col gap-0.5">
              <span className="type-caption text-fg-muted">{cls}</span>
              <span className={cls}>{sample}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Botón">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primario</Button>
          <Button variant="accent">Acento</Button>
          <Button variant="secondary">Secundario</Button>
          <Button icon={Plus}>Con ícono</Button>
          <Button size="sm">Pequeño</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
        <div className="flex flex-wrap gap-3 rounded-lg bg-brand p-4">
          <Button variant="accent">Acento sobre marca</Button>
          <Button variant="on-brand">Sobre marca</Button>
        </div>
      </Block>

      <Block title="Chip">
        <div className="flex flex-wrap gap-2">
          <Chip tone="positive" icon={ArrowUpRight}>12,4% vs oct</Chip>
          <Chip tone="alert">Comida +23%</Chip>
          <Chip tone="progress">Meta 64%</Chip>
          <Chip value="$214k">Mercado</Chip>
        </div>
      </Block>

      <Block title="Botón de ícono y avatar">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton icon={Bell} label="Notificaciones" />
          <IconButton icon={Sprout} label="Marca" variant="brand" />
          <IconButton icon={Plus} label="Nuevo movimiento" variant="accent" size="lg" />
          <Avatar name="Santiago García" />
        </div>
      </Block>

      <Block title="Datos">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex items-center gap-5 rounded-lg bg-surface p-5 shadow-card">
            <BudgetRing percent={68} />
            <ul className="flex flex-1 flex-col gap-3">
              <LegendItem tone="accent" label="Comida" value="$640k" />
              <LegendItem tone="progress" label="Ocio" value="$380k" />
              <LegendItem tone="brand" label="Transporte" value="$210k" />
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <SectionHeader title="Movimientos" action={{ label: 'Ver todo', to: '/movimientos' }} />
            <ul className="rounded-lg bg-surface px-4 py-1.5 shadow-card">
              <TransactionRow title="Rappi" detail="Alimentación · Hoy" amount={-38900} icon={Utensils} />
              <TransactionRow title="Nómina Acme S.A.S." detail="Ingresos · 30 oct" amount={5200000} icon={Briefcase} />
            </ul>
          </div>
        </div>
      </Block>

      <Block title="Insight IA">
        <InsightCard
          message="Los viernes gastas 23% más en domicilios. Si cocinas 2 de cada 4, ahorras $186.000 al mes."
          time="ahora"
          primaryAction={{ label: 'Crear meta de ahorro' }}
          secondaryAction={{ label: 'Después' }}
        />
      </Block>
    </main>
  )
}
