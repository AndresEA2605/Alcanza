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
import { LoadingState } from '../src/ui/LoadingState';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { SpendingMarginBar } from '../src/ui/SpendingMarginBar';
import { ImpactSimulator } from '../src/ui/balance/ImpactSimulator';

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
              margin={spendingMargin}
              onToggleMode={setMarginMode}
            />
          </FadeInView>

          {/* Simulador de impacto interactivo */}
          <FadeInView delay={140}>
            <ImpactSimulator
              income={config.income}
              fixed={config.fixed}
              expenses={expenses}
              incomes={incomes}
              today={today}
              now={now}
            />
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
