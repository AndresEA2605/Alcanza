import {
  createBusinessItem,
  listBusinessItems,
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
      }),
    ]);
  });
});
