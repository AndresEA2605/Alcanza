import {
  createExpense,
  createExpenseId,
  getExpenseById,
  listExpensesByDay,
  listExpensesByMonth,
  restoreExpense,
  softDeleteExpense,
} from '../src/data/expenseRepo';
import { migrateDatabase } from '../src/data/migrations';
import { dayRangeFromTs, monthRangeFromTs } from '../src/domain/budget';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/sqliteTestDb';

function at(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0,
): number {
  return new Date(year, monthIndex, day, hour, minute).getTime();
}

describe('expenseRepo', () => {
  let testDb: TestDatabase;
  const jan10 = at(2026, 0, 10);
  const jan15 = at(2026, 0, 15);
  const feb1 = at(2026, 1, 1, 0, 1);

  beforeEach(async () => {
    testDb = createTestDatabase();
    await migrateDatabase(testDb.db);
  });

  afterEach(() => {
    testDb.close();
  });

  async function seedJanuaryExpenses(): Promise<void> {
    await createExpense(testDb.db, {
      id: 'comida',
      amount: 10_000,
      category: 'comida',
      ts: jan10,
    });
    await createExpense(testDb.db, {
      id: 'transporte',
      amount: 20_000,
      category: 'transporte',
      ts: jan15,
    });
    await createExpense(testDb.db, {
      id: 'febrero',
      amount: 30_000,
      category: 'ocio',
      ts: feb1,
    });
  }

  it('guarda un gasto y lo devuelve como entidad de dominio', async () => {
    const created = await createExpense(testDb.db, {
      id: 'expense-1',
      amount: 12_500,
      category: 'comida',
      ts: jan15,
    });

    expect(created).toEqual({
      id: 'expense-1',
      amount: 12_500,
      category: 'comida',
      ts: jan15,
      deletedAt: null,
    });

    await expect(getExpenseById(testDb.db, 'expense-1')).resolves.toEqual(
      created,
    );
  });

  it('lista el mes en orden descendente y excluye otros meses', async () => {
    await seedJanuaryExpenses();

    const january = await listExpensesByMonth(
      testDb.db,
      monthRangeFromTs(jan15),
    );

    expect(january.map((expense) => expense.id)).toEqual([
      'transporte',
      'comida',
    ]);
  });

  it('respeta los límites del rango del mes', async () => {
    const startOfMonth = at(2026, 0, 1, 0, 0);
    const endOfMonth = at(2026, 0, 31, 23, 59);

    await createExpense(testDb.db, {
      id: 'inicio',
      amount: 1_000,
      category: 'otros',
      ts: startOfMonth,
    });
    await createExpense(testDb.db, {
      id: 'fin',
      amount: 2_000,
      category: 'otros',
      ts: endOfMonth,
    });
    await createExpense(testDb.db, {
      id: 'siguiente',
      amount: 3_000,
      category: 'otros',
      ts: at(2026, 1, 1, 0, 0),
    });

    const january = await listExpensesByMonth(
      testDb.db,
      monthRangeFromTs(jan15),
    );

    expect(january.map((expense) => expense.id)).toEqual(['fin', 'inicio']);
  });

  it('filtra los gastos de un día', async () => {
    await seedJanuaryExpenses();

    const day = await listExpensesByDay(testDb.db, dayRangeFromTs(jan15));

    expect(day.map((expense) => expense.id)).toEqual(['transporte']);
  });

  it('borra de forma lógica y permite restaurar', async () => {
    await seedJanuaryExpenses();

    await expect(
      softDeleteExpense(testDb.db, 'transporte', jan15 + 1_000),
    ).resolves.toBe(true);

    const januaryAfterDelete = await listExpensesByMonth(
      testDb.db,
      monthRangeFromTs(jan15),
    );
    expect(januaryAfterDelete.map((expense) => expense.id)).toEqual(['comida']);

    const deleted = await getExpenseById(testDb.db, 'transporte');
    expect(deleted?.deletedAt).toBe(jan15 + 1_000);

    await expect(
      softDeleteExpense(testDb.db, 'transporte', jan15 + 2_000),
    ).resolves.toBe(false);

    await expect(restoreExpense(testDb.db, 'transporte')).resolves.toBe(true);

    const januaryAfterRestore = await listExpensesByMonth(
      testDb.db,
      monthRangeFromTs(jan15),
    );
    expect(januaryAfterRestore.map((expense) => expense.id)).toEqual([
      'transporte',
      'comida',
    ]);

    await expect(restoreExpense(testDb.db, 'transporte')).resolves.toBe(false);
  });

  it('devuelve false al borrar un gasto inexistente', async () => {
    await expect(
      softDeleteExpense(testDb.db, 'no-existe', jan15),
    ).resolves.toBe(false);
  });

  it('genera identificadores locales únicos', () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => createExpenseId(jan15)),
    );

    expect(ids.size).toBe(100);
    expect([...ids][0]).toMatch(/^exp_/);
  });
});
