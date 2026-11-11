import { create } from 'zustand';
import {
  calculateBusiness,
  normalizeBusinessGoal,
  sumBusinessCalculations,
  type BusinessGoalPeriod,
  type BusinessCalculation,
  type BusinessItem,
  type BusinessSellerProfile,
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
import {
  getBusinessSettings,
  saveBusinessSettings,
  type BusinessSettings,
} from '../data/businessSettingsRepo';
import { deleteProductImages } from '../data/productImageStorage';

export interface BusinessStoreState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  items: BusinessItem[];
  calculations: BusinessCalculation[];
  totals: BusinessCalculation;
  goalAmount: number;
  goalPeriod: BusinessGoalPeriod;
  storeName: string;
  sellerName: string;
  sellerPhone: string;
  sellerCity: string;
  sellerNotes: string;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  saveGoal: (settings: {
    goalAmount: number;
    goalPeriod: BusinessGoalPeriod;
  }) => Promise<void>;
  saveSellerProfile: (profile: Partial<BusinessSellerProfile>) => Promise<void>;
  addItem: (input: NewBusinessItem) => Promise<void>;
  updateItem: (id: string, input: Partial<NewBusinessItem>) => Promise<void>;
  toggleCatalogItem: (id: string, inCatalog: boolean) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useBusinessStore = create<BusinessStoreState>()((set, get) => ({
  status: 'idle',
  error: null,
  items: [],
  calculations: [],
  goalAmount: 0,
  goalPeriod: 'daily',
  storeName: '',
  sellerName: '',
  sellerPhone: '',
  sellerCity: '',
  sellerNotes: '',
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
      const [items, settings] = await Promise.all([
        listBusinessItems(db),
        getBusinessSettings(db),
      ]);
      await loadItemsAndCalculations(set, items, settings);
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
      const [items, settings] = await Promise.all([
        listBusinessItems(db),
        getBusinessSettings(db),
      ]);
      await loadItemsAndCalculations(set, items, settings);
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error inesperado.',
      });
    }
  },

  saveGoal: async (settings) => {
    try {
      const db = await getDatabase();
      await saveBusinessSettings(db, settings);
      set((state) => ({
        ...state,
        ...settings,
        totals: withBusinessGoal(state.totals, settings),
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error inesperado.',
      });
      throw error;
    }
  },

  saveSellerProfile: async (profile) => {
    try {
      const db = await getDatabase();
      await saveBusinessSettings(db, profile);
      set((state) => ({
        ...state,
        ...profile,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error inesperado.',
      });
      throw error;
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

  toggleCatalogItem: async (id, inCatalog) => {
    try {
      const db = await getDatabase();
      await updateBusinessItem(db, id, { inCatalog });
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
  settings: BusinessSettings,
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

  const totals = sumBusinessCalculations(calculations);

  set({
    status: 'ready',
    items: sortedItems,
    calculations,
    goalAmount: settings.goalAmount,
    goalPeriod: settings.goalPeriod,
    storeName: settings.storeName ?? '',
    sellerName: settings.sellerName ?? '',
    sellerPhone: settings.sellerPhone ?? '',
    sellerCity: settings.sellerCity ?? '',
    sellerNotes: settings.sellerNotes ?? '',
    totals: withBusinessGoal(totals, settings),
    error: null,
  });
}

async function refreshItems(
  set: StoreSetter,
  db: Database,
) {
  const [items, settings] = await Promise.all([
    listBusinessItems(db),
    getBusinessSettings(db),
  ]);
  await loadItemsAndCalculations(set, items, settings);
}

function withBusinessGoal(
  totals: BusinessCalculation,
  settings: { goalAmount: number; goalPeriod: BusinessGoalPeriod },
): BusinessCalculation {
  const dailyGoal = normalizeBusinessGoal(
    settings.goalAmount,
    settings.goalPeriod,
  );

  return {
    ...totals,
    remainingToGoal: Math.max(dailyGoal - totals.profit, 0),
    goalPct:
      dailyGoal <= 0 ? 0 : Math.min(Math.max(totals.profit / dailyGoal, 0), 1),
    goalReached: dailyGoal > 0 && totals.profit >= dailyGoal,
  };
}
