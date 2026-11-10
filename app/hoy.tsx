import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { daysLabel, daysLeftSentence, longDateLabel } from '../src/domain/labels';
import { formatCOP } from '../src/domain/money';
import {
  calcSpendingMarginFromState,
  calcTodayFromState,
  useBudgetStore,
} from '../src/store/useBudgetStore';
import { useTheme } from '../src/theme';
import { AnimatedNumber } from '../src/ui/AnimatedNumber';
import { EmptyState } from '../src/ui/EmptyState';
import { ExpenseItem } from '../src/ui/ExpenseItem';
import { ExpenseSheet, type SheetMode } from '../src/ui/ExpenseSheet';
import { FadeInView } from '../src/ui/FadeInView';
import { FloatingActionButton } from '../src/ui/FloatingActionButton';
import { GlassCard } from '../src/ui/GlassCard';
import { IncomeItem } from '../src/ui/IncomeItem';
import { LoadingState } from '../src/ui/LoadingState';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { SpendingMarginBar } from '../src/ui/SpendingMarginBar';
import { SuccessBanner } from '../src/ui/SuccessBanner';
import { StatusPill } from '../src/ui/StatusPill';

/**
 * Pantalla Hoy: número diario, resumen del mes, lista de movimientos de hoy
 * (gastos e ingresos adicionales) y accesos rápidos y claros para registrar dinero.
 */
export default function TodayScreen() {
  const theme = useTheme();
  const config = useBudgetStore((state) => state.config);
  const expenses = useBudgetStore((state) => state.expenses);
  const incomes = useBudgetStore((state) => state.incomes);
  const lastDeleted = useBudgetStore((state) => state.lastDeleted);
  const lastDeletedIncome = useBudgetStore((state) => state.lastDeletedIncome);
  const addExpense = useBudgetStore((state) => state.addExpense);
  const addIncome = useBudgetStore((state) => state.addIncome);
  const deleteExpense = useBudgetStore((state) => state.deleteExpense);
  const deleteIncome = useBudgetStore((state) => state.deleteIncome);
  const undoDelete = useBudgetStore((state) => state.undoDelete);
  const undoDeleteIncome = useBudgetStore((state) => state.undoDeleteIncome);
  const marginMode = useBudgetStore((state) => state.marginMode);
  const budgetStatus = useBudgetStore((state) => state.status);
  const budgetError = useBudgetStore((state) => state.error);
  const initializeBudget = useBudgetStore((state) => state.initialize);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('comida');
  const [saving, setSaving] = useState(false);
  const [undoExpenseVisible, setUndoExpenseVisible] = useState(false);
  const [undoIncomeVisible, setUndoIncomeVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
    return <LoadingState key={budgetStatus} title="Cargando tu presupuesto…" />;
  }

  if (budgetStatus === 'error') {
    return (
      <LoadingState
        key={budgetStatus}
        title="Cargando tu presupuesto…"
        error={budgetError}
        onRetry={() => void initializeBudget()}
      />
    );
  }

  if (!config || !today) {
    return <Redirect href="/onboarding/welcome" />;
  }

  const daily = Math.max(0, Math.round(today.daily));
  const remainingToday = Math.round(today.remaining);

  const todayExpenses = expenses.filter(
    (expense) =>
      expense.deletedAt == null &&
      new Date(expense.ts).toDateString() === new Date(now).toDateString(),
  );

  const todayIncomes = incomes.filter(
    (income) =>
      income.deletedAt == null &&
      new Date(income.ts).toDateString() === new Date(now).toDateString(),
  );

  async function handleAddExpense(parsedAmount: number, chosenCategory: string) {
    if (saving) return;
    setSaving(true);
    try {
      await addExpense({
        amount: parsedAmount,
        category: chosenCategory as 'comida' | 'transporte' | 'ocio' | 'otros',
      });
      setAmount('');
      setSheetVisible(false);
      setBannerMessage('Gasto registrado con éxito');
      setTimeout(() => setBannerMessage(null), 3500);
    } catch {
      // El store gestiona el error
    } finally {
      setSaving(false);
    }
  }

  async function handleAddIncome(parsedAmount: number, description?: string) {
    if (saving) return;
    setSaving(true);
    try {
      await addIncome({
        amount: parsedAmount,
        description,
      });
      setAmount('');
      setSheetVisible(false);
      setBannerMessage('Ingreso adicional sumado a tu presupuesto');
      setTimeout(() => setBannerMessage(null), 3500);
    } catch {
      // El store gestiona el error
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteExpense(expenseId: string) {
    void deleteExpense(expenseId);
    setUndoExpenseVisible(true);
    setTimeout(() => setUndoExpenseVisible(false), 5000);
  }

  function handleUndoExpense() {
    void undoDelete();
    setUndoExpenseVisible(false);
  }

  function handleDeleteIncome(incomeId: string) {
    void deleteIncome(incomeId);
    setUndoIncomeVisible(true);
    setTimeout(() => setUndoIncomeVisible(false), 5000);
  }

  function handleUndoIncome() {
    void undoDeleteIncome();
    setUndoIncomeVisible(false);
  }

  function openSheet(mode: SheetMode | null = null) {
    setSheetMode(mode);
    setAmount('');
    setSheetVisible(true);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const state = useBudgetStore.getState();
      if (state.status === 'ready') {
        await state.refresh();
      }
    } finally {
      setRefreshing(false);
    }
  }

  const hasActivityToday = todayExpenses.length > 0 || todayIncomes.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View
          style={[
            styles.blob,
            { backgroundColor: theme.colors.backgroundAccent },
          ]}
        />
      </View>

      <SafeAreaView style={styles.safe}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={[
            styles.content,
            {
              padding: theme.spacing.xl,
              paddingBottom: theme.spacing.xxxl * 2,
              gap: theme.spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {bannerMessage ? (
            <FadeInView delay={0}>
              <SuccessBanner
                visible={Boolean(bannerMessage)}
                message={bannerMessage}
                onDismiss={() => setBannerMessage(null)}
              />
            </FadeInView>
          ) : null}

          {/* Encabezado de fecha */}
          <FadeInView delay={0}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text
                  style={[styles.overline, { color: theme.colors.accent }]}
                  maxFontSizeMultiplier={1.3}
                >
                  Hoy
                </Text>
                <Text
                  accessibilityRole="header"
                  style={[styles.date, { color: theme.colors.text }]}
                >
                  {longDateLabel(now)}
                </Text>
              </View>
              <StatusPill status={today.status} />
            </View>
          </FadeInView>

          {/* Tarjeta Hero Principal: Puedes gastar hoy */}
          <FadeInView delay={90}>
            <GlassCard contentStyle={styles.hero}>
              <Text style={[styles.heroLabel, { color: theme.colors.textMuted }]}>
                Puedes gastar hoy
              </Text>
              <AnimatedNumber
                value={daily}
                format={(value) => formatCOP(Math.round(value))}
                accessibilityLabel={`Puedes gastar hoy ${formatCOP(daily)}`}
                style={[styles.number, { color: theme.colors.text }]}
              />
              <Text
                style={[styles.heroHint, { color: theme.colors.textSecondary }]}
              >
                {daysLeftSentence(today.daysLeft)} en el mes
              </Text>

              {spendingMargin ? (
                <View style={{ marginTop: theme.spacing.sm, width: '100%' }}>
                  <SpendingMarginBar
                    compact
                    margin={spendingMargin}
                    onPressDetail={() => router.push('/balance')}
                  />
                </View>
              ) : null}
            </GlassCard>
          </FadeInView>

          {/* Acceso único para registrar un movimiento */}
          <FadeInView delay={130}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Registrar un movimiento"
              onPress={() => openSheet()}
              style={[
                styles.quickActionButton,
                {
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.separator,
                },
              ]}
            >
              <View style={styles.quickActionTextGroup}>
                <Text
                  style={[styles.quickActionTitle, { color: theme.colors.text }]}
                >
                  Registrar movimiento
                </Text>
                <Text
                  style={[
                    styles.quickActionSubtitle,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Elige gasto o ingreso
                </Text>
              </View>
              <Text style={[styles.quickActionArrow, { color: theme.colors.textMuted }]}>
                →
              </Text>
            </Pressable>
          </FadeInView>

          <FadeInView delay={150}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir Mi negocio"
              accessibilityHint="Ver productos, ventas y metas de tu negocio"
              onPress={() => router.push('/negocio' as any)}
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
                <Text
                  style={[styles.businessTitle, { color: theme.colors.text }]}
                >
                  Mi negocio
                </Text>
              </View>
              <View
                style={[
                  styles.businessArrowWrap,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.businessArrow,
                    { color: theme.colors.onAccent },
                  ]}
                >
                  →
                </Text>
              </View>
            </Pressable>
          </FadeInView>

          {/* Tarjeta de Disponible hoy después de gastos si ya se gastó algo */}
          {today.spentToday > 0 ? (
            <FadeInView delay={160}>
              <GlassCard contentStyle={{ gap: theme.spacing.xs }}>
                <Text
                  style={[styles.smallLabel, { color: theme.colors.textMuted }]}
                >
                  Disponible hoy después de tus gastos
                </Text>
                <Text
                  style={[
                    styles.remaining,
                    {
                      color:
                        remainingToday < 0
                          ? theme.colors.danger
                          : theme.colors.text,
                    },
                  ]}
                >
                  {formatCOP(remainingToday)}
                </Text>
              </GlassCard>
            </FadeInView>
          ) : null}

          {/* Sección de Movimientos de Hoy */}
          <FadeInView delay={220}>
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.text }]}
              >
                Movimientos de hoy
              </Text>
            </View>

            <View style={styles.movementList}>
              {!hasActivityToday ? (
                <EmptyState
                  title="Sin movimientos hoy"
                  subtitle="Tus gastos e ingresos aparecerán aquí."
                />
              ) : (
                <>
                  {todayIncomes.map((income) => (
                    <IncomeItem
                      key={income.id}
                      income={income}
                      onDelete={() => handleDeleteIncome(income.id)}
                    />
                  ))}
                  {todayExpenses.map((expense) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      onDelete={() => handleDeleteExpense(expense.id)}
                    />
                  ))}
                </>
              )}
            </View>
          </FadeInView>

          {/* Resumen del mes */}
          <FadeInView delay={280}>
            <GlassCard contentStyle={{ gap: theme.spacing.md }}>
              <SummaryRow
                label="Queda del mes"
                value={formatCOP(Math.round(today.monthLeft))}
                strong
              />
              {today.incomeAdditionalMonth > 0 ? (
                <>
                  <Divider />
                  <SummaryRow
                    label="Ingresos extras este mes"
                    value={`+${formatCOP(Math.round(today.incomeAdditionalMonth))}`}
                    valueColor={theme.colors.success}
                  />
                </>
              ) : null}
              <Divider />
              <SummaryRow
                label="Gastado hoy"
                value={formatCOP(Math.round(today.spentToday))}
              />
              <Divider />
              <SummaryRow
                label="Gastado en el mes"
                value={formatCOP(Math.round(today.spentMonth))}
              />
              <Divider />
              <SummaryRow
                label="Días restantes"
                value={daysLabel(today.daysLeft)}
              />
            </GlassCard>
          </FadeInView>

          <FadeInView delay={320}>
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
                <Text
                  style={[
                    styles.balanceArrow,
                    { color: theme.colors.accent },
                  ]}
                >
                  →
                </Text>
              </View>
            </Pressable>
          </FadeInView>

          {/* Accesos secundarios */}
          <FadeInView delay={340} style={styles.footer}>
            <PrimaryButton
              label="Ajustes"
              variant="ghost"
              onPress={() => router.push('/settings')}
            />
          </FadeInView>
        </ScrollView>
      </SafeAreaView>

      {/* Botón flotante accesible */}
      <FloatingActionButton
        accessibilityLabel="Registrar un movimiento"
        onPress={() => openSheet()}
      />

      {/* Hoja unificada para registrar gastos o ingresos */}
      <ExpenseSheet
        visible={sheetVisible}
        initialMode={sheetMode}
        onClose={() => setSheetVisible(false)}
        onSaveExpense={handleAddExpense}
        onSaveIncome={handleAddIncome}
        amount={amount}
        onAmountChange={setAmount}
        category={category}
        onCategoryChange={setCategory}
        saving={saving}
      />

      {/* Banner de deshacer gasto borrado */}
      {undoExpenseVisible && lastDeleted ? (
        <View style={styles.undoBanner}>
          <Text style={[styles.undoText, { color: theme.colors.text }]}>
            Gasto eliminado
          </Text>
          <PrimaryButton
            label="Deshacer"
            variant="ghost"
            onPress={handleUndoExpense}
            style={styles.undoButton}
          />
        </View>
      ) : null}

      {/* Banner de deshacer ingreso borrado */}
      {undoIncomeVisible && lastDeletedIncome ? (
        <View style={styles.undoBanner}>
          <Text style={[styles.undoText, { color: theme.colors.text }]}>
            Ingreso eliminado
          </Text>
          <PrimaryButton
            label="Deshacer"
            variant="ghost"
            onPress={handleUndoIncome}
            style={styles.undoButton}
          />
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({
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
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          {
            color:
              valueColor ??
              (strong ? theme.colors.text : theme.colors.textSecondary),
            fontWeight: strong ? '700' : '600',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const theme = useTheme();

  return (
    <View
      style={[styles.divider, { backgroundColor: theme.colors.separator }]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  blob: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -150,
    right: -120,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  overline: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  heroLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  number: {
    fontSize: 52,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  heroHint: {
    fontSize: 15,
    lineHeight: 20,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    minHeight: 72,
  },
  quickActionTextGroup: {
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
  smallLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  remaining: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
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
  footer: {
    gap: 10,
    marginTop: 'auto',
  },
  undoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#121722',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  undoText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  undoButton: {
    minWidth: 90,
  },
});
