import {
  formatCOP,
  formatCOPInput,
  groupThousands,
  parseCOPInput,
  toIntegerAmount,
} from '../src/domain/money';

describe('formatCOP', () => {
  it('formatea enteros con punto de miles y espacio después del símbolo', () => {
    expect(formatCOP(1_250_000)).toBe('$ 1.250.000');
    expect(formatCOP(999)).toBe('$ 999');
    expect(formatCOP(1_000)).toBe('$ 1.000');
    expect(formatCOP(0)).toBe('$ 0');
  });

  it('formatea negativos con el signo menos tipográfico', () => {
    expect(formatCOP(-12_000)).toBe('\u2212$ 12.000');
    expect(formatCOP(-1_250_000)).toBe('\u2212$ 1.250.000');
    expect(formatCOP(-0)).toBe('$ 0');
  });

  it('redondea solo como red de seguridad para mantener enteros', () => {
    expect(formatCOP(1_234.6)).toBe('$ 1.235');
    expect(toIntegerAmount(1_234.4)).toBe(1_234);
  });

  it('rechaza valores no finitos', () => {
    expect(() => formatCOP(Number.NaN)).toThrow(RangeError);
    expect(() => formatCOP(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('formatCOPInput', () => {
  it('agrega puntos de miles mientras se escribe', () => {
    expect(formatCOPInput('1')).toBe('1');
    expect(formatCOPInput('12')).toBe('12');
    expect(formatCOPInput('123')).toBe('123');
    expect(formatCOPInput('1234')).toBe('1.234');
    expect(formatCOPInput('100000')).toBe('100.000');
    expect(formatCOPInput('1250000')).toBe('1.250.000');
  });

  it('acepta texto ya formateado y descarta caracteres que no son dígitos', () => {
    expect(formatCOPInput('$ 1.250.000')).toBe('1.250.000');
    expect(formatCOPInput('1.250.000')).toBe('1.250.000');
    expect(formatCOPInput('12a34')).toBe('1.234');
  });

  it('normaliza ceros a la izquierda y campos vacíos', () => {
    expect(formatCOPInput('')).toBe('');
    expect(formatCOPInput('000')).toBe('0');
    expect(formatCOPInput('00012')).toBe('12');
  });
});

describe('parseCOPInput', () => {
  it('convierte el texto formateado a un entero', () => {
    expect(parseCOPInput('1.250.000')).toBe(1_250_000);
    expect(parseCOPInput('$ 12.000')).toBe(12_000);
    expect(parseCOPInput('0')).toBe(0);
    expect(parseCOPInput('')).toBe(0);
  });

  it('satura números que superan el entero seguro', () => {
    expect(parseCOPInput('999999999999999999999')).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('groupThousands', () => {
  it('agrupa de tres en tres', () => {
    expect(groupThousands('1')).toBe('1');
    expect(groupThousands('1234')).toBe('1.234');
    expect(groupThousands('123456789')).toBe('123.456.789');
    expect(groupThousands('')).toBe('');
  });
});
