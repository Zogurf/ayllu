import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '../../theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: object;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}) => {
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isPrimary = variant === 'primary';

  let containerStyle = styles.primaryContainer;
  let textStyle = styles.primaryText;
  let iconColor = '#ffffff';

  if (isSecondary) {
    containerStyle = styles.secondaryContainer;
    textStyle = styles.secondaryText;
    iconColor = Colors.secondary;
  } else if (isOutline) {
    containerStyle = styles.outlineContainer;
    textStyle = styles.outlineText;
    iconColor = Colors.primary;
  } else if (isDanger) {
    containerStyle = styles.dangerContainer;
    textStyle = styles.dangerText;
    iconColor = '#ffffff';
  } else if (isGhost) {
    containerStyle = styles.ghostContainer;
    textStyle = styles.ghostText;
    iconColor = Colors.secondaryMuted;
  }

  const sizeContainerStyle =
    size === 'sm'
      ? styles.smContainer
      : size === 'lg'
      ? styles.lgContainer
      : styles.mdContainer;

  const sizeTextStyle =
    size === 'sm' ? styles.smText : size === 'lg' ? styles.lgText : styles.mdText;

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: disabled || loading }}
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.base,
        sizeContainerStyle,
        containerStyle,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary || isDanger ? '#ffffff' : Colors.primary} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <MaterialIcons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={{ marginRight: Spacing.xs + 2 }}
            />
          )}
          <Text style={[styles.baseText, sizeTextStyle, textStyle]}>{label}</Text>
          {icon && iconPosition === 'right' && (
            <MaterialIcons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={{ marginLeft: Spacing.xs + 2 }}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  // Sizes
  smContainer: {
    minHeight: 34,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  smText: {
    fontSize: 12,
  },
  mdContainer: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  mdText: {
    fontSize: 13.5,
  },
  lgContainer: {
    minHeight: 50,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 13,
  },
  lgText: {
    fontSize: 15,
  },
  // Variants
  primaryContainer: {
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryContainer: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.secondary,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  outlineText: {
    color: Colors.primary,
  },
  dangerContainer: {
    backgroundColor: Colors.emergency,
    borderWidth: 0,
  },
  dangerText: {
    color: '#ffffff',
  },
  ghostContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  ghostText: {
    color: Colors.secondaryMuted,
  },
});
