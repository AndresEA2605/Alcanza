/**
 * Utilidades de dinero para pesos colombianos (COP).
 *
 * Reglas:
 * - Los montos son enteros: no se usan centavos.
 * - Formato de presentación: "$ 1.250.000" (espacio después del $ y punto de miles).
 * - Los negativos usan el signo menos tipográfico: "−$ 12.000".
 * - Los campos de entrada agregan los puntos de miles mientras se escribe.
 */

const MINUS_SIGN = '\u2212';
const GROUP_SEPARATOR = '.';

/**
 * Normaliza un monto a entero. Lanza un error si el valor no es finito.
 * El redondeo solo existe como red de seguridad: el dominio trabaja con enteros.
 */
export function toIntegerAmount(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError('El monto debe ser un número finito.');
  }

  return Math.round(amount);
}

/**
 * Agrupa una cadena de dígitos con puntos de miles.
 * Ignora cualquier carácter que no sea dígito y descarta ceros a la izquierda.
 */
export function groupThousands(value: string): string {
  const digits = value
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '');

  if (digits === '') {
    return '';
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

/**
 * Formatea un monto entero en COP para mostrarlo en pantalla.
 *
 * @example formatCOP(1250000) // "$ 1.250.000"
 * @example formatCOP(-12000)  // "−$ 12.000"
 */
export function formatCOP(amount: number): string {
  const rounded = toIntegerAmount(amount);
  const sign = rounded < 0 ? MINUS_SIGN : '';

  return `${sign}$ ${groupThousands(String(Math.abs(rounded)))}`;
}

/**
 * Formatea el contenido de un campo numérico mientras el usuario escribe.
 * No incluye el símbolo de peso: solo los dígitos y los puntos de miles.
 *
 * @example formatCOPInput('1250000') // "1.250.000"
 */
export function formatCOPInput(value: string | number): string {
  return groupThousands(String(value));
}

/**
 * Convierte el texto de un campo numérico a un entero en COP.
 * Acepta puntos, espacios y el símbolo de peso. Un campo vacío vale 0.
 * Si el número supera el entero seguro de JavaScript, se satura para evitar
 * perder precisión.
 */
export function parseCOPInput(value: string): number {
  const digits = value.replace(/\D/g, '');

  if (digits === '') {
    return 0;
  }

  const amount = Number(digits);

  if (!Number.isSafeInteger(amount)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return amount;
}
