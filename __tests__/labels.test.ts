import {
  daysLabel,
  daysLeftSentence,
  longDateLabel,
  monthLabel,
} from '../src/domain/labels';

describe('etiquetas en español', () => {
  it('convierte una clave de mes en texto legible', () => {
    expect(monthLabel('2026-01')).toBe('enero de 2026');
    expect(monthLabel('2025-12')).toBe('diciembre de 2025');
    expect(monthLabel('2026-09')).toBe('septiembre de 2026');
  });

  it('devuelve la clave original si el mes no es válido', () => {
    expect(monthLabel('2026-13')).toBe('2026-13');
    expect(monthLabel('2026-00')).toBe('2026-00');
    expect(monthLabel('enero')).toBe('enero');
  });

  it('escribe la fecha larga con el día local', () => {
    expect(longDateLabel(new Date(2026, 10, 8, 12).getTime())).toBe(
      'domingo, 8 de noviembre',
    );
    expect(longDateLabel(new Date(2026, 0, 1, 12).getTime())).toBe(
      'jueves, 1 de enero',
    );
  });

  it('concuerda en singular y plural', () => {
    expect(daysLabel(1)).toBe('1 día');
    expect(daysLabel(17)).toBe('17 días');
    expect(daysLeftSentence(1)).toBe('Queda 1 día');
    expect(daysLeftSentence(17)).toBe('Quedan 17 días');
  });
});
