import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Button, TextField } from '../../components/ui'
import { AuthLayout, FormError } from './AuthLayout'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8 // igual que AuthController.Register

type Field = 'name' | 'email' | 'password'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (field: Field) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = 'Cuéntanos cómo te llamas.'
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Escribe un email válido.'
    if (form.password.length < MIN_PASSWORD) next.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setErrors({ email: 'Ya existe una cuenta con ese email.' })
      else setFormError(error instanceof ApiError ? error.message : 'Algo salió mal. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Empecemos"
      subtitle="Crea tu cuenta y dale raíces a tu plata."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/ingresar" className="type-label text-fg-accent hover:underline">
            Ingresa
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={formError} />
        <TextField label="Nombre" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
        />
        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? 'Creando tu cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthLayout>
  )
}
