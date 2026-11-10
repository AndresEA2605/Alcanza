import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  useColorScheme,
} from 'react-native';

import { useSettingsStore } from '../store/useSettingsStore';
import {
  palettes,
  radii,
  spacing,
  typography,
  type ThemeColors,
  type ThemeMode,
} from './tokens';

export interface AppTheme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  /** `true` cuando el sistema o el usuario piden reducir el movimiento. */
  reduceMotion: boolean;
}

const ThemeContext = createContext<AppTheme | null>(null);

function useReduceMotionPreference(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setReduced(enabled);
        }
      })
      .catch(() => {
        // Si la plataforma no responde, se deja el movimiento activo.
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const systemReduceMotion = useReduceMotionPreference();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const manualReduceMotion = useSettingsStore(
    (state) => state.reduceMotion,
  );

  const mode: ThemeMode =
    themeMode === 'system'
      ? (scheme === 'dark' ? 'dark' : 'light')
      : themeMode;

  // Se reduce el movimiento si lo pide el sistema o lo activó el usuario.
  const reduceMotion = systemReduceMotion || manualReduceMotion;

  const theme = useMemo<AppTheme>(
    () => ({
      mode,
      colors: palettes[mode],
      spacing,
      radii,
      typography,
      reduceMotion,
    }),
    [mode, reduceMotion],
  );

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider.');
  }

  return theme;
}

/** Atajo para componentes que solo necesitan la paleta. */
export function useColors(): ThemeColors {
  return useTheme().colors;
}
