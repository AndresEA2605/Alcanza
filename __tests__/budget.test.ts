import {
  calcToday,
  dayRangeFromTs,
  daysInMonthFromTs,
  monthKeyFromTs,
  monthRangeFromTs,
  type Expense,
} from '../src/domain/budget';

const INCOME = 3_000_000;
const FIXED = 1_000_000;
const DISPOSABLE = INCOME - FIXED;

/** Construye un epoch local para que las pruebas no dependan de la zona horaria. */
function at(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0,
  second = 0,
  ms = 0,
): number {
  return new Date(year, monthIndex, day, hour, minute, second, ms).getTime();
}

function makeExpense(partial: Partial<Expense> & { ts: number }): Expense {
  return {
    id: 'expense-1',
    amount: 10_000,
    category: 'comida',
    deletedAt: null,
    ...partial,
  };
}

function run(
  now: number,
  expenses: readonly Expense[] = [],
  income = INCOME,
  fixed = FIXED,
) {
  return calcToday({ income, fixed, expenses, now });
}

describe('calcToday: días del mes', () => {
  it('calcula el primer día del mes sin contar gastos del mes anterior', () => {
    const now = at(2026, 0, 1, 9);
    const result = run(now, [
      makeExpense({ amount: 777_000, ts: at(2025, 11, 31, 23, 59) }),
    ]);

    expect(result.daysLeft).toBe(31);
    expect(result.spentBefore).toBe(0);
    expect(result.spentToday).toBe(0);
    expect(result.spentMonth).toBe(0);
    expect(result.pool).toBe(DISPOSABLE);
    expect(result.daily).toBeCloseTo(DISPOSABLE / 31, 10);
    expect(result.remaining).toBeCloseTo(DISPOSABLE / 31, 10);
    expect(result.tomorrow).toBeCloseTo(DISPOSABLE / 30, 10);
    expect(result.monthLeft).toBe(DISPOSABLE);
    expect(result.usedPct).toBe(0);
    expect(result.status).toBe('verde');
  });

  it('calcula el último día del mes con un solo día restante', () => {
    const now = at(2026, 0, 31, 12);
    const result = run(now, [
      makeExpense({ amount: 500_000, ts: at(2026, 0, 10, 12) }),
    ]);

    expect(result.daysLeft).toBe(1);
    expect(result.spentBefore).toBe(500_000);
    expect(result.spentToday).toBe(0);
    expect(result.pool).toBe(1_500_000);
    expect(result.daily).toBe(1_500_000);
    expect(result.remaining).toBe(1_500_000);
    expect(result.tomorrow).toBe(0);
    expect(result.monthLeft).toBe(1_500_000);
    expect(result.usedPct).toBe(0.25);
    expect(result.status).toBe('verde');
  });

  it('cuenta un gasto hecho justo a medianoche como del día nuevo', () => {
    const now = at(2026, 0, 15, 0, 0);
    const result = run(now, [makeExpense({ ts: now })]);

    expect(result.spentBefore).toBe(0);
    expect(result.spentToday).toBe(10_000);
  });
});

describe('calcToday: ingresos y fijos', () => {
  it('queda en rojo cuando el ingreso es igual a los gastos fijos', () => {
    const result = run(at(2026, 0, 15, 12), [], 3_000_000, 3_000_000);

    expect(result.pool).toBe(0);
    expect(result.daily).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.tomorrow).toBe(0);
    expect(result.monthLeft).toBe(0);
    expect(result.usedPct).toBe(0);
    expect(result.status).toBe('rojo');
  });

  it('queda en rojo cuando los fijos superan el ingreso', () => {
    const result = run(at(2026, 0, 15, 12), [], 3_000_000, 3_500_000);

    expect(result.pool).toBe(-500_000);
    expect(result.daily).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.tomorrow).toBe(0);
    expect(result.monthLeft).toBe(-500_000);
    expect(result.usedPct).toBe(0);
    expect(result.status).toBe('rojo');
  });
});

describe('calcToday: cambio de día y de mes', () => {
  it('cuenta un gasto a las 11:59 p. m. como del día que termina', () => {
    const now = at(2026, 0, 31, 23, 59);
    const result = run(now, [makeExpense({ amount: 50_000, ts: now })]);

    expect(result.daysLeft).toBe(1);
    expect(result.spentBefore).toBe(0);
    expect(result.spentToday).toBe(50_000);
    expect(result.pool).toBe(DISPOSABLE);
    expect(result.daily).toBe(DISPOSABLE);
    expect(result.remaining).toBe(DISPOSABLE - 50_000);
    expect(result.tomorrow).toBe(0);
    expect(result.monthLeft).toBe(DISPOSABLE - 50_000);
    expect(result.status).toBe('verde');
  });

  it('a las 12:01 a. m. del mes siguiente ignora el gasto del mes anterior', () => {
    const now = at(2026, 1, 1, 0, 1);
    const result = run(now, [
      makeExpense({
        id: 'enero',
        amount: 50_000,
        ts: at(2026, 0, 31, 23, 59),
      }),
      makeExpense({ id: 'febrero', amount: 50_000, ts: now }),
    ]);

    expect(result.daysLeft).toBe(28);
    expect(result.spentBefore).toBe(0);
    expect(result.spentToday).toBe(50_000);
    expect(result.pool).toBe(DISPOSABLE);
    expect(result.daily).toBeCloseTo(DISPOSABLE / 28, 10);
    expect(result.remaining).toBeCloseTo(DISPOSABLE / 28 - 50_000, 10);
    expect(result.tomorrow).toBeCloseTo((DISPOSABLE - 50_000) / 27, 10);
    expect(result.monthLeft).toBe(DISPOSABLE - 50_000);
    expect(result.usedPct).toBe(0.025);
    expect(result.status).toBe('verde');
  });
});

describe('calcToday: borrado lógico', () => {
  it('borrar un gasto de un día anterior libera presupuesto', () => {
    const now = at(2026, 0, 15, 12);
    const active = makeExpense({
      amount: 200_000,
      ts: at(2026, 0, 10, 12),
    });

    const before = run(now, [active]);
    const after = run(now, [
      { ...active, deletedAt: at(2026, 0, 14, 12) },
    ]);

    expect(before.spentBefore).toBe(200_000);
    expect(after.spentBefore).toBe(0);
    expect(before.daily).toBeCloseTo(1_800_000 / 17, 10);
    expect(after.daily).toBeCloseTo(DISPOSABLE / 17, 10);
    expect(after.daily).toBeGreaterThan(before.daily);
    expect(after.monthLeft).toBe(before.monthLeft + 200_000);
    expect(before.usedPct).toBe(0.1);
    expect(after.usedPct).toBe(0);
  });

  it('ignora un gasto borrado del día de hoy', () => {
    const now = at(2026, 0, 15, 12);
    const result = run(now, [
      makeExpense({ amount: 80_000, ts: now, deletedAt: now + 1 }),
    ]);

    expect(result.spentToday).toBe(0);
    expect(result.monthLeft).toBe(DISPOSABLE);
  });
});

describe('calcToday: febrero y año bisiesto', () => {
  it('el 29 de febrero de 2024 es el último día del mes', () => {
    const now = at(2024, 1, 29, 12);

    expect(daysInMonthFromTs(now)).toBe(29);
    expect(run(now).daysLeft).toBe(1);
    expect(run(now).tomorrow).toBe(0);
  });

  it('el 1 de febrero de 2024 quedan 29 días', () => {
    expect(run(at(2024, 1, 1, 0, 1)).daysLeft).toBe(29);
  });

  it('febrero de 2026 no es bisiesto', () => {
    expect(run(at(2026, 1, 1, 0, 1)).daysLeft).toBe(28);
    expect(run(at(2026, 1, 28, 12)).daysLeft).toBe(1);
  });
});

describe('calcToday: estado visual y porcentaje usado', () => {
  it('está en verde cuando queda exactamente 25 % del número diario', () => {
    const now = at(2026, 0, 31, 12);
    const result = run(now, [makeExpense({ amount: 750, ts: now })], 1_000, 0);

    expect(result.daily).toBe(1_000);
    expect(result.remaining).toBe(250);
    expect(result.status).toBe('verde');
  });

  it('pasa a naranja cuando queda menos del 25 % del número diario', () => {
    const now = at(2026, 0, 31, 12);
    const result = run(now, [makeExpense({ amount: 751, ts: now })], 1_000, 0);

    expect(result.remaining).toBe(249);
    expect(result.status).toBe('naranja');
  });

  it('pasa a rojo cuando el gasto de hoy supera el número diario', () => {
    const now = at(2026, 0, 31, 12);
    const result = run(now, [makeExpense({ amount: 1_001, ts: now })], 1_000, 0);

    expect(result.remaining).toBe(-1);
    expect(result.monthLeft).toBe(-1);
    expect(result.status).toBe('rojo');
  });

  it('no descuenta gastos con fecha futura dentro del mismo mes', () => {
    const now = at(2026, 0, 15, 12);
    const result = run(now, [
      makeExpense({ amount: 50_000, ts: at(2026, 0, 20, 12) }),
    ]);

    expect(result.spentBefore).toBe(0);
    expect(result.spentToday).toBe(0);
    expect(result.monthLeft).toBe(DISPOSABLE);
  });
});

describe('calcToday: ingresos adicionales', () => {
  it('suma ingresos adicionales anteriores y de hoy al presupuesto', () => {
    const now = at(2026, 0, 15, 12);
    const incomes = [
      {
        id: 'inc-1',
        amount: 200_000,
        description: 'Venta',
        ts: at(2026, 0, 10, 10),
        deletedAt: null,
      },
      {
        id: 'inc-2',
        amount: 140_000,
        description: 'Bono',
        ts: now,
        deletedAt: null,
      },
      {
        id: 'inc-del',
        amount: 999_999,
        description: 'Borrado',
        ts: now,
        deletedAt: now,
      },
    ];

    const result = calcToday({
      income: INCOME,
      fixed: FIXED,
      expenses: [],
      incomes,
      now,
    });

    expect(result.incomeBefore).toBe(200_000);
    expect(result.incomeToday).toBe(140_000);
    expect(result.incomeAdditionalMonth).toBe(340_000);
    expect(result.totalIncome).toBe(INCOME + 340_000);
    // (2_000_000 + 340_000) / 17 días restantes = 2_340_000 / 17
    expect(result.daily).toBeCloseTo(2_340_000 / 17, 10);
    expect(result.remaining).toBeCloseTo(2_340_000 / 17, 10);
    expect(result.monthLeft).toBe(2_340_000);
  });
});

describe('utilidades de fecha', () => {
  it('deriva la clave y el rango del mes local', () => {
    const ts = at(2026, 0, 15, 12);

    expect(monthKeyFromTs(ts)).toBe('2026-01');
    expect(monthRangeFromTs(ts)).toEqual({
      start: at(2026, 0, 1, 0, 0, 0, 0),
      end: at(2026, 1, 1, 0, 0, 0, 0),
    });
  });

  it('deriva el rango del día local', () => {
    expect(dayRangeFromTs(at(2026, 0, 15, 12))).toEqual({
      start: at(2026, 0, 15, 0, 0, 0, 0),
      end: at(2026, 0, 16, 0, 0, 0, 0),
    });
  });
});
