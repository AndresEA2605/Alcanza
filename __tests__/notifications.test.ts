import {
  formatSecondsToHms,
  isValidTime,
  secondsUntilNextTime,
} from '../src/domain/notifications';

describe('utilidades de notificación', () => {
  describe('isValidTime', () => {
    it('acepta horas válidas', () => {
      expect(isValidTime('00:00')).toBe(true);
      expect(isValidTime('09:30')).toBe(true);
      expect(isValidTime('20:00')).toBe(true);
      expect(isValidTime('23:59')).toBe(true);
    });

    it('rechaza horas inválidas', () => {
      expect(isValidTime('24:00')).toBe(false);
      expect(isValidTime('12:60')).toBe(false);
      expect(isValidTime('9:30')).toBe(false);
      expect(isValidTime('20:0')).toBe(false);
      expect(isValidTime('abc')).toBe(false);
      expect(isValidTime('')).toBe(false);
    });
  });

  describe('secondsUntilNextTime', () => {
    it('calcula segundos hasta una hora futura hoy', () => {
      const now = new Date(2026, 0, 15, 10, 0, 0).getTime();
      const seconds = secondsUntilNextTime('12:00', now);

      expect(seconds).toBe(2 * 60 * 60); // 2 horas
    });

    it('calcula segundos hasta una hora pasada (mañana)', () => {
      const now = new Date(2026, 0, 15, 22, 0, 0).getTime();
      const seconds = secondsUntilNextTime('08:00', now);

      expect(seconds).toBe(10 * 60 * 60); // 10 horas hasta mañana
    });

    it('devuelve 0 si la hora es ahora', () => {
      const now = new Date(2026, 0, 15, 12, 0, 0).getTime();
      const seconds = secondsUntilNextTime('12:00', now);

      expect(seconds).toBe(0);
    });

    it('lanza error con formato inválido', () => {
      expect(() => secondsUntilNextTime('25:00')).toThrow(RangeError);
      expect(() => secondsUntilNextTime('abc')).toThrow(RangeError);
    });
  });

  describe('formatSecondsToHms', () => {
    it('formatea segundos en horas y minutos', () => {
      expect(formatSecondsToHms(0)).toBe('0 m');
      expect(formatSecondsToHms(90)).toBe('1 m');
      expect(formatSecondsToHms(3600)).toBe('1 h');
      expect(formatSecondsToHms(3660)).toBe('1 h 1 m');
      expect(formatSecondsToHms(7325)).toBe('2 h 2 m');
      expect(formatSecondsToHms(-10)).toBe('0 m');
    });
  });
});
