import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { CalendarDays, Trash2 } from 'lucide-react-native'
import { Platform, Pressable, StyleSheet, Text, TextInput, ToastAndroid, View } from 'react-native'
import { ApiError } from '../../api'
import { createTransaction, deleteTransaction, updateTransaction } from '../../api/transactions'
import type { CategoryResponse, TransactionResponse } from '../../api/types'
import { Button, categoryIcon, SegmentedControl, Sheet, TextField } from '../../components/ui'
import { formatNumber, formatShortDate, parseDateOnly, toIsoDate } from '../../lib/format'
import { colors, fonts, radius, tabularNums, type, withAlpha } from '../../theme'
import {
  buildRequest,
  categoriesFor,
  defaultIncomeCategory,
  initialValues,
  quickDates,
  sanitizeDigits,
  type FormErrors,
  type FormValues,
  type Kind,
} from './transactionForm'

/** Un poco después de que el Modal se muestra (la hoja tarda 420 ms en subir). */
const FOCUS_DELAY_MS = 250

const KIND_OPTIONS = [
  { value: 'expense' as const, label: 'Gasto' },
  { value: 'income' as const, label: 'Ingreso' },
]

interface TransactionSheetProps {
  open: boolean
  /** Cambia en cada apertura para reiniciar el formulario. */
  formKey: number
  editing: TransactionResponse | null
  categories: CategoryResponse[]
  onReloadCategories: () => void
  onClose: () => void
  onSaved: () => void
}

export function TransactionSheet({ open, formKey, editing, categories, onReloadCategories, onClose, onSaved }: TransactionSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}>
      {open && <TransactionForm key={formKey} editing={editing} categories={categories} onReloadCategories={onReloadCategories} onSaved={onSaved} />}
    </Sheet>
  )
}

/** Confirmación breve y nativa (Android); en otras plataformas basta con ver el dashboard actualizado. */
function toast(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT)
}

function TransactionForm({
  editing,
  categories,
  onReloadCategories,
  onSaved,
}: {
  editing: TransactionResponse | null
  categories: CategoryResponse[]
  onReloadCategories: () => void
  onSaved: () => void
}) {
  const [values, setValues] = useState<FormValues>(() => initialValues(editing))
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { today, yesterday } = quickDates()
  const amountRef = useRef<ComponentRef<typeof TextInput>>(null)

  // `autoFocus` no abre el teclado dentro de un <Modal> en Android: el input se monta antes de que
  // la ventana del modal tenga el foco. Se enfoca a mano cuando la hoja ya está entrando.
  useEffect(() => {
    if (editing) return
    const id = setTimeout(() => amountRef.current?.focus(), FOCUS_DELAY_MS)
    return () => clearTimeout(id)
  }, [editing])

  const set = (patch: Partial<FormValues>, clear?: keyof FormErrors) => {
    setValues((v) => ({ ...v, ...patch }))
    if (clear) setErrors((e) => ({ ...e, [clear]: undefined }))
  }

  function changeKind(kind: Kind) {
    const visible = categoriesFor(kind, categories)
    // Al pasar a ingreso sin categoría se sugiere "Ingresos"; si la elegida no aplica al nuevo tipo, se limpia
    let categoryId = values.categoryId && visible.some((c) => c.id === values.categoryId) ? values.categoryId : null
    if (kind === 'income' && !categoryId) categoryId = defaultIncomeCategory(categories)
    set({ kind, categoryId })
  }

  function pickOtherDate() {
    DateTimePickerAndroid.open({
      value: parseDateOnly(values.date),
      mode: 'date',
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type === 'set' && date) set({ date: toIsoDate(date) }, 'date')
      },
    })
  }

  const fail = (error: unknown) => setFormError(error instanceof ApiError ? error.message : 'Algo salió mal. Intenta de nuevo.')

  async function save() {
    if (busy) return
    const result = buildRequest(values, categories, editing)
    setFormError(null)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setBusy('save')
    try {
      if (editing) await updateTransaction(editing.id, result.request)
      else await createTransaction(result.request)
      toast(editing ? 'Cambios guardados' : values.kind === 'expense' ? 'Gasto agregado' : 'Ingreso agregado')
      onSaved()
    } catch (error) {
      fail(error)
      setBusy(null)
    }
  }

  async function remove() {
    if (!editing || busy) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setBusy('delete')
    try {
      await deleteTransaction(editing.id)
      toast('Movimiento eliminado')
      onSaved()
    } catch (error) {
      fail(error)
      setBusy(null)
    }
  }

  const visibleCategories = categoriesFor(values.kind, categories)
  const isOtherDate = values.date !== today && values.date !== yesterday
  const income = values.kind === 'income'

  return (
    <View style={styles.form}>
      {formError && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[type.bodySm, styles.formError]}>
          {formError}
        </Text>
      )}

      <SegmentedControl label="Tipo de movimiento" options={KIND_OPTIONS} value={values.kind} onChange={changeKind} stretch />

      {/* Monto: el teclado numérico se abre solo al crear */}
      <View style={styles.field}>
        <Text style={[type.label, { color: colors.fg }]}>Monto</Text>
        <View style={[styles.amountRow, errors.amount ? styles.amountInvalid : null]}>
          <Text style={[styles.sign, { color: colors.fgMuted }]}>{income ? '+$' : '−$'}</Text>
          <TextInput
            accessibilityLabel={`Monto del ${income ? 'ingreso' : 'gasto'}`}
            accessibilityHint={errors.amount}
            ref={amountRef}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={withAlpha(colors.fgMuted, 0.5)}
            selectionColor={colors.brand}
            cursorColor={colors.brand}
            value={values.digits ? formatNumber(Number(values.digits)) : ''}
            onChangeText={(text) => set({ digits: sanitizeDigits(text) }, 'amount')}
            style={[styles.amount, tabularNums, { color: income ? colors.fgBrand : colors.fg }]}
          />
        </View>
        {errors.amount && <Text style={[type.bodySm, { color: colors.fgAccent }]}>{errors.amount}</Text>}
      </View>

      {/* Categoría: un toque (US-04, obligatoria) */}
      <View style={styles.field}>
        <Text style={[type.label, { color: colors.fg }]}>Categoría</Text>
        {categories.length === 0 ? (
          <View style={styles.noCategories}>
            <Text style={[type.bodySm, { color: colors.fgMuted }]}>No pudimos cargar tus categorías.</Text>
            <Button variant="secondary" size="sm" label="Reintentar" onPress={onReloadCategories} />
          </View>
        ) : (
          <View accessibilityRole="radiogroup" accessibilityLabel="Categoría" style={styles.chips}>
            {visibleCategories.map((c) => {
              const active = c.id === values.categoryId
              const Icon = categoryIcon(c.icon)
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="radio"
                  accessibilityLabel={c.name}
                  accessibilityState={{ checked: active, selected: active }}
                  onPress={() => set({ categoryId: c.id }, 'category')}
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && !active && styles.chipPressed]}
                >
                  <Icon size={16} color={active ? colors.iconOnBrand : colors.icon} />
                  <Text style={[type.labelSm, { color: active ? colors.fgOnBrand : colors.fg }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        )}
        {errors.category && <Text style={[type.bodySm, { color: colors.fgAccent }]}>{errors.category}</Text>}
      </View>

      {/* Fecha: atajos Hoy / Ayer; "Otra" abre el calendario nativo de Android */}
      <View style={styles.field}>
        <Text style={[type.label, { color: colors.fg }]}>Fecha</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Fecha" style={styles.chips}>
          <DateChip label="Hoy" active={values.date === today} onPress={() => set({ date: today }, 'date')} />
          <DateChip label="Ayer" active={values.date === yesterday} onPress={() => set({ date: yesterday }, 'date')} />
          {Platform.OS === 'android' && (
            <DateChip
              label={isOtherDate ? formatShortDate(values.date) : 'Otra fecha'}
              active={isOtherDate}
              icon
              onPress={pickOtherDate}
            />
          )}
          {Platform.OS !== 'android' && isOtherDate && <DateChip label={formatShortDate(values.date)} active onPress={() => {}} />}
        </View>
        {errors.date && <Text style={[type.bodySm, { color: colors.fgAccent }]}>{errors.date}</Text>}
      </View>

      <TextField
        label="Descripción (opcional)"
        placeholder={income ? 'Nómina, venta, regalo…' : 'Mercado, Uber, almuerzo…'}
        hint={values.description.trim() ? undefined : 'Si la dejas vacía, usamos el nombre de la categoría.'}
        maxLength={200}
        returnKeyType="done"
        onSubmitEditing={save}
        value={values.description}
        onChangeText={(description) => set({ description })}
      />

      <View style={styles.actions}>
        <Button
          label={busy === 'save' ? 'Guardando…' : editing ? 'Guardar cambios' : income ? 'Agregar ingreso' : 'Agregar gasto'}
          block
          loading={busy === 'save'}
          disabled={busy !== null}
          onPress={save}
        />
        {editing && (
          <Button
            variant="secondary"
            icon={Trash2}
            block
            label={busy === 'delete' ? 'Eliminando…' : confirmDelete ? 'Toca de nuevo para eliminar' : 'Eliminar movimiento'}
            loading={busy === 'delete'}
            disabled={busy !== null}
            onPress={remove}
            style={confirmDelete ? styles.confirmDelete : undefined}
          />
        )}
      </View>
    </View>
  )
}

function DateChip({ label, active, icon, onPress }: { label: string; active: boolean; icon?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: active, selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && !active && styles.chipPressed]}
    >
      {icon && <CalendarDays size={16} color={active ? colors.iconOnBrand : colors.icon} />}
      <Text style={[type.labelSm, { color: active ? colors.fgOnBrand : colors.fg }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  formError: { color: colors.fgAccent, backgroundColor: colors.accentSubtle, borderRadius: radius.sm, padding: 12 },
  field: { gap: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, borderBottomWidth: 2, borderBottomColor: colors.line, paddingBottom: 4 },
  amountInvalid: { borderBottomColor: colors.accent },
  sign: { fontFamily: fonts.displayLight, fontSize: 30, lineHeight: 40 },
  amount: { flex: 1, minWidth: 0, fontFamily: fonts.display, fontSize: 40, lineHeight: 52, padding: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipPressed: { backgroundColor: withAlpha(colors.subtle, 0.6) },
  noCategories: { gap: 8, alignItems: 'flex-start' },
  actions: { gap: 8, paddingTop: 4 },
  confirmDelete: { borderColor: colors.accent },
})
