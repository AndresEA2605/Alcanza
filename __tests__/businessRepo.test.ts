import {
  createBusinessItem,
  listBusinessItems,
  toggleBusinessItemCatalog,
  updateBusinessItem,
} from '../src/data/businessRepo';
import { migrateDatabase } from '../src/data/migrations';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/sqliteTestDb';

describe('businessRepo', () => {
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = createTestDatabase();
    await migrateDatabase(testDb.db);
  });

  afterEach(() => {
    testDb.close();
  });

  it('guarda y actualiza descripción, imagen y meta por periodo', async () => {
    const created = await createBusinessItem(testDb.db, {
      name: 'Café molido',
      type: 'product',
      quantity: 2,
      pricePerUnit: 12000,
      investment: 10000,
      dailyGoal: 10000,
      goalAmount: 300000,
      goalPeriod: 'monthly',
      description: 'Tueste medio',
      imageUri: 'file:///products/cafe.jpg',
    });

    expect(created).toMatchObject({
      goalAmount: 300000,
      goalPeriod: 'monthly',
      dailyGoal: 10000,
      description: 'Tueste medio',
      imageUri: 'file:///products/cafe.jpg',
      inCatalog: true,
    });

    await updateBusinessItem(testDb.db, created.id, {
      goalAmount: 3650000,
      goalPeriod: 'yearly',
      description: '',
      imageUri: null,
    });

    await expect(listBusinessItems(testDb.db)).resolves.toEqual([
      expect.objectContaining({
        id: created.id,
        goalAmount: 3650000,
        goalPeriod: 'yearly',
        dailyGoal: 10000,
        description: '',
        imageUri: null,
        inCatalog: true,
      }),
    ]);
  });

  it('permite decidir si un producto va al catálogo o no y alternar su estado', async () => {
    const itemCatalog = await createBusinessItem(testDb.db, {
      name: 'Camisa Blanca',
      type: 'product',
      quantity: 1,
      pricePerUnit: 50000,
      dailyGoal: 0,
      inCatalog: true,
    });

    const itemInternalOnly = await createBusinessItem(testDb.db, {
      name: 'Materia prima interna',
      type: 'product',
      quantity: 1,
      pricePerUnit: 10000,
      dailyGoal: 0,
      inCatalog: false,
    });

    expect(itemCatalog.inCatalog).toBe(true);
    expect(itemInternalOnly.inCatalog).toBe(false);

    // Alternar visibilidad
    await toggleBusinessItemCatalog(testDb.db, itemCatalog.id, false);
    await toggleBusinessItemCatalog(testDb.db, itemInternalOnly.id, true);

    const items = await listBusinessItems(testDb.db);
    const updatedCatalog = items.find((i) => i.id === itemCatalog.id);
    const updatedInternal = items.find((i) => i.id === itemInternalOnly.id);

    expect(updatedCatalog?.inCatalog).toBe(false);
    expect(updatedInternal?.inCatalog).toBe(true);
  });
});
