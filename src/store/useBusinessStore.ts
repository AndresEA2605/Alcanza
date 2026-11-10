import { create } from 'zustand';
import {
  calculateBusiness,
  sumBusinessCalculations,
  type BusinessCalculation,
  type BusinessItem,
  type NewBusinessItem,
} from '../domain/business';
import { getDatabase } from '../data/db';
import type { Database } from '../data/migrations';
import {
  createBusinessItem,
  deleteBusinessItem,
  getBusinessItemById,
  listBusinessItems,
  updateBusinessItem,
} from '../data/businessRepo';
import { deleteProductImages } from '../data/productImageStorage';

export interface BusinessStoreState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  items: BusinessItem[];
  calculations: BusinessCalculation[];
  totals: BusinessCalculation;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  addItem: (input: NewBusinessItem) => Promise<void>;
  updateItem: (id: string, input: Partial<NewBusinessItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useBusinessStore = create<BusinessStoreState>()((set, get) => ({
  status: 'idle',
  error: null,
  items: [],
  calculations: [],
  totals: {
    revenue: 0,
    cost: 0,
    profit: 0,
    freeProfit: 0,
    remainingToGoal: 0,
    goalPct: 0,
    reinvestment: 0,
    goalReached: false,
    costPerUnit: 0,
    profitPerUnit: 0,
  },

  initialize: async () => {
    const { status } = get();

    if (status === 'loading') {
      return;
    }

    set({ status: 'loading', error: null });

    try {
      const db = await getDatabase();
      const items = await listBusinessItems(db);
      await loadItemsAndCalculations(set, items);
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error inesperado.',
      });
    }
  },

  refresh: async () => {
    set({ status: 'loading', error: null });

    try {
      const db = await getDatabase();
      const items = await listBusinessItems(db);
      await loadItemsAndCalculations(set, items);
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error inesperado.',
      });
    }
  },

  addItem: async (input) => {
    try {
      const db = await getDatabase();
      await createBusinessItem(db, input);
      await refreshItems(set, db);
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error inesperado.',
      });
      throw error;
    }
  },

  updateItem: async (id, input) => {
    try {
      const db = await getDatabase();
      const existing = await getBusinessItemById(db, id);
      const updated = await updateBusinessItem(db, id, input);

      if (!updated) {
        throw new Error('No encontré ese producto o servicio.');
      }

      if (existing?.imageUri && existing.imageUri !== updated.imageUri) {
        deleteProductImages([existing.imageUri]);
      }

      await refreshItems(set, db);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error inesperado.',
      });
      throw error;
    }
  },

  deleteItem: async (id) => {
    try {
      const db = await getDatabase();
      const existing = await getBusinessItemById(db, id);
      const deleted = await deleteBusinessItem(db, id);

      if (!deleted) {
        throw new Error('No pude eliminar ese producto o servicio.');
      }

      if (existing?.imageUri) {
        deleteProductImages([existing.imageUri]);
      }

      await refreshItems(set, db);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error inesperado.',
      });
      throw error;
    }
  },
}));

type StoreSetter = (fn: any) => void;

async function loadItemsAndCalculations(
  set: StoreSetter,
  items: BusinessItem[],
) {
  const sortedItems = items.sort((a, b) => a.name.localeCompare(b.name));
  const calculations = sortedItems.map((item) =>
    calculateBusiness({
      type: item.type,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      investment: item.investment,
      dailyGoal: item.dailyGoal,
    }),
  );

  set({
    status: 'ready',
    items: sortedItems,
    calculations,
    totals: sumBusinessCalculations(calculations),
    error: null,
  });
}

async function refreshItems(
  set: StoreSetter,
  db: Database,
) {
  const items = await listBusinessItems(db);
  await loadItemsAndCalculations(set, items);
}
