import { Pressable, type PressableProps } from 'react-native';

import { useTheme } from '../theme';
import { tapFeedback } from './haptics';

export function HapticPressable({
  onPress,
  ...props
}: PressableProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      onPress={(event) => {
        tapFeedback(Boolean(onPress) && !theme.reduceMotion);
        onPress?.(event);
      }}
    />
  );
}
