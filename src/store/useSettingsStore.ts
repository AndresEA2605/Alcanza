import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

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
  /** Carga los valores guardados desde SecureStore. */
  load: () => Promise<void>;
  reset: () => void;
}

/**
 * Preferencias de la app. Se persisten en expo-secure-store (encriptado en el
 * dispositivo) para que sobrevivan al reinicio de la app. No salen del
 * teléfono ni se envían a ningún servidor.
 */
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
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsData>;

        set({
          ...defaults,
          ...parsed,
        });
      }
    } catch {
      // Si no se puede leer SecureStore, se usan los valores por defecto.
    }
  },

  reset: () => {
    set(defaults);
    void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {
      // No bloqueamos la app por un fallo de borrado.
    });
  },
}));

/**
 * Escribe los datos actuales en SecureStore. Se ignora el resultado para no
 * bloquear la interfaz; los datos se reescriben en el siguiente cambio.
 */
function persist(get: () => SettingsState): void {
  const { themeMode, reduceMotion, notificationsEnabled, notificationTime } =
    get();

  void SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify({
      themeMode,
      reduceMotion,
      notificationsEnabled,
      notificationTime,
    }),
  );
}
