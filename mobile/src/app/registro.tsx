import { useRef, useState, type ComponentRef } from 'react'
import { Link } from 'expo-router'
import { Text, type TextInput } from 'react-native'
import { ApiError } from '../api'
import { SERVER_WAKING_MESSAGE } from '../brand'
import { useAuth } from '../auth/AuthContext'
import { Button, TextField } from '../components/ui'
import { AuthLayout, FormError } from '../features/auth/AuthLayout'
import { EMAIL_RE, MIN_PASSWORD } from '../features/auth/validation'
import { useSlow } from '../hooks/useSlow'
import { colors, type } from '../theme'

type Field = 'name' | 'email' | 'password'

export default function RegisterScreen() {
  const { register } = useAuth()
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null)
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null)

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const slow = useSlow(submitting)

  const set = (field: Field) => (value: string) => setForm((f) => ({ ...f, [field]: value }))

  async function onSubmit() {
    if (submitting) return
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
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setErrors({ email: 'Ya existe una cuenta con ese email.' })
      else setFormError(error instanceof ApiError ? error.message : 'Algo salió mal. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Empecemos"
      subtitle="Crea tu cuenta y dale raíces a tu plata."
      footer={
        <Text style={[type.body, { color: colors.fgMuted }]}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/ingresar" replace style={[type.label, { color: colors.fgAccent }]}>
            Ingresa
          </Link>
        </Text>
      }
    >
      <FormError message={formError} />
      <TextField
        label="Nombre"
        value={form.name}
        onChangeText={set('name')}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        value={form.email}
        onChangeText={set('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Contraseña"
        password
        value={form.password}
        onChangeText={set('password')}
        error={errors.password}
        hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Button label={submitting ? 'Creando tu cuenta…' : 'Crear cuenta'} loading={submitting} block onPress={onSubmit} style={{ marginTop: 8 }} />
      {slow && <Text style={[type.bodySm, { color: colors.fgMuted, textAlign: 'center' }]}>{SERVER_WAKING_MESSAGE}</Text>}
    </AuthLayout>
  )
}
