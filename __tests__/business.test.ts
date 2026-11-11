import {
  calculateBusiness,
  createWhatsAppChatUrl,
  formatCatalogShareText,
  formatProductShareText,
  normalizeBusinessGoal,
  normalizePhoneForWhatsApp,
  sumBusinessCalculations,
  type BusinessItem,
} from '../src/domain/business';

describe('cálculos de negocio', () => {
  it('convierte metas mensuales y anuales a su equivalente diario', () => {
    expect(normalizeBusinessGoal(300000, 'monthly')).toBe(10000);
    expect(normalizeBusinessGoal(3650000, 'yearly')).toBe(10000);
    expect(normalizeBusinessGoal(10000, 'daily')).toBe(10000);
  });

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

describe('utilidades de compartir catálogo y producto', () => {
  it('normaliza números de celular para WhatsApp agregando código 57 a celulares colombianos', () => {
    expect(normalizePhoneForWhatsApp('300 123 4567')).toBe('573001234567');
    expect(normalizePhoneForWhatsApp('+57 310 987 6543')).toBe('573109876543');
    expect(normalizePhoneForWhatsApp('15551234567')).toBe('15551234567');
  });

  it('crea enlace de chat directo de WhatsApp', () => {
    const url = createWhatsAppChatUrl('3001234567', 'Hola! Me interesa');
    expect(url).toBe('https://wa.me/573001234567?text=Hola!%20Me%20interesa');
  });

  it('formatea texto de producto con ID, precio, información de vendedor y links', () => {
    const item: BusinessItem = {
      id: 'biz_test_123',
      name: 'Café Especial',
      type: 'product',
      quantity: 10,
      pricePerUnit: 25000,
      investment: 150000,
      dailyGoal: 0,
      goalAmount: 0,
      goalPeriod: 'daily',
      description: 'Café de origen Huila',
      imageUri: null,
      inCatalog: true,
      createdAt: 1000,
      updatedAt: 1000,
    };

    const text = formatProductShareText({
      item,
      seller: {
        storeName: 'Café Don Pedro',
        sellerName: 'Pedro Gómez',
        sellerPhone: '3001234567',
        sellerCity: 'Pitalito',
        sellerNotes: 'Envíos a todo el país',
      },
      appLink: 'mealcanza://negocio/tienda?id=biz_test_123',
    });

    expect(text).toContain('Café Especial');
    expect(text).toContain('*ID de referencia:* biz_test_123');
    expect(text).toContain('$ 25.000');
    expect(text).toContain('Café Don Pedro');
    expect(text).toContain('Pedro Gómez');
    expect(text).toContain('Pitalito');
    expect(text).toContain('Envíos a todo el país');
    expect(text).toContain('https://wa.me/573001234567');
    expect(text).toContain('mealcanza://negocio/tienda?id=biz_test_123');
  });

  it('formatea el catálogo completo listando productos con ID y precio', () => {
    const items: BusinessItem[] = [
      {
        id: 'biz_1',
        name: 'Camisa Lino',
        type: 'product',
        quantity: 5,
        pricePerUnit: 80000,
        investment: 200000,
        dailyGoal: 0,
        goalAmount: 0,
        goalPeriod: 'daily',
        description: 'Blanca talla M',
        imageUri: null,
        inCatalog: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'biz_2',
        name: 'Pantalón Jean',
        type: 'product',
        quantity: 3,
        pricePerUnit: 120000,
        investment: 180000,
        dailyGoal: 0,
        goalAmount: 0,
        goalPeriod: 'daily',
        description: 'Azul clásico',
        imageUri: null,
        inCatalog: true,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ];

    const text = formatCatalogShareText({
      items,
      seller: {
        storeName: 'Boutique Elegance',
        sellerPhone: '3159998877',
      },
      appLink: 'mealcanza://negocio/tienda',
    });

    expect(text).toContain('Boutique Elegance');
    expect(text).toContain('*Camisa Lino* — $ 80.000');
    expect(text).toContain('ID: `biz_1`');
    expect(text).toContain('*Pantalón Jean* — $ 120.000');
    expect(text).toContain('ID: `biz_2`');
    expect(text).toContain('https://wa.me/573159998877');
  });
});
