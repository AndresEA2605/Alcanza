import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Vibración corta al tocar. Se ignora en web y si el sistema pide reducir
 * movimiento. Nunca lanza: un fallo de hápticos no debe romper la interfaz.
 */
export function tapFeedback(enabled: boolean): void {
  if (!enabled || Platform.OS === 'web') {
    return;
  }

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // El dispositivo puede no tener motor háptico.
  });
}

/** Vibración de éxito, para el final del onboarding. */
export function successFeedback(enabled: boolean): void {
  if (!enabled || Platform.OS === 'web') {
    return;
  }

  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {
      // Sin hápticos disponibles.
    },
  );
}
