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
  getBusinessSettings,
  saveBusinessSettings,
} from '../src/data/businessSettingsRepo';
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

  it('guarda y recupera la meta general de Mi negocio', async () => {
    await saveBusinessSettings(testDb.db, {
      goalAmount: 900_000,
      goalPeriod: 'monthly',
    });

    await expect(getBusinessSettings(testDb.db)).resolves.toEqual({
      goalAmount: 900_000,
      goalPeriod: 'monthly',
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

  it('borra los datos financieros y del negocio y devuelve las imágenes', async () => {
    await saveBusinessSettings(testDb.db, {
      goalAmount: 600_000,
      goalPeriod: 'monthly',
    });
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
    await testDb.db.runAsync(
      `INSERT INTO income_entry (id, amount, description, ts)
       VALUES (?, ?, ?, ?)`,
      'income-1',
      100_000,
      'Venta',
      new Date(2026, 0, 15, 13).getTime(),
    );
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

    await expect(clearAllData(testDb.db)).resolves.toEqual([
      'file:///documents/business-product.jpg',
    ]);

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toBeNull();
    await expect(getBusinessSettings(testDb.db)).resolves.toEqual({
      goalAmount: 0,
      goalPeriod: 'daily',
    });

    for (const table of [
      'month_config',
      'expense',
      'income_entry',
      'business_item',
      'business_account',
    ]) {
      const result = await testDb.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM ${table}`,
      );
      expect(result?.count).toBe(0);
    }
  });

  it('borra el resto de los datos aunque falte business_account', async () => {
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
    await testDb.db.execAsync('DROP TABLE business_account');

    await expect(clearAllData(testDb.db)).resolves.toEqual([]);

    await expect(getMonthConfig(testDb.db, '2026-01')).resolves.toBeNull();
    const expenseCount = await testDb.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM expense',
    );
    expect(expenseCount?.count).toBe(0);
  });
});
