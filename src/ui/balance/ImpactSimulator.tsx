import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  CalcTodayResult,
  Expense,
  IncomeEntry,
} from '../../domain/budget';
import { calcSpendingMargin } from '../../domain/spendingMargin';
import { formatCOP } from '../../domain/money';
import { useTheme } from '../../theme';
import { GlassCard } from '../GlassCard';

const SIMULATION_AMOUNTS = [10_000, 30_000, 50_000, 100_000] as const;

export function ImpactSimulator({
  income,
  fixed,
  expenses,
  incomes,
  today,
  now,
}: {
  income: number;
  fixed: number;
  expenses: readonly Expense[];
  incomes: readonly IncomeEntry[];
  today: CalcTodayResult;
  now: number;
}) {
  const theme = useTheme();
  const [extraAmount, setExtraAmount] = useState(0);

  const simulatedMargin = useMemo(() => {
    if (extraAmount <= 0) return null;

    return calcSpendingMargin({
      income,
      fixed,
      expenses: [
        ...expenses,
        {
          id: 'simulated_expense',
          amount: extraAmount,
          category: 'otros',
          ts: now,
          deletedAt: null,
        },
      ],
      incomes,
      now,
    });
  }, [expenses, extraAmount, fixed, income, incomes, now]);

  const statusColor = simulatedMargin
    ? {
        bien: theme.colors.success,
        aviso: theme.colors.warning,
        limite: theme.colors.danger,
      }[simulatedMargin.status]
    : theme.colors.text;

  return (
    <GlassCard contentStyle={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>
          SIMULACIÓN
        </Text>
        <Text
          style={[styles.title, { color: theme.colors.text }]}
          maxFontSizeMultiplier={1.3}
        >
          ¿Y si gasto hoy?
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Elige un monto adicional y mira cómo cambiaría tu margen y el
          disponible para mañana.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
        ¿Cuánto gastarías?
      </Text>
      <View
        style={styles.chipsRow}
        accessibilityRole="radiogroup"
        accessibilityLabel="Monto adicional a simular"
      >
        {SIMULATION_AMOUNTS.map((amount) => {
          const selected = extraAmount === amount;
          return (
            <Pressable
              key={amount}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setExtraAmount(selected ? 0 : amount)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.colors.accent
                    : theme.colors.inputBackground,
                  borderColor: selected
                    ? theme.colors.accent
                    : theme.colors.separator,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selected
                      ? theme.colors.onAccent
                      : theme.colors.text,
                    fontWeight: selected ? '700' : '600',
                  },
                ]}
              >
                {formatCOP(amount)}
              </Text>
            </Pressable>
          );
        })}
        {extraAmount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Borrar simulación"
            onPress={() => setExtraAmount(0)}
            style={[
              styles.resetChip,
              { borderColor: theme.colors.separator },
            ]}
          >
            <Text style={[styles.resetText, { color: theme.colors.textSecondary }]}>
              Borrar
            </Text>
          </Pressable>
        ) : null}
      </View>

      {simulatedMargin ? (
        <View style={styles.result}>
          <View
            style={[
              styles.resultHero,
              {
                backgroundColor:
                  simulatedMargin.status === 'bien'
                    ? theme.colors.successSoft
                    : simulatedMargin.status === 'aviso'
                      ? theme.colors.warningSoft
                      : theme.colors.dangerSoft,
              },
            ]}
          >
            <View style={styles.resultHeading}>
              <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>
                Disponible diario para mañana
              </Text>
              <Text style={[styles.resultStatus, { color: statusColor }]}>
                {simulatedMargin.status === 'bien'
                  ? 'Dentro del margen'
                  : simulatedMargin.status === 'aviso'
                    ? 'Margen ajustado'
                    : 'Sobre el límite'}
              </Text>
            </View>
            <Text
              style={[
                styles.projectedAmount,
                {
                  color:
                    simulatedMargin.status === 'limite'
                      ? theme.colors.danger
                      : theme.colors.text,
                },
              ]}
            >
              {formatCOP(Math.round(simulatedMargin.tomorrowEstimated))}
            </Text>
            <View
              style={[
                styles.impactTrack,
                { backgroundColor: theme.colors.separator },
              ]}
            >
              <View
                style={[
                  styles.impactFill,
                  {
                    width: `${simulatedMargin.percentage}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>
            <View style={styles.impactMeta}>
              <Text style={[styles.impactMetaText, { color: theme.colors.textSecondary }]}>
                {simulatedMargin.percentage}% del margen de hoy
              </Text>
              <Text style={[styles.impactMetaText, { color: theme.colors.textSecondary }]}>
                {today.daysLeft > 1
                  ? `${today.daysLeft - 1} días restantes`
                  : 'Último día del mes'}
              </Text>
            </View>
          </View>

          <ComparisonRow label="Proyección actual" value={formatCOP(Math.round(today.tomorrow))} />
          <ComparisonRow
            label="Cambio por este gasto"
            value={`${simulatedMargin.tomorrowEstimated < today.tomorrow ? '−' : '+'}${formatCOP(
              Math.abs(
                Math.round(simulatedMargin.tomorrowEstimated - today.tomorrow),
              ),
            )}`}
            valueColor={
              simulatedMargin.tomorrowEstimated < today.tomorrow
                ? theme.colors.danger
                : theme.colors.success
            }
          />
        </View>
      ) : (
        <View
          style={[
            styles.emptyState,
            { backgroundColor: theme.colors.inputBackground },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Elige un monto para empezar
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            La simulación no cambia tus gastos registrados.
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

function ComparisonRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.comparisonRow, { borderTopColor: theme.colors.separator }]}>
      <Text style={[styles.comparisonLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.comparisonValue,
          { color: valueColor ?? theme.colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  chip: {
    minHeight: 44,
    minWidth: 76,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resetChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  result: {
    gap: 12,
  },
  resultHero: {
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  resultHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  resultStatus: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  projectedAmount: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  impactTrack: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  impactFill: {
    height: '100%',
    borderRadius: 4,
  },
  impactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  impactMetaText: {
    fontSize: 11,
    lineHeight: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  comparisonValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
});
