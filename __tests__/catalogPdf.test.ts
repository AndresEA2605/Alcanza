import {
  generateCatalogPdfHtml,
  generateProductPdfHtml,
} from '../src/domain/catalogPdf';
import type { BusinessItem } from '../src/domain/business';

describe('catalogPdf HTML generators', () => {
  const mockProduct: BusinessItem = {
    id: 'biz_sample_456',
    name: 'Café Grano & Tostado',
    type: 'product',
    quantity: 12,
    pricePerUnit: 32000,
    investment: 180000,
    dailyGoal: 0,
    goalAmount: 0,
    goalPeriod: 'daily',
    description: '100% Arábica con notas a chocolate',
    imageUri: null,
    inCatalog: true,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const mockService: BusinessItem = {
    id: 'biz_serv_789',
    name: 'Asesoría Personalizada',
    type: 'service',
    quantity: 1,
    pricePerUnit: 150000,
    investment: 0,
    dailyGoal: 0,
    goalAmount: 0,
    goalPeriod: 'daily',
    description: 'Sesión 1 a 1 de 60 minutos',
    imageUri: null,
    inCatalog: true,
    createdAt: 1000,
    updatedAt: 1000,
  };

  it('genera HTML para la ficha de producto con diseño Instagram + Factura', () => {
    const html = generateProductPdfHtml({
      item: mockProduct,
      imageBase64: 'data:image/jpeg;base64,mockdata',
      seller: {
        storeName: 'Origen Colombia',
        sellerName: 'Valeria López',
        sellerPhone: '3109876543',
        sellerCity: 'Manizales',
        sellerNotes: 'Envíos a todo el país',
      },
    });

    expect(html).toContain('Café Grano &amp; Tostado');
    expect(html).toContain('ID: biz_sample_456');
    expect(html).toContain('$ 32.000');
    expect(html).toContain('Producto');
    expect(html).toContain('100% Arábica con notas a chocolate');
    expect(html).toContain('data:image/jpeg;base64,mockdata');
    expect(html).toContain('Origen Colombia');
    expect(html).toContain('Valeria López');
    expect(html).toContain('3109876543');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Manizales');
    expect(html).toContain('Cotización / Ficha Comercial');
  });

  it('genera HTML para el catálogo completo con múltiples ítems separados por ID', () => {
    const html = generateCatalogPdfHtml({
      items: [
        { item: mockProduct, imageBase64: null },
        { item: mockService, imageBase64: null },
      ],
      seller: {
        storeName: 'Tienda Integral',
        sellerPhone: '3201112233',
      },
    });

    expect(html).toContain('Tienda Integral');
    expect(html).toContain('2 productos');
    expect(html).toContain('ID: biz_sample_456');
    expect(html).toContain('Café Grano &amp; Tostado');
    expect(html).toContain('$ 32.000');
    expect(html).toContain('ID: biz_serv_789');
    expect(html).toContain('Asesoría Personalizada');
    expect(html).toContain('$ 150.000');
    expect(html).toContain('Servicio');
    expect(html).toContain('3201112233');
  });
});
