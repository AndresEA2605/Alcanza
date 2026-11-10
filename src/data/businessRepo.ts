/**
 * Repositorio de ítems de negocio (productos o servicios del emprendimiento).
 *
 * Almacena en SQLite la información de cada producto o servicio. Los cálculos
 * de ganancia se hacen en el dominio puro (`src/domain/business.ts`).
 *
 * Esquema:
 *   business_item(id, name, type, quantity, price_per_unit, investment, daily_goal, goal_amount, goal_period, description, image_uri, created_at, updated_at)
 */

import {
  calculateBusiness,
  normalizeBusinessGoal,
  type BusinessCalculation,
  type BusinessGoalPeriod,
  type BusinessItem,
  type NewBusinessItem,
} from '../domain/business';
import type { Database } from './migrations';

interface BusinessItemRow {
  id: string;
  name: string;
  type: 'product' | 'service';
  quantity: number;
  price_per_unit: number;
  investment: number;
  daily_goal: number;
  goal_amount?: number;
  goal_period?: BusinessGoalPeriod;
  description?: string;
  image_uri?: string | null;
  created_at: number;
  updated_at: number;
}

function mapBusinessItem(row: BusinessItemRow): BusinessItem {
  return {
    id: row.id,
    name: row.name,
    type: (row.type as 'product' | 'service') ?? 'product',
    quantity: row.quantity ?? 0,
    pricePerUnit: row.price_per_unit ?? 0,
    investment: row.investment ?? 0,
    dailyGoal: row.daily_goal ?? 0,
    goalAmount: row.goal_amount ?? row.daily_goal ?? 0,
    goalPeriod: row.goal_period ?? 'daily',
    description: row.description ?? '',
    imageUri: row.image_uri ?? null,
    createdAt: row.created_at ?? Date.now(),
    updatedAt: row.updated_at ?? Date.now(),
  };
}

/** Identificador local; no requiere red ni servicios externos. */
export function createBusinessId(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');

  return `biz_${now.toString(36)}_${random}`;
}

export async function createBusinessItem(
  db: Database,
  input: NewBusinessItem,
): Promise<BusinessItem> {
  const now = Date.now();
  const id = createBusinessId(now);

  await db.runAsync(
    `INSERT INTO business_item (id, name, type, quantity, price_per_unit, investment, daily_goal, goal_amount, goal_period, description, image_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.type,
    input.quantity,
    input.pricePerUnit,
    input.investment ?? 0,
    normalizeBusinessGoal(
      input.goalAmount ?? input.dailyGoal,
      input.goalPeriod ?? 'daily',
    ),
    input.goalAmount ?? input.dailyGoal,
    input.goalPeriod ?? 'daily',
    input.description?.trim() ?? '',
    input.imageUri ?? null,
    now,
    now,
  );

  return {
    id,
    name: input.name,
    type: input.type,
    quantity: input.quantity,
    pricePerUnit: input.pricePerUnit,
    investment: input.investment ?? 0,
    dailyGoal: normalizeBusinessGoal(
      input.goalAmount ?? input.dailyGoal,
      input.goalPeriod ?? 'daily',
    ),
    goalAmount: input.goalAmount ?? input.dailyGoal,
    goalPeriod: input.goalPeriod ?? 'daily',
    description: input.description?.trim() ?? '',
    imageUri: input.imageUri ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listBusinessItems(db: Database): Promise<BusinessItem[]> {
  const rows = await db.getAllAsync<BusinessItemRow>(
    `SELECT id, name, type, quantity, price_per_unit, investment, daily_goal, goal_amount, goal_period, description, image_uri, created_at, updated_at
     FROM business_item
     ORDER BY name COLLATE NOCASE ASC`,
  );

  return rows.map(mapBusinessItem);
}

export async function getBusinessItemById(
  db: Database,
  id: string,
): Promise<BusinessItem | null> {
  const row = await db.getFirstAsync<BusinessItemRow>(
    `SELECT id, name, type, quantity, price_per_unit, investment, daily_goal, goal_amount, goal_period, description, image_uri, created_at, updated_at
     FROM business_item
     WHERE id = ?`,
    id,
  );

  return row ? mapBusinessItem(row) : null;
}

export async function updateBusinessItem(
  db: Database,
  id: string,
  input: Partial<NewBusinessItem>,
): Promise<BusinessItem | null> {
  const existing = await getBusinessItemById(db, id);

  if (!existing) {
    return null;
  }

  const now = Date.now();
  const goalPeriod =
    input.goalPeriod ??
    (input.dailyGoal !== undefined && input.goalAmount === undefined
      ? 'daily'
      : existing.goalPeriod);
  const goalAmount =
    input.goalAmount ??
    (input.dailyGoal !== undefined && input.goalPeriod === undefined
      ? input.dailyGoal
      : existing.goalAmount);
  const updated: BusinessItem = {
    ...existing,
    name: input.name ?? existing.name,
    type: input.type ?? existing.type,
    quantity: input.quantity ?? existing.quantity,
    pricePerUnit: input.pricePerUnit ?? existing.pricePerUnit,
    investment: input.investment ?? existing.investment,
    dailyGoal:
      input.dailyGoal ??
      normalizeBusinessGoal(goalAmount, goalPeriod),
    goalAmount,
    goalPeriod,
    description:
      input.description !== undefined
        ? input.description.trim()
        : existing.description,
    imageUri:
      input.imageUri !== undefined ? input.imageUri : existing.imageUri,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE business_item
     SET name = ?, type = ?, quantity = ?, price_per_unit = ?, investment = ?, daily_goal = ?, goal_amount = ?, goal_period = ?, description = ?, image_uri = ?, updated_at = ?
     WHERE id = ?`,
    updated.name,
    updated.type,
    updated.quantity,
    updated.pricePerUnit,
    updated.investment,
    updated.dailyGoal,
    updated.goalAmount,
    updated.goalPeriod,
    updated.description,
    updated.imageUri,
    updated.updatedAt,
    id,
  );

  return updated;
}

export async function deleteBusinessItem(
  db: Database,
  id: string,
): Promise<boolean> {
  const result = await db.runAsync(
    `DELETE FROM business_item WHERE id = ?`,
    id,
  );

  return result.changes > 0;
}

export async function calculateAllBusinessItems(
  db: Database,
): Promise<BusinessCalculation[]> {
  const items = await listBusinessItems(db);

  return items.map((item) =>
    calculateBusiness({
      type: item.type,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      investment: item.investment,
      dailyGoal: item.dailyGoal,
    }),
  );
}
