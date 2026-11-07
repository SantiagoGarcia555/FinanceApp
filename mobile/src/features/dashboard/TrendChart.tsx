import { StyleSheet, Text, View } from 'react-native'
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg'
import type { MonthlyTrendPoint } from '../../api/types'
import { formatCompactMoney } from '../../lib/format'
import { colors, fonts, type } from '../../theme'
import { monthShort } from '../../../../shared/dashboard'

// Mismas medidas que web/src/features/dashboard/TrendChart.tsx (viewBox escalable)
const W = 320
const H = 140
const BASE = 118 // línea base de las barras
const MAX_H = 104
const BAR = 13
const GAP = 3

/** Ingresos vs gastos de los últimos meses (SVG propio, sin librería de gráficos). */
export function TrendChart({ months }: { months: MonthlyTrendPoint[] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.totalIncome, Math.abs(m.totalExpense)]))
  const slot = W / Math.max(months.length, 1)
  // TalkBack lee el gráfico como un texto: "nov: ingresos $5,2 M, gastos $1,8 M; …"
  const a11y = `Ingresos y gastos de los últimos ${months.length} meses. ${months
    .map((m) => `${monthShort(m.month)}: ingresos ${formatCompactMoney(m.totalIncome)}, gastos ${formatCompactMoney(Math.abs(m.totalExpense))}`)
    .join('; ')}`

  return (
    <View style={styles.figure}>
      <View style={styles.legend} importantForAccessibility="no-hide-descendants">
        <Legend color={colors.brand} label="Ingresos" />
        <Legend color={colors.accent} label="Gastos" />
      </View>

      <View accessible accessibilityRole="image" accessibilityLabel={a11y}>
        <Svg viewBox={`0 0 ${W} ${H}`} style={styles.chart}>
          <Line x1={0} x2={W} y1={BASE} y2={BASE} stroke={colors.line} strokeWidth={1} />
          {months.map((m, i) => {
            const income = (m.totalIncome / max) * MAX_H
            const expense = (Math.abs(m.totalExpense) / max) * MAX_H
            const center = slot * i + slot / 2
            const isLast = i === months.length - 1
            return [
              income > 0 && (
                <Rect key={`${m.month}-i`} x={center - BAR - GAP / 2} y={BASE - income} width={BAR} height={income} rx={4} fill={colors.brand} />
              ),
              expense > 0 && (
                <Rect key={`${m.month}-e`} x={center + GAP / 2} y={BASE - expense} width={BAR} height={expense} rx={4} fill={colors.accent} />
              ),
              <SvgText
                key={`${m.month}-t`}
                x={center}
                y={BASE + 18}
                textAnchor="middle"
                fontSize={11}
                fontFamily={isLast ? fonts.sansBold : fonts.sans}
                fill={isLast ? colors.fg : colors.fgMuted}
              >
                {monthShort(m.month)}
              </SvgText>,
            ]
          })}
        </Svg>
      </View>
    </View>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[type.caption, { color: colors.fgMuted }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  figure: { gap: 12 },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 9999 },
  chart: { width: '100%', aspectRatio: W / H },
})
