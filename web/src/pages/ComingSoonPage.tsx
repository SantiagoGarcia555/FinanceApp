import { Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 pb-36 text-center">
      <span aria-hidden className="grid size-16 place-items-center rounded-full bg-brand-subtle text-icon-brand">
        <Sprout size={30} />
      </span>
      <h1 className="type-h1">{title}</h1>
      <p className="type-body text-fg-muted">Esta sección todavía está creciendo. Muy pronto la verás aquí.</p>
      <Link to="/" className="type-label text-fg-accent hover:underline">
        Volver al inicio
      </Link>
    </main>
  )
}
