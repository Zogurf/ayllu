import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../theme/colors';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'emergency';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
}) => {
  const paddingStyle =
    padding === 'none'
      ? { padding: 0 }
      : padding === 'sm'
      ? { padding: Spacing.sm }
      : padding === 'lg'
      ? { padding: Spacing.xl }
      : { padding: Spacing.md };

  const variantStyle =
    variant === 'elevated'
      ? [styles.base, Shadows.md, { backgroundColor: Colors.surface }]
      : variant === 'outlined'
      ? [styles.base, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }]
      : variant === 'emergency'
      ? [
          styles.base,
          {
            backgroundColor: '#fff5f5',
            borderWidth: 1,
            borderColor: '#fecaca',
          },
        ]
      : [styles.base, Shadows.sm, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }];

  return (
    <View style={[variantStyle, paddingStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
  },
});
