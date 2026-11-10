import * as SQLite from 'expo-sqlite';

import { migrateDatabase } from './migrations';

export type { Database } from './migrations';

export const DATABASE_NAME = 'mealcanza.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Abre la base de datos una sola vez por proceso y aplica las migraciones.
 * Si la apertura falla, la promesa se descarta para permitir un reintento.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA busy_timeout = 5000;');
  await migrateDatabase(db);

  return db;
}
