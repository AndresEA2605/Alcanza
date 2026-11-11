import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable as NativePressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '../../theme';
import { HapticPressable as Pressable } from '../HapticPressable';
import { PrimaryButton } from '../PrimaryButton';

interface DataResetModalProps {
  visible: boolean;
  confirmation: string;
  onConfirmationChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: string | null;
  canRetryCleanup: boolean;
}

export function DataResetModal({
  visible,
  confirmation,
  onConfirmationChange,
  onClose,
  onConfirm,
  busy,
  error,
  canRetryCleanup,
}: DataResetModalProps) {
  const theme = useTheme();
  const disabled = confirmation !== 'CONFIRMAR' || busy;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <NativePressable
          accessibilityElementsHidden
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: theme.colors.scrim }]}
        />
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: theme.colors.surface }]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.text }]}
          >
            Borrar todos los datos
          </Text>
          <Text
            style={[
              styles.description,
              { color: theme.colors.textSecondary },
            ]}
          >
            Se eliminarán tu presupuesto, movimientos, productos, servicios y
            sus imágenes. Esta acción no se puede deshacer.
          </Text>
          <Text style={[styles.instruction, { color: theme.colors.text }]}>
            Escribe CONFIRMAR para continuar.
          </Text>
          <TextInput
            accessibilityLabel="Escribe CONFIRMAR para borrar todos los datos"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy && !canRetryCleanup}
            onChangeText={onConfirmationChange}
            onSubmitEditing={onConfirm}
            placeholder="CONFIRMAR"
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="done"
            value={confirmation}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.separator,
              },
            ]}
          />
          {error ? (
            <Text
              accessibilityRole="alert"
              style={[styles.error, { color: theme.colors.danger }]}
            >
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <PrimaryButton
              label="Cancelar"
              variant="secondary"
              disabled={busy || canRetryCleanup}
              onPress={onClose}
              style={styles.cancelButton}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled, busy }}
              disabled={disabled}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  backgroundColor: theme.colors.danger,
                  opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.deleteButtonLabel,
                  { color: theme.colors.onAccent },
                ]}
              >
                {busy
                  ? 'Borrando…'
                  : canRetryCleanup
                    ? 'Reintentar limpieza'
                    : 'Borrar datos'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    padding: 22,
    gap: 16,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  instruction: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    gap: 10,
  },
  cancelButton: {
    minHeight: 50,
  },
  deleteButton: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  deleteButtonLabel: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
});
