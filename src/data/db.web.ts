/**
 * Implementación de la base de datos para web.
 *
 * Usa localStorage para persistir tablas como JSON. Implementa la interfaz
 * `Database` definida en `./migrations` para que los repositorios (incomeRepo,
 * expenseRepo, configRepo, etc.) funcionen sin cambios en el navegador.
 *
 * Soporta el subconjunto de SQL que usa la aplicación:
 * - CREATE TABLE / DROP TABLE / ALTER TABLE (no-op para columnas)
 * - INSERT / UPDATE / DELETE
 * - SELECT con WHERE, ORDER BY, LIMIT
 * - PRAGMA table_info, user_version
 * - withTransactionAsync
 */

import type { BindValue, Database, RunResult } from './migrations';

const STORAGE_PREFIX = 'me-alcanza-web-db:';
const META_KEY = 'me-alcanza-web-meta';

type Row = Record<string, unknown>;

function tableKey(name: string): string {
  return `${STORAGE_PREFIX}${name}`;
}

function loadTables(): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  if (typeof localStorage === 'undefined') {
    return map;
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      const tableName = key.slice(STORAGE_PREFIX.length);
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          map.set(tableName, JSON.parse(raw));
        }
      } catch {
        // Ignorar entradas corruptas.
      }
    }
  }
  return map;
}

function saveTables(tables: Map<string, Row[]>): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
      i--;
    }
  }
  for (const [name, rows] of tables) {
    localStorage.setItem(tableKey(name), JSON.stringify(rows));
  }
}

function getMeta(): { user_version: number } {
  if (typeof localStorage === 'undefined') {
    return { user_version: 0 };
  }
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : { user_version: 0 };
  } catch {
    return { user_version: 0 };
  }
}

function setMeta(meta: { user_version: number }): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function cloneRow(row: Row): Row {
  return { ...row };
}

/**
 * Extrae el nombre de la tabla de una sentencia SQL.
 */
function extractTableName(sql: string): string | null {
  const patterns = [
    /(?:INTO|FROM|TABLE|UPDATE)\s+([`"]?)(\w+)\1/i,
  ];
  for (const pattern of patterns) {
    const match = sql.match(pattern);
    if (match) {
      return match[2];
    }
  }
  return null;
}

/**
 * Evalúa una fila contra una cláusula WHERE simplificada.
 * Soporta: col = ?, col IS NULL, col IS NOT NULL, col >= ?, col <= ?, col > ?, col < ?,
 * y combinaciones con AND.
 */
function parseWhere(
  rows: Row[],
  whereSql: string | undefined,
  params: BindValue[],
): Row[] {
  if (!whereSql) {
    return rows.map(cloneRow);
  }

  let paramIndex = 0;
  const getParam = (): BindValue => {
    const value = params[paramIndex];
    paramIndex++;
    return value;
  };

  const evaluate = (row: Row, condition: string): boolean => {
    const cond = condition.trim();
    if (cond.startsWith('(') && cond.endsWith(')')) {
      return evaluate(row, cond.slice(1, -1).trim());
    }

    const upper = cond.toUpperCase();

    if (upper.endsWith(' IS NULL')) {
      const col = cond.replace(/ IS NULL$/i, '').trim();
      return row[col] === null || row[col] === undefined;
    }
    if (upper.endsWith(' IS NOT NULL')) {
      const col = cond.replace(/ IS NOT NULL$/i, '').trim();
      return row[col] !== null && row[col] !== undefined;
    }

    const matchEq = cond.match(/^(\w+)\s*=\s*\?$/i);
    if (matchEq) {
      return row[matchEq[1]] === getParam();
    }

    const matchGte = cond.match(/^(\w+)\s*>=\s*\?$/i);
    if (matchGte) {
      return (row[matchGte[1]] as number) >= (getParam() as number);
    }

    const matchLte = cond.match(/^(\w+)\s*<=\s*\?$/i);
    if (matchLte) {
      return (row[matchLte[1]] as number) <= (getParam() as number);
    }

    const matchGt = cond.match(/^(\w+)\s*>\s*\?$/i);
    if (matchGt) {
      return (row[matchGt[1]] as number) > (getParam() as number);
    }

    const matchLt = cond.match(/^(\w+)\s*<\s*\?$/i);
    if (matchLt) {
      return (row[matchLt[1]] as number) < (getParam() as number);
    }

    return true;
  };

  const andParts = whereSql.split(/\s+and\s+/i);
  return rows.filter((row) => andParts.every((part) => evaluate(row, part.trim())));
}

function parseOrderBy(
  rows: Row[],
  orderBySql: string | undefined,
): Row[] {
  if (!orderBySql) {
    return rows;
  }
  const normalized = orderBySql.trim();
  const parts = normalized.split(/\s+/);
  // Formato esperado: "ts DESC, id DESC" o "col ASC"
  const field = parts[0];
  const direction = parts[1]?.toUpperCase() === 'DESC' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    if (av == null) return -direction;
    if (bv == null) return direction;
    return (av as unknown as number) < (bv as unknown as number) ? -direction : direction;
  });
}

/**
 * Extrae nombres de columna de `INSERT INTO tabla (col1, col2) VALUES (...)`.
 */
function extractInsertColumns(sql: string): string[] | null {
  const match = sql.match(/\(([^)]*)\)\s*values/i);
  if (!match) return null;
  return match[1].split(',').map((c) => c.trim().replace(/[`"]/g, ''));
}

export class WebDatabase implements Database {
  private tables: Map<string, Row[]>;

  constructor() {
    this.tables = loadTables();
  }

  private persist(): void {
    saveTables(this.tables);
  }

  async execAsync(source: string): Promise<void> {
    const normalized = source.trim();

    if (/^pragma journal_mode/i.test(normalized)) return;
    if (/^pragma busy_timeout/i.test(normalized)) return;
    if (/^pragma wal_checkpoint/i.test(normalized)) return;

    const versionSet = normalized.match(/^pragma user_version\s*=\s*(\d+)/i);
    if (versionSet) {
      setMeta({ user_version: parseInt(versionSet[1], 10) });
      return;
    }

    if (/^create table/i.test(normalized)) {
      const tableName = extractTableName(normalized);
      if (tableName && !this.tables.has(tableName)) {
        this.tables.set(tableName, []);
        this.persist();
      }
      return;
    }

    if (/^drop table/i.test(normalized)) {
      const tableName = extractTableName(normalized);
      if (tableName) {
        this.tables.delete(tableName);
        this.persist();
      }
      return;
    }

    if (/^alter table/i.test(normalized)) {
      // ALTER TABLE ... ADD COLUMN: las columnas son dinámicas por fila.
      return;
    }

    if (/rename to/i.test(normalized)) {
      const match = normalized.match(/rename to\s+([`"]?)(\w+)\1/i);
      if (match) {
        const newName = match[2];
        for (const [name] of this.tables) {
          if (name.endsWith('_new')) {
            const rows = this.tables.get(name);
            this.tables.delete(name);
            this.tables.set(newName, rows ?? []);
            this.persist();
            return;
          }
        }
      }
      return;
    }

    throw new Error(`WebDatabase no soporta: ${source.slice(0, 80)}`);
  }

  async runAsync(
    source: string,
    ...params: BindValue[]
  ): Promise<RunResult> {
    const normalized = source.trim();

    if (/^insert into/i.test(normalized)) {
      const tableName = extractTableName(normalized);
      if (!tableName) {
        throw new Error(`No se pudo extraer tabla de: ${source}`);
      }
      let rows = this.tables.get(tableName);
      if (!rows) {
        rows = [];
        this.tables.set(tableName, rows);
      }

      const columns = extractInsertColumns(normalized);
      const row: Row = {};
      if (columns) {
        for (let i = 0; i < columns.length; i++) {
          row[columns[i]] = params[i];
        }
      } else {
        for (let i = 0; i < params.length; i++) {
          row[`col_${i}`] = params[i];
        }
      }
      rows.push(row);
      this.persist();
      return { changes: 1, lastInsertRowId: rows.length };
    }

    if (/^update/i.test(normalized)) {
      const tableName = extractTableName(normalized);
      if (!tableName) {
        throw new Error(`No se pudo extraer tabla de: ${source}`);
      }
      const rows = this.tables.get(tableName);
      if (!rows) {
        return { changes: 0, lastInsertRowId: 0 };
      }

      const setMatch = normalized.match(/set\s+(.*?)(?:\s+where\s|$)/i);
      const whereMatch = normalized.match(/\bwhere\s+(.*)/i);
      const whereSql = whereMatch ? whereMatch[1] : undefined;
      const paramValues = [...params];

      let changes = 0;
      for (const row of rows) {
        const matches = parseWhere([row], whereSql, paramValues).length > 0;
        if (!matches) continue;

        if (setMatch) {
          const assignments = setMatch[1].split(',');
          for (const assignment of assignments) {
            const eqIndex = assignment.indexOf('=');
            if (eqIndex === -1) continue;
            const col = assignment.slice(0, eqIndex).trim();
            const val = assignment.slice(eqIndex + 1).trim();
            if (val === '?') {
              row[col] = paramValues.shift();
            } else {
              row[col] = val.replace(/^'|'$/g, '');
            }
          }
        }
        changes++;
      }
      this.persist();
      return { changes, lastInsertRowId: 0 };
    }

    if (/^delete from/i.test(normalized)) {
      const tableName = extractTableName(normalized);
      if (!tableName) {
        throw new Error(`No se pudo extraer tabla de: ${source}`);
      }
      const rows = this.tables.get(tableName);
      if (!rows) {
        return { changes: 0, lastInsertRowId: 0 };
      }

      const whereMatch = normalized.match(/\bwhere\s+(.*)/i);
      const whereSql = whereMatch ? whereMatch[1] : undefined;

      const toDelete = parseWhere(rows, whereSql, params);
      const changes = toDelete.length;
      this.tables.set(
        tableName,
        rows.filter((row) => !toDelete.includes(row)),
      );
      this.persist();
      return { changes, lastInsertRowId: 0 };
    }

    throw new Error(`WebDatabase no soporta: ${source.slice(0, 80)}`);
  }

  async getFirstAsync<T>(
    source: string,
    ...params: BindValue[]
  ): Promise<T | null> {
    const results = await this.getAllAsync<T>(source, ...params);
    return results.length > 0 ? results[0] : null;
  }

  async getAllAsync<T>(
    source: string,
    ...params: BindValue[]
  ): Promise<T[]> {
    const normalized = source.trim();

    const versionMatch = normalized.match(/^pragma user_version$/i);
    if (versionMatch) {
      return [{ user_version: getMeta().user_version }] as unknown as T[];
    }

    const tableInfoMatch = normalized.match(/^pragma table_info\((\w+)\)$/i);
    if (tableInfoMatch) {
      const tableName = tableInfoMatch[1];
      const rows = this.tables.get(tableName);
      if (!rows || rows.length === 0) {
        return [] as unknown as T[];
      }
      const columns = Object.keys(rows[0]).map((name) => ({
        cid: 0,
        name,
        type: '',
        notnull: 0,
        dflt_value: null,
        pk: 0,
      }));
      return columns as unknown as T[];
    }

    if (/^select.*from sqlite_master/i.test(normalized)) {
      const tables = loadTables();
      const names = Array.from(tables.keys()).map((name) => ({ name }));
      return names as unknown as T[];
    }

    const selectMatch = normalized.match(
      /^select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(.*?))?(?:\s+order\s+by\s+(.*?))?(?:\s+limit\s+(\d+))?$/is,
    );
    if (selectMatch) {
      const [, columnsRaw, tableName, whereRaw, orderByRaw, limitRaw] =
        selectMatch;
      const rows = this.tables.get(tableName) ?? [];
      const columns = columnsRaw.split(',').map((c) => c.trim());

      let filtered = parseWhere(rows, whereRaw, params);
      if (orderByRaw) {
        // Múltiples campos de ORDER BY separados por coma.
        const orderParts = orderByRaw.split(',');
        let current = filtered;
        for (let i = orderParts.length - 1; i >= 0; i--) {
          current = parseOrderBy(current, orderParts[i].trim());
        }
        filtered = current;
      }

      if (columns.length === 1 && columns[0] === '*') {
        const limit = limitRaw ? parseInt(limitRaw, 10) : Infinity;
        return filtered.slice(0, limit) as unknown as T[];
      }

      const projected = filtered.map((row) => {
        const projectedRow: Row = {};
        for (const col of columns) {
          projectedRow[col] = row[col];
        }
        return projectedRow;
      });
      const limit = limitRaw ? parseInt(limitRaw, 10) : Infinity;
      return projected.slice(0, limit) as unknown as T[];
    }

    throw new Error(`WebDatabase no soporta SELECT: ${source.slice(0, 80)}`);
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
    this.persist();
  }
}

let databasePromise: Promise<WebDatabase> | null = null;

export function getDatabase(): Promise<WebDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = new WebDatabase();
      return db;
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export const DATABASE_NAME = 'mealcanza-web.db';
