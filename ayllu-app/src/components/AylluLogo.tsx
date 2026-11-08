import React from 'react';
import { Image, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

interface AylluLogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 72,
};

export const AylluLogo: React.FC<AylluLogoProps> = ({
  size = 'md',
  variant = 'light',
  style,
  rounded = true,
}) => {
  const dimension = typeof size === 'number' ? size : SIZE_MAP[size] || 32;
  const borderRadius = rounded ? Math.round(dimension * 0.22) : 0;

  const imageSource =
    variant === 'dark'
      ? require('../../assets/ayllu-logo-dark.jpg')
      : require('../../assets/ayllu-logo.jpg');

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="Logo oficial de Ayllu"
    >
      <Image
        source={imageSource}
        style={[
          styles.image,
          {
            width: dimension,
            height: dimension,
            borderRadius,
          },
        ]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
