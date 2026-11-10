/**
 * Utilidades puras para notificaciones locales.
 *
 * No importan expo-notifications ni ningún módulo nativo, así que se pueden
 * probar en Jest sin depender del dispositivo.
 */

/** Valida que una cadena tenga formato HH:mm con hora y minuto válidos. */
export function isValidTime(time: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(time);

  if (!match) {
    return false;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** Calcula los segundos hasta la próxima ocurrencia de una hora HH:mm. */
export function secondsUntilNextTime(time: string, now = Date.now()): number {
  if (!isValidTime(time)) {
    throw new RangeError('La hora debe tener formato HH:mm.');
  }

  const match = /^(\d{2}):(\d{2})$/.exec(time);

  if (!match) {
    throw new RangeError('La hora debe tener formato HH:mm.');
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  const date = new Date(now);
  const target = new Date(date);
  target.setHours(hour, minute, 0, 0);

  if (target < date) {
    target.setDate(target.getDate() + 1);
  }

  return Math.max(0, Math.round((target.getTime() - date.getTime()) / 1000));
}

/** Convierte segundos a una cadena legible (ej. "3 h 15 m"). */
export function formatSecondsToHms(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} m` : `${hours} h`;
  }

  return `${minutes} m`;
}
