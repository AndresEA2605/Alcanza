import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { longDateLabel } from '../src/domain/labels';
import { formatCOP } from '../src/domain/money';
import {
  calcSpendingMarginFromState,
  calcTodayFromState,
  useBudgetStore,
} from '../src/store/useBudgetStore';
import { useTheme } from '../src/theme';
import { ExpenseSheet, type SheetMode } from '../src/ui/ExpenseSheet';
import { FadeInView } from '../src/ui/FadeInView';
import { FloatingActionButton } from '../src/ui/FloatingActionButton';
import { GlassCard } from '../src/ui/GlassCard';
import { LoadingState } from '../src/ui/LoadingState';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { SuccessBanner } from '../src/ui/SuccessBanner';
import { StatusPill } from '../src/ui/StatusPill';
import {
  BalanceShortcutCard,
  BusinessShortcutCard,
  DashboardBudgetCard,
  MonthlySummaryCard,
  RegisterMovementCard,
  TodayMovementSection,
} from '../src/ui/dashboard/DashboardSections';

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
  const setMarginMode = useBudgetStore((state) => state.setMarginMode);
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

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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

          {spendingMargin ? (
            <FadeInView delay={90}>
              <DashboardBudgetCard
                today={today}
                margin={spendingMargin}
                mode={marginMode}
                onModeChange={setMarginMode}
              />
            </FadeInView>
          ) : null}

          {/* Acceso único para registrar un movimiento */}
          <FadeInView delay={130}>
            <RegisterMovementCard onPress={() => openSheet()} />
          </FadeInView>

          <FadeInView delay={150}>
            <BusinessShortcutCard />
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
            <TodayMovementSection
              incomes={todayIncomes}
              expenses={todayExpenses}
              onDeleteIncome={handleDeleteIncome}
              onDeleteExpense={handleDeleteExpense}
            />
          </FadeInView>

          {/* Resumen del mes */}
          <FadeInView delay={280}>
            <MonthlySummaryCard today={today} />
          </FadeInView>

          <FadeInView delay={320}>
            <BalanceShortcutCard />
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
