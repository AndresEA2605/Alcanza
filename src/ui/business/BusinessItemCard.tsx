import { StyleSheet, Text, View } from 'react-native';

import type { BusinessCalculation, BusinessItem } from '../../domain/business';
import { formatCOP } from '../../domain/money';
import { useTheme } from '../../theme';
import { GlassCard } from '../GlassCard';
import { HapticPressable as Pressable } from '../HapticPressable';
import { SecureProductImage } from './SecureProductImage';

export function BusinessItemCard({
  item,
  calculation,
  onEdit,
  onDelete,
  onToggleCatalog,
}: {
  item: BusinessItem;
  calculation?: BusinessCalculation;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCatalog?: () => void;
}) {
  const theme = useTheme();
  const isProduct = item.type === 'product';
  const revenue = calculation?.revenue ?? item.pricePerUnit * item.quantity;
  const cost = calculation?.cost ?? (isProduct ? item.investment : 0);
  const profit = calculation?.profit ?? revenue - cost;

  return (
    <GlassCard contentStyle={styles.cardContent}>
      <View style={styles.cardTopRow}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isProduct
                  ? theme.colors.accentSoft
                  : theme.colors.successSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                {
                  color: isProduct ? theme.colors.accent : theme.colors.success,
                },
              ]}
            >
              {isProduct ? '📦 Producto' : '🚗 Servicio'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              item.inCatalog
                ? 'Visible en tienda. Toca para ocultar'
                : 'Oculto en tienda. Toca para mostrar'
            }
            disabled={!onToggleCatalog}
            onPress={onToggleCatalog}
            style={[
              styles.catalogBadge,
              {
                backgroundColor: item.inCatalog
                  ? theme.colors.surfaceStrong
                  : theme.colors.inputBackground,
                borderColor: item.inCatalog
                  ? theme.colors.separator
                  : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.catalogBadgeText,
                {
                  color: item.inCatalog
                    ? theme.colors.accent
                    : theme.colors.textMuted,
                },
              ]}
            >
              {item.inCatalog ? '🛍️ En catálogo' : '👁️ Oculto'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.profitBadge}>
          <Text style={[styles.profitLabel, { color: theme.colors.textMuted }]}>
            {profit < 0 ? 'Pérdida' : 'Ganancia'}
          </Text>
          <Text
            style={[
              styles.profitNumber,
              {
                color: profit >= 0 ? theme.colors.success : theme.colors.danger,
              },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {profit > 0 ? '+' : ''}
            {formatCOP(Math.abs(Math.round(profit)))}
          </Text>
        </View>
      </View>

      <View style={styles.itemIdentity}>
        {item.imageUri ? (
          <SecureProductImage
            uri={item.imageUri}
            label={`Imagen de ${item.name}`}
            style={{
              ...styles.itemImage,
              backgroundColor: theme.colors.inputBackground,
            }}
          />
        ) : null}
        <View style={styles.itemTitleGroup}>
          <Text
            style={[styles.itemName, { color: theme.colors.text }]}
            maxFontSizeMultiplier={1.3}
          >
            {item.name}
          </Text>
          {item.description ? (
            <Text
              style={[
                styles.itemDescription,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={3}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <Detail
          label="Precio unidad"
          value={formatCOP(Math.round(item.pricePerUnit))}
        />
        <Detail
          label="Cantidad"
          value={`${item.quantity} ${
            item.quantity === 1
              ? isProduct
                ? 'unidad'
                : 'servicio'
              : isProduct
                ? 'unidades'
                : 'servicios'
          }`}
        />
        <Detail
          label="Venta total"
          value={formatCOP(Math.round(revenue))}
        />
        <Detail
          label="Costo"
          value={isProduct ? formatCOP(Math.round(cost)) : 'Sin costo'}
          subdued
        />
      </View>

      <View style={styles.cardActions}>
        <ActionButton
          label="✏️ Editar"
          accessibilityLabel={`Editar ${item.name}`}
          onPress={onEdit}
        />
        <ActionButton
          label="🗑️ Eliminar"
          accessibilityLabel={`Eliminar ${item.name}`}
          onPress={onDelete}
          destructive
        />
      </View>
    </GlassCard>
  );
}

function Detail({
  label,
  value,
  subdued = false,
}: {
  label: string;
  value: string;
  subdued?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailItemLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.detailItemValue,
          { color: subdued ? theme.colors.textSecondary : theme.colors.text },
        ]}
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  accessibilityLabel,
  onPress,
  destructive = false,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          backgroundColor: destructive
            ? theme.colors.dangerSoft
            : theme.colors.inputBackground,
          borderColor: destructive
            ? theme.colors.danger
            : theme.colors.separator,
        },
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          { color: destructive ? theme.colors.danger : theme.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    gap: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catalogBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catalogBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  profitBadge: {
    alignItems: 'flex-end',
  },
  profitLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  profitNumber: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  itemIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  itemTitleGroup: {
    flex: 1,
    gap: 3,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  detailItem: {
    width: '47%',
    gap: 2,
  },
  detailItemLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailItemValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
