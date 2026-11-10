import { Stack } from 'expo-router';

import { useTheme } from '../../src/theme';

export default function NegocioLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="nuevo" />
      <Stack.Screen name="editar/[id]" />
    </Stack>
  );
}
