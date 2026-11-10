/**
 * Dominio puro del Margen de Gasto (límite razonable de gasto).
 *
 * Calcula cuánto de lo disponible puede gastar la persona de forma razonable
 * hoy o en el mes, proporcionalmente a lo que tiene y le queda:
 * (ingreso - fijos - gastos ya hechos) / días restantes.
 *
 * Sin efectos secundarios, sin dependencias de UI, DB ni reloj del sistema.
 */

import {
  calcToday,
  monthKeyFromTs,
  type CalcTodayInput,
  type Category,
  type Expense,
  type IncomeEntry,
} from './budget';
import { formatCOP } from './money';

export type MarginTier = 'conservador' | 'normal' | 'flexible';
export type MarginStatus = 'bien' | 'aviso' | 'limite';
export type MarginMode = 'hoy' | 'semana' | 'mes';

export interface MarginSection {
  readonly tier: MarginTier;
  readonly label: string;
  /** Porcentaje inferior inclusivo (0 - 100). */
  readonly minPct: number;
  /** Porcentaje superior inclusivo (0 - 100). */
  readonly maxPct: number;
  readonly status: MarginStatus;
  readonly colorKey: 'success' | 'warning' | 'danger';
}

/**
 * Secciones estándar del margen de gasto:
 * - Conservador (0% - 70%): Zona segura que protege los días venideros.
 * - Normal (70% - 90%): Zona de atención, cerca del tope razonable.
 * - Flexible / Límite (90% - 100%+): Zona de advertencia o sobregiro.
 */
export const DEFAULT_MARGIN_SECTIONS: readonly MarginSection[] = [
  {
    tier: 'conservador',
    label: 'Conservador',
    minPct: 0,
    maxPct: 70,
    status: 'bien',
    colorKey: 'success',
  },
  {
    tier: 'normal',
    label: 'Normal',
    minPct: 70,
    maxPct: 90,
    status: 'aviso',
    colorKey: 'warning',
  },
  {
    tier: 'flexible',
    label: 'Límite',
    minPct: 90,
    maxPct: 100,
    status: 'limite',
    colorKey: 'danger',
  },
] as const;

export interface SpendingMarginResult {
  /** Modo de análisis: hoy, semana actual o mes. */
  mode: MarginMode;
  /** Porcentaje consumido acotado entre 0 y 100 para la barra gráfica. */
  percentage: number;
  /** Porcentaje exacto consumido (puede ser mayor a 100 si se superó el margen). */
  rawPercentage: number;
  tier: MarginTier;
  status: MarginStatus;
  /** Límite razonable en COP para el periodo seleccionado. */
  limit: number;
  /** Monto consumido en COP para el periodo seleccionado. */
  spent: number;
  /** Monto restante en COP para este periodo. */
  remaining: number;
  /** Disponible mensual al inicio del periodo seleccionado. */
  pool: number;
  /** Días restantes del periodo seleccionado, incluido hoy. */
  daysLeft: number;
  /** Estimado diario para mañana según el gasto actual. */
  tomorrowEstimated: number;
  sections: readonly MarginSection[];
  /** Título sintético del estado del margen. */
  headline: string;
  /** Explicación detallada de por qué se encuentra en este estado. */
  explanation: string;
}

export interface SpendingMarginOptions {
  mode?: MarginMode;
  sections?: readonly MarginSection[];
}

/**
 * Determina a qué sección y estado pertenece un porcentaje de consumo.
 */
export function resolveMarginTier(
  pct: number,
  sections: readonly MarginSection[] = DEFAULT_MARGIN_SECTIONS,
): { tier: MarginTier; status: MarginStatus; section: MarginSection } {
  if (pct >= 90) {
    const section = sections.find((s) => s.tier === 'flexible') ?? sections[sections.length - 1]!;
    return { tier: 'flexible', status: 'limite', section };
  }
  if (pct >= 70) {
    const section = sections.find((s) => s.tier === 'normal') ?? sections[1]!;
    return { tier: 'normal', status: 'aviso', section };
  }
  const section = sections.find((s) => s.tier === 'conservador') ?? sections[0]!;
  return { tier: 'conservador', status: 'bien', section };
}

/**
 * Calcula el margen de gasto actual (porcentaje, secciones, estado y explicación).
 */
export function calcSpendingMargin(
  input: CalcTodayInput,
  options?: SpendingMarginOptions,
): SpendingMarginResult {
  const mode = options?.mode ?? 'hoy';
  const sections = options?.sections ?? DEFAULT_MARGIN_SECTIONS;
  const today = calcToday(input);

  const daysLeft = today.daysLeft;
  const pool = today.pool;
  const tomorrowEstimated = today.tomorrow;

  if (mode === 'semana') {
    const currentDate = new Date(input.now);
    const todayStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
    );
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
    const mondayOffset = (todayStart.getDay() + 6) % 7;
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const periodStart = weekStart < monthStart ? monthStart : weekStart;
    const periodEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
    const calendarDay = (date: Date) =>
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const periodDays = Math.round(
      (calendarDay(periodEnd) - calendarDay(periodStart)) / 86_400_000,
    );
    const monthDaysAtPeriodStart = Math.round(
      (calendarDay(monthEnd) - calendarDay(periodStart)) / 86_400_000,
    );

    let spentBeforePeriod = 0;
    let spentPeriod = 0;
    for (const expense of input.expenses) {
      if (
        expense.deletedAt != null ||
        expense.ts < monthStart.getTime() ||
        expense.ts >= periodEnd.getTime()
      ) {
        continue;
      }

      if (expense.ts < periodStart.getTime()) {
        spentBeforePeriod += expense.amount;
      } else {
        spentPeriod += expense.amount;
      }
    }

    let incomeBeforePeriod = 0;
    for (const income of input.incomes ?? []) {
      if (
        income.deletedAt == null &&
        income.ts >= monthStart.getTime() &&
        income.ts < periodStart.getTime()
      ) {
        incomeBeforePeriod += income.amount;
      }
    }

    const availableAtPeriodStart =
      input.income + incomeBeforePeriod - input.fixed - spentBeforePeriod;
    const limit =
      monthDaysAtPeriodStart > 0
        ? (Math.max(availableAtPeriodStart, 0) / monthDaysAtPeriodStart) *
          periodDays
        : 0;
    const remaining = limit - spentPeriod;
    const rawPct = limit <= 0 ? 100 : (spentPeriod / limit) * 100;
    const percentage = Math.min(100, Math.max(0, Math.round(rawPct)));
    const resolved = resolveMarginTier(percentage, sections);
    const tier = limit <= 0 ? 'flexible' : resolved.tier;
    const status = limit <= 0 ? 'limite' : resolved.status;

    let headline = 'Semana dentro de tu margen';
    let explanation = `Has usado el ${percentage}% del margen de esta semana (${formatCOP(spentPeriod)} de ${formatCOP(Math.round(limit))}). Te quedan ${formatCOP(Math.round(remaining))}.`;

    if (limit <= 0) {
      headline = 'Sin margen disponible esta semana';
      explanation =
        'No hay presupuesto variable disponible para los días restantes de esta semana.';
    } else if (remaining < 0) {
      headline = 'Margen semanal superado';
      explanation = `Has superado el margen de esta semana por ${formatCOP(Math.abs(Math.round(remaining)))}.`;
    } else if (status === 'limite') {
      headline = 'Llegando al límite semanal';
      explanation = `Has utilizado el ${percentage}% del margen de esta semana. Te quedan ${formatCOP(Math.round(remaining))} para los días restantes.`;
    } else if (status === 'aviso') {
      headline = 'Consumo moderado de la semana';
      explanation = `Has consumido el ${percentage}% del margen semanal. Mantén el ritmo para cuidar tu presupuesto mensual.`;
    }

    return {
      mode,
      percentage,
      rawPercentage: rawPct,
      tier,
      status,
      limit,
      spent: spentPeriod,
      remaining,
      pool: availableAtPeriodStart,
      daysLeft: Math.max(
        0,
        Math.round(
          (calendarDay(periodEnd) - calendarDay(todayStart)) / 86_400_000,
        ),
      ),
      tomorrowEstimated,
      sections,
      headline,
      explanation,
    };
  }

  if (mode === 'mes') {
    const totalDisposable = Math.max(0, today.totalIncome - input.fixed);
    const spentMonth = today.spentMonth;
    const remainingMonth = Math.max(0, totalDisposable - spentMonth);

    let rawPct = 0;
    if (totalDisposable <= 0) {
      rawPct = 100;
    } else {
      rawPct = (spentMonth / totalDisposable) * 100;
    }

    const percentage = Math.min(100, Math.max(0, Math.round(rawPct)));
    const resolved = resolveMarginTier(percentage, sections);
    const tier = totalDisposable <= 0 ? 'flexible' : resolved.tier;
    const status = totalDisposable <= 0 ? 'limite' : resolved.status;

    let headline = 'Presupuesto mensual bajo control';
    let explanation = `Has usado el ${percentage}% de tu disponible mensual (${formatCOP(spentMonth)} de ${formatCOP(totalDisposable)}). Te quedan ${formatCOP(today.monthLeft)}.`;

    if (totalDisposable <= 0) {
      headline = 'Sin margen mensual disponible';
      explanation = 'Tus gastos fijos igualan o superan tus ingresos. No tienes margen para gastos variables.';
    } else if (today.monthLeft < 0) {
      headline = 'Presupuesto mensual excedido';
      explanation = `Has sobrepasado tu disponible del mes por ${formatCOP(Math.abs(today.monthLeft))}. Cada gasto adicional aumenta el déficit.`;
    } else if (status === 'limite') {
      headline = 'Llegando al límite del mes';
      explanation = `Has utilizado el ${percentage}% de tus recursos del mes. Quedan ${formatCOP(today.monthLeft)} para ${daysLeft} días (${formatCOP(Math.round(today.daily))} diarios).`;
    } else if (status === 'aviso') {
      headline = 'Consumo moderado del mes';
      explanation = `Has consumido el ${percentage}% de tu disponible del mes. Mantén el ritmo para no apretar el fin de mes.`;
    }

    return {
      mode,
      percentage,
      rawPercentage: rawPct,
      tier,
      status,
      limit: totalDisposable,
      spent: spentMonth,
      remaining: remainingMonth,
      pool,
      daysLeft,
      tomorrowEstimated,
      sections,
      headline,
      explanation,
    };
  }

  // Modo 'hoy' (proporcional: (ingreso - fijos - gastos previos) / días restantes)
  const dailyLimit = today.daily;
  const spentToday = today.spentToday;
  const remainingToday = today.remaining;

  let rawPct = 0;
  if (dailyLimit <= 0 || pool <= 0) {
    rawPct = 100;
  } else {
    rawPct = (spentToday / dailyLimit) * 100;
  }

  const percentage = Math.min(100, Math.max(0, Math.round(rawPct)));
  const resolved = resolveMarginTier(percentage, sections);
  const tier = (dailyLimit <= 0 || pool <= 0) ? 'flexible' : resolved.tier;
  const status = (dailyLimit <= 0 || pool <= 0) ? 'limite' : resolved.status;

  let headline = 'Dentro de tu margen seguro';
  let explanation = '';

  if (dailyLimit <= 0) {
    headline = 'Sin disponible para hoy';
    explanation = pool <= 0
      ? 'Has consumido todo el presupuesto del mes. Cada gasto que hagas hoy comprometerá recursos que no tienes.'
      : 'No tienes cuota disponible para hoy.';
  } else if (remainingToday < 0) {
    const excess = Math.abs(Math.round(remainingToday));
    headline = 'Límite de hoy superado';
    explanation = `Superaste el margen razonable de hoy por ${formatCOP(excess)}. Tu cuota estimada para mañana bajó a ${formatCOP(Math.round(tomorrowEstimated))}.`;
  } else if (status === 'limite') {
    headline = 'En el límite razonable de hoy';
    explanation = `Has alcanzado el ${percentage}% del límite razonable de hoy (${formatCOP(spentToday)} de ${formatCOP(Math.round(dailyLimit))}). Te quedan ${formatCOP(Math.round(remainingToday))}.`;
  } else if (status === 'aviso') {
    headline = 'Atención al margen de hoy';
    explanation = `Has consumido el ${percentage}% de tu margen diario. Te quedan ${formatCOP(Math.round(remainingToday))} para no afectar los días siguientes.`;
  } else {
    if (spentToday === 0) {
      headline = 'Margen de hoy intacto';
      explanation = `Tienes el 100% de tu margen razonable disponible: ${formatCOP(Math.round(dailyLimit))} para gastar hoy sin presiones.`;
    } else {
      headline = 'Margen en zona segura';
      explanation = `Has usado el ${percentage}% de tu cuota de hoy (${formatCOP(spentToday)} de ${formatCOP(Math.round(dailyLimit))}). Te quedan ${formatCOP(Math.round(remainingToday))}.`;
    }
  }

  return {
    mode: 'hoy',
    percentage,
    rawPercentage: rawPct,
    tier,
    status,
    limit: dailyLimit,
    spent: spentToday,
    remaining: remainingToday,
    pool,
    daysLeft,
    tomorrowEstimated,
    sections,
    headline,
    explanation,
  };
}

export type VerificationErrorCode =
  | 'OK'
  | 'INVALID_AMOUNT'
  | 'INVALID_DATE'
  | 'NO_DISPOSABLE'
  | 'EXCEEDS_MONTH_AVAILABLE'
  | 'EXCEEDS_DAILY_MARGIN';

export interface VerifyExpenseInput {
  amount: number;
  category: Category;
  ts?: number;
  now?: number;
  income: number;
  fixed: number;
  expenses: readonly Expense[];
  incomes?: readonly IncomeEntry[];
}

export interface MarginVerificationImpact {
  spentTodayBefore: number;
  spentTodayAfter: number;
  remainingTodayBefore: number;
  remainingTodayAfter: number;
  dailyLimit: number;
  pctDailyUsedAfter: number;
  tierAfter: MarginTier;
  statusAfter: MarginStatus;
  tomorrowBefore: number;
  tomorrowAfter: number;
  monthLeftBefore: number;
  monthLeftAfter: number;
  daysLeft: number;
}

export interface ExpenseVerificationResult {
  /** ¿Se puede registrar el gasto? Falso si es inválido o excede fondos mensuales totales. */
  allowed: boolean;
  /** Bloqueo estricto por falta de fondos o datos inválidos (no se puede ignorar). */
  hardBlocked: boolean;
  /** Advertencia: rompe el margen razonable diario, pero hay fondos del mes disponibles si el usuario confirma. */
  canProceedWithWarning: boolean;
  status: MarginStatus;
  tier: MarginTier;
  code: VerificationErrorCode;
  title: string;
  message: string;
  impact: MarginVerificationImpact | null;
}

/**
 * Sistema de verificación fuerte de gastos contra el margen razonable.
 *
 * Valida:
 * 1. Monto positivo entero.
 * 2. Fecha dentro del mes actual.
 * 3. No exceder el disponible total del mes (bloqueo duro).
 * 4. Considerar días restantes y gastos del mes, calculando el impacto en hoy y en los días futuros.
 */
export function verifyExpenseMargin({
  amount,
  category: _category,
  ts,
  now = Date.now(),
  income,
  fixed,
  expenses,
  incomes,
}: VerifyExpenseInput): ExpenseVerificationResult {
  const expenseTs = ts ?? now;

  // 1. Validación de monto positivo
  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      allowed: false,
      hardBlocked: true,
      canProceedWithWarning: false,
      status: 'limite',
      tier: 'flexible',
      code: 'INVALID_AMOUNT',
      title: 'Monto inválido',
      message: 'El monto del gasto debe ser un número entero mayor que 0.',
      impact: null,
    };
  }

  // 2. Validación de fecha dentro del mes actual
  const currentMonthKey = monthKeyFromTs(now);
  const expenseMonthKey = monthKeyFromTs(expenseTs);
  if (expenseMonthKey !== currentMonthKey) {
    return {
      allowed: false,
      hardBlocked: true,
      canProceedWithWarning: false,
      status: 'limite',
      tier: 'flexible',
      code: 'INVALID_DATE',
      title: 'Fecha fuera del mes actual',
      message: 'Solo puedes registrar gastos que correspondan al mes en curso.',
      impact: null,
    };
  }

  // Cálculos base antes del gasto
  const currentToday = calcToday({ income, fixed, expenses, incomes, now });
  const disposable = currentToday.totalIncome - fixed;

  if (disposable <= 0) {
    return {
      allowed: false,
      hardBlocked: true,
      canProceedWithWarning: false,
      status: 'limite',
      tier: 'flexible',
      code: 'NO_DISPOSABLE',
      title: 'Sin presupuesto disponible',
      message: 'Tus gastos fijos igualan o superan tus ingresos del mes. No tienes disponible para gastos variables.',
      impact: null,
    };
  }

  // 3. Validación de no exceder disponible del mes
  const monthLeftBefore = currentToday.monthLeft;
  if (amount > monthLeftBefore) {
    const missing = amount - monthLeftBefore;
    return {
      allowed: false,
      hardBlocked: true,
      canProceedWithWarning: false,
      status: 'limite',
      tier: 'flexible',
      code: 'EXCEEDS_MONTH_AVAILABLE',
      title: 'Supera el disponible del mes',
      message: `El gasto de ${formatCOP(amount)} excede lo que te queda disponible en el mes (${formatCOP(Math.max(0, monthLeftBefore))}). Te faltarían ${formatCOP(missing)} para cubrirlo.`,
      impact: null,
    };
  }

  // 4. Considerar días restantes y gastos del mes (impacto en el margen diario)
  const daysLeft = currentToday.daysLeft;
  const dailyLimit = currentToday.daily;
  const spentTodayBefore = currentToday.spentToday;
  const remainingTodayBefore = currentToday.remaining;
  const tomorrowBefore = currentToday.tomorrow;

  const spentTodayAfter = spentTodayBefore + amount;
  const remainingTodayAfter = dailyLimit - spentTodayAfter;
  const pool = currentToday.pool;
  const tomorrowAfter =
    daysLeft > 1 ? Math.max(0, pool - spentTodayAfter) / (daysLeft - 1) : 0;
  const monthLeftAfter = monthLeftBefore - amount;

  const pctDailyUsedAfter = dailyLimit > 0
    ? (spentTodayAfter / dailyLimit) * 100
    : 100;

  const { tier: tierAfter, status: statusAfter } = resolveMarginTier(pctDailyUsedAfter);

  const impact: MarginVerificationImpact = {
    spentTodayBefore,
    spentTodayAfter,
    remainingTodayBefore,
    remainingTodayAfter,
    dailyLimit,
    pctDailyUsedAfter,
    tierAfter,
    statusAfter,
    tomorrowBefore,
    tomorrowAfter,
    monthLeftBefore,
    monthLeftAfter,
    daysLeft,
  };

  // ¿Rompe el margen razonable diario?
  if (spentTodayAfter > dailyLimit) {
    const excess = spentTodayAfter - dailyLimit;
    const diffTomorrow = Math.max(0, tomorrowBefore - tomorrowAfter);

    return {
      allowed: true,
      hardBlocked: false,
      canProceedWithWarning: true,
      status: 'limite',
      tier: 'flexible',
      code: 'EXCEEDS_DAILY_MARGIN',
      title: 'Supera el margen diario',
      message: `Este gasto supera el límite razonable de hoy en ${formatCOP(Math.round(excess))}. Tienes fondos en el mes, pero tu cuota diaria para los próximos ${daysLeft - 1} días se reducirá en ${formatCOP(Math.round(diffTomorrow))} (de ${formatCOP(Math.round(tomorrowBefore))} a ${formatCOP(Math.round(tomorrowAfter))}).`,
      impact,
    };
  }

  // Dentro del margen diario (bien o aviso)
  if (statusAfter === 'aviso') {
    return {
      allowed: true,
      hardBlocked: false,
      canProceedWithWarning: false,
      status: 'aviso',
      tier: tierAfter,
      code: 'OK',
      title: 'Cerca del límite de hoy',
      message: `Este gasto llevará tu consumo de hoy al ${Math.round(pctDailyUsedAfter)}% del margen diario. Te quedarán ${formatCOP(Math.round(remainingTodayAfter))} para el resto del día.`,
      impact,
    };
  }

  return {
    allowed: true,
    hardBlocked: false,
    canProceedWithWarning: false,
    status: 'bien',
    tier: tierAfter,
    code: 'OK',
    title: 'Gasto dentro del margen seguro',
    message: `Gasto razonable (${Math.round(pctDailyUsedAfter)}% del diario). Te quedarán ${formatCOP(Math.round(remainingTodayAfter))} para hoy sin alterar tu presupuesto futuro.`,
    impact,
  };
}
