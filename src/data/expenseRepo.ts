import type { Category, DateRange, Expense } from '../domain/budget';
import type { Database } from './migrations';

interface ExpenseRow {
  id: string;
  amount: number;
  category: Category;
  ts: number;
  deleted_at: number | null;
}

export interface NewExpense {
  id: string;
  amount: number;
  category: Category;
  ts: number;
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category,
    ts: row.ts,
    deletedAt: row.deleted_at,
  };
}

/** Identificador local; no requiere red ni servicios externos. */
export function createExpenseId(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');

  return `exp_${now.toString(36)}_${random}`;
}

export async function createExpense(
  db: Database,
  input: NewExpense,
): Promise<Expense> {
  await db.runAsync(
    `INSERT INTO expense (id, amount, category, ts, deleted_at)
     VALUES (?, ?, ?, ?, NULL)`,
    input.id,
    input.amount,
    input.category,
    input.ts,
  );

  return {
    id: input.id,
    amount: input.amount,
    category: input.category,
    ts: input.ts,
    deletedAt: null,
  };
}

export async function listExpensesBetween(
  db: Database,
  range: DateRange,
): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT id, amount, category, ts, deleted_at
     FROM expense
     WHERE deleted_at IS NULL AND ts >= ? AND ts < ?
     ORDER BY ts DESC, id DESC`,
    range.start,
    range.end,
  );

  return rows.map(mapExpense);
}

export async function listExpensesByMonth(
  db: Database,
  range: DateRange,
): Promise<Expense[]> {
  return listExpensesBetween(db, range);
}

export async function listExpensesByDay(
  db: Database,
  range: DateRange,
): Promise<Expense[]> {
  return listExpensesBetween(db, range);
}

export async function getExpenseById(
  db: Database,
  id: string,
): Promise<Expense | null> {
  const row = await db.getFirstAsync<ExpenseRow>(
    `SELECT id, amount, category, ts, deleted_at
     FROM expense
     WHERE id = ?`,
    id,
  );

  return row ? mapExpense(row) : null;
}

/** Borrado lógico: el gasto se conserva para poder deshacer. */
export async function softDeleteExpense(
  db: Database,
  id: string,
  deletedAt: number,
): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE expense
     SET deleted_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    deletedAt,
    id,
  );

  return result.changes > 0;
}

export async function restoreExpense(
  db: Database,
  id: string,
): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE expense
     SET deleted_at = NULL
     WHERE id = ? AND deleted_at IS NOT NULL`,
    id,
  );

  return result.changes > 0;
}
