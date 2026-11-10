import { create } from 'zustand';

import {
  calcToday,
  monthKeyFromTs,
  monthRangeFromTs,
  type CalcTodayResult,
  type Category,
  type Expense,
  type IncomeEntry,
} from '../domain/budget';
import {
  calcSpendingMargin,
  verifyExpenseMargin,
  type ExpenseVerificationResult,
  type MarginMode,
  type SpendingMarginOptions,
  type SpendingMarginResult,
} from '../domain/spendingMargin';
import {
  clearAllData,
  copyMonthConfig,
  getLatestMonthConfigBefore,
  getMonthConfig,
  upsertMonthConfig,
  type MonthConfig,
} from '../data/configRepo';
import { getDatabase } from '../data/db';
import {
  createExpense,
  createExpenseId,
  listExpensesByMonth,
  restoreExpense,
  softDeleteExpense,
} from '../data/expenseRepo';
import {
  createIncome,
  createIncomeId,
  listIncomesByMonth,
  restoreIncome,
  softDeleteIncome,
} from '../data/incomeRepo';

export type BudgetStoreStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AddExpenseInput {
  amount: number;
  category: Category;
  /** Epoch en milisegundos; por defecto, el momento actual. */
  ts?: number;
}

export interface AddIncomeInput {
  amount: number;
  description?: string;
  /** Epoch en milisegundos; por defecto, el momento actual. */
  ts?: number;
}

export interface BudgetStoreState {
  status: BudgetStoreStatus;
  error: string | null;
  /** Mes cargado en formato `YYYY-MM`. */
  month: string | null;
  config: MonthConfig | null;
  /** Gastos activos del mes cargado. */
  expenses: Expense[];
  /** Ingresos adicionales activos del mes cargado. */
  incomes: IncomeEntry[];
  /** `true` cuando no existe month_config para el mes actual. */
  needsMonthSetup: boolean;
  /** Configuración más reciente de un mes anterior, si existe. */
  previousConfig: MonthConfig | null;
  /** Último gasto borrado, para deshacer. */
  lastDeleted: Expense | null;
  /** Último ingreso borrado, para deshacer. */
  lastDeletedIncome: IncomeEntry | null;
  /** Modo activo para el margen de gasto ('hoy' o 'mes'). */
  marginMode: MarginMode;
  setMarginMode: (mode: MarginMode) => void;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  saveMonthConfig: (income: number, fixed: number) => Promise<void>;
  adoptPreviousConfig: () => Promise<void>;
  verifyExpense: (input: AddExpenseInput) => ExpenseVerificationResult;
  addExpense: (
    input: AddExpenseInput,
    options?: { allowOverMargin?: boolean },
  ) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  undoDelete: () => Promise<void>;
  addIncome: (input: AddIncomeInput) => Promise<IncomeEntry>;
  deleteIncome: (id: string) => Promise<void>;
  undoDeleteIncome: () => Promise<void>;
  resetData: () => Promise<string[]>;
}

export const initialBudgetState = {
  status: 'idle' as const,
  error: null as string | null,
  month: null as string | null,
  config: null as MonthConfig | null,
  expenses: [] as Expense[],
  incomes: [] as IncomeEntry[],
  needsMonthSetup: false,
  previousConfig: null as MonthConfig | null,
  lastDeleted: null as Expense | null,
  lastDeletedIncome: null as IncomeEntry | null,
  marginMode: 'hoy' as MarginMode,
};

interface LoadedMonth {
  month: string;
  config: MonthConfig | null;
  expenses: Expense[];
  incomes: IncomeEntry[];
  needsMonthSetup: boolean;
  previousConfig: MonthConfig | null;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado. Intenta de nuevo.';
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} debe ser un entero mayor o igual a 0.`);
  }
}

function assertPositiveInteger(value: number, label = 'El gasto'): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} debe ser un entero mayor que 0.`);
  }
}

function sortExpenses(expenses: readonly Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) => b.ts - a.ts || b.id.localeCompare(a.id),
  );
}

function sortIncomes(incomes: readonly IncomeEntry[]): IncomeEntry[] {
  return [...incomes].sort(
    (a, b) => b.ts - a.ts || b.id.localeCompare(a.id),
  );
}

async function loadMonthState(now: number): Promise<LoadedMonth> {
  const db = await getDatabase();
  const month = monthKeyFromTs(now);
  const config = await getMonthConfig(db, month);

  if (!config) {
    const previousConfig = await getLatestMonthConfigBefore(db, month);

    return {
      month,
      config: null,
      expenses: [],
      incomes: [],
      needsMonthSetup: true,
      previousConfig,
    };
  }

  const range = monthRangeFromTs(now);
  const [expenses, incomes] = await Promise.all([
    listExpensesByMonth(db, range),
    listIncomesByMonth(db, range),
  ]);

  return {
    month,
    config,
    expenses,
    incomes,
    needsMonthSetup: false,
    previousConfig: null,
  };
}

export const useBudgetStore = create<BudgetStoreState>()((set, get) => ({
  ...initialBudgetState,

  setMarginMode: (marginMode) => set({ marginMode }),

  verifyExpense: (input) => verifyExpenseFromState(get(), input),

  initialize: async () => {
    const now = Date.now();
    const currentMonth = monthKeyFromTs(now);
    const { status, month } = get();

    if (status === 'loading') {
      return;
    }

    if (status === 'ready' && month === currentMonth) {
      return;
    }

    set({ status: 'loading', error: null });

    try {
      const loaded = await loadMonthState(now);
      set({ ...loaded, status: 'ready', error: null, lastDeleted: null });
    } catch (error) {
      set({ status: 'error', error: toErrorMessage(error) });
    }
  },

  refresh: async () => {
    try {
      const loaded = await loadMonthState(Date.now());
      set({ ...loaded, status: 'ready', error: null, lastDeleted: null });
    } catch (error) {
      set({ status: 'error', error: toErrorMessage(error) });
    }
  },

  saveMonthConfig: async (income, fixed) => {
    try {
      assertNonNegativeInteger(income, 'El ingreso mensual');
      assertNonNegativeInteger(fixed, 'Los gastos fijos');

      const now = Date.now();
      const month = monthKeyFromTs(now);
      const db = await getDatabase();

      await upsertMonthConfig(db, { month, income, fixed });

      const range = monthRangeFromTs(now);
      const [expenses, incomes] = await Promise.all([
        listExpensesByMonth(db, range),
        listIncomesByMonth(db, range),
      ]);

      set({
        status: 'ready',
        month,
        config: { month, income, fixed },
        expenses,
        incomes,
        needsMonthSetup: false,
        previousConfig: null,
        lastDeleted: null,
        lastDeletedIncome: null,
        error: null,
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  adoptPreviousConfig: async () => {
    try {
      const { previousConfig } = get();

      if (!previousConfig) {
        throw new Error('No hay un mes anterior para copiar.');
      }

      const now = Date.now();
      const month = monthKeyFromTs(now);
      const db = await getDatabase();
      const config = await copyMonthConfig(db, previousConfig.month, month);

      if (!config) {
        throw new Error('No pude copiar la configuración del mes anterior.');
      }

      const range = monthRangeFromTs(now);
      const [expenses, incomes] = await Promise.all([
        listExpensesByMonth(db, range),
        listIncomesByMonth(db, range),
      ]);

      set({
        status: 'ready',
        month,
        config,
        expenses,
        incomes,
        needsMonthSetup: false,
        previousConfig: null,
        lastDeleted: null,
        lastDeletedIncome: null,
        error: null,
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  addExpense: async ({ amount, category, ts }, options) => {
    try {
      assertPositiveInteger(amount);

      const now = Date.now();
      const expenseTs = ts ?? now;

      if (!Number.isSafeInteger(expenseTs) || expenseTs < 0) {
        throw new Error('La fecha del gasto no es válida.');
      }

      const currentMonth = monthKeyFromTs(now);

      if (monthKeyFromTs(expenseTs) !== currentMonth) {
        throw new Error('Solo puedes registrar gastos del mes actual.');
      }

      if (get().month !== currentMonth) {
        await get().refresh();
      }

      if (get().month !== currentMonth) {
        throw new Error('No pude actualizar el mes actual. Intenta de nuevo.');
      }

      const currentConfig = get().config;
      if (!currentConfig) {
        throw new Error('Primero configura tu ingreso mensual.');
      }

      const verification = verifyExpenseMargin({
        amount,
        category,
        ts: expenseTs,
        now,
        income: currentConfig.income,
        fixed: currentConfig.fixed,
        expenses: get().expenses,
        incomes: get().incomes,
      });

      if (verification.hardBlocked) {
        throw new Error(verification.message);
      }

      if (verification.canProceedWithWarning && options?.allowOverMargin === false) {
        throw new Error(verification.message);
      }

      const db = await getDatabase();
      const created = await createExpense(db, {
        id: createExpenseId(now),
        amount,
        category,
        ts: expenseTs,
      });

      set((state) => ({
        expenses: sortExpenses([created, ...state.expenses]),
        error: null,
      }));

      return created;
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  deleteExpense: async (id) => {
    try {
      const target = get().expenses.find((expense) => expense.id === id);

      if (!target) {
        throw new Error('No encontré ese gasto.');
      }

      const deletedAt = Date.now();
      const db = await getDatabase();
      const deleted = await softDeleteExpense(db, id, deletedAt);

      if (!deleted) {
        throw new Error('No pude borrar ese gasto.');
      }

      set((state) => ({
        expenses: state.expenses.filter((expense) => expense.id !== id),
        lastDeleted: { ...target, deletedAt },
        error: null,
      }));
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  undoDelete: async () => {
    try {
      const deleted = get().lastDeleted;

      if (!deleted) {
        return;
      }

      const db = await getDatabase();
      const restored = await restoreExpense(db, deleted.id);

      if (!restored) {
        throw new Error('No pude deshacer el borrado.');
      }

      set((state) => ({
        expenses: sortExpenses([
          { ...deleted, deletedAt: null },
          ...state.expenses.filter((expense) => expense.id !== deleted.id),
        ]),
        lastDeleted: null,
        error: null,
      }));
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  addIncome: async ({ amount, description, ts }) => {
    try {
      assertPositiveInteger(amount, 'El ingreso');

      const now = Date.now();
      const incomeTs = ts ?? now;

      if (!Number.isSafeInteger(incomeTs) || incomeTs < 0) {
        throw new Error('La fecha del ingreso no es válida.');
      }

      const currentMonth = monthKeyFromTs(now);

      if (monthKeyFromTs(incomeTs) !== currentMonth) {
        throw new Error('Solo puedes registrar ingresos del mes actual.');
      }

      if (get().month !== currentMonth) {
        await get().refresh();
      }

      if (get().month !== currentMonth) {
        throw new Error('No pude actualizar el mes actual. Intenta de nuevo.');
      }

      const db = await getDatabase();
      const created = await createIncome(db, {
        id: createIncomeId(now),
        amount,
        description: description?.trim() || undefined,
        ts: incomeTs,
      });

      set((state) => ({
        incomes: sortIncomes([created, ...state.incomes]),
        error: null,
      }));

      return created;
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  deleteIncome: async (id) => {
    try {
      const target = get().incomes.find((income) => income.id === id);

      if (!target) {
        throw new Error('No encontré ese ingreso.');
      }

      const deletedAt = Date.now();
      const db = await getDatabase();
      const deleted = await softDeleteIncome(db, id, deletedAt);

      if (!deleted) {
        throw new Error('No pude borrar ese ingreso.');
      }

      set((state) => ({
        incomes: state.incomes.filter((income) => income.id !== id),
        lastDeletedIncome: { ...target, deletedAt },
        error: null,
      }));
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  undoDeleteIncome: async () => {
    try {
      const deleted = get().lastDeletedIncome;

      if (!deleted) {
        return;
      }

      const db = await getDatabase();
      const restored = await restoreIncome(db, deleted.id);

      if (!restored) {
        throw new Error('No pude deshacer el borrado.');
      }

      set((state) => ({
        incomes: sortIncomes([
          { ...deleted, deletedAt: null },
          ...state.incomes.filter((income) => income.id !== deleted.id),
        ]),
        lastDeletedIncome: null,
        error: null,
      }));
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },

  resetData: async () => {
    try {
      const db = await getDatabase();
      const productImageUris = await clearAllData(db);

      set({
        ...initialBudgetState,
        status: 'ready',
        month: monthKeyFromTs(Date.now()),
        needsMonthSetup: true,
        error: null,
      });
      return productImageUris;
    } catch (error) {
      set({ error: toErrorMessage(error) });
      throw error;
    }
  },
}));

/**
 * Calcula el número de hoy a partir del estado cargado. Es una función pura
 * para que la interfaz la use dentro de `useMemo` sin crear suscripciones
 * que devuelvan un objeto nuevo en cada render.
 */
export function calcTodayFromState(
  state: Pick<BudgetStoreState, 'config' | 'expenses'> & {
    incomes?: readonly IncomeEntry[];
  },
  now = Date.now(),
): CalcTodayResult | null {
  if (!state.config) {
    return null;
  }

  return calcToday({
    income: state.config.income,
    fixed: state.config.fixed,
    expenses: state.expenses,
    incomes: state.incomes,
    now,
  });
}

/**
 * Calcula el margen de gasto a partir del estado cargado.
 */
export function calcSpendingMarginFromState(
  state: Pick<BudgetStoreState, 'config' | 'expenses'> & {
    incomes?: readonly IncomeEntry[];
    marginMode?: MarginMode;
  },
  now = Date.now(),
  options?: SpendingMarginOptions,
): SpendingMarginResult | null {
  if (!state.config) {
    return null;
  }

  return calcSpendingMargin(
    {
      income: state.config.income,
      fixed: state.config.fixed,
      expenses: state.expenses,
      incomes: state.incomes,
      now,
    },
    {
      mode: options?.mode ?? state.marginMode ?? 'hoy',
      sections: options?.sections,
    },
  );
}

/**
 * Verifica un posible gasto contra el margen de gasto actual del estado.
 */
export function verifyExpenseFromState(
  state: Pick<BudgetStoreState, 'config' | 'expenses'> & {
    incomes?: readonly IncomeEntry[];
  },
  input: AddExpenseInput,
  now = Date.now(),
): ExpenseVerificationResult {
  if (!state.config) {
    return {
      allowed: false,
      hardBlocked: true,
      canProceedWithWarning: false,
      status: 'limite',
      tier: 'flexible',
      code: 'NO_DISPOSABLE',
      title: 'Sin configuración',
      message: 'Primero configura tu ingreso mensual.',
      impact: null,
    };
  }

  return verifyExpenseMargin({
    amount: input.amount,
    category: input.category,
    ts: input.ts,
    now,
    income: state.config.income,
    fixed: state.config.fixed,
    expenses: state.expenses,
    incomes: state.incomes,
  });
}
