/**
 * Esquema y migraciones versionadas de la base de datos local.
 *
 * Este módulo es puro respecto a Expo: recibe un objeto que cumple la
 * interfaz `Database`, de modo que las migraciones se pueden probar en Node
 * sin cargar el módulo nativo de SQLite.
 */

export type BindValue = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface Database {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: BindValue[]): Promise<RunResult>;
  getFirstAsync<T>(source: string, ...params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: BindValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export interface Migration {
  version: number;
  up(db: Database): Promise<void>;
}

/**
 * Migraciones en orden. Nunca se debe editar una migración ya publicada:
 * se agrega una nueva con el siguiente número de versión.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE month_config (
          month TEXT PRIMARY KEY NOT NULL
            CHECK (length(month) = 7 AND month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
          income INTEGER NOT NULL
            CHECK (typeof(income) = 'integer' AND income >= 0),
          fixed INTEGER NOT NULL
            CHECK (typeof(fixed) = 'integer' AND fixed >= 0)
        );

        CREATE TABLE expense (
          id TEXT PRIMARY KEY NOT NULL,
          amount INTEGER NOT NULL
            CHECK (typeof(amount) = 'integer' AND amount > 0),
          category TEXT NOT NULL
            CHECK (category IN ('comida', 'transporte', 'ocio', 'otros')),
          ts INTEGER NOT NULL
            CHECK (typeof(ts) = 'integer'),
          deleted_at INTEGER NULL
            CHECK (deleted_at IS NULL OR typeof(deleted_at) = 'integer')
        );

        CREATE INDEX idx_expense_ts ON expense (ts);
      `);
    },
  },
  {
    version: 2,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE business_item (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL
            CHECK (length(name) > 0 AND length(name) <= 100),
          type TEXT NOT NULL
            CHECK (type IN ('product', 'service')),
          quantity INTEGER NOT NULL
            CHECK (typeof(quantity) = 'integer' AND quantity > 0),
          price_per_unit INTEGER NOT NULL
            CHECK (typeof(price_per_unit) = 'integer' AND price_per_unit >= 0),
          investment INTEGER NOT NULL
            CHECK (typeof(investment) = 'integer' AND investment >= 0),
          daily_goal INTEGER NOT NULL
            CHECK (typeof(daily_goal) = 'integer' AND daily_goal >= 0),
          created_at INTEGER NOT NULL
            CHECK (typeof(created_at) = 'integer'),
          updated_at INTEGER NOT NULL
            CHECK (typeof(updated_at) = 'integer')
        );
      `);
    },
  },
  {
    version: 3,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE business_account (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL
            CHECK (length(name) > 0 AND length(name) <= 100),
          type TEXT NOT NULL
            CHECK (type IN ('cash', 'bank', 'wallet')),
          amount INTEGER NOT NULL
            CHECK (typeof(amount) = 'integer' AND amount >= 0),
          created_at INTEGER NOT NULL
            CHECK (typeof(created_at) = 'integer'),
          updated_at INTEGER NOT NULL
            CHECK (typeof(updated_at) = 'integer')
        );
      `);
    },
  },
  {
    version: 4,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE income_entry (
          id TEXT PRIMARY KEY NOT NULL,
          amount INTEGER NOT NULL
            CHECK (typeof(amount) = 'integer' AND amount > 0),
          description TEXT NOT NULL DEFAULT '',
          ts INTEGER NOT NULL
            CHECK (typeof(ts) = 'integer'),
          deleted_at INTEGER NULL
            CHECK (deleted_at IS NULL OR typeof(deleted_at) = 'integer')
        );

        CREATE INDEX idx_income_entry_ts ON income_entry (ts);
      `);
    },
  },
];

export const LATEST_DATABASE_VERSION =
  Math.max(
    MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0,
    4,
  );

/**
 * Aplica las migraciones pendientes dentro de una transacción por versión.
 * Si una migración falla, SQLite revierte también el cambio de user_version.
 */
export async function migrateDatabase(db: Database): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion > LATEST_DATABASE_VERSION) {
    throw new Error(
      'La base de datos es más nueva que esta versión de la app. Actualiza la app para continuar.',
    );
  }

  const migrations = [...MIGRATIONS].sort((a, b) => a.version - b.version);

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  // Migración de seguridad para business_item: asegurar que el esquema sea el
  // correcto independientemente del user_version. Recrea la tabla si tiene
  // columnas antiguas (sale_price, cost_price) que no son compatibles.
  await migrateBusinessItemSchema(db);
}

/**
 * Migración de seguridad idempotente para business_item.
 *
 * Verifica el esquema real de la tabla y la recrea si no tiene las columnas
 * correctas (price_per_unit, type, investment). Usa valores por defecto (0)
 * para todas las columnas numéricas, evitando leer columnas antiguas que
 * pueden tener valores NULL o no existir.
 *
 * Nunca lanza: si algo falla, la app sigue funcionando (los datos de
 * business_item simplemente no estarán disponibles hasta que el usuario los
 * ingrese de nuevo).
 */
async function migrateBusinessItemSchema(db: Database): Promise<void> {
  try {
    const columns = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(business_item)`,
    );
    const existing = new Set(columns.map((c) => c.name));

    const row = await db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version',
    );
    const currentVersion = row?.user_version ?? 0;

    // Si ya tiene el esquema nuevo y user_version es al menos 3, no hacer nada
    if (
      existing.has('price_per_unit') &&
      existing.has('type') &&
      currentVersion >= 3
    ) {
      return;
    }

    // Recrear la tabla con el esquema nuevo, usando valores por defecto
    // para todas las columnas numéricas (sin leer columnas antiguas que
    // pueden tener NULL o no existir).
    await db.execAsync(`
      CREATE TABLE business_item_new (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
        type TEXT NOT NULL DEFAULT 'product' CHECK (type IN ('product', 'service')),
        quantity INTEGER NOT NULL DEFAULT 0 CHECK (typeof(quantity) = 'integer' AND quantity > 0),
        price_per_unit INTEGER NOT NULL DEFAULT 0 CHECK (typeof(price_per_unit) = 'integer' AND price_per_unit >= 0),
        investment INTEGER NOT NULL DEFAULT 0 CHECK (typeof(investment) = 'integer' AND investment >= 0),
        daily_goal INTEGER NOT NULL DEFAULT 0 CHECK (typeof(daily_goal) = 'integer' AND daily_goal >= 0),
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      );
    `);

    await db.execAsync(`
      INSERT INTO business_item_new (id, name, type, quantity, price_per_unit, investment, daily_goal, created_at, updated_at)
      SELECT id, name, 'product', quantity, 0, 0, daily_goal, created_at, updated_at
      FROM business_item;
    `);

    await db.execAsync(`DROP TABLE business_item;`);
    await db.execAsync(`ALTER TABLE business_item_new RENAME TO business_item;`);

    // Siempre asegurar que user_version sea al menos 3 (versión del esquema de business_item)
    if (currentVersion < 3) {
      await db.execAsync(`PRAGMA user_version = 3`);
    }
  } catch (error) {
    // Si algo falla (tabla bloqueada, columnas inexistentes, etc.), no
    // lanzamos el error para no romper la app. Los datos de business_item
    // simplemente no estarán disponibles hasta que el usuario los ingrese
    // de nuevo.
    console.warn('No se pudo migrar business_item:', error);
  }
}
