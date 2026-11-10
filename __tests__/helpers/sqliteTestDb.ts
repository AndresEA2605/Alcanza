import { DatabaseSync } from 'node:sqlite';

import type { BindValue, Database } from '../../src/data/migrations';

export interface TestDatabase {
  db: Database;
  raw: DatabaseSync;
  close: () => void;
}

/**
 * Adaptador de `node:sqlite` a la interfaz asíncrona que usan los repos.
 * Permite probar el SQL real, las restricciones y las migraciones en Jest.
 */
export function createTestDatabase(): TestDatabase {
  const raw = new DatabaseSync(':memory:');

  const db: Database = {
    async execAsync(source: string): Promise<void> {
      raw.exec(source);
    },

    async runAsync(source: string, ...params: BindValue[]) {
      const result = raw.prepare(source).run(...params);

      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },

    async getFirstAsync<T>(
      source: string,
      ...params: BindValue[]
    ): Promise<T | null> {
      const row = raw.prepare(source).get(...params);

      return (row as T | undefined) ?? null;
    },

    async getAllAsync<T>(source: string, ...params: BindValue[]): Promise<T[]> {
      return raw.prepare(source).all(...params) as T[];
    },

    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      raw.exec('BEGIN');

      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };

  return {
    db,
    raw,
    close: () => raw.close(),
  };
}
