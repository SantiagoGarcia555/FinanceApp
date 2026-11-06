import { useRef, useState, type ComponentRef } from 'react'
import { Link } from 'expo-router'
import { Text, type TextInput } from 'react-native'
import { ApiError } from '../api'
import { SERVER_WAKING_MESSAGE } from '../brand'
import { useAuth } from '../auth/AuthContext'
import { Button, TextField } from '../components/ui'
import { AuthLayout, FormError } from '../features/auth/AuthLayout'
import { EMAIL_RE } from '../features/auth/validation'
import { useSlow } from '../hooks/useSlow'
import { colors, type } from '../theme'

export default function LoginScreen() {
  const { login } = useAuth()
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const slow = useSlow(submitting)

  async function onSubmit() {
    if (submitting) return
    const next: typeof errors = {}
    if (!EMAIL_RE.test(email.trim())) next.email = 'Escribe un email válido.'
    if (!password) next.password = 'Escribe tu contraseña.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      // Al quedar autenticado, el guard del layout raíz lleva a las tabs.
      await login({ email: email.trim(), password })
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401
          ? 'Email o contraseña incorrectos.'
          : error instanceof ApiError
            ? error.message // incluye el bloqueo por intentos (429) con el mensaje de la API
            : 'Algo salió mal. Intenta de nuevo.',
      )
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Hola de nuevo"
      subtitle="Ingresa para ver cómo van tus finanzas."
      footer={
        <Text style={[type.body, { color: colors.fgMuted }]}>
          ¿No tienes cuenta?{' '}
          <Link href="/registro" replace style={[type.label, { color: colors.fgAccent }]}>
            Crea una
          </Link>
        </Text>
      }
    >
      <FormError message={formError} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
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
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Button label={submitting ? 'Ingresando…' : 'Ingresar'} loading={submitting} block onPress={onSubmit} style={{ marginTop: 8 }} />
      {slow && <Text style={[type.bodySm, { color: colors.fgMuted, textAlign: 'center' }]}>{SERVER_WAKING_MESSAGE}</Text>}
    </AuthLayout>
  )
}
