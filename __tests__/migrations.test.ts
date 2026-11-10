import {
  LATEST_DATABASE_VERSION,
  migrateDatabase,
} from '../src/data/migrations';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/sqliteTestDb';

describe('migraciones de la base de datos', () => {
  let testDb: TestDatabase;

  beforeEach(() => {
    testDb = createTestDatabase();
  });

  afterEach(() => {
    testDb.close();
  });

  async function userVersion(): Promise<number | undefined> {
    const row = await testDb.db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version',
    );

    return row?.user_version;
  }

  it('crea las tablas y marca la versión más reciente', async () => {
    await migrateDatabase(testDb.db);

    expect(await userVersion()).toBe(LATEST_DATABASE_VERSION);

    const tables = await testDb.db.getAllAsync<{ name: string }>(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table' AND name IN ('month_config', 'expense')
       ORDER BY name`,
    );

    expect(tables.map((table) => table.name)).toEqual([
      'expense',
      'month_config',
    ]);
  });

  it('crea el índice en ts', async () => {
    await migrateDatabase(testDb.db);

    const indexes = await testDb.db.getAllAsync<{ name: string }>(
      "PRAGMA index_list('expense')",
    );

    expect(indexes.map((index) => index.name)).toContain('idx_expense_ts');
  });

  it('es idempotente', async () => {
    await migrateDatabase(testDb.db);
    await migrateDatabase(testDb.db);

    expect(await userVersion()).toBe(LATEST_DATABASE_VERSION);
  });

  it('rechaza una base de datos más nueva que la app', async () => {
    await testDb.db.execAsync('PRAGMA user_version = 99');

    await expect(migrateDatabase(testDb.db)).rejects.toThrow(/más nueva/);
  });

  it('exige montos enteros y positivos en expense', async () => {
    await migrateDatabase(testDb.db);

    await expect(
      testDb.db.runAsync(
        `INSERT INTO expense (id, amount, category, ts, deleted_at)
         VALUES ('cero', 0, 'comida', 1, NULL)`,
      ),
    ).rejects.toThrow();

    await expect(
      testDb.db.runAsync(
        `INSERT INTO expense (id, amount, category, ts, deleted_at)
         VALUES ('negativo', -100, 'comida', 1, NULL)`,
      ),
    ).rejects.toThrow();

    await expect(
      testDb.db.runAsync(
        `INSERT INTO expense (id, amount, category, ts, deleted_at)
         VALUES ('decimal', 10.5, 'comida', 1, NULL)`,
      ),
    ).rejects.toThrow();
  });

  it('rechaza categorías desconocidas', async () => {
    await migrateDatabase(testDb.db);

    await expect(
      testDb.db.runAsync(
        `INSERT INTO expense (id, amount, category, ts, deleted_at)
         VALUES ('otra', 1000, 'mascotas', 1, NULL)`,
      ),
    ).rejects.toThrow();
  });

  it('valida el formato del mes y los enteros de month_config', async () => {
    await migrateDatabase(testDb.db);

    await expect(
      testDb.db.runAsync(
        `INSERT INTO month_config (month, income, fixed)
         VALUES ('2026-1', 3000000, 1000000)`,
      ),
    ).rejects.toThrow();

    await expect(
      testDb.db.runAsync(
        `INSERT INTO month_config (month, income, fixed)
         VALUES ('2026-01', -1, 1000000)`,
      ),
    ).rejects.toThrow();

    await expect(
      testDb.db.runAsync(
        `INSERT INTO month_config (month, income, fixed)
         VALUES ('2026-01', 3000000, 100.5)`,
      ),
    ).rejects.toThrow();
  });

  it('acepta un gasto y una configuración válidos', async () => {
    await migrateDatabase(testDb.db);

    await expect(
      testDb.db.runAsync(
        `INSERT INTO month_config (month, income, fixed)
         VALUES ('2026-01', 3000000, 1000000)`,
      ),
    ).resolves.toMatchObject({ changes: 1 });

    await expect(
      testDb.db.runAsync(
        `INSERT INTO expense (id, amount, category, ts, deleted_at)
         VALUES ('valido', 12500, 'comida', 1767225600000, NULL)`,
      ),
    ).resolves.toMatchObject({ changes: 1 });
  });
});
