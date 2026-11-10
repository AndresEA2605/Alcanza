import { create } from 'zustand';

export interface OnboardingState {
  income: number;
  fixed: number;
  setIncome: (income: number) => void;
  setFixed: (fixed: number) => void;
  reset: () => void;
}

/**
 * Datos temporales del onboarding. No se guardan aquí: al final se envían a
 * `useBudgetStore`, que los persiste en SQLite para el mes actual.
 */
export const useOnboardingStore = create<OnboardingState>()((set) => ({
  income: 0,
  fixed: 0,
  setIncome: (income) => set({ income }),
  setFixed: (fixed) => set({ fixed }),
  reset: () => set({ income: 0, fixed: 0 }),
}));
