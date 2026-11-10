import { calculateBusiness, sumBusinessCalculations } from '../src/domain/business';

describe('cálculos de negocio', () => {
  it('calcula ganancia de un producto (canasta de huevos)', () => {
    // Inversión: $140.000 por 14 canastas, se venden a $12.000 cada una
    const result = calculateBusiness({
      type: 'product',
      quantity: 14,
      pricePerUnit: 12000,
      investment: 140000,
      dailyGoal: 50000,
    });

    expect(result.cost).toBe(140000);
    expect(result.revenue).toBe(168000);
    expect(result.costPerUnit).toBe(10000);
    expect(result.profitPerUnit).toBe(2000);
    expect(result.profit).toBe(28000);
    expect(result.freeProfit).toBe(28000);
    expect(result.reinvestment).toBe(28000);
    expect(result.remainingToGoal).toBe(22000);
    expect(result.goalReached).toBe(false);
  });

  it('calcula ganancia de un servicio (Indrive/Uber)', () => {
    // 5 viajes a $15.000 cada uno, meta diaria $50.000
    const result = calculateBusiness({
      type: 'service',
      quantity: 5,
      pricePerUnit: 15000,
      dailyGoal: 50000,
    });

    expect(result.cost).toBe(0);
    expect(result.revenue).toBe(75000);
    expect(result.profit).toBe(75000);
    expect(result.freeProfit).toBe(75000);
    expect(result.remainingToGoal).toBe(0);
    expect(result.goalPct).toBe(1);
    expect(result.goalReached).toBe(true);
  });

  it('indica cuánto falta para la meta diaria', () => {
    const result = calculateBusiness({
      type: 'service',
      quantity: 2,
      pricePerUnit: 15000,
      dailyGoal: 50000,
    });

    expect(result.revenue).toBe(30000);
    expect(result.remainingToGoal).toBe(20000);
    expect(result.goalPct).toBe(0.6);
    expect(result.goalReached).toBe(false);
  });

  it('devuelve ceros cuando la cantidad es 0', () => {
    const result = calculateBusiness({
      type: 'service',
      quantity: 0,
      pricePerUnit: 15000,
      dailyGoal: 1000,
    });

    expect(result.revenue).toBe(0);
    expect(result.cost).toBe(0);
    expect(result.profit).toBe(0);
    expect(result.freeProfit).toBe(0);
    expect(result.goalReached).toBe(false);
  });

  it('no permite precio por unidad negativo', () => {
    expect(() =>
      calculateBusiness({ type: 'service', quantity: 1, pricePerUnit: -1, dailyGoal: 1000 }),
    ).toThrow('Precio por unidad');
  });

  it('suma varios cálculos de negocio', () => {
    const a = calculateBusiness({
      type: 'product',
      quantity: 10,
      pricePerUnit: 300,
      investment: 1500,
      dailyGoal: 1000,
    });
    const b = calculateBusiness({
      type: 'service',
      quantity: 2,
      pricePerUnit: 5000,
      dailyGoal: 5000,
    });

    const total = sumBusinessCalculations([a, b]);

    expect(total.revenue).toBe(3000 + 10000);
    expect(total.cost).toBe(1500 + 0);
    expect(total.profit).toBe(1500 + 10000);
    expect(total.freeProfit).toBe(1500 + 10000);
    expect(total.reinvestment).toBe(1500 + 10000);
  });
});
