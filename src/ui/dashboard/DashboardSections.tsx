import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { daysLeftSentence } from '../../domain/labels';
import { formatCOP } from '../../domain/money';
import type { MarginMode, SpendingMarginResult } from '../../domain/spendingMargin';
import type { CalcTodayResult, Expense, IncomeEntry } from '../../domain/budget';
import { useTheme } from '../../theme';
import { AnimatedNumber } from '../AnimatedNumber';
import { EmptyState } from '../EmptyState';
import { ExpenseItem } from '../ExpenseItem';
import { GlassCard } from '../GlassCard';
import { HapticPressable as Pressable } from '../HapticPressable';
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
    mode === 'mes'
      ? Math.round(today.monthLeft)
      : Math.round(margin.remaining);
  const isOverLimit = available < 0;
  const displayedAmount = Math.abs(available);
  const availableLabel = isOverLimit
    ? 'Exceso'
    : mode === 'hoy'
      ? 'Disponible hoy'
      : mode === 'semana'
        ? 'Disponible esta semana'
        : 'Disponible del mes';
  const hint =
    mode === 'hoy'
      ? `${daysLeftSentence(today.daysLeft)} · Tope ${formatCOP(Math.round(margin.limit))}`
      : mode === 'semana'
        ? `${margin.daysLeft} días · Tope ${formatCOP(Math.round(margin.limit))}`
        : `${margin.percentage}% usado`;

  return (
    <GlassCard
      intensity={48}
      style={[
        styles.budgetCardShell,
        {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.accent,
        },
      ]}
      contentStyle={styles.budgetCard}
    >
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
              style={({ pressed }) => [
                styles.periodButton,
                selected && {
                  backgroundColor: theme.colors.accent,
                },
                pressed &&
                  !theme.reduceMotion && {
                    transform: [{ scale: 0.97 }],
                    opacity: 0.85,
                  },
              ]}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  {
                    color: selected
                      ? theme.colors.onAccent
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
      <Text style={[styles.availableLabel, { color: theme.colors.accent }]}>
        {availableLabel}
      </Text>
      <AnimatedNumber
        value={displayedAmount}
        format={(value) => formatCOP(Math.round(value))}
        accessibilityLabel={`${availableLabel} ${formatCOP(displayedAmount)}`}
        style={[
          styles.number,
          { color: isOverLimit ? theme.colors.danger : theme.colors.text },
        ]}
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
  return (
    <DashboardShortcutCard
      accessibilityLabel="Registrar un movimiento"
      label="Registrar"
      onPress={onPress}
    />
  );
}

export function BusinessShortcutCard() {
  return (
    <DashboardShortcutCard
      accessibilityLabel="Abrir Mi negocio"
      accessibilityHint="Ver productos, ventas y metas de tu negocio"
      label="Mi negocio"
      onPress={() => router.push('/negocio' as never)}
    />
  );
}

export function BalanceShortcutCard() {
  return (
    <DashboardShortcutCard
      accessibilityLabel="Ver balance y margen"
      accessibilityHint="Consultar tu presupuesto y gastos"
      label="Balance y margen"
      onPress={() => router.push('/balance')}
    />
  );
}

function DashboardShortcutCard({
  accessibilityLabel,
  accessibilityHint,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  accessibilityHint?: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcutCard,
        {
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.accent,
          transform: [
            { scale: pressed && !theme.reduceMotion ? 0.99 : 1 },
          ],
        },
      ]}
    >
      <Text style={[styles.shortcutTitle, { color: theme.colors.text }]}>
        {label}
      </Text>
      <View
        style={[
          styles.shortcutArrowWrap,
          { backgroundColor: theme.colors.accent },
        ]}
      >
        <Text
          style={[styles.shortcutArrow, { color: theme.colors.onAccent }]}
          accessibilityElementsHidden
        >
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

const styles = StyleSheet.create({
  budgetCardShell: {
    borderRadius: 20,
  },
  budgetCard: {
    alignItems: 'stretch',
    padding: 18,
    gap: 14,
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
  shortcutCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  shortcutTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  shortcutArrowWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutArrow: {
    fontSize: 24,
    lineHeight: 28,
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
});
