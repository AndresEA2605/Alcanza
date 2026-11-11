import { Stack } from 'expo-router';

import { useTheme } from '../../src/theme';

export default function NegocioLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.colors.background, flex: 1 },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="tienda" />
      <Stack.Screen name="nuevo" />
      <Stack.Screen name="nueva-cuenta" />
      <Stack.Screen name="ajustes" />
      <Stack.Screen name="editar\[id\]" />
    </Stack>
  );
}
