import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { ImageStyle } from 'react-native';

import { resolveProductImageSource } from '../../data/productImageStorage';
import { useTheme } from '../../theme';

export function SecureProductImage({
  uri,
  label,
  style,
}: {
  uri: string;
  label: string;
  style: ImageStyle;
}) {
  const theme = useTheme();
  const [result, setResult] = useState<{
    uri: string;
    source?: string;
    failed?: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;

    void resolveProductImageSource(uri).then(
      (resolvedSource) => {
        if (active) {
          setResult({ uri, source: resolvedSource });
        }
      },
      () => {
        if (active) {
          setResult({ uri, failed: true });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [uri]);

  if (result?.uri === uri && result.failed) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel="Imagen protegida no disponible"
        style={[
          styles.failed,
          {
            width: style.width,
            height: style.height,
            borderRadius: style.borderRadius,
            backgroundColor: theme.colors.inputBackground,
          },
        ]}
      >
        <Text style={{ color: theme.colors.textMuted }}>Imagen no disponible</Text>
      </View>
    );
  }

  return result?.uri === uri && result.source ? (
    <Image
      source={{ uri: result.source }}
      style={style}
      accessibilityLabel={label}
    />
  ) : (
    <View
      accessibilityLabel="Cargando imagen protegida"
      style={[
        styles.loading,
        {
          width: style.width,
          height: style.height,
          borderRadius: style.borderRadius,
          backgroundColor: theme.colors.inputBackground,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  failed: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  loading: {
    opacity: 0.6,
  },
});
