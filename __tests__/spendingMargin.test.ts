import { type Expense } from '../src/domain/budget';
import {
  calcSpendingMargin,
  DEFAULT_MARGIN_SECTIONS,
  resolveMarginTier,
  verifyExpenseMargin,
} from '../src/domain/spendingMargin';

const INCOME = 3_000_000;
const FIXED = 1_000_000;
const DISPOSABLE = INCOME - FIXED; // 2_000_000

function at(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0,
): number {
  return new Date(year, monthIndex, day, hour, minute).getTime();
}

function makeExpense(partial: Partial<Expense> & { ts: number }): Expense {
  return {
    id: `exp-${Math.random()}`,
    amount: 10_000,
    category: 'comida',
    deletedAt: null,
    ...partial,
  };
}

describe('resolveMarginTier', () => {
  it('clasifica porcentajes < 70% como conservador / bien', () => {
    const res0 = resolveMarginTier(0);
    expect(res0.tier).toBe('conservador');
    expect(res0.status).toBe('bien');

    const res50 = resolveMarginTier(50);
    expect(res50.tier).toBe('conservador');
    expect(res50.status).toBe('bien');

    const res69 = resolveMarginTier(69);
    expect(res69.tier).toBe('conservador');
    expect(res69.status).toBe('bien');
  });

  it('clasifica porcentajes entre 70% y 89% como normal / aviso', () => {
    const res70 = resolveMarginTier(70);
    expect(res70.tier).toBe('normal');
    expect(res70.status).toBe('aviso');

    const res85 = resolveMarginTier(85);
    expect(res85.tier).toBe('normal');
    expect(res85.status).toBe('aviso');
  });

  it('clasifica porcentajes >= 90% como flexible / límite', () => {
    const res90 = resolveMarginTier(90);
    expect(res90.tier).toBe('flexible');
    expect(res90.status).toBe('limite');

    const res120 = resolveMarginTier(120);
    expect(res120.tier).toBe('flexible');
    expect(res120.status).toBe('limite');
  });
});

describe('calcSpendingMargin: modo hoy', () => {
  const JAN_15_2026 = at(2026, 0, 15, 12); // Día 15 de 31 -> 17 días restantes

  it('calcula margen intacto (0 gastos)', () => {
    const result = calcSpendingMargin({
      income: INCOME,
      fixed: FIXED,
      expenses: [],
      now: JAN_15_2026,
    });

    const expectedDaily = DISPOSABLE / 17; // ~117_647
    expect(result.mode).toBe('hoy');
    expect(result.daysLeft).toBe(17);
    expect(result.limit).toBeCloseTo(expectedDaily, 5);
    expect(result.spent).toBe(0);
    expect(result.remaining).toBeCloseTo(expectedDaily, 5);
    expect(result.percentage).toBe(0);
    expect(result.tier).toBe('conservador');
    expect(result.status).toBe('bien');
    expect(result.headline).toContain('intacto');
    expect(result.explanation).toContain('100% de tu margen');
    expect(result.sections).toEqual(DEFAULT_MARGIN_SECTIONS);
  });

  it('calcula consumo en zona conservadora (< 70%)', () => {
    const expenses = [
      makeExpense({ amount: 50_000, ts: JAN_15_2026 }), // 50_000 de ~117_647 -> ~42.5%
    ];

    const result = calcSpendingMargin({
      income: INCOME,
      fixed: FIXED,
      expenses,
      now: JAN_15_2026,
    });

    expect(result.spent).toBe(50_000);
    expect(result.percentage).toBe(43);
    expect(result.tier).toBe('conservador');
    expect(result.status).toBe('bien');
    expect(result.headline).toContain('segura');
  });

  it('calcula consumo en zona normal / aviso (70% - 89%)', () => {
    // Para diario de 117_647, el 75% es ~88_235
    const expenses = [
      makeExpense({ amount: 90_000, ts: JAN_15_2026 }), // ~76.5%
    ];

    const result = calcSpendingMargin({
      income: INCOME,
      fixed: FIXED,
      expenses,
      now: JAN_15_2026,
    });

    expect(result.percentage).toBe(77);
    expect(result.tier).toBe('normal');
    expect(result.status).toBe('aviso');
    expect(result.headline).toContain('Atención');
  });

  it('calcula consumo en zona límite (90% - 100%)', () => {
    const expenses = [
      makeExpense({ amount: 110_000, ts: JAN_15_2026 }), // ~93.5%
    ];

    const result = calcSpendingMargin({
      income: INCOME,
      fixed: FIXED,
      expenses,
      now: JAN_15_2026,
    });

    expect(result.percentage).toBe(94);
    expect(result.tier).toBe('flexible');
    expect(result.status).toBe('limite');
    expect(result.headline).toContain('límite');
  });

  it('calcula cuando se supera el límite diario (> 100%)', () => {
    const expenses = [
      makeExpense({ amount: 150_000, ts: JAN_15_2026 }), // 150_000 de ~117_647 -> ~127.5%
    ];

    const result = calcSpendingMargin({
      income: INCOME,
      fixed: FIXED,
      expenses,
      now: JAN_15_2026,
    });

    expect(result.percentage).toBe(100); // Clamped to 100 for bar
    expect(result.rawPercentage).toBeGreaterThan(100);
    expect(result.remaining).toBeLessThan(0);
    expect(result.tier).toBe('flexible');
    expect(result.status).toBe('limite');
    expect(result.headline).toContain('superado');
    expect(result.explanation).toContain('Tu cuota estimada para mañana bajó');
  });

  it('maneja el caso de presupuesto agotado (pool <= 0)', () => {
    const expenses = [
      // Gastos previos que consumen todo el disponible
      makeExpense({ amount: 2_000_000, ts: at(2026, 0, 10) }),
    ];

    const result = calcSpendingMargin({
      income: INCOME,
      fixed: FIXED,
      expenses,
      now: JAN_15_2026,
    });

    expect(result.pool).toBe(0);
    expect(result.limit).toBe(0);
    expect(result.status).toBe('limite');
    expect(result.explanation).toContain('todo el presupuesto del mes');
  });
});

describe('calcSpendingMargin: modo mes', () => {
  const JAN_15_2026 = at(2026, 0, 15, 12);

  it('calcula el margen del mes completo', () => {
    const expenses = [
      makeExpense({ amount: 500_000, ts: at(2026, 0, 5) }),
      makeExpense({ amount: 100_000, ts: JAN_15_2026 }),
    ];

    const result = calcSpendingMargin(
      {
        income: INCOME,
        fixed: FIXED,
        expenses,
        now: JAN_15_2026,
      },
      { mode: 'mes' },
    );

    expect(result.mode).toBe('mes');
    expect(result.limit).toBe(DISPOSABLE); // 2_000_000
    expect(result.spent).toBe(600_000);
    expect(result.remaining).toBe(1_400_000);
    expect(result.percentage).toBe(30);
    expect(result.tier).toBe('conservador');
    expect(result.status).toBe('bien');
  });

  it('maneja ingresos fijos que cubren todo el disponible mensual', () => {
    const result = calcSpendingMargin(
      {
        income: 1_000_000,
        fixed: 1_000_000,
        expenses: [],
        now: JAN_15_2026,
      },
      { mode: 'mes' },
    );

    expect(result.limit).toBe(0);
    expect(result.status).toBe('limite');
    expect(result.headline).toContain('Sin margen');
  });
});

describe('calcSpendingMargin: modo semana', () => {
  const JAN_15_2026 = at(2026, 0, 15, 12);

  it('calcula el disponible proporcional y cuenta ingresos anteriores y de esta semana', () => {
    const expenses = [
      makeExpense({ amount: 500_000, ts: at(2026, 0, 5) }),
      makeExpense({ amount: 100_000, ts: at(2026, 0, 13) }),
      makeExpense({ amount: 100_000, ts: JAN_15_2026 }),
      makeExpense({ amount: 900_000, ts: at(2026, 0, 20) }),
    ];
    const incomes = [
      {
        id: 'income-before-week',
        amount: 50_000,
        description: 'Ingreso anterior',
        ts: at(2026, 0, 10),
        deletedAt: null,
      },
      {
        id: 'income-this-week',
        amount: 200_000,
        description: 'Ingreso de esta semana',
        ts: at(2026, 0, 14),
        deletedAt: null,
      },
    ];

    const result = calcSpendingMargin(
      { income: INCOME, fixed: FIXED, expenses, incomes, now: JAN_15_2026 },
      { mode: 'semana' },
    );

    expect(result.mode).toBe('semana');
    expect(result.limit).toBeCloseTo(
      ((3_000_000 + 50_000 - 1_000_000 - 500_000) / 20) * 7 + 200_000,
    );
    expect(result.spent).toBe(200_000);
    expect(result.remaining).toBeCloseTo(result.limit - 200_000);
    expect(result.daysLeft).toBe(4);
    expect(result.status).toBe('bien');
  });

  it('recorta la semana al inicio del mes y excluye gastos de semanas anteriores', () => {
    const result = calcSpendingMargin(
      {
        income: INCOME,
        fixed: FIXED,
        expenses: [
          makeExpense({ amount: 100_000, ts: at(2025, 11, 31) }),
          makeExpense({ amount: 200_000, ts: at(2026, 0, 1) }),
        ],
        now: at(2026, 0, 2),
      },
      { mode: 'semana' },
    );

    expect(result.limit).toBeCloseTo(DISPOSABLE / 31 * 4);
    expect(result.spent).toBe(200_000);
    expect(result.daysLeft).toBe(3);
  });
});

describe('verifyExpenseMargin: sistema de verificación fuerte', () => {
  const JAN_15_2026 = at(2026, 0, 15, 12); // 17 días restantes, diario base ~117_647

  it('rechaza monto no entero o menor o igual a cero', () => {
    const zero = verifyExpenseMargin({
      amount: 0,
      category: 'comida',
      income: INCOME,
      fixed: FIXED,
      expenses: [],
      now: JAN_15_2026,
    });
    expect(zero.allowed).toBe(false);
    expect(zero.hardBlocked).toBe(true);
    expect(zero.code).toBe('INVALID_AMOUNT');

    const negative = verifyExpenseMargin({
      amount: -5000,
      category: 'comida',
      income: INCOME,
      fixed: FIXED,
      expenses: [],
      now: JAN_15_2026,
    });
    expect(negative.allowed).toBe(false);
    expect(negative.hardBlocked).toBe(true);
    expect(negative.code).toBe('INVALID_AMOUNT');

    const decimal = verifyExpenseMargin({
      amount: 1500.5,
      category: 'comida',
      income: INCOME,
      fixed: FIXED,
      expenses: [],
      now: JAN_15_2026,
    });
    expect(decimal.allowed).toBe(false);
    expect(decimal.code).toBe('INVALID_AMOUNT');
  });

  it('rechaza fecha fuera del mes actual', () => {
    const DEC_2025 = at(2025, 11, 20);
    const result = verifyExpenseMargin({
      amount: 20_000,
      category: 'comida',
      ts: DEC_2025,
      now: JAN_15_2026,
      income: INCOME,
      fixed: FIXED,
      expenses: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.hardBlocked).toBe(true);
    expect(result.code).toBe('INVALID_DATE');
    expect(result.message).toContain('mes en curso');
  });

  it('rechaza cuando no hay disponible para variables (fijos >= ingreso)', () => {
    const result = verifyExpenseMargin({
      amount: 20_000,
      category: 'comida',
      now: JAN_15_2026,
      income: 1_000_000,
      fixed: 1_000_000,
      expenses: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.hardBlocked).toBe(true);
    expect(result.code).toBe('NO_DISPOSABLE');
  });

  it('bloquea estrictamente si el gasto supera todo lo disponible en el mes', () => {
    // Quedan 2_000_000 en el mes. Intento gastar 2_500_000.
    const result = verifyExpenseMargin({
      amount: 2_500_000,
      category: 'otros',
      now: JAN_15_2026,
      income: INCOME,
      fixed: FIXED,
      expenses: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.hardBlocked).toBe(true);
    expect(result.code).toBe('EXCEEDS_MONTH_AVAILABLE');
    expect(result.status).toBe('limite');
    expect(result.message).toContain('excede lo que te queda disponible en el mes');
    expect(result.message).toContain('Te faltarían $ 500.000');
  });

  it('permite con advertencia si supera el límite diario pero hay fondos en el mes', () => {
    // Diario es ~117_647. Intento gastar 200_000.
    // Hay fondos en el mes (2_000_000), pero rompe el margen diario.
    const result = verifyExpenseMargin({
      amount: 200_000,
      category: 'ocio',
      now: JAN_15_2026,
      income: INCOME,
      fixed: FIXED,
      expenses: [],
    });

    expect(result.allowed).toBe(true);
    expect(result.hardBlocked).toBe(false);
    expect(result.canProceedWithWarning).toBe(true);
    expect(result.code).toBe('EXCEEDS_DAILY_MARGIN');
    expect(result.status).toBe('limite');
    expect(result.tier).toBe('flexible');
    expect(result.title).toBe('Supera el margen diario');
    expect(result.impact).not.toBeNull();
    expect(result.impact?.tomorrowAfter).toBeLessThan(result.impact?.tomorrowBefore ?? 0);
    expect(result.message).toContain('se reducirá');
  });

  it('aprueba sin advertencia cuando está dentro del margen seguro (zona conservadora)', () => {
    // Gasto de 40_000 de ~117_647 -> ~34%
    const result = verifyExpenseMargin({
      amount: 40_000,
      category: 'comida',
      now: JAN_15_2026,
      income: INCOME,
      fixed: FIXED,
      expenses: [],
    });

    expect(result.allowed).toBe(true);
    expect(result.hardBlocked).toBe(false);
    expect(result.canProceedWithWarning).toBe(false);
    expect(result.status).toBe('bien');
    expect(result.tier).toBe('conservador');
    expect(result.code).toBe('OK');
    expect(result.title).toContain('margen seguro');
  });

  it('aprueba con estado aviso cuando entra a la zona normal (70% - 90%)', () => {
    // 95_000 de ~117_647 -> ~80.7%
    const result = verifyExpenseMargin({
      amount: 95_000,
      category: 'comida',
      now: JAN_15_2026,
      income: INCOME,
      fixed: FIXED,
      expenses: [],
    });

    expect(result.allowed).toBe(true);
    expect(result.hardBlocked).toBe(false);
    expect(result.canProceedWithWarning).toBe(false);
    expect(result.status).toBe('aviso');
    expect(result.tier).toBe('normal');
    expect(result.code).toBe('OK');
    expect(result.title).toContain('Cerca del límite');
  });
});
