import type { BusinessGoalPeriod, BusinessSellerProfile } from '../domain/business';
import type { Database } from './migrations';

export interface BusinessSettings extends BusinessSellerProfile {
  goalAmount: number;
  goalPeriod: BusinessGoalPeriod;
}

interface BusinessSettingsRow {
  goal_amount: number;
  goal_period: BusinessGoalPeriod;
  store_name?: string | null;
  seller_name?: string | null;
  seller_phone?: string | null;
  seller_city?: string | null;
  seller_notes?: string | null;
}

export async function getBusinessSettings(
  db: Database,
): Promise<BusinessSettings> {
  const row = await db.getFirstAsync<BusinessSettingsRow>(
    `SELECT goal_amount, goal_period, store_name, seller_name, seller_phone, seller_city, seller_notes
     FROM business_settings
     WHERE id = 1`,
  );

  if (!row) {
    throw new Error('No encontré los ajustes de Mi negocio.');
  }

  return {
    goalAmount: row.goal_amount,
    goalPeriod: row.goal_period,
    storeName: row.store_name ?? '',
    sellerName: row.seller_name ?? '',
    sellerPhone: row.seller_phone ?? '',
    sellerCity: row.seller_city ?? '',
    sellerNotes: row.seller_notes ?? '',
  };
}

export async function saveBusinessSettings(
  db: Database,
  settings: Partial<BusinessSettings>,
): Promise<void> {
  const current = await getBusinessSettings(db);
  const updated: BusinessSettings = {
    ...current,
    ...settings,
  };

  await db.runAsync(
    `UPDATE business_settings
     SET goal_amount = ?, goal_period = ?, store_name = ?, seller_name = ?, seller_phone = ?, seller_city = ?, seller_notes = ?
     WHERE id = 1`,
    updated.goalAmount,
    updated.goalPeriod,
    updated.storeName,
    updated.sellerName,
    updated.sellerPhone,
    updated.sellerCity,
    updated.sellerNotes,
  );
}
