import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';

export type SheetMode = 'gasto' | 'ingreso';

interface MovementTypeSelectorProps {
  mode: SheetMode | null;
  onChange: (mode: SheetMode) => void;
}

export function MovementTypeSelector({
  mode,
  onChange,
}: MovementTypeSelectorProps) {
  const theme = useTheme();
  const options = [
    {
      id: 'gasto',
      title: 'Gasto',
      description: 'Registra una compra o pago',
      selectedColor: theme.colors.accent,
    },
    {
      id: 'ingreso',
      title: 'Ingreso',
      description: 'Suma dinero extra a tu presupuesto',
      selectedColor: theme.colors.success,
    },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          ¿Qué vas a registrar?
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Elige una opción para continuar.
        </Text>
      </View>

      <View
        style={styles.options}
        accessibilityRole="radiogroup"
        accessibilityLabel="Tipo de movimiento"
      >
        {options.map((option) => {
          const selected = mode === option.id;

          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${option.title}. ${option.description}`}
              onPress={() => onChange(option.id)}
              style={[
                styles.option,
                {
                  backgroundColor: selected
                    ? theme.colors.surface
                    : theme.colors.inputBackground,
                  borderColor: selected
                    ? option.selectedColor
                    : theme.colors.separator,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionTitle,
                  {
                    color: selected
                      ? option.selectedColor
                      : theme.colors.text,
                  },
                ]}
              >
                {option.title}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  heading: {
    gap: 4,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  options: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    minHeight: 82,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});
