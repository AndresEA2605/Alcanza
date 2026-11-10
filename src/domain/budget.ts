/**
 * Motor de cálculo de "¿Me alcanza?".
 *
 * Todo el cálculo es puro: recibe datos y devuelve el resultado sin tocar
 * la interfaz, la base de datos ni el reloj del sistema. Las fechas llegan
 * como epoch en milisegundos y el día se deriva aquí, en hora local.
 */

export const CATEGORY_IDS = ['comida', 'transporte', 'ocio', 'otros'] as const;

export type Category = (typeof CATEGORY_IDS)[number];

export const CATEGORIES = [
  { id: 'comida', label: 'Comida', emoji: '🍽️' },
  { id: 'transporte', label: 'Transporte', emoji: '🚌' },
  { id: 'ocio', label: 'Ocio', emoji: '🎉' },
  { id: 'otros', label: 'Otros', emoji: '🛒' },
] as const satisfies readonly {
  id: Category;
  label: string;
  emoji: string;
}[];

export interface Expense {
  id: string;
  /** Monto en COP, entero positivo. */
  amount: number;
  category: Category;
  /** Fecha del gasto como epoch en milisegundos. */
  ts: number;
  /** Marca de borrado lógico; `null` si el gasto está activo. */
  deletedAt: number | null;
}

export interface IncomeEntry {
  id: string;
  /** Monto en COP, entero positivo. */
  amount: number;
  /** Motivo o descripción del ingreso (ej. Venta, Quincena, Regalo). */
  description: string;
  /** Fecha del ingreso como epoch en milisegundos. */
  ts: number;
  /** Marca de borrado lógico; `null` si el ingreso está activo. */
  deletedAt: number | null;
}

export type BudgetStatus = 'verde' | 'naranja' | 'rojo';

export interface CalcTodayInput {
  /** Ingreso base del mes en COP. */
  income: number;
  /** Gastos fijos del mes en COP. */
  fixed: number;
  /** Gastos del mes; los borrados se ignoran. */
  expenses: readonly Expense[];
  /** Ingresos adicionales del mes; los borrados se ignoran. */
  incomes?: readonly IncomeEntry[];
  /** Momento del cálculo como epoch en milisegundos. */
  now: number;
}

export interface CalcTodayResult {
  /** Días que quedan del mes, incluido hoy. */
  daysLeft: number;
  /** Gastos del mes anteriores a hoy. */
  spentBefore: number;
  /** Gastos de hoy. */
  spentToday: number;
  /** Gastos del mes hasta hoy. */
  spentMonth: number;
  /** Ingresos adicionales del mes anteriores a hoy. */
  incomeBefore: number;
  /** Ingresos adicionales registrados hoy. */
  incomeToday: number;
  /** Total de ingresos adicionales registrados este mes. */
  incomeAdditionalMonth: number;
  /** Ingreso total del mes (base + adicionales). */
  totalIncome: number;
  /** Disponible para el resto del mes antes de gastar hoy. */
  pool: number;
  /** Número diario base de hoy. */
  daily: number;
  /** Lo que queda disponible hoy. */
  remaining: number;
  /** Número diario estimado para mañana. */
  tomorrow: number;
  /** Lo que queda del mes después de los gastos de hoy. */
  monthLeft: number;
  /** Porcentaje del presupuesto variable usado (0 si no hay base). */
  usedPct: number;
  status: BudgetStatus;
}

export interface DateRange {
  /** Inicio inclusivo, epoch en milisegundos. */
  start: number;
  /** Fin exclusivo, epoch en milisegundos. */
  end: number;
}

/** Clave de mes local en formato `YYYY-MM`. */
export function monthKeyFromTs(ts: number): string {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

/** Rango [inicio, fin) del mes local que contiene `ts`. */
export function monthRangeFromTs(ts: number): DateRange {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = date.getMonth();

  return {
    start: new Date(year, month, 1).getTime(),
    end: new Date(year, month + 1, 1).getTime(),
  };
}

/** Rango [inicio, fin) del día local que contiene `ts`. */
export function dayRangeFromTs(ts: number): DateRange {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  return {
    start: new Date(year, month, day).getTime(),
    end: new Date(year, month, day + 1).getTime(),
  };
}

/** Cantidad de días del mes local que contiene `ts`. */
export function daysInMonthFromTs(ts: number): number {
  const date = new Date(ts);

  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Calcula el número diario y el estado del presupuesto para el momento `now`.
 *
 * Los gastos de días futuros del mismo mes no se descuentan: todavía no se han
 * gastado. Los gastos borrados lógicamente y los de otros meses se ignoran.
 */
export function calcToday({
  income,
  fixed,
  expenses,
  incomes,
  now,
}: CalcTodayInput): CalcTodayResult {
  const current = new Date(now);
  const totalDays = daysInMonthFromTs(now);
  const daysLeft = totalDays - current.getDate() + 1;

  const today = dayRangeFromTs(now);
  const month = monthRangeFromTs(now);

  let spentBefore = 0;
  let spentToday = 0;

  for (const expense of expenses) {
    if (expense.deletedAt != null) {
      continue;
    }

    if (expense.ts < month.start || expense.ts >= month.end) {
      continue;
    }

    if (expense.ts < today.start) {
      spentBefore += expense.amount;
    } else if (expense.ts < today.end) {
      spentToday += expense.amount;
    }
  }

  let incomeBefore = 0;
  let incomeToday = 0;

  if (incomes) {
    for (const inc of incomes) {
      if (inc.deletedAt != null) {
        continue;
      }

      if (inc.ts < month.start || inc.ts >= month.end) {
        continue;
      }

      if (inc.ts < today.start) {
        incomeBefore += inc.amount;
      } else if (inc.ts < today.end) {
        incomeToday += inc.amount;
      }
    }
  }

  const incomeAdditionalMonth = incomeBefore + incomeToday;
  const totalIncome = income + incomeAdditionalMonth;
  const spentMonth = spentBefore + spentToday;

  const pool = totalIncome - fixed - spentBefore;
  const daily = Math.max(pool, 0) / daysLeft;
  const remaining = daily - spentToday;
  const tomorrow =
    daysLeft > 1 ? Math.max(pool - spentToday, 0) / (daysLeft - 1) : 0;
  const monthLeft = totalIncome - fixed - spentBefore - spentToday;

  const disposable = totalIncome - fixed;
  const usedPct = disposable <= 0 ? 0 : spentMonth / disposable;

  const status: BudgetStatus =
    remaining < 0 || pool <= 0
      ? 'rojo'
      : remaining / daily < 0.25
        ? 'naranja'
        : 'verde';

  return {
    daysLeft,
    spentBefore,
    spentToday,
    spentMonth,
    incomeBefore,
    incomeToday,
    incomeAdditionalMonth,
    totalIncome,
    pool,
    daily,
    remaining,
    tomorrow,
    monthLeft,
    usedPct,
    status,
  };
}
