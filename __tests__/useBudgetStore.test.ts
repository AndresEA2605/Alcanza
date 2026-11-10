import { getMonthConfig, upsertMonthConfig } from '../src/data/configRepo';
import { getDatabase } from '../src/data/db';
import {
  getExpenseById,
  listExpensesByMonth,
} from '../src/data/expenseRepo';
import { migrateDatabase } from '../src/data/migrations';
import { monthRangeFromTs } from '../src/domain/budget';
import {
  calcSpendingMarginFromState,
  calcTodayFromState,
  initialBudgetState,
  useBudgetStore,
  verifyExpenseFromState,
} from '../src/store/useBudgetStore';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/sqliteTestDb';

jest.mock('../src/data/db', () => ({
  getDatabase: jest.fn(),
}));

const mockedGetDatabase = jest.mocked(getDatabase);

const INCOME = 3_000_000;
const FIXED = 1_000_000;
const DEC_15_2025 = new Date(2025, 11, 15, 12).getTime();
const JAN_15_2026 = new Date(2026, 0, 15, 12).getTime();

describe('useBudgetStore', () => {
  let testDb: TestDatabase;
  let nowSpy: jest.SpyInstance<number, []>;

  beforeEach(async () => {
    testDb = createTestDatabase();
    await migrateDatabase(testDb.db);
    mockedGetDatabase.mockResolvedValue(testDb.db as never);
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(JAN_15_2026);
    useBudgetStore.setState(initialBudgetState);
  });

  afterEach(() => {
    nowSpy.mockRestore();
    testDb.close();
    jest.clearAllMocks();
  });

  async function configureCurrentMonth(): Promise<void> {
    await useBudgetStore.getState().initialize();
    await useBudgetStore.getState().saveMonthConfig(INCOME, FIXED);
  }

  it('carga el mes actual aunque no exista configuración', async () => {
    await useBudgetStore.getState().initialize();

    const state = useBudgetStore.getState();

    expect(state.status).toBe('ready');
    expect(state.month).toBe('2026-01');
    expect(state.config).toBeNull();
    expect(state.expenses).toEqual([]);
    expect(state.needsMonthSetup).toBe(true);
    expect(state.previousConfig).toBeNull();
    expect(calcTodayFromState(state)).toBeNull();
  });

  it('guarda ingreso y fijos del mes', async () => {
    await useBudgetStore.getState().initialize();
    await useBudgetStore.getState().saveMonthConfig(INCOME, FIXED);

    const state = useBudgetStore.getState();

    expect(state.config).toEqual({
      month: '2026-01',
      income: INCOME,
      fixed: FIXED,
    });
    expect(state.needsMonthSetup).toBe(false);
    expect(state.error).toBeNull();

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toEqual({
      month: '2026-01',
      income: INCOME,
      fixed: FIXED,
    });

    const today = calcTodayFromState(state);
    expect(today?.daysLeft).toBe(17);
    expect(today?.daily).toBeCloseTo((INCOME - FIXED) / 17, 10);
  });

  it('agrega un gasto y actualiza el cálculo de hoy', async () => {
    await configureCurrentMonth();

    const expense = await useBudgetStore.getState().addExpense({
      amount: 50_000,
      category: 'comida',
    });

    const state = useBudgetStore.getState();
    const today = calcTodayFromState(state);

    expect(expense.deletedAt).toBeNull();
    expect(expense.ts).toBe(JAN_15_2026);
    expect(state.expenses).toEqual([expense]);
    expect(today?.spentToday).toBe(50_000);
    expect(today?.monthLeft).toBe(INCOME - FIXED - 50_000);

    const rows = await listExpensesByMonth(
      testDb.db,
      monthRangeFromTs(JAN_15_2026),
    );
    expect(rows).toHaveLength(1);
  });

  it('borra de forma lógica y deshace el borrado', async () => {
    await configureCurrentMonth();
    const expense = await useBudgetStore.getState().addExpense({
      amount: 50_000,
      category: 'comida',
    });

    await useBudgetStore.getState().deleteExpense(expense.id);

    let state = useBudgetStore.getState();
    expect(state.expenses).toEqual([]);
    expect(state.lastDeleted?.id).toBe(expense.id);
    expect((await getExpenseById(testDb.db, expense.id))?.deletedAt).toBe(
      JAN_15_2026,
    );

    await useBudgetStore.getState().undoDelete();

    state = useBudgetStore.getState();
    expect(state.expenses.map((item) => item.id)).toEqual([expense.id]);
    expect(state.expenses[0]?.deletedAt).toBeNull();
    expect(state.lastDeleted).toBeNull();
    expect((await getExpenseById(testDb.db, expense.id))?.deletedAt).toBeNull();
  });

  it('ofrece copiar la configuración del mes anterior', async () => {
    await upsertMonthConfig(testDb.db, {
      month: '2025-12',
      income: 2_500_000,
      fixed: 800_000,
    });

    await useBudgetStore.getState().initialize();

    let state = useBudgetStore.getState();
    expect(state.needsMonthSetup).toBe(true);
    expect(state.previousConfig).toEqual({
      month: '2025-12',
      income: 2_500_000,
      fixed: 800_000,
    });

    await useBudgetStore.getState().adoptPreviousConfig();

    state = useBudgetStore.getState();
    expect(state.config).toEqual({
      month: '2026-01',
      income: 2_500_000,
      fixed: 800_000,
    });
    expect(state.needsMonthSetup).toBe(false);
    expect(state.previousConfig).toBeNull();

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toEqual({
      month: '2026-01',
      income: 2_500_000,
      fixed: 800_000,
    });
  });

  it('detecta el cambio de mes al refrescar', async () => {
    nowSpy.mockReturnValue(DEC_15_2025);
    await configureCurrentMonth();

    nowSpy.mockReturnValue(JAN_15_2026);
    await useBudgetStore.getState().refresh();

    const state = useBudgetStore.getState();
    expect(state.month).toBe('2026-01');
    expect(state.config).toBeNull();
    expect(state.needsMonthSetup).toBe(true);
    expect(state.previousConfig).toEqual({
      month: '2025-12',
      income: INCOME,
      fixed: FIXED,
    });
  });

  it('actualiza el mes antes de agregar un gasto si cambió el mes', async () => {
    nowSpy.mockReturnValue(DEC_15_2025);
    await configureCurrentMonth();

    nowSpy.mockReturnValue(JAN_15_2026);

    await expect(
      useBudgetStore.getState().addExpense({
        amount: 10_000,
        category: 'comida',
      }),
    ).rejects.toThrow('Primero configura');

    const state = useBudgetStore.getState();
    expect(state.month).toBe('2026-01');
    expect(state.needsMonthSetup).toBe(true);

    const count = await testDb.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM expense',
    );
    expect(count?.count).toBe(0);
  });

  it('borra todos los datos y vuelve al estado sin configuración', async () => {
    await configureCurrentMonth();
    await useBudgetStore.getState().addExpense({
      amount: 50_000,
      category: 'comida',
    });
    await testDb.db.runAsync(
      `INSERT INTO business_item (
         id, name, type, quantity, price_per_unit, investment, daily_goal,
         created_at, updated_at, image_uri
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'item-1',
      'Producto',
      'product',
      1,
      20_000,
      10_000,
      0,
      1,
      1,
      'file:///documents/business-product.jpg',
    );
    await testDb.db.runAsync(
      `INSERT INTO business_account (id, name, type, amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      'account-1',
      'Efectivo',
      'cash',
      50_000,
      1,
      1,
    );

    await expect(useBudgetStore.getState().resetData()).resolves.toEqual([
      'file:///documents/business-product.jpg',
    ]);

    const state = useBudgetStore.getState();
    expect(state.config).toBeNull();
    expect(state.expenses).toEqual([]);
    expect(state.needsMonthSetup).toBe(true);
    expect(state.month).toBe('2026-01');
    expect(state.lastDeleted).toBeNull();

    const configCount = await testDb.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM month_config',
    );
    const expenseCount = await testDb.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM expense',
    );
    const itemCount = await testDb.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM business_item',
    );
    const accountCount = await testDb.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM business_account',
    );
    expect(configCount?.count).toBe(0);
    expect(expenseCount?.count).toBe(0);
    expect(itemCount?.count).toBe(0);
    expect(accountCount?.count).toBe(0);
  });

  it('rechaza montos inválidos y gastos sin configuración', async () => {
    await useBudgetStore.getState().initialize();

    await expect(
      useBudgetStore.getState().saveMonthConfig(-1, 0),
    ).rejects.toThrow('ingreso');

    await expect(
      useBudgetStore.getState().addExpense({
        amount: 0,
        category: 'comida',
      }),
    ).rejects.toThrow('gasto');

    await expect(
      useBudgetStore.getState().addExpense({
        amount: 10_000,
        category: 'comida',
      }),
    ).rejects.toThrow('Primero configura');

    expect(useBudgetStore.getState().error).toBeTruthy();
  });

  it('rechaza gastos de otro mes', async () => {
    await configureCurrentMonth();

    await expect(
      useBudgetStore.getState().addExpense({
        amount: 10_000,
        category: 'comida',
        ts: DEC_15_2025,
      }),
    ).rejects.toThrow('mes actual');
  });

  it('calcula y verifica el margen de gasto desde el store', async () => {
    await configureCurrentMonth();

    let state = useBudgetStore.getState();
    const marginInitial = calcSpendingMarginFromState(state);
    expect(marginInitial).not.toBeNull();
    expect(marginInitial?.mode).toBe('hoy');
    expect(marginInitial?.percentage).toBe(0);
    expect(marginInitial?.status).toBe('bien');

    // Verificar gasto dentro del margen
    const verification = state.verifyExpense({
      amount: 40_000,
      category: 'comida',
    });
    expect(verification.allowed).toBe(true);
    expect(verification.canProceedWithWarning).toBe(false);
    expect(verification.status).toBe('bien');

    // Bloquear gasto que excede todo el disponible del mes (2_000_000 disponible)
    const verificationExceeds = state.verifyExpense({
      amount: 2_500_000,
      category: 'otros',
    });
    expect(verificationExceeds.allowed).toBe(false);
    expect(verificationExceeds.hardBlocked).toBe(true);

    await expect(
      useBudgetStore.getState().addExpense({
        amount: 2_500_000,
        category: 'otros',
      }),
    ).rejects.toThrow('excede');

    // Rechazar con allowOverMargin: false cuando supera diario
    await expect(
      useBudgetStore.getState().addExpense(
        {
          amount: 200_000,
          category: 'ocio',
        },
        { allowOverMargin: false },
      ),
    ).rejects.toThrow('supera el límite razonable de hoy');

    // Pero permitir registrar si no es estricto
    const recorded = await useBudgetStore.getState().addExpense({
      amount: 200_000,
      category: 'ocio',
    });
    expect(recorded.amount).toBe(200_000);

    state = useBudgetStore.getState();
    const marginAfter = calcSpendingMarginFromState(state);
    expect(marginAfter?.status).toBe('limite');
    expect(marginAfter?.percentage).toBe(100);
  });

  it('agrega ingresos adicionales y actualiza el disponible de hoy y del mes', async () => {
    await configureCurrentMonth();

    const stateBefore = useBudgetStore.getState();
    const todayBefore = calcTodayFromState(stateBefore);
    expect(todayBefore?.daily).toBeCloseTo((INCOME - FIXED) / 17, 10);
    expect(todayBefore?.totalIncome).toBe(INCOME);

    const income = await useBudgetStore.getState().addIncome({
      amount: 340_000,
      description: 'Trabajo independiente',
    });

    expect(income.amount).toBe(340_000);
    expect(income.description).toBe('Trabajo independiente');
    expect(income.deletedAt).toBeNull();

    const stateAfter = useBudgetStore.getState();
    expect(stateAfter.incomes).toEqual([income]);

    const todayAfter = calcTodayFromState(stateAfter);
    // 340_000 / 17 = 20_000 más por día
    expect(todayAfter?.totalIncome).toBe(INCOME + 340_000);
    expect(todayAfter?.daily).toBeCloseTo((INCOME - FIXED + 340_000) / 17, 10);
    expect(todayAfter?.monthLeft).toBe(INCOME - FIXED + 340_000);

    // Borrado lógico y deshacer
    await useBudgetStore.getState().deleteIncome(income.id);
    expect(useBudgetStore.getState().incomes).toEqual([]);
    expect(useBudgetStore.getState().lastDeletedIncome?.id).toBe(income.id);

    await useBudgetStore.getState().undoDeleteIncome();
    expect(useBudgetStore.getState().incomes).toEqual([
      { ...income, deletedAt: null },
    ]);
  });
});
