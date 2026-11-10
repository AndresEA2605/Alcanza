/**
 * Cálculos de negocio para "¿Me alcanza?".
 *
 * Sirve para cualquier producto o servicio: canasta de huevos, viajes de
 * Indrive/Uber, ventas de ropa, etc. Todo el cálculo es puro: recibe datos
 * y devuelve resultados sin tocar la interfaz ni la base de datos.
 */

export type BusinessType = 'product' | 'service';

export interface BusinessItem {
  /** Identificador local del producto o servicio. */
  id: string;
  /** Nombre del producto o servicio. */
  name: string;
  /** Tipo: 'product' para cosas que se compran y venden, 'service' para servicios. */
  type: BusinessType;
  /** Cantidad comprada o realizada. */
  quantity: number;
  /** Precio de venta o ingreso por unidad en COP. */
  pricePerUnit: number;
  /** Para productos: inversión total realizada. Para servicios: no aplica. */
  investment: number;
  /** Meta de ganancia diaria en COP. */
  dailyGoal: number;
  /** Fecha de creación como epoch en milisegundos. */
  createdAt: number;
  /** Fecha de última actualización como epoch en milisegundos. */
  updatedAt: number;
}

export interface NewBusinessItem {
  name: string;
  type: BusinessType;
  quantity: number;
  pricePerUnit: number;
  investment?: number;
  dailyGoal: number;
}

export interface BusinessCalculation {
  /** Ingreso total: precio de venta × cantidad. */
  revenue: number;
  /** Costo total: solo para productos (inversión). Para servicios es 0. */
  cost: number;
  /** Ganancia: ingreso total − costo total. */
  profit: number;
  /** Ganancia libre: lo que se ganó por encima del costo. */
  freeProfit: number;
  /** Cuánto falta para alcanzar la meta diaria. */
  remainingToGoal: number;
  /** Porcentaje de avance hacia la meta diaria (0 si no hay meta). */
  goalPct: number;
  /** Cuánto queda disponible para reinvertir (igual a la ganancia libre). */
  reinvestment: number;
  /** Si se alcanzó o superó la meta diaria. */
  goalReached: boolean;
  /** Costo por unidad (solo productos). */
  costPerUnit: number;
  /** Ganancia por unidad. */
  profitPerUnit: number;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} debe ser un entero mayor o igual a 0.`);
  }
}

export function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} debe ser un entero mayor que 0.`);
  }
}

/**
 * Calcula todos los indicadores de negocio para un ítem.
 *
 * Para productos:
 *   - costo por unidad = inversión / cantidad
 *   - ganancia por unidad = precio de venta − costo por unidad
 *   - ganancia total = ganancia por unidad × cantidad
 *
 * Para servicios:
 *   - costo = 0
 *   - ganancia = ingreso por servicio × cantidad
 */
export function calculateBusiness({
  type,
  quantity,
  pricePerUnit,
  investment = 0,
  dailyGoal,
}: {
  type: BusinessType;
  quantity: number;
  pricePerUnit: number;
  investment?: number;
  dailyGoal: number;
}): BusinessCalculation {
  assertNonNegativeInteger(quantity, 'Cantidad');
  assertNonNegativeInteger(pricePerUnit, 'Precio por unidad');
  assertNonNegativeInteger(investment, 'Inversión');
  assertNonNegativeInteger(dailyGoal, 'Meta diaria');

  const revenue = pricePerUnit * quantity;
  const cost = type === 'product' ? investment : 0;
  const costPerUnit = type === 'product' && quantity > 0 ? investment / quantity : 0;
  const profit = revenue - cost;
  const profitPerUnit = type === 'product' ? profit / quantity : pricePerUnit;
  const freeProfit = Math.max(profit, 0);
  const remainingToGoal = Math.max(dailyGoal - profit, 0);
  const goalPct = dailyGoal <= 0 ? 0 : Math.min(profit / dailyGoal, 1);
  const reinvestment = freeProfit;
  const goalReached = profit >= dailyGoal;

  return {
    revenue,
    cost,
    profit,
    freeProfit,
    remainingToGoal,
    goalPct,
    reinvestment,
    goalReached,
    costPerUnit,
    profitPerUnit,
  };
}

/** Suma los cálculos de varios ítems de negocio. */
export function sumBusinessCalculations(
  calculations: readonly BusinessCalculation[],
): BusinessCalculation {
  return calculations.reduce(
    (acc, calc) => ({
      revenue: acc.revenue + calc.revenue,
      cost: acc.cost + calc.cost,
      profit: acc.profit + calc.profit,
      freeProfit: acc.freeProfit + calc.freeProfit,
      remainingToGoal: Math.max(acc.remainingToGoal + calc.remainingToGoal, 0),
      goalPct: 0,
      reinvestment: acc.reinvestment + calc.reinvestment,
      goalReached: acc.goalReached || calc.goalReached,
      costPerUnit: 0,
      profitPerUnit: 0,
    }),
    {
      revenue: 0,
      cost: 0,
      profit: 0,
      freeProfit: 0,
      remainingToGoal: 0,
      goalPct: 0,
      reinvestment: 0,
      goalReached: false,
      costPerUnit: 0,
      profitPerUnit: 0,
    },
  );
}
