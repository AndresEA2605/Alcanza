import { Slot } from 'expo-router';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '../../src/theme';

export default function NegocioLayout() {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
  };

  return (
    <View style={containerStyle}>
      <Slot />
    </View>
  );
}
