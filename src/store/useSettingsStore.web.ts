/**
 * Preferencias de la app para web.
 *
 * Se persisten en localStorage (no cifrado). Para una versión de producción
 * en web se debería evaluar una estrategia de almacenamiento más segura.
 */

import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'me-alcanza-settings';

interface SettingsData {
  themeMode: ThemeMode;
  reduceMotion: boolean;
  notificationsEnabled: boolean;
  /** Hora de la notificación diaria en formato HH:mm. */
  notificationTime: string;
}

const defaults: SettingsData = {
  themeMode: 'system',
  reduceMotion: false,
  notificationsEnabled: false,
  notificationTime: '20:00',
};

export interface SettingsState extends SettingsData {
  setThemeMode: (mode: ThemeMode) => void;
  setReduceMotion: (reduce: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationTime: (time: string) => void;
  load: () => Promise<void>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...defaults,

  setThemeMode: (themeMode) => {
    set({ themeMode });
    void persist(get);
  },

  setReduceMotion: (reduceMotion) => {
    set({ reduceMotion });
    void persist(get);
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    void persist(get);
  },

  setNotificationTime: (notificationTime) => {
    set({ notificationTime });
    void persist(get);
  },

  load: async () => {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsData>;
        set({
          ...defaults,
          ...parsed,
        });
      }
    } catch {
      // Si no se puede leer localStorage, se usan los valores por defecto.
    }
  },

  reset: () => {
    set(defaults);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
}));

/**
 * Escribe los datos actuales en localStorage.
 */
function persist(get: () => SettingsState): void {
  const { themeMode, reduceMotion, notificationsEnabled, notificationTime } =
    get();

  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      themeMode,
      reduceMotion,
      notificationsEnabled,
      notificationTime,
    }),
  );
}
