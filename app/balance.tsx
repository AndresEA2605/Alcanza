import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatCOP } from '../src/domain/money';
import { calcSpendingMargin } from '../src/domain/spendingMargin';
import {
  calcSpendingMarginFromState,
  calcTodayFromState,
  useBudgetStore,
} from '../src/store/useBudgetStore';
import { useTheme } from '../src/theme';
import { BackButton } from '../src/ui/BackButton';
import { FadeInView } from '../src/ui/FadeInView';
import { GlassCard } from '../src/ui/GlassCard';
import { LoadingState } from '../src/ui/LoadingState';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { SpendingMarginBar } from '../src/ui/SpendingMarginBar';

export default function BalanceScreen() {
  const theme = useTheme();
  const config = useBudgetStore((state) => state.config);
  const expenses = useBudgetStore((state) => state.expenses);
  const incomes = useBudgetStore((state) => state.incomes);
  const marginMode = useBudgetStore((state) => state.marginMode);
  const setMarginMode = useBudgetStore((state) => state.setMarginMode);
  const budgetStatus = useBudgetStore((state) => state.status);
  const budgetError = useBudgetStore((state) => state.error);
  const initializeBudget = useBudgetStore((state) => state.initialize);

  const [now] = useState(Date.now);
  const [simulatedExtraAmount, setSimulatedExtraAmount] = useState(0);

  useEffect(() => {
    if (budgetStatus === 'idle') {
      void initializeBudget();
    }
  }, [budgetStatus, initializeBudget]);

  const today = calcTodayFromState({ config, expenses, incomes }, now);
  const spendingMargin = calcSpendingMarginFromState(
    { config, expenses, incomes, marginMode },
    now,
      );

  // Simulación interactiva: qué pasaría si gasto $X hoy
  const simulatedMargin = useMemo(() => {
    if (!config || simulatedExtraAmount <= 0) return null;

    const simulatedExpenses = [
      ...expenses,
      {
        id: 'simulated_expense',
        amount: simulatedExtraAmount,
        category: 'otros' as const,
        ts: now,
        deletedAt: null,
      },
    ];

    return calcSpendingMargin({
      income: config.income,
      fixed: config.fixed,
      expenses: simulatedExpenses,
      incomes,
      now,
    });
  }, [config, expenses, incomes, now, simulatedExtraAmount]);

  if (budgetStatus === 'idle' || budgetStatus === 'loading') {
    return <LoadingState key={budgetStatus} title="Cargando tu balance…" />;
  }

  if (budgetStatus === 'error') {
    return (
      <LoadingState
        key={budgetStatus}
        title="Cargando tu balance…"
        error={budgetError}
        onRetry={() => void initializeBudget()}
      />
    );
  }

  if (!config || !today || !spendingMargin) {
    return <Redirect href="/hoy" />;
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/hoy');
    }
  }

  const activeMargin = simulatedMargin ?? spendingMargin;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              padding: theme.spacing.xl,
              paddingBottom: theme.spacing.xxxl * 2,
              gap: theme.spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Navegación superior con botón Atrás */}
          <FadeInView delay={0}>
            <View style={styles.navBar}>
              <BackButton onPress={goBack} />
              <PrimaryButton
                label="Registrar gasto"
                variant="ghost"
                onPress={goBack}
                style={styles.navAction}
              />
            </View>
          </FadeInView>

          {/* Encabezado */}
          <FadeInView delay={40}>
            <View style={styles.header}>
              <Text
                style={[styles.overline, { color: theme.colors.accent }]}
                maxFontSizeMultiplier={1.3}
              >
                INTELIGENCIA FINANCIERA
              </Text>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: theme.colors.text }]}
              >
                Balance y Margen
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Proyección y control proporcional de tus gastos
              </Text>
            </View>
          </FadeInView>

          {/* Barra de margen de gasto completa */}
          <FadeInView delay={90}>
            <SpendingMarginBar
              margin={activeMargin}
              onToggleMode={setMarginMode}
            />
          </FadeInView>

          {/* Simulador de impacto interactivo */}
          <FadeInView delay={140}>
            <GlassCard contentStyle={styles.simulatorCard}>
              <View style={styles.simHeader}>
                <Text
                  style={[styles.simEyebrow, { color: theme.colors.accent }]}
                >
                  SIMULACIÓN
                </Text>
                <Text
                  style={[styles.simTitle, { color: theme.colors.text }]}
                  maxFontSizeMultiplier={1.3}
                >
                  ¿Y si gasto hoy?
                </Text>
                <Text style={[styles.simSubtitle, { color: theme.colors.textSecondary }]}>
                  Elige un monto adicional y mira cómo cambiaría tu margen y el disponible para mañana.
                </Text>
              </View>

              <Text style={[styles.simSectionLabel, { color: theme.colors.text }]}>
                ¿Cuánto gastarías?
              </Text>
              <View
                style={styles.chipsRow}
                accessibilityRole="radiogroup"
                accessibilityLabel="Monto adicional a simular"
              >
                {[10_000, 30_000, 50_000, 100_000].map((amount) => {
                  const isSelected = simulatedExtraAmount === amount;
                  return (
                    <Pressable
                      key={amount}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      onPress={() =>
                        setSimulatedExtraAmount(isSelected ? 0 : amount)
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.accent
                            : theme.colors.inputBackground,
                          borderColor: isSelected
                            ? theme.colors.accent
                            : theme.colors.separator,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected
                              ? theme.colors.onAccent
                              : theme.colors.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {formatCOP(amount)}
                      </Text>
                    </Pressable>
                );
                })}

                {simulatedExtraAmount > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Borrar simulación"
                    onPress={() => setSimulatedExtraAmount(0)}
                    style={[
                      styles.resetChip,
                      {
                        borderColor: theme.colors.separator,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.resetText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Borrar
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {simulatedMargin ? (
                  <View style={styles.simResult}>
                    <View
                      style={[
                        styles.simResultHero,
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
                        <Text
                          style={[
                            styles.resultLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          Disponible diario para mañana
                        </Text>
                        <Text
                          style={[
                            styles.resultStatus,
                            {
                              color:
                                simulatedMargin.status === 'bien'
                                  ? theme.colors.success
                                  : simulatedMargin.status === 'aviso'
                                    ? theme.colors.warning
                                    : theme.colors.danger,
                            },
                          ]}
                        >
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
                        {formatCOP(
                          Math.round(simulatedMargin.tomorrowEstimated),
                        )}
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
                              backgroundColor:
                                simulatedMargin.status === 'bien'
                                  ? theme.colors.success
                                  : simulatedMargin.status === 'aviso'
                                    ? theme.colors.warning
                                    : theme.colors.danger,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.impactMeta}>
                        <Text
                          style={[
                            styles.impactMetaText,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {simulatedMargin.percentage}% del margen de hoy
                        </Text>
                        <Text
                          style={[
                            styles.impactMetaText,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {today.daysLeft > 1
                            ? `${today.daysLeft - 1} días restantes`
                            : 'Último día del mes'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.comparisonRow,
                        { borderTopColor: theme.colors.separator },
                      ]}
                    >
                      <Text
                        style={[
                          styles.comparisonLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Proyección actual
                      </Text>
                      <Text
                        style={[
                          styles.comparisonValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {formatCOP(Math.round(today.tomorrow))}
                      </Text>
                    </View>
                      <View
                        style={[
                          styles.comparisonRow,
                          { borderTopColor: theme.colors.separator },
                        ]}
                      >
                      <Text
                        style={[
                          styles.comparisonLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Cambio por este gasto
                      </Text>
                      <Text
                        style={[
                          styles.comparisonValue,
                          {
                            color:
                              simulatedMargin.tomorrowEstimated <
                              today.tomorrow
                                ? theme.colors.danger
                                : theme.colors.success,
                          },
                        ]}
                      >
                        {simulatedMargin.tomorrowEstimated < today.tomorrow
                          ? '−'
                          : '+'}
                        {formatCOP(
                          Math.abs(
                            Math.round(
                              simulatedMargin.tomorrowEstimated -
                                today.tomorrow,
                            ),
                          ),
                        )}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.simEmptyState,
                      { backgroundColor: theme.colors.inputBackground },
                    ]}
                  >
                    <Text
                      style={[
                        styles.emptyTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      Elige un monto para empezar
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      La simulación no cambia tus gastos registrados.
                    </Text>
                  </View>
              )}
            </GlassCard>
          </FadeInView>

          {/* Desglose mensual detallado */}
          <FadeInView delay={190}>
            <GlassCard contentStyle={{ gap: theme.spacing.md }}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.text }]}
                maxFontSizeMultiplier={1.3}
              >
                Resumen del mes ({today.daysLeft} días restantes)
              </Text>

              <RowItem
                label="Ingreso base mensual"
                value={formatCOP(config.income)}
              />
              {today.incomeAdditionalMonth > 0 ? (
                <RowItem
                  label="Ingresos adicionales del mes"
                  value={`+${formatCOP(Math.round(today.incomeAdditionalMonth))}`}
                  valueColor={theme.colors.success}
                />
              ) : null}
              {today.incomeAdditionalMonth > 0 ? (
                <RowItem
                  label="Ingreso total del mes"
                  value={formatCOP(Math.round(today.totalIncome))}
                  strong
                />
              ) : null}
              <RowItem
                label="Gastos fijos comprometidos"
                value={formatCOP(config.fixed)}
              />
              <RowItem
                label="Presupuesto variable disponible"
                value={formatCOP(Math.max(0, today.totalIncome - config.fixed))}
                strong
              />

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.separator },
                ]}
              />

              <RowItem
                label="Gastos acumulados del mes"
                value={formatCOP(Math.round(today.spentMonth))}
              />
              <RowItem
                label="Disponible total para lo que queda"
                value={formatCOP(Math.max(0, Math.round(today.monthLeft)))}
                strong
                valueColor={
                  today.monthLeft < 0
                    ? theme.colors.danger
                    : theme.colors.success
                }
              />

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.separator },
                ]}
              />

              <RowItem
                label="Número diario para hoy"
                value={formatCOP(Math.max(0, Math.round(today.daily)))}
                strong
              />
              <RowItem
                label="Proyección diaria para mañana"
                value={formatCOP(Math.max(0, Math.round(today.tomorrow)))}
              />
            </GlassCard>
          </FadeInView>

          {/* Botón inferior para volver */}
          <FadeInView delay={230} style={styles.footer}>
            <PrimaryButton
              label="Volver a la pantalla principal"
              onPress={goBack}
            />
          </FadeInView>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function RowItem({
  label,
  value,
  strong = false,
  valueColor,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueColor?: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.rowItem}>
      <Text
        style={[
          styles.rowItemLabel,
          {
            color: strong ? theme.colors.text : theme.colors.textSecondary,
            fontWeight: strong ? '700' : '400',
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.rowItemValue,
          {
            color: valueColor ?? (strong ? theme.colors.text : theme.colors.textSecondary),
            fontWeight: strong ? '800' : '600',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    width: '100%',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  navAction: {
    minWidth: 100,
  },
  header: {
    gap: 4,
  },
  overline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  simHeader: {
    gap: 6,
  },
  simulatorCard: {
    gap: 16,
  },
  simEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  simTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  simSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  simSectionLabel: {
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
  simResult: {
    gap: 12,
  },
  simResultHero: {
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
  simEmptyState: {
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
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowItemLabel: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  rowItemValue: {
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: 2,
  },
  footer: {
    width: '100%',
    marginTop: 8,
  },
});
