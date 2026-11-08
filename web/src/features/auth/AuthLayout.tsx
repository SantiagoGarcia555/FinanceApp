import type { ReactNode } from 'react'
import { Sprout } from 'lucide-react'
import { delay } from '../../lib/motion'

// Nombre de trabajo de la marca (no validado): centralizado aquí para cambiarlo fácil.
export const BRAND_NAME = 'tino'

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-drift absolute -top-32 -right-24 size-80 rounded-[42%_58%_63%_37%/41%_44%_56%_59%] bg-decor opacity-85" />
        <div className="animate-drift absolute -bottom-24 -left-28 size-72 rounded-[63%_37%_54%_46%/55%_48%_52%_45%] bg-accent opacity-10 [animation-direction:alternate-reverse]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-5 py-12">
        <header className="animate-rise flex flex-col gap-5" style={delay(50)}>
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid size-12 place-items-center rounded-full bg-brand text-progress">
              <Sprout size={26} />
            </span>
            <span className="font-display text-[36px] leading-none font-semibold italic">{BRAND_NAME}</span>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="type-h1">{title}</h1>
            <p className="type-body text-fg-muted">{subtitle}</p>
          </div>
        </header>

        <div className="animate-rise rounded-xl bg-surface p-6 shadow-card" style={delay(200)}>
          {children}
        </div>

        <p className="animate-rise type-body text-center text-fg-muted" style={delay(350)}>
          {footer}
        </p>
      </main>
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="type-body-sm rounded-sm bg-accent-subtle px-4 py-3 text-fg-accent">
      {message}
    </p>
  )
}
