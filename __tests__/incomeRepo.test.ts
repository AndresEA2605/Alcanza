import {
  createIncome,
  createIncomeId,
  getIncomeById,
  listIncomesByDay,
  listIncomesByMonth,
  restoreIncome,
  softDeleteIncome,
} from '../src/data/incomeRepo';
import { migrateDatabase } from '../src/data/migrations';
import { dayRangeFromTs, monthRangeFromTs } from '../src/domain/budget';
import {
  createTestDatabase,
  type TestDatabase,
} from './helpers/sqliteTestDb';

function at(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0,
): number {
  return new Date(year, monthIndex, day, hour, minute).getTime();
}

describe('incomeRepo', () => {
  let testDb: TestDatabase;
  const jan10 = at(2026, 0, 10);
  const jan15 = at(2026, 0, 15);
  const feb1 = at(2026, 1, 1, 0, 1);

  beforeEach(async () => {
    testDb = createTestDatabase();
    await migrateDatabase(testDb.db);
  });

  afterEach(() => {
    testDb.close();
  });

  async function seedJanuaryIncomes(): Promise<void> {
    await createIncome(testDb.db, {
      id: 'honorarios',
      amount: 150_000,
      description: 'Honorarios asesoría',
      ts: jan10,
    });
    await createIncome(testDb.db, {
      id: 'venta',
      amount: 80_000,
      description: 'Venta bicicleta',
      ts: jan15,
    });
    await createIncome(testDb.db, {
      id: 'febrero',
      amount: 200_000,
      description: 'Trabajo extra',
      ts: feb1,
    });
  }

  it('guarda un ingreso y lo devuelve como entidad de dominio', async () => {
    const created = await createIncome(testDb.db, {
      id: 'income-1',
      amount: 120_000,
      description: 'Regalo cumpleaños',
      ts: jan15,
    });

    expect(created).toEqual({
      id: 'income-1',
      amount: 120_000,
      description: 'Regalo cumpleaños',
      ts: jan15,
      deletedAt: null,
    });

    await expect(getIncomeById(testDb.db, 'income-1')).resolves.toEqual(created);
  });

  it('lista el mes en orden descendente y excluye otros meses', async () => {
    await seedJanuaryIncomes();

    const january = await listIncomesByMonth(
      testDb.db,
      monthRangeFromTs(jan15),
    );

    expect(january.map((income) => income.id)).toEqual(['venta', 'honorarios']);
  });

  it('lista por día excluyendo otros días', async () => {
    await seedJanuaryIncomes();

    const day15 = await listIncomesByDay(
      testDb.db,
      dayRangeFromTs(jan15),
    );

    expect(day15.map((income) => income.id)).toEqual(['venta']);
  });

  it('aplica borrado lógico y restaura correctamente', async () => {
    await seedJanuaryIncomes();

    const deleted = await softDeleteIncome(testDb.db, 'venta', jan15 + 1000);
    expect(deleted).toBe(true);

    const active = await listIncomesByMonth(
      testDb.db,
      monthRangeFromTs(jan15),
    );
    expect(active.map((income) => income.id)).toEqual(['honorarios']);

    const inDb = await getIncomeById(testDb.db, 'venta');
    expect(inDb?.deletedAt).toBe(jan15 + 1000);

    const restored = await restoreIncome(testDb.db, 'venta');
    expect(restored).toBe(true);

    const restoredActive = await listIncomesByMonth(
      testDb.db,
      monthRangeFromTs(jan15),
    );
    expect(restoredActive.map((income) => income.id)).toEqual(['venta', 'honorarios']);
  });

  it('genera identificadores únicos y consistentes', () => {
    const id1 = createIncomeId(jan15);
    const id2 = createIncomeId(jan15);

    expect(id1).toMatch(/^inc_[a-z0-9]+_[a-z0-9]+$/);
    expect(id2).toMatch(/^inc_[a-z0-9]+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});
