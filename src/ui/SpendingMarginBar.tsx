import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { formatCOP } from '../domain/money';
import type { MarginMode, SpendingMarginResult } from '../domain/spendingMargin';
import { useTheme } from '../theme';
import { AnimatedNumber } from './AnimatedNumber';
import { GlassCard } from './GlassCard';
import { HapticPressable as Pressable } from './HapticPressable';

export interface SpendingMarginBarProps {
  margin: SpendingMarginResult;
  onToggleMode?: (mode: MarginMode) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  onPressDetail?: () => void;
}

/**
 * Barra visual del margen de gasto razonable (1% a 100%).
 *
 * Muestra el porcentaje proporcional disponible/consumido dividido en tres
 * zonas: Conservador (verde), Normal (amarillo) y Límite (rojo).
 * Explica con claridad por qué se puede o no gastar más y qué impacto tiene
 * en el presupuesto de los días futuros.
 */
export function SpendingMarginBar({
  margin,
  onToggleMode,
  style,
  compact = false,
  onPressDetail,
}: SpendingMarginBarProps) {
  const theme = useTheme();
  const [showExplanation, setShowExplanation] = useState(false);

  const activeColor = {
    bien: theme.colors.success,
    aviso: theme.colors.warning,
    limite: theme.colors.danger,
  }[margin.status];

  const progress = useSharedValue(theme.reduceMotion ? margin.percentage : 0);

  useEffect(() => {
    if (theme.reduceMotion) {
      progress.value = margin.percentage;
      return;
    }

    progress.value = withTiming(margin.percentage, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [margin.percentage, progress, theme.reduceMotion]);

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const isHoy = margin.mode === 'hoy';
  const isSemana = margin.mode === 'semana';
  const statusLabel =
    margin.status === 'bien'
      ? 'En orden'
      : margin.status === 'aviso'
        ? 'Ajustado'
        : margin.remaining < 0
          ? 'Excedido'
          : 'Al límite';

  if (compact) {
    const periodLabel =
      margin.mode === 'hoy'
        ? 'hoy'
        : margin.mode === 'semana'
          ? 'esta semana'
          : 'este mes';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Margen de gasto para ${periodLabel} al ${margin.percentage}%. ${margin.headline}. Toca para abrir balance.`}
        onPress={onPressDetail}
        style={({ pressed }) => [
          styles.compactContainer,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.separator,
            opacity: pressed && onPressDetail ? 0.75 : 1,
          },
          style,
        ]}
      >
        <View style={styles.compactTopRow}>
          <View style={styles.compactHeading}>
            <View
              style={[styles.compactDot, { backgroundColor: activeColor }]}
            />
            <Text
              style={[styles.compactTitle, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
            <Text style={[styles.compactPercentage, { color: activeColor }]}>
              {margin.percentage}%
            </Text>
          </View>
          {onPressDetail ? (
            <View style={styles.compactLinkWrapper}>
              <Text
                style={[
                  styles.compactLinkText,
                  { color: theme.colors.accent },
                ]}
                accessibilityElementsHidden
              >
                →
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.compactBarTrack}>
          <View style={styles.trackBackground}>
            <View style={[styles.segment, { flex: 70, backgroundColor: theme.colors.successSoft }]} />
            <View style={[styles.segment, { flex: 20, backgroundColor: theme.colors.warningSoft }]} />
            <View style={[styles.segment, { flex: 10, backgroundColor: theme.colors.dangerSoft }]} />
          </View>
          <Animated.View
            style={[
              styles.fillBar,
              { backgroundColor: activeColor },
              fillAnimatedStyle,
            ]}
          />
        </View>
      </Pressable>
    );
  }

  return (
    <GlassCard
      style={style}
      contentStyle={{ gap: theme.spacing.lg }}
    >
      {/* Encabezado: Título y StatusPill */}
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.text }]}
            maxFontSizeMultiplier={1.3}
          >
            {isHoy
              ? 'Hoy'
              : isSemana
                ? 'Esta semana'
                : 'Este mes'}
          </Text>
        </View>
      </View>

      {/* Selector de periodo */}
      {onToggleMode ? (
        <View
          style={[
            styles.modeToggle,
            { backgroundColor: theme.colors.inputBackground },
          ]}
          accessibilityRole="tablist"
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isHoy }}
            accessibilityLabel="Margen de hoy"
            onPress={() => onToggleMode('hoy')}
            style={[
              styles.modeButton,
              isHoy && { backgroundColor: theme.colors.surfaceStrong },
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                {
                  color: isHoy ? theme.colors.text : theme.colors.textMuted,
                  fontWeight: isHoy ? '700' : '500',
                },
              ]}
            >
              Hoy
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isSemana }}
            accessibilityLabel="Margen de esta semana"
            onPress={() => onToggleMode('semana')}
            style={[
              styles.modeButton,
              isSemana && { backgroundColor: theme.colors.surfaceStrong },
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                {
                  color: isSemana ? theme.colors.text : theme.colors.textMuted,
                  fontWeight: isSemana ? '700' : '500',
                },
              ]}
            >
              Semana
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: margin.mode === 'mes' }}
            accessibilityLabel="Margen del mes"
            onPress={() => onToggleMode('mes')}
            style={[
              styles.modeButton,
              margin.mode === 'mes' && {
                backgroundColor: theme.colors.surfaceStrong,
              },
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                {
                  color:
                    margin.mode === 'mes'
                      ? theme.colors.text
                      : theme.colors.textMuted,
                  fontWeight: margin.mode === 'mes' ? '700' : '500',
                },
              ]}
            >
              Mes
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Métricas del periodo */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Usado
          </Text>
          <View style={styles.percentageContainer}>
            <AnimatedNumber
              value={margin.percentage}
              format={(val) => `${Math.round(val)}%`}
              style={[styles.percentageText, { color: activeColor }]}
              accessibilityLabel={`Consumo del margen: ${margin.percentage}%`}
            />
            {margin.rawPercentage > 100 ? (
              <Text style={[styles.exceededBadge, { color: theme.colors.danger }]}>
                +{Math.round(margin.rawPercentage - 100)}% exceso
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.metricItem, styles.metricRight]}>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Disponible
          </Text>
          <Text
            style={[
              styles.amountRemaining,
              {
                color:
                  margin.remaining <= 0
                    ? theme.colors.danger
                    : theme.colors.text,
              },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {formatCOP(Math.max(0, Math.round(margin.remaining)))}
          </Text>
          <Text style={[styles.metricSub, { color: theme.colors.textMuted }]}>
            de {formatCOP(Math.round(margin.limit))} total
          </Text>
        </View>
      </View>

      {/* Barra de progreso con 3 zonas visuales (Conservador / Normal / Límite) */}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: margin.percentage,
        }}
        accessibilityLabel={`Barra de margen de gasto al ${margin.percentage}%. Estado: ${margin.headline}`}
        style={styles.barWrapper}
      >
        <View style={styles.trackBackground}>
          {/* Segmento Conservador (0 - 70%) */}
          <View
            style={[
              styles.segment,
              { flex: 70, backgroundColor: theme.colors.successSoft },
            ]}
          />
          {/* Segmento Normal (70 - 90%) */}
          <View
            style={[
              styles.segment,
              { flex: 20, backgroundColor: theme.colors.warningSoft },
            ]}
          />
          {/* Segmento Límite (90 - 100%) */}
          <View
            style={[
              styles.segment,
              { flex: 10, backgroundColor: theme.colors.dangerSoft },
            ]}
          />
        </View>

        {/* Relleno animado según porcentaje */}
        <Animated.View
          style={[
            styles.fillBar,
            { backgroundColor: activeColor },
            fillAnimatedStyle,
          ]}
        />
      </View>

      {/* Umbrales de uso */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            0–70%
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            70–90%
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            90–100%+
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showExplanation }}
        onPress={() => setShowExplanation((visible) => !visible)}
        style={[
          styles.explanationToggle,
          { borderTopColor: theme.colors.separator },
        ]}
      >
        <Text style={[styles.explanationToggleText, { color: theme.colors.accent }]}>
          {showExplanation ? 'Menos' : '¿Cómo se calcula?'}
        </Text>
        <Text style={[styles.explanationToggleText, { color: theme.colors.accent }]}>
          {showExplanation ? '−' : '+'}
        </Text>
      </Pressable>
      {showExplanation ? (
        <View
          style={[
            styles.explanationCard,
            { backgroundColor: theme.colors.inputBackground },
          ]}
        >
          <Text
            style={[styles.explanationText, { color: theme.colors.textSecondary }]}
            maxFontSizeMultiplier={1.3}
          >
            {margin.explanation}
          </Text>
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    fontSize: 12,
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  metricItem: {
    gap: 4,
  },
  metricRight: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  percentageText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  exceededBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  amountRemaining: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  barWrapper: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  trackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  segment: {
    height: '100%',
  },
  fillBar: {
    height: '100%',
    borderRadius: 6,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: -2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  explanationCard: {
    padding: 12,
    borderRadius: 12,
  },
  explanationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  explanationToggleText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 17,
  },
  compactContainer: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    width: '100%',
  },
  compactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  compactHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  compactDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  compactTitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    flexShrink: 1,
  },
  compactPercentage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  compactLinkWrapper: {
    paddingTop: 1,
  },
  compactLinkText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  compactBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
});
