import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BusinessCalculation, BusinessItem } from '../../domain/business';
import { formatCOP } from '../../domain/money';
import { useTheme } from '../../theme';
import { GlassCard } from '../GlassCard';
import { SecureProductImage } from './SecureProductImage';

export function BusinessItemCard({
  item,
  calculation,
  onEdit,
  onDelete,
}: {
  item: BusinessItem;
  calculation?: BusinessCalculation;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const isProduct = item.type === 'product';
  const profit = calculation?.profit ?? 0;
  const revenue = calculation?.revenue ?? item.pricePerUnit * item.quantity;
  const cost = calculation?.cost ?? (isProduct ? item.investment : 0);

  return (
    <GlassCard contentStyle={styles.cardContent}>
      <View style={styles.cardTopRow}>
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
        <View style={styles.profitBadge}>
          <Text style={[styles.profitLabel, { color: theme.colors.textMuted }]}>
            Ganancia
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
            {profit >= 0 ? '+' : ''}
            {formatCOP(Math.round(profit))}
          </Text>
        </View>
      </View>

      <View style={styles.itemIdentity}>
        {item.imageUri ? (
          <SecureProductImage
            uri={item.imageUri}
            label={`Imagen de ${item.name}`}
            style={styles.itemImage}
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
        <Detail label="Precio venta" value={formatCOP(Math.round(item.pricePerUnit))} />
        <Detail
          label="Cantidad diaria"
          value={`${item.quantity} ${isProduct ? 'unidades' : 'servicios'}`}
        />
        <Detail label="Ingreso diario" value={formatCOP(Math.round(revenue))} />
        <Detail
          label={isProduct ? 'Costo inversión' : 'Costo operativo'}
          value={isProduct ? formatCOP(Math.round(cost)) : 'Sin costo'}
          subdued
        />
      </View>

      {item.goalAmount > 0 ? (
        <View
          style={[
            styles.itemGoalBox,
            {
              backgroundColor: theme.colors.inputBackground,
              borderColor: theme.colors.separator,
            },
          ]}
        >
          <Text
            style={[styles.itemGoalText, { color: theme.colors.textSecondary }]}
          >
            Meta{' '}
            {item.goalPeriod === 'daily'
              ? 'diaria'
              : item.goalPeriod === 'monthly'
                ? 'mensual'
                : 'anual'}
            :{' '}
            <Text style={{ fontWeight: '700', color: theme.colors.text }}>
              {formatCOP(Math.round(item.goalAmount))}
            </Text>
          </Text>
          {calculation?.goalReached ? (
            <Text
              style={[
                styles.itemGoalAchieved,
                { color: theme.colors.success },
              ]}
            >
              ✓ Cumplida
            </Text>
          ) : null}
        </View>
      ) : null}

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
          borderColor: theme.colors.separator,
          backgroundColor: theme.colors.inputBackground,
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
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#80808022',
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
  itemGoalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemGoalText: {
    fontSize: 12,
  },
  itemGoalAchieved: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
