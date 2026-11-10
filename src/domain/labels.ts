/**
 * Etiquetas legibles en español de Colombia.
 *
 * Son funciones puras: reciben una clave de mes o un epoch y devuelven texto.
 * No guardan fechas ni dependen de la zona horaria del servidor.
 */

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

/**
 * Convierte una clave `YYYY-MM` en “mes de año”.
 * Si la clave no es válida, la devuelve tal cual para no inventar fechas.
 */
export function monthLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);

  if (!match) {
    return monthKey;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (monthIndex < 0 || monthIndex > 11) {
    return monthKey;
  }

  return `${MONTHS[monthIndex]} de ${year}`;
}

/**
 * Fecha larga local, sin año: “sábado, 8 de noviembre”.
 * Se usa en la pantalla de Hoy.
 */
export function longDateLabel(ts: number): string {
  const date = new Date(ts);

  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

/** “1 día” o “17 días”, según corresponda. */
export function daysLabel(days: number): string {
  return days === 1 ? '1 día' : `${days} días`;
}

/** “Queda 1 día” o “Quedan 17 días”. */
export function daysLeftSentence(days: number): string {
  return days === 1 ? 'Queda 1 día' : `Quedan ${days} días`;
}
