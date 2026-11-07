import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CloudOff, Sun } from 'lucide-react-native'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../auth/AuthContext'
import { Screen } from '../../components/Screen'
import { Avatar, BudgetRing, Button, categoryIcon, Chip, InsightCard, LegendItem, Rise, SectionHeader, TransactionRow } from '../../components/ui'
import { useSlow } from '../../hooks/useSlow'
import { formatCompactMoney, formatMonthName, formatNumber, formatPercent, formatRelativeDay, formatToday } from '../../lib/format'
import { colors, fonts, radius, shadows, space, type, withAlpha } from '../../theme'
import { budgetTone, buildDashboardView } from '../../../../shared/dashboard'
import { CategoryBreakdown } from './CategoryBreakdown'
import type { DashboardData } from './dashboardData'
import { TrendChart } from './TrendChart'
import { useDashboard } from './useDashboard'

/** Inicio (1.3.2): versión móvil del dashboard de la web, con los mismos datos y reglas (shared/dashboard.ts). */
export function DashboardScreen() {
  const { user } = useAuth()
  const { state, refreshing, refresh, retry } = useDashboard()
  const slow = useSlow(state.status === 'loading')
  const firstName = user?.name.trim().split(/\s+/)[0] ?? ''

  return (
    <Screen
      withNav
      background={<Blobs />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          enabled={state.status !== 'loading'}
          colors={[colors.brand]}
          tintColor={colors.brand}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      <Rise from={-14} style={styles.header}>
        <View style={styles.greeting}>
          <View style={styles.today}>
            <Sun size={15} color={colors.progress} />
            <Text style={[type.bodySm, { color: colors.fgMuted }]}>{formatToday()}</Text>
          </View>
          <Text accessibilityRole="header" style={[type.h1, { color: colors.fg }]}>
            Hola{firstName && `, ${firstName}`}
          </Text>
        </View>
        {user && <Avatar name={user.name} />}
      </Rise>

      {state.status === 'loading' && (
        <View accessible accessibilityLabel="Cargando tu resumen" style={styles.skeletons}>
          <Skeleton width={144} height={16} />
          <Skeleton width={256} height={56} />
          <Skeleton height={160} />
          <Skeleton height={192} />
          {slow && (
            <Text accessibilityLiveRegion="polite" style={[type.bodySm, styles.center, { color: colors.fgMuted }]}>
              Despertando el servidor… la primera carga puede tardar hasta un minuto.
            </Text>
          )}
        </View>
      )}

      {state.status === 'error' && (
        <Rise style={[styles.card, styles.errorCard]}>
          <View style={styles.errorBadge}>
            <CloudOff size={24} color={colors.fgAccent} />
          </View>
          <Text accessibilityRole="header" style={[type.h3, { color: colors.fg }]}>
            No pudimos cargar tu resumen
          </Text>
          <Text accessibilityLiveRegion="polite" style={[type.bodySm, styles.center, { color: colors.fgMuted }]}>
            {state.message}
          </Text>
          <Button label="Reintentar" onPress={retry} />
        </Rise>
      )}

      {state.status === 'ready' && (
        <>
          {state.refreshError && (
            <Text accessibilityLiveRegion="polite" style={[type.bodySm, { color: colors.fgAccent }]}>
              No pudimos actualizar: {state.refreshError}
            </Text>
          )}
          <Dashboard data={state.data} />
        </>
      )}
    </Screen>
  )
}

function Dashboard({ data }: { data: DashboardData }) {
  const [insightDismissed, setInsightDismissed] = useState(false)
  const { summary, recentTransactions, categoryIcons } = data
  const view = buildDashboardView({ summary, trend: data.trend, budgets: data.budgets, recentCount: recentTransactions.length })
  const { expenseChange, monthlyBudgets } = view
  const negative = view.negativeBalance
  // Las pantallas de presupuestos y movimientos llegan en 1.3.3/1.3.4: por ahora la sugerencia solo se descarta
  const dismiss = { label: 'Entendido', onPress: () => setInsightDismissed(true) }

  return (
    <>
      {/* Saldo del mes */}
      <View style={styles.hero}>
        <Rise delay={150} from={10}>
          <Text style={[type.bodySm, { color: colors.fgMuted }]}>Disponible este mes</Text>
        </Rise>
        <Rise delay={220} from={30}>
          <View
            style={styles.amountRow}
            // TalkBack: "Disponible este mes: $2.847.500" en una sola lectura
            accessible
            accessibilityLabel={`Disponible este mes: ${negative ? 'menos ' : ''}$${formatNumber(Math.abs(summary.balance))}`}
          >
            <Text style={[styles.currency, { color: negative ? colors.fgAccent : colors.fgMuted }]}>{negative ? '−$' : '$'}</Text>
            <Text style={[type.monto, styles.amount, { color: negative ? colors.fgAccent : colors.fg }]} adjustsFontSizeToFit numberOfLines={1}>
              {formatNumber(Math.abs(summary.balance))}
            </Text>
          </View>
        </Rise>
        {view.hasActivity && (
          <Rise delay={400} from={12} style={styles.chips}>
            {view.spent > 0 && <Chip>Gastos del mes: {formatCompactMoney(view.spent)}</Chip>}
            {expenseChange !== null && (
              // Gastar más es alerta (terracota); gastar menos, a favor (bosque)
              <Chip tone={expenseChange > 0 ? 'alert' : 'positive'} icon={expenseChange > 0 ? ArrowUpRight : ArrowDownRight}>
                {formatPercent(Math.abs(expenseChange))} {expenseChange > 0 ? 'más' : 'menos'} que {view.previousMonthLabel}
              </Chip>
            )}
          </Rise>
        )}
      </View>

      {/* Presupuesto del mes */}
      {monthlyBudgets.length > 0 && (
        <Rise delay={500} from={30} style={[styles.card, styles.budgetCard]}>
          <BudgetRing percent={view.budgetPercent} label="usado" description="de tu presupuesto del mes usado" animationDelay={600} />
          <View style={styles.budgetList}>
            <Text accessibilityRole="header" style={[type.h3, { color: colors.fg }]}>
              {formatMonthName(summary.month)}
            </Text>
            {monthlyBudgets.slice(0, 3).map((b) => (
              <LegendItem key={b.id} tone={budgetTone(b.percentUsed)} label={b.categoryName} value={`${Math.round(b.percentUsed)}%`} />
            ))}
          </View>
        </Rise>
      )}

      {/* Sugerencia: calculada de los datos reales hasta que llegue ISavingsInsightService (fase 2) */}
      {!insightDismissed &&
        (!view.hasActivity ? (
          <Rise delay={650} from={36}>
            <InsightCard
              title="Empecemos a echar raíces"
              message="Registra tu primer movimiento o importa el extracto de tu banco desde la web, y aquí verás a dónde se va tu plata."
              primaryAction={dismiss}
            />
          </Rise>
        ) : (
          view.insight && (
            <Rise delay={650} from={36}>
              <InsightCard message={view.insight.message} primaryAction={dismiss} />
            </Rise>
          )
        ))}

      {/* US-12: gasto del mes por categoría (siempre, con o sin presupuestos) */}
      {view.breakdown.length > 0 && (
        <Rise delay={750} from={30} style={[styles.card, styles.section]}>
          <Text accessibilityRole="header" style={[type.h3, { color: colors.fg }]}>
            Gasto por categoría
          </Text>
          <CategoryBreakdown items={view.breakdown} />
        </Rise>
      )}

      {/* Tendencia de ingresos vs gastos */}
      {view.hasTrend && (
        <Rise delay={850} from={30} style={[styles.card, styles.trend]}>
          <Text accessibilityRole="header" style={[type.h3, { color: colors.fg }]}>
            Últimos {data.trend.length} meses
          </Text>
          <TrendChart months={data.trend} />
        </Rise>
      )}

      {/* Movimientos recientes */}
      <View style={styles.recent}>
        <Rise delay={900} from={16}>
          <SectionHeader title="Movimientos" />
        </Rise>
        {recentTransactions.length > 0 ? (
          <View style={[styles.card, styles.list]}>
            {recentTransactions.map((t, i) => (
              <Rise key={t.id} delay={1000 + i * 90} from={18}>
                <TransactionRow
                  title={t.description}
                  detail={`${t.categoryName ?? 'Sin categoría'} · ${formatRelativeDay(t.date)}`}
                  amount={t.amount}
                  icon={categoryIcon(t.categoryId ? categoryIcons[t.categoryId] : null)}
                />
              </Rise>
            ))}
          </View>
        ) : (
          <Rise delay={1000} from={18} style={[styles.card, styles.empty]}>
            <Text style={[type.bodySm, styles.center, { color: colors.fgMuted }]}>
              Aún no tienes movimientos. Muy pronto podrás registrarlos con el botón + ; mientras tanto, hazlo desde la web.
            </Text>
          </Rise>
        )}
      </View>
    </>
  )
}

function Skeleton({ width, height }: { width?: number; height: number }) {
  return <View style={[styles.skeleton, { height }, width ? { width } : { alignSelf: 'stretch' }]} />
}

/** Manchas orgánicas de fondo (= Blobs de la web, sin la deriva animada). */
function Blobs() {
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobMiddle]} />
      <View style={[styles.blob, styles.blobBottom]} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  greeting: { flex: 1, gap: space[1] },
  today: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { textAlign: 'center' },
  skeletons: { gap: space[5], paddingTop: 6 },
  skeleton: { borderRadius: radius.md, backgroundColor: withAlpha(colors.subtle, 0.8) },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, boxShadow: shadows.card },
  errorCard: { alignItems: 'center', gap: space[3], padding: space[6], marginTop: space[6] },
  errorBadge: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSubtle },
  hero: { gap: space[1], paddingTop: 6, marginTop: -space[2] },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  currency: { fontFamily: fonts.displayLight, fontSize: 30, lineHeight: 36 },
  amount: { flexShrink: 1 },
  recent: { gap: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingTop: space[2] },
  budgetCard: { flexDirection: 'row', alignItems: 'center', gap: space[5], padding: space[5] },
  budgetList: { flex: 1, minWidth: 0, gap: space[3] },
  section: { gap: space[4], padding: space[5] },
  trend: { gap: space[3], padding: space[5] },
  list: { paddingHorizontal: space[4], paddingVertical: 6 },
  empty: { paddingHorizontal: space[5], paddingVertical: space[6] },
  blob: { position: 'absolute', borderRadius: 9999 },
  blobTop: { top: -120, right: -60, width: 320, height: 320, backgroundColor: withAlpha(colors.decor, 0.85), transform: [{ scaleX: 1.1 }, { rotate: '18deg' }] },
  blobMiddle: { top: 300, left: -110, width: 240, height: 240, backgroundColor: withAlpha(colors.progress, 0.2) },
  blobBottom: { top: 600, right: -100, width: 280, height: 280, backgroundColor: withAlpha(colors.accent, 0.1) },
})
