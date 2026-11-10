import { Redirect } from 'expo-router';

import { useBudgetStore } from '../src/store/useBudgetStore';
import { LoadingState } from '../src/ui/LoadingState';

/**
 * Puerta de entrada: espera a que el estado local cargue y decide si la
 * persona debe configurar el mes o ir directo a Hoy.
 */
export default function IndexScreen() {
  const status = useBudgetStore((state) => state.status);
  const needsMonthSetup = useBudgetStore((state) => state.needsMonthSetup);
  const error = useBudgetStore((state) => state.error);
  const initialize = useBudgetStore((state) => state.initialize);

  if (status === 'error') {
    return (
      <LoadingState
        key={status}
        title="Preparando la app…"
        error={error ?? 'No pude abrir tus datos locales.'}
        onRetry={() => void initialize()}
      />
    );
  }

  if (status !== 'ready') {
    return <LoadingState key={status} title="Abriendo tus datos…" />;
  }

  return (
    <Redirect href={needsMonthSetup ? '/onboarding/welcome' : '/hoy'} />
  );
}
