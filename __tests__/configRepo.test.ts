import {
  clearAllData,
  copyMonthConfig,
  getLatestMonthConfigBefore,
  getMonthConfig,
  upsertMonthConfig,
} from '../src/data/configRepo';
import { createExpense } from '../src/data/expenseRepo';
import { migrateDatabase } from '../src/data/migrations';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/sqliteTestDb';

describe('configRepo', () => {
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = createTestDatabase();
    await migrateDatabase(testDb.db);
  });

  afterEach(() => {
    testDb.close();
  });

  it('devuelve null cuando el mes no tiene configuración', async () => {
    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toBeNull();
  });

  it('inserta y actualiza la configuración de un mes', async () => {
    await upsertMonthConfig(testDb.db, {
      month: '2026-01',
      income: 3_000_000,
      fixed: 1_000_000,
    });

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toEqual({
      month: '2026-01',
      income: 3_000_000,
      fixed: 1_000_000,
    });

    await upsertMonthConfig(testDb.db, {
      month: '2026-01',
      income: 3_500_000,
      fixed: 1_200_000,
    });

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toEqual({
      month: '2026-01',
      income: 3_500_000,
      fixed: 1_200_000,
    });
  });

  it('encuentra la configuración del mes anterior más reciente', async () => {
    await upsertMonthConfig(testDb.db, {
      month: '2025-11',
      income: 2_000_000,
      fixed: 500_000,
    });
    await upsertMonthConfig(testDb.db, {
      month: '2025-12',
      income: 2_500_000,
      fixed: 800_000,
    });

    await expect(
      getLatestMonthConfigBefore(testDb.db, '2026-01'),
    ).resolves.toEqual({
      month: '2025-12',
      income: 2_500_000,
      fixed: 800_000,
    });

    await expect(
      getLatestMonthConfigBefore(testDb.db, '2025-12'),
    ).resolves.toEqual({
      month: '2025-11',
      income: 2_000_000,
      fixed: 500_000,
    });

    await expect(
      getLatestMonthConfigBefore(testDb.db, '2025-11'),
    ).resolves.toBeNull();
  });

  it('copia ingreso y fijos a un mes nuevo', async () => {
    await upsertMonthConfig(testDb.db, {
      month: '2025-12',
      income: 2_500_000,
      fixed: 800_000,
    });

    await expect(
      copyMonthConfig(testDb.db, '2025-12', '2026-01'),
    ).resolves.toEqual({
      month: '2026-01',
      income: 2_500_000,
      fixed: 800_000,
    });

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toEqual({
      month: '2026-01',
      income: 2_500_000,
      fixed: 800_000,
    });
  });

  it('devuelve null si el mes de origen no existe', async () => {
    await expect(
      copyMonthConfig(testDb.db, '2025-12', '2026-01'),
    ).resolves.toBeNull();

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toBeNull();
  });

  it('borra todos los datos de ambas tablas', async () => {
    await upsertMonthConfig(testDb.db, {
      month: '2026-01',
      income: 3_000_000,
      fixed: 1_000_000,
    });
    await createExpense(testDb.db, {
      id: 'expense-1',
      amount: 25_000,
      category: 'comida',
      ts: new Date(2026, 0, 15, 12).getTime(),
    });

    await clearAllData(testDb.db);

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toBeNull();

    const configCount = await testDb.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM month_config',
    );
    const expenseCount = await testDb.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM expense',
    );

    expect(configCount?.count).toBe(0);
    expect(expenseCount?.count).toBe(0);
  });
});
