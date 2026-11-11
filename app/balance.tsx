import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatCOP } from '../src/domain/money';
import {
  calcSpendingMarginFromState,
  calcTodayFromState,
  useBudgetStore,
} from '../src/store/useBudgetStore';
import { useTheme } from '../src/theme';
import { BackButton } from '../src/ui/BackButton';
import { FadeInView } from '../src/ui/FadeInView';
import { GlassCard } from '../src/ui/GlassCard';
import { HapticPressable as Pressable } from '../src/ui/HapticPressable';
import { LoadingState } from '../src/ui/LoadingState';
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
  const [monthlyDetailsOpen, setMonthlyDetailsOpen] = useState(false);

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

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              padding: theme.spacing.xl,
              paddingBottom: theme.spacing.xxxl * 2,
              gap: theme.spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Navegación superior con botón Atrás */}
          <FadeInView delay={0}>
            <View style={styles.navBar}>
              <BackButton onPress={goBack} />
            </View>
          </FadeInView>

          {/* Encabezado */}
          <FadeInView delay={40}>
            <View style={styles.header}>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: theme.colors.text }]}
              >
                Balance
              </Text>
            </View>
          </FadeInView>

          {/* Barra de margen de gasto completa */}
          <FadeInView delay={90}>
            <SpendingMarginBar
              margin={spendingMargin}
              onToggleMode={setMarginMode}
            />
          </FadeInView>

          {/* Resumen mensual desplegable */}
          <FadeInView delay={140}>
            <GlassCard contentStyle={{ gap: theme.spacing.lg }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: monthlyDetailsOpen }}
                accessibilityLabel={`Detalle del mes. ${
                  today.monthLeft < 0 ? 'Déficit' : 'Disponible'
                } ${formatCOP(Math.abs(Math.round(today.monthLeft)))}`}
                onPress={() => setMonthlyDetailsOpen((open) => !open)}
                style={[
                  styles.monthSummary,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.separator,
                  },
                ]}
              >
                <View style={styles.monthSummaryText}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Mes
                  </Text>
                  <Text style={[styles.rowItemLabel, { color: theme.colors.textSecondary }]}>
                    {today.monthLeft < 0 ? 'Déficit' : 'Disponible'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.monthSummaryAmount,
                    {
                      color:
                        today.monthLeft < 0
                          ? theme.colors.danger
                          : theme.colors.success,
                    },
                  ]}
                >
                  {formatCOP(Math.abs(Math.round(today.monthLeft)))}
                </Text>
                <Text style={[styles.monthSummaryArrow, { color: theme.colors.accent }]}>
                  {monthlyDetailsOpen ? '−' : '+'}
                </Text>
              </Pressable>

              {monthlyDetailsOpen ? (
                <>
                  <RowItem
                    label="Ingreso base"
                    value={formatCOP(config.income)}
                  />
                  {today.incomeAdditionalMonth > 0 ? (
                    <RowItem
                      label="Ingresos extra"
                      value={`+${formatCOP(Math.round(today.incomeAdditionalMonth))}`}
                      valueColor={theme.colors.success}
                    />
                  ) : null}
                  {today.incomeAdditionalMonth > 0 ? (
                    <RowItem
                      label="Ingreso total"
                      value={formatCOP(Math.round(today.totalIncome))}
                      strong
                    />
                  ) : null}
                  <RowItem
                    label="Reservado para gastos fijos"
                    value={formatCOP(config.fixed)}
                  />
                  <RowItem
                    label="Disponible tras gastos fijos"
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
                    label="Gastos registrados este mes"
                    value={formatCOP(Math.round(today.spentMonth))}
                  />
                  <RowItem
                    label={today.monthLeft < 0 ? 'Déficit' : 'Disponible'}
                    value={formatCOP(Math.abs(Math.round(today.monthLeft)))}
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
                    label="Hoy"
                    value={formatCOP(Math.max(0, Math.round(today.daily)))}
                    strong
                  />
                  <RowItem
                    label="Mañana"
                    value={formatCOP(Math.max(0, Math.round(today.tomorrow)))}
                  />
                </>
              ) : null}
            </GlassCard>
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
  header: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
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
  monthSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 18,
  },
  monthSummaryText: {
    flex: 1,
    gap: 2,
  },
  monthSummaryAmount: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  monthSummaryArrow: {
    width: 24,
    textAlign: 'right',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
  },
});
