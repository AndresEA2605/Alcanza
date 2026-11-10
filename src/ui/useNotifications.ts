import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';

import {
  formatSecondsToHms,
  isValidTime,
  secondsUntilNextTime,
} from '../domain/notifications';

/**
 * Gestiona las notificaciones locales diarias.
 *
 * - Solicita permiso al montar si las notificaciones están activadas.
 * - Programa una notificación diaria a la hora configurada.
 * - Cancela las notificaciones si se desactivan.
 * - Nunca lanza: un fallo de notificaciones no debe romper la app.
 */
export function useNotifications(
  enabled: boolean,
  time: string,
): {
  status: 'granted' | 'denied' | 'undetermined' | 'unknown';
  secondsUntilNext: number | null;
  timeUntilNext: string | null;
} {
  const [status, setStatus] = useState<
    'granted' | 'denied' | 'undetermined' | 'unknown'
  >('unknown');
  const [secondsUntilNext, setSecondsUntilNext] = useState<number | null>(
    null,
  );

  useEffect(() => {
    async function initialize() {
      try {
        const { status: permissionStatus } =
          await Notifications.getPermissionsAsync();
        setStatus(
          permissionStatus === 'granted'
            ? 'granted'
            : permissionStatus === 'denied'
              ? 'denied'
              : 'undetermined',
        );

        if (enabled && permissionStatus === 'granted' && isValidTime(time)) {
          await Notifications.cancelAllScheduledNotificationsAsync();

          await Notifications.scheduleNotificationAsync({
            content: {
              title: '¿Me alcanza?',
              body: 'Revisa tu número diario para gastar sin arruinar el mes.',
              data: { type: 'daily-reminder' },
            },
            trigger: {
              type: 'daily',
              hour: parseTimeToDateComponents(time).hour,
              minute: parseTimeToDateComponents(time).minute,
            } as Parameters<
              typeof Notifications.scheduleNotificationAsync
            >[0]['trigger'],
          });

          setSecondsUntilNext(secondsUntilNextTime(time));
        } else if (!enabled) {
          await Notifications.cancelAllScheduledNotificationsAsync();
          setSecondsUntilNext(null);
        }
      } catch {
        // Las notificaciones pueden no estar disponibles en el simulador o
        // el dispositivo puede denegar el permiso. No interrumpimos la app.
        setStatus('denied');
        setSecondsUntilNext(null);
      }
    }

    void initialize();
  }, [enabled, time]);

  const timeUntilNext =
    secondsUntilNext != null ? formatSecondsToHms(secondsUntilNext) : null;

  return {
    status,
    secondsUntilNext,
    timeUntilNext,
  };
}

function parseTimeToDateComponents(time: string) {
  const [hour, minute] = time.split(':').map(Number);

  return {
    hour,
    minute,
    second: 0,
  };
}
