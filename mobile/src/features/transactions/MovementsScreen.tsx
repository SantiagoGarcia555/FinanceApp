import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CloudOff, FileUp, Plus } from 'lucide-react-native'
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BOTTOM_NAV_CLEARANCE, Button, categoryIcon, Chip, IconButton, Rise, SegmentedControl, SelectField, TransactionRow } from '../../components/ui'
import { useSlow } from '../../hooks/useSlow'
import { formatCompactMoney, formatDayHeading, formatMoney, formatMonthYear } from '../../lib/format'
import { colors, radius, shadows, space, tabularNums, type, withAlpha } from '../../theme'
import { addMonths, firstOfMonth, groupByDay, monthFilters, type KindFilter } from './movements'
import { useTransactions } from './TransactionsContext'
import { useMovements } from './useMovements'

const KIND_OPTIONS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'expense' as const, label: 'Gastos' },
  { value: 'income' as const, label: 'Ingresos' },
]

/** Billetera (1.3.4): movimientos del mes con filtros, agrupados por día y con scroll infinito. */
export function MovementsScreen({ onImport }: { /** Abre el importador de extractos (1.3.5). */ onImport?: () => void }) {
  const insets = useSafeAreaInsets()
  const { categories, openEdit, openNew, version } = useTransactions()
  const [thisMonth] = useState(() => firstOfMonth(new Date()))
  const [month, setMonth] = useState(thisMonth)
  const [kind, setKind] = useState<KindFilter>('all')
  const [categoryId, setCategoryId] = useState('')

  const filters = useMemo(() => monthFilters(month, kind, categoryId), [month, kind, categoryId])
  const m = useMovements(filters, version)
  const sections = useMemo(() => groupByDay(m.items), [m.items])
  const slow = useSlow(m.status === 'loading')

  const categoryIcons = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.icon])), [categories])
  const categoryOptions = useMemo(
    () => [{ value: '', label: 'Todas las categorías' }, ...categories.map((c) => ({ value: c.id, label: c.name, icon: categoryIcon(c.icon) }))],
    [categories],
  )

  const isCurrentMonth = month.getTime() === thisMonth.getTime()
  const filtered = kind !== 'all' || categoryId !== ''
  const s = m.summary

  const header = (
    <View style={styles.header}>
      <Rise from={-14} style={styles.titleRow}>
        <Text accessibilityRole="header" style={[type.h1, { color: colors.fg }]}>
          Movimientos
        </Text>
        <View style={styles.titleSide}>
          {m.status === 'ready' && (
            <Text accessibilityLiveRegion="polite" style={[type.bodySm, { color: colors.fgMuted }]}>
              {m.totalCount} {m.totalCount === 1 ? 'movimiento' : 'movimientos'}
            </Text>
          )}
          {onImport && <IconButton icon={FileUp} label="Importar extracto" variant="ghost" onPress={onImport} />}
        </View>
      </Rise>

      {/* Mes */}
      <View style={styles.monthBar}>
        <IconButton icon={ChevronLeft} label="Mes anterior" variant="ghost" onPress={() => setMonth((d) => addMonths(d, -1))} />
        <Text accessibilityLiveRegion="polite" style={[type.label, { color: colors.fg }]}>
          {formatMonthYear(month)}
        </Text>
        <IconButton
          icon={ChevronRight}
          label="Mes siguiente"
          variant="ghost"
          disabled={isCurrentMonth}
          accessibilityState={{ disabled: isCurrentMonth }}
          style={isCurrentMonth ? styles.disabled : undefined}
          onPress={() => setMonth((d) => addMonths(d, 1))}
        />
      </View>

      {s && (s.totalIncome !== 0 || s.totalExpense !== 0) && (
        <View style={styles.chips}>
          <Chip tone="positive">Ingresos {formatCompactMoney(s.totalIncome)}</Chip>
          <Chip>Gastos {formatCompactMoney(Math.abs(s.totalExpense))}</Chip>
          <Chip tone={s.balance < 0 ? 'alert' : 'progress'}>Balance {formatCompactMoney(s.balance)}</Chip>
        </View>
      )}

      {/* Filtros */}
      <SegmentedControl label="Tipo de movimiento" options={KIND_OPTIONS} value={kind} onChange={setKind} stretch />
      <SelectField label="Categoría" options={categoryOptions} value={categoryId} onChange={setCategoryId} />

      {m.status === 'error' && m.items.length > 0 && (
        <Text accessibilityLiveRegion="polite" style={[type.bodySm, { color: colors.fgAccent }]}>
          No pudimos actualizar: {m.error}
        </Text>
      )}
    </View>
  )

  const empty =
    m.status === 'loading' ? (
      <View accessible accessibilityLabel="Cargando movimientos" style={styles.skeletons}>
        <View style={[styles.skeleton, { width: 96, height: 16 }]} />
        <View style={[styles.skeleton, { height: 224 }]} />
        {slow && (
          <Text accessibilityLiveRegion="polite" style={[type.bodySm, styles.center, { color: colors.fgMuted }]}>
            Despertando el servidor… la primera carga puede tardar hasta un minuto.
          </Text>
        )}
      </View>
    ) : m.status === 'error' ? (
      <View style={[styles.card, styles.message]}>
        <View style={styles.errorBadge}>
          <CloudOff size={24} color={colors.fgAccent} />
        </View>
        <Text accessibilityLiveRegion="polite" style={[type.bodySm, styles.center, { color: colors.fgMuted }]}>
          {m.error}
        </Text>
        <Button label="Reintentar" onPress={m.retry} />
      </View>
    ) : (
      <View style={[styles.card, styles.message]}>
        <Text style={[type.h3, { color: colors.fg }]}>{filtered ? 'Nada con esos filtros' : 'Sin movimientos este mes'}</Text>
        <Text style={[type.bodySm, styles.center, { color: colors.fgMuted }]}>
          {filtered ? 'Prueba con otro tipo o categoría.' : 'Registra lo que gastas y recibes para ver a dónde se va tu plata.'}
        </Text>
        {!filtered && <Button icon={Plus} label="Agregar movimiento" onPress={openNew} />}
        {!filtered && onImport && <Button variant="secondary" icon={FileUp} label="Importar extracto" onPress={onImport} />}
      </View>
    )

  const footer =
    m.items.length === 0 ? undefined : m.loadingMore ? (
      <ActivityIndicator accessibilityLabel="Cargando más movimientos" color={colors.brand} style={styles.footer} />
    ) : m.loadMoreError ? (
      <View style={[styles.footer, styles.footerError]}>
        <Text style={[type.bodySm, styles.center, { color: colors.fgAccent }]}>{m.loadMoreError}</Text>
        <Button variant="secondary" size="sm" label="Reintentar" onPress={m.loadMore} />
      </View>
    ) : !m.hasMore && m.status === 'ready' ? (
      <Text style={[type.caption, styles.center, styles.footer, { color: colors.fgMuted }]}>Eso es todo en {formatMonthYear(month).toLowerCase()}.</Text>
    ) : undefined

  return (
    <View style={styles.screen}>
      <SectionList
        // Con datos viejos visibles mientras cambia el filtro no hace falta vaciar la lista
        sections={m.status === 'error' && m.items.length === 0 ? [] : sections}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader} accessibilityRole="header">
            <Text style={[type.labelSm, { color: colors.fgMuted }]}>{formatDayHeading(section.day)}</Text>
            <Text style={[type.caption, tabularNums, { color: colors.fgMuted }]}>{formatMoney(section.total, { signed: true })}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.row,
              index === 0 && styles.rowFirst,
              index === section.data.length - 1 && styles.rowLast,
            ]}
          >
            <TransactionRow
              title={item.description}
              detail={item.categoryName ?? 'Sin categoría'}
              amount={item.amount}
              icon={categoryIcon(item.categoryId ? categoryIcons[item.categoryId] : null)}
              onPress={() => openEdit(item)}
            />
          </View>
        )}
        stickySectionHeadersEnabled
        onEndReached={() => void m.loadMore()}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={m.refreshing}
            onRefresh={m.refresh}
            enabled={m.status !== 'loading'}
            colors={[colors.brand]}
            tintColor={colors.brand}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space[6], paddingBottom: BOTTOM_NAV_CLEARANCE + insets.bottom + space[6] },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, paddingHorizontal: space[5] },
  header: { gap: space[4], marginBottom: space[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  titleSide: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginRight: -space[3] },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 9999,
    backgroundColor: colors.surface,
    padding: 6,
    boxShadow: shadows.card,
  },
  disabled: { opacity: 0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  center: { textAlign: 'center' },
  skeletons: { gap: space[3], paddingTop: space[2] },
  skeleton: { borderRadius: radius.md, backgroundColor: withAlpha(colors.subtle, 0.8) },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, boxShadow: shadows.card },
  message: { alignItems: 'center', gap: space[3], paddingHorizontal: space[6], paddingVertical: space[8], marginTop: space[2] },
  errorBadge: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSubtle },
  // Fondo crema: el encabezado queda fijo arriba al hacer scroll y tapa las filas que pasan debajo
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    paddingHorizontal: space[1],
    paddingTop: space[4],
    paddingBottom: space[2],
  },
  row: { backgroundColor: colors.surface, paddingHorizontal: space[4] },
  rowFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: 6 },
  rowLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, paddingBottom: 6 },
  footer: { paddingVertical: space[6] },
  footerError: { alignItems: 'center', gap: space[2] },
})
