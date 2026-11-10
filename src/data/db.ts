import * as SQLite from 'expo-sqlite';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { migrateDatabase } from './migrations';
import { migrateProductImages } from './productImageStorage';

export type { Database } from './migrations';

export const DATABASE_NAME = 'mealcanza.db';
const ENCRYPTED_DATABASE_NAME = 'mealcanza-encrypted.db';
const DATABASE_KEY_STORAGE = 'me-alcanza-sqlcipher-key';

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
  const db = await openProtectedDatabase();

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA busy_timeout = 5000;');
  await migrateDatabase(db);
  await migrateProductImages(db);

  return db;
}

async function openProtectedDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error(
      'La versión web no está habilitada para proteger tus datos locales.',
    );
  }

  const directory = SQLite.defaultDatabaseDirectory;
  if (typeof directory !== 'string' || directory.length === 0) {
    throw new Error('No se encontró el almacenamiento local seguro de la app.');
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    const encryptedFile = new File(directory, ENCRYPTED_DATABASE_NAME);
    if (encryptedFile.exists) {
      throw new Error(
        'Tus datos están cifrados y Expo Go no puede abrirlos. Usa la versión de desarrollo instalada para continuar.',
      );
    }

    return SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  const legacyFile = new File(directory, DATABASE_NAME);
  const encryptedFile = new File(directory, ENCRYPTED_DATABASE_NAME);
  const key = await getDatabaseKey(legacyFile.exists, encryptedFile.exists);
  const encryptedDb = await openEncryptedDatabase(
    key,
    directory,
    encryptedFile.exists && !legacyFile.exists,
  );
  let legacyDb: SQLite.SQLiteDatabase | null = null;

  try {
    if (legacyFile.exists) {
      legacyDb = await SQLite.openDatabaseAsync(
        DATABASE_NAME,
        { useNewConnection: true },
        directory,
      );
      await legacyDb.execAsync(
        'PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;',
      );
      await SQLite.backupDatabaseAsync({
        sourceDatabase: legacyDb,
        destDatabase: encryptedDb,
      });
      await verifyDatabaseCopy(legacyDb, encryptedDb);
      await migrateDatabase(encryptedDb);
      await encryptedDb.execAsync('PRAGMA journal_mode = WAL;');
      await legacyDb.closeAsync();
      legacyDb = null;
      await SQLite.deleteDatabaseAsync(DATABASE_NAME, directory);
    }

    return encryptedDb;
  } catch (error) {
    if (legacyDb) {
      await legacyDb.closeAsync();
    }
    await encryptedDb.closeAsync();
    throw error;
  }
}

async function getDatabaseKey(
  hasLegacyDatabase: boolean,
  hasEncryptedDatabase: boolean,
): Promise<string> {
  const storedKey = await SecureStore.getItemAsync(DATABASE_KEY_STORAGE);
  if (storedKey) {
    if (!/^[\da-f]{64}$/i.test(storedKey)) {
      throw new Error('La llave de cifrado local no tiene un formato válido.');
    }
    return storedKey;
  }

  if (hasEncryptedDatabase && !hasLegacyDatabase) {
    throw new Error(
      'No se encontró la llave para descifrar tus datos. La base local se conserva sin cambios.',
    );
  }

  const keyBytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(keyBytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  await SecureStore.setItemAsync(DATABASE_KEY_STORAGE, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

async function openEncryptedDatabase(
  key: string,
  directory: string,
  alreadyExists: boolean,
): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(ENCRYPTED_DATABASE_NAME, {}, directory);

  try {
    const cipher = await db.getFirstAsync<{ cipher_version: string }>(
      'PRAGMA cipher_version',
    );
    if (!cipher?.cipher_version) {
      throw new Error(
        'El cifrado SQLCipher no está disponible. Instala la versión de desarrollo para abrir tus datos.',
      );
    }

    await db.execAsync(`PRAGMA key = "x'${key}'";`);
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
    return db;
  } catch (error) {
    await db.closeAsync();
    if (!alreadyExists) {
      await SQLite.deleteDatabaseAsync(ENCRYPTED_DATABASE_NAME, directory);
    }
    throw error;
  }
}

async function verifyDatabaseCopy(
  source: SQLite.SQLiteDatabase,
  destination: SQLite.SQLiteDatabase,
): Promise<void> {
  const sourceTables = await getUserTableNames(source);
  const destinationTables = await getUserTableNames(destination);
  if (JSON.stringify(sourceTables) !== JSON.stringify(destinationTables)) {
    throw new Error('No se pudo verificar la copia cifrada de la base local.');
  }

  for (const table of sourceTables) {
    const quotedTable = `"${table.replaceAll('"', '""')}"`;
    const sourceCount = await source.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${quotedTable}`,
    );
    const destinationCount = await destination.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${quotedTable}`,
    );
    if (sourceCount?.count !== destinationCount?.count) {
      throw new Error('No se pudo verificar la copia cifrada de la base local.');
    }
  }

  const integrity = await destination.getFirstAsync<{
    integrity_check: string;
  }>('PRAGMA integrity_check');
  if (integrity?.integrity_check !== 'ok') {
    throw new Error('La base local cifrada no pasó la verificación de integridad.');
  }
}

async function getUserTableNames(
  db: SQLite.SQLiteDatabase,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  );
  return rows.map(({ name }) => name);
}
