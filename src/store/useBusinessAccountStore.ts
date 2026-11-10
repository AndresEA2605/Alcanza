import { create } from 'zustand';

import {
  calculateAccountsTotal,
  type AccountAccount,
  type NewAccount,
} from '../domain/businessAccount';
import { getDatabase } from '../data/db';
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from '../data/businessAccountRepo';

export interface BusinessAccountState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  accounts: AccountAccount[];
  total: number;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  addAccount: (input: NewAccount) => Promise<void>;
  updateAccount: (id: string, input: Partial<NewAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
}

export const useBusinessAccountStore = create<BusinessAccountState>()((set, get) => ({
  status: 'idle',
  error: null,
  accounts: [],
  total: 0,

  initialize: async () => {
    const { status } = get();
    if (status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const db = await getDatabase();
      const accounts = await listAccounts(db);
      const total = calculateAccountsTotal(accounts).total;
      set({ status: 'ready', accounts, total, error: null });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Error inesperado.' });
    }
  },

  refresh: async () => {
    try {
      const db = await getDatabase();
      const accounts = await listAccounts(db);
      const total = calculateAccountsTotal(accounts).total;
      set({ status: 'ready', accounts, total, error: null });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Error inesperado.' });
    }
  },

  addAccount: async (input) => {
    try {
      const db = await getDatabase();
      const created = await createAccount(db, input);
      const accounts = [...get().accounts, created];
      const total = calculateAccountsTotal(accounts).total;
      set({ accounts, total, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error inesperado.' });
      throw error;
    }
  },

  updateAccount: async (id, input) => {
    try {
      const db = await getDatabase();
      const updated = await updateAccount(db, id, input);
      if (!updated) throw new Error('No encontré esa cuenta.');
      const accounts = get().accounts.map((a) => (a.id === id ? updated : a));
      const total = calculateAccountsTotal(accounts).total;
      set({ accounts, total, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error inesperado.' });
      throw error;
    }
  },

  deleteAccount: async (id) => {
    try {
      const db = await getDatabase();
      const deleted = await deleteAccount(db, id);
      if (!deleted) throw new Error('No pude eliminar esa cuenta.');
      const accounts = get().accounts.filter((a) => a.id !== id);
      const total = calculateAccountsTotal(accounts).total;
      set({ accounts, total, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error inesperado.' });
      throw error;
    }
  },
}));
