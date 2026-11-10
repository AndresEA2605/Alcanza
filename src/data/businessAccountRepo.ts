/**
 * Repositorio de cuentas de dinero (efectivo, bancolombia, nequi, etc.).
 * Se guarda en SQLite.
 */

import type { AccountAccount, NewAccount } from '../domain/businessAccount';
import type { Database } from './migrations';

interface AccountRow {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'wallet';
  amount: number;
  created_at: number;
  updated_at: number;
}

function mapAccount(row: AccountRow): AccountAccount {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: row.amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createAccountId(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `biz_${now.toString(36)}_${random}`;
}

export async function createAccount(db: Database, input: NewAccount): Promise<AccountAccount> {
  const now = Date.now();
  const id = createAccountId(now);

  await db.runAsync(
    `INSERT INTO business_account (id, name, type, amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.type,
    input.amount,
    now,
    now,
  );

  return {
    id,
    name: input.name,
    type: input.type,
    amount: input.amount,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listAccounts(db: Database): Promise<AccountAccount[]> {
  const rows = await db.getAllAsync<AccountRow>(
    `SELECT id, name, type, amount, created_at, updated_at
     FROM business_account
     ORDER BY name COLLATE NOCASE ASC`,
  );
  return rows.map(mapAccount);
}

export async function getAccountById(db: Database, id: string): Promise<AccountAccount | null> {
  const row = await db.getFirstAsync<AccountRow>(
    `SELECT id, name, type, amount, created_at, updated_at
     FROM business_account
     WHERE id = ?`,
    id,
  );
  return row ? mapAccount(row) : null;
}

export async function updateAccount(
  db: Database,
  id: string,
  input: Partial<NewAccount>,
): Promise<AccountAccount | null> {
  const existing = await getAccountById(db, id);
  if (!existing) return null;

  const now = Date.now();
  const updated: AccountAccount = {
    ...existing,
    name: input.name ?? existing.name,
    type: input.type ?? existing.type,
    amount: input.amount ?? existing.amount,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE business_account
     SET name = ?, type = ?, amount = ?, updated_at = ?
     WHERE id = ?`,
    updated.name,
    updated.type,
    updated.amount,
    updated.updatedAt,
    id,
  );

  return updated;
}

export async function deleteAccount(db: Database, id: string): Promise<boolean> {
  const result = await db.runAsync(`DELETE FROM business_account WHERE id = ?`, id);
  return result.changes > 0;
}
