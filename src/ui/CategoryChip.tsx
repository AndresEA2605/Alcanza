import { Text, StyleSheet } from 'react-native';

import { CATEGORIES, type Category } from '../domain/budget';
import { useTheme } from '../theme';
import { HapticPressable } from './HapticPressable';

interface CategoryChipProps {
  category: Category;
  selected: boolean;
  onPress: (category: Category) => void;
}

export function CategoryChip({ category, selected, onPress }: CategoryChipProps) {
  const theme = useTheme();
  const categoryMeta = CATEGORIES.find((item) => item.id === category);

  return (
    <HapticPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={categoryMeta?.label ?? category}
      onPress={() => onPress(category)}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.accent : theme.colors.inputBackground,
          borderColor: theme.colors.separator,
        },
      ]}
    >
      <Text style={styles.emoji}>
        {categoryMeta?.emoji ?? ''}
      </Text>
      <Text
        style={[
          styles.label,
          {
            color: selected ? theme.colors.onAccent : theme.colors.text,
            fontWeight: selected ? '700' : '600',
          },
        ]}
        maxFontSizeMultiplier={1.3}
      >
        {categoryMeta?.label ?? category}
      </Text>
    </HapticPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 16,
    lineHeight: 20,
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
});
