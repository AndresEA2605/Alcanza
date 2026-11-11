import type { BusinessGoalPeriod } from '../domain/business';
import type { Database } from './migrations';

export interface BusinessSettings {
  goalAmount: number;
  goalPeriod: BusinessGoalPeriod;
}

interface BusinessSettingsRow {
  goal_amount: number;
  goal_period: BusinessGoalPeriod;
}

export async function getBusinessSettings(
  db: Database,
): Promise<BusinessSettings> {
  const row = await db.getFirstAsync<BusinessSettingsRow>(
    'SELECT goal_amount, goal_period FROM business_settings WHERE id = 1',
  );

  if (!row) {
    throw new Error('No encontré los ajustes de Mi negocio.');
  }

  return {
    goalAmount: row.goal_amount,
    goalPeriod: row.goal_period,
  };
}

export async function saveBusinessSettings(
  db: Database,
  settings: BusinessSettings,
): Promise<void> {
  await db.runAsync(
    `UPDATE business_settings
     SET goal_amount = ?, goal_period = ?
     WHERE id = 1`,
    settings.goalAmount,
    settings.goalPeriod,
  );
}
