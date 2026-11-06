import { useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowUpRight, Bell, Briefcase, Plus, Sprout, Utensils } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Avatar,
  BOTTOM_NAV_CLEARANCE,
  BottomNav,
  BudgetRing,
  Button,
  CATEGORY_ICONS,
  Chip,
  IconButton,
  InsightCard,
  LegendItem,
  ProgressBar,
  Rise,
  SectionHeader,
  SegmentedControl,
  SelectField,
  Sheet,
  TextField,
  TransactionRow,
  type NavTabKey,
} from '../components/ui'
import { colors, fonts, radius, shadows, space, type, type ColorToken, type TypeToken } from '../theme'

// Catálogo vivo de fundamentos y componentes (= /fundamentos en la web y la página "Componentes" de Figma).
// Sirve para revisar la librería en el teléfono con Expo Go antes de armar pantallas (1.3.1+).

const swatches: ColorToken[] = [
  'canvas',
  'surface',
  'subtle',
  'decor',
  'brand',
  'brandSubtle',
  'accent',
  'accentSubtle',
  'progress',
  'progressSubtle',
]

const typeSamples: Array<[TypeToken, string]> = [
  ['monto', '2.847.500'],
  ['h1', 'Hola, Santiago'],
  ['h2', 'Movimientos'],
  ['h3', 'Noviembre'],
  ['quote', '“Si cocinas 2 de cada 4, ahorras $186.000 al mes.”'],
  ['body', 'Texto de cuerpo para descripciones y formularios.'],
  ['bodySm', 'Domicilio · Hoy'],
  ['label', 'Crear meta de ahorro'],
  ['labelSm', '12,4% vs oct'],
  ['caption', 'Proyección fin de mes'],
]

type Kind = 'expense' | 'income'

function Block({ title, children, delay }: { title: string; children: ReactNode; delay: number }) {
  return (
    <Rise delay={delay} style={styles.block}>
      <Text accessibilityRole="header" style={[type.h2, { color: colors.fg }]}>
        {title}
      </Text>
      {children}
    </Rise>
  )
}

export function FundamentosScreen({ onBack }: { onBack?: () => void }) {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<NavTabKey>('inicio')
  const [kind, setKind] = useState<Kind>('expense')
  const [category, setCategory] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[6], paddingBottom: BOTTOM_NAV_CLEARANCE + insets.bottom + space[6] }]}
      >
        <Rise style={styles.header}>
          {onBack && <IconButton icon={ArrowLeft} label="Volver" onPress={onBack} style={styles.back} />}
          <Text style={[type.caption, { color: colors.fgMuted }]}>Finance APP · Fundamentos y componentes</Text>
          <Text style={[type.h1, { color: colors.fg }]}>Raíz × Aurora</Text>
          <Text style={styles.brand}>raíz</Text>
        </Rise>

        <Block title="Color" delay={60}>
          <View style={styles.swatchGrid}>
            {swatches.map((name) => (
              <View key={name} style={styles.swatchCell}>
                <View style={[styles.swatch, { backgroundColor: colors[name] }]} />
                <Text style={[type.labelSm, { color: colors.fg }]}>{name}</Text>
              </View>
            ))}
          </View>
        </Block>

        <Block title="Tipografía" delay={120}>
          <View style={styles.card}>
            {typeSamples.map(([key, sample]) => (
              <View key={key} style={styles.typeRow}>
                <Text style={[type.caption, { color: colors.fgMuted }]}>type.{key}</Text>
                <Text style={[type[key], { color: colors.fg }]}>{sample}</Text>
              </View>
            ))}
          </View>
        </Block>

        <Block title="Botón" delay={180}>
          <View style={styles.wrap}>
            <Button label="Primario" />
            <Button variant="accent" label="Acento" />
            <Button variant="secondary" label="Secundario" />
            <Button icon={Plus} label="Con ícono" />
            <Button size="sm" label="Pequeño" />
            <Button disabled label="Deshabilitado" />
            <Button loading label="Guardando" />
          </View>
          <View style={[styles.wrap, styles.brandPanel]}>
            <Button variant="accent" label="Acento sobre marca" />
            <Button variant="on-brand" label="Sobre marca" />
          </View>
        </Block>

        <Block title="Chip" delay={240}>
          <View style={styles.wrap}>
            <Chip tone="positive" icon={ArrowUpRight}>
              12,4% vs oct
            </Chip>
            <Chip tone="alert">Comida +23%</Chip>
            <Chip tone="progress">Meta 64%</Chip>
            <Chip value="$214k">Mercado</Chip>
          </View>
        </Block>

        <Block title="Botón de ícono y avatar" delay={300}>
          <View style={styles.wrap}>
            <IconButton icon={Bell} label="Notificaciones" />
            <IconButton icon={Sprout} label="Marca" variant="brand" />
            <IconButton icon={Plus} label="Nuevo movimiento" variant="accent" size="lg" />
            <Avatar name="Santiago García" />
          </View>
        </Block>

        <Block title="Datos" delay={360}>
          <View style={[styles.card, styles.ringCard]}>
            <BudgetRing percent={68} animationDelay={500} />
            <View style={styles.legend}>
              <LegendItem tone="accent" label="Comida" value="$640k" />
              <LegendItem tone="progress" label="Ocio" value="$380k" />
              <LegendItem tone="brand" label="Transporte" value="$210k" />
            </View>
          </View>
          <View style={[styles.card, styles.bars]}>
            <ProgressBar value={42} label="Presupuesto de Transporte" />
            <ProgressBar value={78} tone="progress" label="Meta de ahorro" />
            <ProgressBar value={112} tone="accent" label="Presupuesto de Comida (excedido)" />
            <ProgressBar value={55} tone="neutral" label="Reparto del gasto" />
          </View>
          <SectionHeader title="Movimientos" action={{ label: 'Ver todo', onPress: () => setTab('billetera') }} />
          <View style={[styles.card, styles.list]}>
            <TransactionRow title="Rappi" detail="Alimentación · Hoy" amount={-38900} icon={Utensils} onPress={() => setSheetOpen(true)} />
            <TransactionRow title="Nómina Acme S.A.S." detail="Ingresos · 30 oct" amount={5200000} icon={Briefcase} />
          </View>
        </Block>

        <Block title="Formularios" delay={420}>
          <SegmentedControl
            label="Tipo de movimiento"
            stretch
            value={kind}
            onChange={setKind}
            options={[
              { value: 'expense', label: 'Gasto' },
              { value: 'income', label: 'Ingreso' },
            ]}
          />
          <TextField label="Correo" placeholder="tu@correo.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <TextField label="Contraseña" password hint="Mínimo 8 caracteres." autoComplete="password" />
          <TextField
            label="Monto"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            error={amount === '0' ? 'El monto debe ser mayor que 0.' : undefined}
            placeholder="Escribe 0 para ver el error"
          />
          <SelectField
            label="Categoría"
            value={category}
            onChange={setCategory}
            options={CATEGORY_ICONS.map((c) => ({ value: c.key, label: c.label, icon: c.icon }))}
          />
          <Button variant="secondary" label="Abrir hoja inferior" onPress={() => setSheetOpen(true)} />
        </Block>

        <Block title="Insight IA" delay={480}>
          <InsightCard
            message="Los viernes gastas 23% más en domicilios. Si cocinas 2 de cada 4, ahorras $186.000 al mes."
            time="ahora"
            primaryAction={{ label: 'Crear meta de ahorro' }}
            secondaryAction={{ label: 'Después' }}
          />
        </Block>
      </ScrollView>

      <BottomNav active={tab} onTabPress={setTab} onAdd={() => setSheetOpen(true)} />

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Nuevo movimiento">
        <View style={styles.sheetBody}>
          <Text style={[type.body, { color: colors.fgMuted }]}>
            Hoja inferior de ejemplo. El botón atrás de Android y tocar el fondo la cierran. En 1.3.3 aquí va el alta rápida.
          </Text>
          <TextField label="Descripción" placeholder="Almuerzo" />
          <Button label="Guardar" block onPress={() => setSheetOpen(false)} />
        </View>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: space[5], gap: space[8] },
  header: { gap: space[1] },
  back: { marginBottom: space[3] },
  brand: { fontFamily: fonts.displayBoldItalic, fontSize: 36, lineHeight: 40, color: colors.fgBrand, marginTop: space[2] },
  block: { gap: space[3] },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  // 3 columnas: (100% − 2 gaps de 12) / 3 ≈ 31%
  swatchCell: { width: '31%', gap: space[2] },
  swatch: { height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, padding: space[5], boxShadow: shadows.card, gap: space[3] },
  typeRow: { gap: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[3] },
  brandPanel: { borderRadius: radius.lg, backgroundColor: colors.brand, padding: space[4] },
  ringCard: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  legend: { flex: 1, gap: space[3] },
  bars: { gap: space[4] },
  list: { paddingVertical: space[1], paddingHorizontal: space[4], gap: 0 },
  sheetBody: { gap: space[4] },
})
