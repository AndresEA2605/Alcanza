import { Redirect, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { longDateLabel } from '../src/domain/labels';
import type { Category } from '../src/domain/budget';
import {
  calcSpendingMarginFromState,
  calcTodayFromState,
  useBudgetStore,
} from '../src/store/useBudgetStore';
import { useTheme } from '../src/theme';
import { ExpenseSheet, type SheetMode } from '../src/ui/ExpenseSheet';
import { FadeInView } from '../src/ui/FadeInView';
import { FloatingActionButton } from '../src/ui/FloatingActionButton';
import { HapticPressable as Pressable } from '../src/ui/HapticPressable';
import { LoadingState } from '../src/ui/LoadingState';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { SuccessBanner } from '../src/ui/SuccessBanner';
import { StatusPill } from '../src/ui/StatusPill';
import {
  BusinessShortcutCard,
  DashboardBudgetCard,
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
  const [category, setCategory] = useState<Category>('comida');
  const [saving, setSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [undoExpenseVisible, setUndoExpenseVisible] = useState(false);
  const [undoIncomeVisible, setUndoIncomeVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerTone, setBannerTone] = useState<'success' | 'error'>('success');
  const [refreshing, setRefreshing] = useState(false);
  const [now] = useState(Date.now);
  const bannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showBanner(message: string, tone: 'success' | 'error' = 'success') {
    if (bannerTimeout.current) {
      clearTimeout(bannerTimeout.current);
    }
    setBannerMessage(message);
    setBannerTone(tone);
    bannerTimeout.current = setTimeout(() => setBannerMessage(null), 3500);
  }

  function dismissBanner() {
    if (bannerTimeout.current) {
      clearTimeout(bannerTimeout.current);
      bannerTimeout.current = null;
    }
    setBannerMessage(null);
  }

  useEffect(() => {
    if (budgetStatus === 'idle') {
      void initializeBudget();
    }
  }, [budgetStatus, initializeBudget]);

  useEffect(
    () => () => {
      if (bannerTimeout.current) {
        clearTimeout(bannerTimeout.current);
      }
    },
    [],
  );

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

  async function handleAddExpense(parsedAmount: number, chosenCategory: Category) {
    if (saving) return;
    setSaving(true);
    setSubmissionError(null);
    try {
      await addExpense({
        amount: parsedAmount,
        category: chosenCategory,
      });
      setAmount('');
      setSheetVisible(false);
      showBanner('Gasto registrado con éxito');
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el gasto. Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAddIncome(parsedAmount: number, description?: string) {
    if (saving) return;
    setSaving(true);
    setSubmissionError(null);
    try {
      await addIncome({
        amount: parsedAmount,
        description,
      });
      setAmount('');
      setSheetVisible(false);
      showBanner('Ingreso adicional sumado a tu presupuesto');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el ingreso. Intenta de nuevo.';
      setSubmissionError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      await deleteExpense(expenseId);
      setUndoExpenseVisible(true);
      setTimeout(() => setUndoExpenseVisible(false), 5000);
    } catch (error) {
      showBanner(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el gasto. Intenta de nuevo.',
        'error',
      );
    }
  }

  async function handleUndoExpense() {
    try {
      await undoDelete();
      setUndoExpenseVisible(false);
    } catch (error) {
      showBanner(
        error instanceof Error
          ? error.message
          : 'No se pudo recuperar el gasto. Intenta de nuevo.',
        'error',
      );
    }
  }

  async function handleDeleteIncome(incomeId: string) {
    try {
      await deleteIncome(incomeId);
      setUndoIncomeVisible(true);
      setTimeout(() => setUndoIncomeVisible(false), 5000);
    } catch (error) {
      showBanner(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el ingreso. Intenta de nuevo.',
        'error',
      );
    }
  }

  async function handleUndoIncome() {
    try {
      await undoDeleteIncome();
      setUndoIncomeVisible(false);
    } catch (error) {
      showBanner(
        error instanceof Error
          ? error.message
          : 'No se pudo recuperar el ingreso. Intenta de nuevo.',
        'error',
      );
    }
  }

  function openSheet(mode: SheetMode | null = null) {
    setSheetMode(mode);
    setAmount('');
    setSubmissionError(null);
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
        <View
          style={[
            styles.blobSecondary,
            { backgroundColor: theme.colors.backgroundAccentTwo },
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
                variant={bannerTone}
                onDismiss={dismissBanner}
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
              <View style={styles.headerActions}>
                <StatusPill status={today.status} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ajustes"
                  accessibilityHint="Abrir la configuración de la aplicación"
                  hitSlop={8}
                  onPress={() => router.push('/settings')}
                  style={({ pressed }) => [
                    styles.settingsButton,
                    {
                      backgroundColor: theme.colors.accentSoft,
                      borderColor: theme.colors.accent,
                      shadowColor: theme.colors.accent,
                      opacity: pressed ? 0.8 : 1,
                      transform: [
                        {
                          scale:
                            pressed && !theme.reduceMotion ? 0.94 : 1,
                        },
                      ],
                    },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: 'gearshape.fill',
                      android: 'settings',
                      web: 'settings',
                    }}
                    tintColor={theme.colors.accent}
                    size={21}
                  />
                </Pressable>
              </View>
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

          {/* Sección de Movimientos de Hoy */}
          <FadeInView delay={220}>
            <TodayMovementSection
              incomes={todayIncomes}
              expenses={todayExpenses}
              onDeleteIncome={handleDeleteIncome}
              onDeleteExpense={handleDeleteExpense}
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
        onClose={() => {
          setSubmissionError(null);
          setSheetVisible(false);
        }}
        onSaveExpense={handleAddExpense}
        onSaveIncome={handleAddIncome}
        amount={amount}
        onAmountChange={(value) => {
          setAmount(value);
          setSubmissionError(null);
        }}
        category={category}
        onCategoryChange={setCategory}
        saving={saving}
        errorMessage={submissionError}
        onDismissError={() => setSubmissionError(null)}
      />

      {/* Banner de deshacer gasto borrado */}
      {undoExpenseVisible && lastDeleted ? (
        <View
          style={[
            styles.undoBanner,
            {
              backgroundColor: theme.colors.surfaceStrong,
              borderColor: theme.colors.separator,
            },
          ]}
        >
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
        <View
          style={[
            styles.undoBanner,
            {
              backgroundColor: theme.colors.surfaceStrong,
              borderColor: theme.colors.separator,
            },
          ]}
        >
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
  blobSecondary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -100,
    left: -130,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
  undoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
