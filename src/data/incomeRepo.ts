import type { DateRange, IncomeEntry } from '../domain/budget';
import type { Database } from './migrations';

interface IncomeRow {
  id: string;
  amount: number;
  description: string;
  ts: number;
  deleted_at: number | null;
}

export interface NewIncome {
  id: string;
  amount: number;
  description?: string;
  ts: number;
}

function mapIncome(row: IncomeRow): IncomeEntry {
  return {
    id: row.id,
    amount: row.amount,
    description: row.description ?? '',
    ts: row.ts,
    deletedAt: row.deleted_at,
  };
}

/** Identificador local único para ingresos; no requiere red. */
export function createIncomeId(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');

  return `inc_${now.toString(36)}_${random}`;
}

export async function createIncome(
  db: Database,
  input: NewIncome,
): Promise<IncomeEntry> {
  const description = input.description ?? '';
  await db.runAsync(
    `INSERT INTO income_entry (id, amount, description, ts, deleted_at)
     VALUES (?, ?, ?, ?, NULL)`,
    input.id,
    input.amount,
    description,
    input.ts,
  );

  return {
    id: input.id,
    amount: input.amount,
    description,
    ts: input.ts,
    deletedAt: null,
  };
}

export async function listIncomesBetween(
  db: Database,
  range: DateRange,
): Promise<IncomeEntry[]> {
  const rows = await db.getAllAsync<IncomeRow>(
    `SELECT id, amount, description, ts, deleted_at
     FROM income_entry
     WHERE deleted_at IS NULL AND ts >= ? AND ts < ?
     ORDER BY ts DESC, id DESC`,
    range.start,
    range.end,
  );

  return rows.map(mapIncome);
}

export async function listIncomesByMonth(
  db: Database,
  range: DateRange,
): Promise<IncomeEntry[]> {
  return listIncomesBetween(db, range);
}

export async function listIncomesByDay(
  db: Database,
  range: DateRange,
): Promise<IncomeEntry[]> {
  return listIncomesBetween(db, range);
}

export async function getIncomeById(
  db: Database,
  id: string,
): Promise<IncomeEntry | null> {
  const row = await db.getFirstAsync<IncomeRow>(
    `SELECT id, amount, description, ts, deleted_at
     FROM income_entry
     WHERE id = ?`,
    id,
  );

  return row ? mapIncome(row) : null;
}

export async function softDeleteIncome(
  db: Database,
  id: string,
  deletedAt = Date.now(),
): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE income_entry
     SET deleted_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    deletedAt,
    id,
  );

  return result.changes > 0;
}

export async function restoreIncome(
  db: Database,
  id: string,
): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE income_entry
     SET deleted_at = NULL
     WHERE id = ? AND deleted_at IS NOT NULL`,
    id,
  );

  return result.changes > 0;
}
