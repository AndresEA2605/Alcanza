import { formatCOP } from './money';

/**
 * Cálculos de negocio para "¿Me alcanza?".
 *
 * Sirve para cualquier producto o servicio: canasta de huevos, viajes de
 * Indrive/Uber, ventas de ropa, etc. Todo el cálculo es puro: recibe datos
 * y devuelve resultados sin tocar la interfaz ni la base de datos.
 */

export type BusinessType = 'product' | 'service';
export type BusinessGoalPeriod = 'daily' | 'monthly' | 'yearly';

export interface BusinessSellerProfile {
  storeName: string;
  sellerName: string;
  sellerPhone: string;
  sellerCity: string;
  sellerNotes: string;
}

export function normalizeBusinessGoal(
  amount: number,
  period: BusinessGoalPeriod,
): number {
  const days = period === 'daily' ? 1 : period === 'monthly' ? 30 : 365;
  return Math.round(amount / days);
}

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
  /** Monto de la meta configurada en su periodo. */
  goalAmount: number;
  /** Periodo de la meta configurada. */
  goalPeriod: BusinessGoalPeriod;
  /** Descripción opcional del producto o servicio. */
  description: string;
  /** URI local opcional de la imagen. */
  imageUri: string | null;
  /** Si el producto o servicio está visible en el catálogo de la tienda. */
  inCatalog: boolean;
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
  goalAmount?: number;
  goalPeriod?: BusinessGoalPeriod;
  description?: string;
  imageUri?: string | null;
  inCatalog?: boolean;
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

/** Limpia y normaliza números de teléfono para enlaces de WhatsApp. */
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // Si tiene 10 dígitos (típico celular en Colombia que empieza por 3) agregamos código de país 57
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  return digits;
}

/** Construye un enlace directo de WhatsApp con mensaje predeterminado. */
export function createWhatsAppChatUrl(phone: string, message: string): string {
  const clean = normalizePhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  return clean ? `https://wa.me/${clean}?text=${encoded}` : '';
}

/** Formatea la ficha compartible de un producto con información del vendedor e ID. */
export function formatProductShareText({
  item,
  seller,
  appLink,
}: {
  item: BusinessItem;
  seller?: Partial<BusinessSellerProfile>;
  appLink?: string;
}): string {
  const isProduct = item.type === 'product';
  const typeEmoji = isProduct ? '📦' : '🚗';
  const lines: string[] = [
    `🛍️ *${item.name}*`,
    `🏷️ *ID de referencia:* ${item.id}`,
    `💰 *Precio:* ${formatCOP(item.pricePerUnit)}`,
    `${typeEmoji} *Tipo:* ${isProduct ? 'Producto' : 'Servicio'}`,
  ];

  if (item.description) {
    lines.push(`📝 *Detalles:* ${item.description}`);
  }

  const sellerParts: string[] = [];
  if (seller?.storeName) sellerParts.push(`🏪 *Tienda:* ${seller.storeName}`);
  if (seller?.sellerName) sellerParts.push(`👤 *Vendedor:* ${seller.sellerName}`);
  if (seller?.sellerCity) sellerParts.push(`📍 *Ubicación:* ${seller.sellerCity}`);
  if (seller?.sellerNotes) sellerParts.push(`ℹ️ ${seller.sellerNotes}`);

  if (sellerParts.length > 0) {
    lines.push('', '--- Vendedor ---', ...sellerParts);
  }

  if (seller?.sellerPhone) {
    const defaultMsg = `Hola! Me interesa el producto "${item.name}" (ID: ${item.id}) por ${formatCOP(item.pricePerUnit)}. ¿Sigue disponible?`;
    const waUrl = createWhatsAppChatUrl(seller.sellerPhone, defaultMsg);
    if (waUrl) {
      lines.push('', `💬 *Pedir directamente por WhatsApp:*`, waUrl);
    }
  }

  if (appLink) {
    lines.push('', `📲 *Ver en el catálogo:*`, appLink);
  }

  return lines.join('\n');
}

/** Formatea el catálogo completo en un resumen de texto compartible. */
export function formatCatalogShareText({
  items,
  seller,
  appLink,
}: {
  items: BusinessItem[];
  seller?: Partial<BusinessSellerProfile>;
  appLink?: string;
}): string {
  const storeTitle = seller?.storeName ? `🏪 *${seller.storeName}*` : '🛍️ *Catálogo de Productos*';
  const lines: string[] = [storeTitle];

  if (seller?.sellerName) lines.push(`👤 Vendedor: ${seller.sellerName}`);
  if (seller?.sellerCity) lines.push(`📍 Ubicación: ${seller.sellerCity}`);
  if (seller?.sellerNotes) lines.push(`ℹ️ ${seller.sellerNotes}`);

  lines.push('', `📦 *Productos disponibles (${items.length}):*`, '');

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. *${item.name}* — ${formatCOP(item.pricePerUnit)}`,
      `   ID: \`${item.id}\`${item.description ? ` • ${item.description}` : ''}`,
    );
  });

  if (seller?.sellerPhone) {
    const defaultMsg = `Hola! Estuve viendo su catálogo y me gustaría hacer un pedido.`;
    const waUrl = createWhatsAppChatUrl(seller.sellerPhone, defaultMsg);
    if (waUrl) {
      lines.push('', `💬 *Contacto WhatsApp:*`, waUrl);
    }
  }

  if (appLink) {
    lines.push('', `📲 *Abrir catálogo completo en app:*`, appLink);
  }

  return lines.join('\n');
}
