import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../theme/colors';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: object;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 720,
  style,
}) => {
  if (Platform.OS !== 'web') {
    return <View style={[styles.mobileContainer, style]}>{children}</View>;
  }

  return (
    <View style={styles.webOuter}>
      <View style={[styles.webInner, { maxWidth }, style]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
    width: '100%',
  },
  webOuter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#0b1329', // subtle deep backdrop on wide screens
  },
  webInner: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.background,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
});
