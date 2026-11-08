import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

interface EmptyCommunityStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
}

export const EmptyCommunityState: React.FC<EmptyCommunityStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = 'diversity-3',
  secondaryActionLabel,
  onSecondaryAction,
  style,
}) => (
  <View style={[styles.container, style]}>
    <View style={styles.iconCircle}>
      <MaterialIcons name={icon} size={32} color={Colors.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    
    <View style={styles.actionsRow}>
      {actionLabel && onAction && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onAction}
          style={styles.primaryButton}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={18} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onSecondaryAction}
          style={styles.secondaryButton}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>{secondaryActionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.secondaryMuted,
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: Spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryMuted,
  },
});
