import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '../../theme/colors';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'emergency'
  | 'info'
  | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  size?: 'sm' | 'md';
  pulse?: boolean;
  style?: ViewStyle;
}

const VARIANT_CONFIG: Record<
  BadgeVariant,
  { bg: string; border: string; text: string; dot: string }
> = {
  primary: {
    bg: Colors.primaryContainer,
    border: '#bfdbfe',
    text: Colors.primaryDark,
    dot: Colors.primary,
  },
  secondary: {
    bg: Colors.surfaceSubtle,
    border: Colors.border,
    text: Colors.secondary,
    dot: Colors.secondary,
  },
  success: {
    bg: Colors.successLight,
    border: '#86efac',
    text: '#15803d',
    dot: Colors.success,
  },
  warning: {
    bg: Colors.warningLight,
    border: '#fde68a',
    text: Colors.warningText,
    dot: Colors.warning,
  },
  danger: {
    bg: '#fee2e2',
    border: '#fca5a5',
    text: Colors.emergencyDark,
    dot: Colors.emergency,
  },
  emergency: {
    bg: Colors.emergencyContainer,
    border: '#f87171',
    text: '#991b1b',
    dot: Colors.emergency,
  },
  info: {
    bg: Colors.infoLight,
    border: '#bae6fd',
    text: '#0369a1',
    dot: Colors.info,
  },
  neutral: {
    bg: Colors.surfaceSubtle,
    border: Colors.border,
    text: Colors.slateDim,
    dot: Colors.slateDim,
  },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  icon,
  size = 'md',
  pulse = false,
  style,
}) => {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.neutral;
  const isSm = size === 'sm';

  const containerDynamic: ViewStyle = {
    backgroundColor: config.bg,
    borderColor: config.border,
  };

  const textDynamic: TextStyle = {
    color: config.text,
  };

  const dotDynamic: ViewStyle = {
    backgroundColor: config.dot,
  };

  return (
    <View style={[styles.base, containerDynamic, isSm && styles.smContainer, style]}>
      {pulse && <View style={[styles.pulseDot, dotDynamic]} />}
      {icon && (
        <MaterialIcons
          name={icon}
          size={isSm ? 11 : 13}
          color={config.text}
          style={{ marginRight: 3 }}
        />
      )}
      <Text style={[styles.baseText, textDynamic, isSm && styles.smText]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  smContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  baseText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  smText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
});
