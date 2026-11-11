import {
  LATEST_DATABASE_VERSION,
  MIGRATIONS,
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

    const businessColumns = await testDb.db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(business_item)`,
    );
    expect(businessColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'description',
        'image_uri',
        'goal_period',
        'goal_amount',
        'in_catalog',
      ]),
    );

    const tables = await testDb.db.getAllAsync<{ name: string }>(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table'
         AND name IN ('month_config', 'expense', 'business_settings')
       ORDER BY name`,
    );

    expect(tables.map((table) => table.name)).toEqual([
      'business_settings',
      'expense',
      'month_config',
    ]);
    await expect(
      testDb.db.getFirstAsync(
        'SELECT goal_amount, goal_period FROM business_settings WHERE id = 1',
      ),
    ).resolves.toEqual({ goal_amount: 0, goal_period: 'daily' });

    const settingsColumns = await testDb.db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(business_settings)`,
    );
    expect(settingsColumns.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'store_name',
        'seller_name',
        'seller_phone',
        'seller_city',
        'seller_notes',
      ]),
    );
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

  it('restaura business_account si falta en una base de datos de una versión anterior', async () => {
    await migrateDatabase(testDb.db);
    await testDb.db.execAsync('DROP TABLE business_account');
    await testDb.db.execAsync('PRAGMA user_version = 5');

    await migrateDatabase(testDb.db);

    const table = await testDb.db.getFirstAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name = 'business_account'`,
    );
    expect(table?.name).toBe('business_account');
    expect(await userVersion()).toBe(LATEST_DATABASE_VERSION);
  });

  it('conserva las metas existentes como metas diarias al migrar el negocio', async () => {
    for (const migration of MIGRATIONS.filter(({ version }) => version <= 4)) {
      await migration.up(testDb.db);
    }
    await testDb.db.execAsync('PRAGMA user_version = 4');

    await testDb.db.execAsync(`
      INSERT INTO business_item (
        id, name, type, quantity, price_per_unit, investment, daily_goal, created_at, updated_at
      ) VALUES
        ('prod-1', 'Producto', 'product', 1, 100, 50, 15000, 1, 1),
        ('serv-1', 'Servicio', 'service', 1, 80, 0, 25000, 1, 1);
    `);

    await migrateDatabase(testDb.db);

    const items = await testDb.db.getAllAsync<{
      id: string;
      goal_amount: number;
      goal_period: string;
      daily_goal: number;
      in_catalog: number;
    }>(
      `SELECT id, goal_amount, goal_period, daily_goal, in_catalog
       FROM business_item
       ORDER BY id`,
    );

    expect(items).toEqual([
      {
        id: 'prod-1',
        goal_amount: 15000,
        goal_period: 'daily',
        daily_goal: 15000,
        in_catalog: 1,
      },
      {
        id: 'serv-1',
        goal_amount: 25000,
        goal_period: 'daily',
        daily_goal: 25000,
        in_catalog: 1,
      },
    ]);
  });

  it('conserva el valor por defecto si falla la migración idempotente de business_item', async () => {
    const errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await migrateDatabase(testDb.db);
    const brokenDb = {
      ...testDb.db,
      getAllAsync: jest.fn().mockRejectedValue(new Error('error forzado')),
    };

    await expect(migrateDatabase(brokenDb as any)).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });

  it('rechaza una base de datos más nueva que la app', async () => {
    await testDb.db.execAsync(`PRAGMA user_version = ${LATEST_DATABASE_VERSION + 1}`);

    await expect(migrateDatabase(testDb.db)).rejects.toThrow(
      'La base de datos es más nueva que esta versión de la app. Actualiza la app para continuar.',
    );
  });

  it('rechaza montos negativos o con decimales en SQLite', async () => {
    await migrateDatabase(testDb.db);

    await expect(
      testDb.db.runAsync(
        `INSERT INTO expense (id, amount, category, ts, deleted_at)
         VALUES ('negativo', -100, 'comida', 1767225600000, NULL)`,
      ),
    ).rejects.toThrow();

    await expect(
      testDb.db.runAsync(
        `INSERT INTO expense (id, amount, category, ts, deleted_at)
         VALUES ('decimal', 12.5, 'comida', 1767225600000, NULL)`,
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
