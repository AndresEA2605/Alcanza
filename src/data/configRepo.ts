import type { Database } from './migrations';

export interface MonthConfig {
  /** Clave local en formato `YYYY-MM`. */
  month: string;
  income: number;
  fixed: number;
}

interface MonthConfigRow {
  month: string;
  income: number;
  fixed: number;
}

function mapMonthConfig(row: MonthConfigRow): MonthConfig {
  return {
    month: row.month,
    income: row.income,
    fixed: row.fixed,
  };
}

export async function getMonthConfig(
  db: Database,
  month: string,
): Promise<MonthConfig | null> {
  const row = await db.getFirstAsync<MonthConfigRow>(
    'SELECT month, income, fixed FROM month_config WHERE month = ?',
    month,
  );

  return row ? mapMonthConfig(row) : null;
}

export async function upsertMonthConfig(
  db: Database,
  config: MonthConfig,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO month_config (month, income, fixed)
     VALUES (?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET
       income = excluded.income,
       fixed = excluded.fixed`,
    config.month,
    config.income,
    config.fixed,
  );
}

/**
 * Devuelve la configuración del mes más reciente anterior a `month`.
 * Sirve para ofrecer "mantener el mismo ingreso y fijos" al cambiar de mes.
 */
export async function getLatestMonthConfigBefore(
  db: Database,
  month: string,
): Promise<MonthConfig | null> {
  const row = await db.getFirstAsync<MonthConfigRow>(
    `SELECT month, income, fixed
     FROM month_config
     WHERE month < ?
     ORDER BY month DESC
     LIMIT 1`,
    month,
  );

  return row ? mapMonthConfig(row) : null;
}

/**
 * Copia ingreso y fijos de un mes a otro. Devuelve la configuración creada,
 * o `null` si el mes de origen no existe.
 */
export async function copyMonthConfig(
  db: Database,
  sourceMonth: string,
  targetMonth: string,
): Promise<MonthConfig | null> {
  const source = await getMonthConfig(db, sourceMonth);

  if (!source) {
    return null;
  }

  const target: MonthConfig = {
    month: targetMonth,
    income: source.income,
    fixed: source.fixed,
  };

  await upsertMonthConfig(db, target);

  return target;
}

/** Borra todos los datos locales de la app. */
export async function clearAllData(db: Database): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM expense;
      DELETE FROM month_config;
    `);
    try {
      await db.execAsync(`DELETE FROM income_entry;`);
    } catch {
      // Ignorar si la tabla no existe en esquemas antiguos
    }
  });
}
