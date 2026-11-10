import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { daysLabel, daysLeftSentence } from '../../domain/labels';
import { formatCOP } from '../../domain/money';
import type { MarginMode, SpendingMarginResult } from '../../domain/spendingMargin';
import type { CalcTodayResult, Expense, IncomeEntry } from '../../domain/budget';
import { useTheme } from '../../theme';
import { AnimatedNumber } from '../AnimatedNumber';
import { EmptyState } from '../EmptyState';
import { ExpenseItem } from '../ExpenseItem';
import { GlassCard } from '../GlassCard';
import { IncomeItem } from '../IncomeItem';
import { SpendingMarginBar } from '../SpendingMarginBar';

const PERIOD_OPTIONS: readonly { mode: MarginMode; label: string }[] = [
  { mode: 'hoy', label: 'Hoy' },
  { mode: 'semana', label: 'Semana' },
  { mode: 'mes', label: 'Mes' },
];

export function DashboardBudgetCard({
  today,
  margin,
  mode,
  onModeChange,
}: {
  today: CalcTodayResult;
  margin: SpendingMarginResult;
  mode: MarginMode;
  onModeChange: (mode: MarginMode) => void;
}) {
  const theme = useTheme();
  const available =
    mode === 'hoy'
      ? Math.max(0, Math.round(margin.limit))
      : Math.max(0, Math.round(margin.remaining));
  const title = {
    hoy: 'Puedes gastar hoy',
    semana: 'Disponible esta semana',
    mes: 'Disponible este mes',
  }[mode];
  const availableLabel = {
    hoy: 'Disponible para hoy',
    semana: 'Disponible el resto de la semana',
    mes: 'Disponible el resto del mes',
  }[mode];
  const hint =
    mode === 'hoy'
      ? `${daysLeftSentence(today.daysLeft)} en el mes`
      : mode === 'semana'
        ? `${margin.daysLeft} días restantes · límite ${formatCOP(Math.round(margin.limit))}`
        : `De ${formatCOP(Math.round(margin.limit))} de presupuesto variable`;

  return (
    <GlassCard contentStyle={styles.budgetCard}>
      <Text style={[styles.budgetTitle, { color: theme.colors.textMuted }]}>
        {title}
      </Text>
      <View
        style={[
          styles.periodToggle,
          { backgroundColor: theme.colors.inputBackground },
        ]}
        accessibilityRole="tablist"
        accessibilityLabel="Periodo del presupuesto"
      >
        {PERIOD_OPTIONS.map(({ mode: option, label }) => {
          const selected = mode === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`Ver presupuesto para ${label.toLowerCase()}`}
              onPress={() => onModeChange(option)}
              style={[
                styles.periodButton,
                selected && { backgroundColor: theme.colors.surfaceStrong },
              ]}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  {
                    color: selected
                      ? theme.colors.text
                      : theme.colors.textMuted,
                    fontWeight: selected ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.availableLabel, { color: theme.colors.textSecondary }]}>
        {availableLabel}
      </Text>
      <AnimatedNumber
        value={available}
        format={(value) => formatCOP(Math.round(value))}
        accessibilityLabel={`${title} ${formatCOP(available)}`}
        style={[styles.number, { color: theme.colors.text }]}
      />
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        {hint}
      </Text>
      <SpendingMarginBar
        compact
        margin={margin}
        onPressDetail={() => router.push('/balance')}
      />
    </GlassCard>
  );
}

export function RegisterMovementCard({
  onPress,
}: {
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar un movimiento"
        onPress={onPress}
        style={[
          styles.quickAction,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.separator,
          },
        ]}
      >
        <View style={styles.actionTextGroup}>
          <Text style={[styles.quickActionTitle, { color: theme.colors.text }]}>
            Registrar movimiento
          </Text>
          <Text style={[styles.quickActionSubtitle, { color: theme.colors.textMuted }]}>
            Elige gasto o ingreso
          </Text>
        </View>
        <Text style={[styles.quickActionArrow, { color: theme.colors.textMuted }]}>
          →
        </Text>
      </Pressable>
  );
}

export function BusinessShortcutCard() {
  const theme = useTheme();

  return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir Mi negocio"
        accessibilityHint="Ver productos, ventas y metas de tu negocio"
        onPress={() => router.push('/negocio' as never)}
        style={({ pressed }) => [
          styles.businessCard,
          {
            backgroundColor: theme.colors.accentSoft,
            borderColor: theme.colors.accent,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        <View style={styles.businessCardContent}>
          <Text style={[styles.businessTitle, { color: theme.colors.text }]}>
            Mi negocio
          </Text>
        </View>
        <View
          style={[
            styles.businessArrowWrap,
            { backgroundColor: theme.colors.accent },
          ]}
        >
          <Text style={[styles.businessArrow, { color: theme.colors.onAccent }]}>
            →
          </Text>
        </View>
      </Pressable>
  );
}

export function BalanceShortcutCard() {
  const theme = useTheme();

  return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver balance y margen"
        accessibilityHint="Consultar tu proyección mensual y simular gastos"
        onPress={() => router.push('/balance')}
        style={({ pressed }) => [
          styles.balanceCard,
          {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        <View style={styles.balanceCardContent}>
          <Text
            style={[
              styles.balanceCardTitle,
              { color: theme.colors.onAccent },
            ]}
          >
            Balance y margen
          </Text>
          <Text
            style={[
              styles.balanceCardSubtitle,
              { color: theme.colors.onAccent },
            ]}
          >
            Proyección mensual y simulador
          </Text>
        </View>
        <View
          style={[
            styles.balanceArrowWrap,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.balanceArrow, { color: theme.colors.accent }]}>
            →
          </Text>
        </View>
      </Pressable>
  );
}

export function TodayMovementSection({
  incomes,
  expenses,
  onDeleteIncome,
  onDeleteExpense,
}: {
  incomes: readonly IncomeEntry[];
  expenses: readonly Expense[];
  onDeleteIncome: (id: string) => void;
  onDeleteExpense: (id: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.movementSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Movimientos de hoy
      </Text>
      <View style={styles.movementList}>
        {incomes.length === 0 && expenses.length === 0 ? (
          <EmptyState
            title="Sin movimientos hoy"
            subtitle="Tus gastos e ingresos aparecerán aquí."
          />
        ) : (
          <>
            {incomes.map((income) => (
              <IncomeItem
                key={income.id}
                income={income}
                onDelete={() => onDeleteIncome(income.id)}
              />
            ))}
            {expenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                onDelete={() => onDeleteExpense(expense.id)}
              />
            ))}
          </>
        )}
      </View>
    </View>
  );
}

export function MonthlySummaryCard({ today }: { today: CalcTodayResult }) {
  const theme = useTheme();
  const rows = [
    { label: 'Queda del mes', value: formatCOP(Math.round(today.monthLeft)), strong: true },
    ...(today.incomeAdditionalMonth > 0
      ? [{
          label: 'Ingresos extras este mes',
          value: `+${formatCOP(Math.round(today.incomeAdditionalMonth))}`,
          valueColor: theme.colors.success,
        }]
      : []),
    { label: 'Gastado hoy', value: formatCOP(Math.round(today.spentToday)) },
    { label: 'Gastado en el mes', value: formatCOP(Math.round(today.spentMonth)) },
    { label: 'Días restantes', value: daysLabel(today.daysLeft) },
  ];

  return (
    <GlassCard contentStyle={styles.summaryCard}>
      {rows.map((row, index) => (
        <View key={row.label} style={styles.summaryGroup}>
          {index > 0 ? (
            <View
              style={[styles.divider, { backgroundColor: theme.colors.separator }]}
            />
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              {row.label}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    row.valueColor ??
                    (row.strong ? theme.colors.text : theme.colors.textSecondary),
                  fontWeight: row.strong ? '700' : '600',
                },
              ]}
            >
              {row.value}
            </Text>
          </View>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  budgetCard: {
    alignItems: 'stretch',
    paddingVertical: 24,
    gap: 14,
  },
  budgetTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  periodToggle: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginTop: -6,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  periodButtonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  availableLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  number: {
    fontSize: 46,
    lineHeight: 56,
    fontWeight: '800',
    letterSpacing: -1.1,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    minHeight: 72,
  },
  actionTextGroup: {
    flex: 1,
    gap: 2,
  },
  quickActionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  quickActionSubtitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  quickActionArrow: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
  },
  businessCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  businessCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  businessTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  businessArrowWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessArrow: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '600',
  },
  balanceCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  balanceCardContent: {
    flex: 1,
    gap: 4,
  },
  balanceCardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  balanceCardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.88,
  },
  balanceArrowWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceArrow: {
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '600',
  },
  movementSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  movementList: {
    gap: 10,
  },
  summaryCard: {
    gap: 14,
  },
  summaryGroup: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
