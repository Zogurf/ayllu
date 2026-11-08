import React, { useState } from 'react';
import { Image, View, type ImageStyle, type ViewStyle, type StyleProp } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export const Avatar: React.FC<{ uri?: string; style: StyleProp<ImageStyle> }> = ({ uri, style }) => {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return uri && failedUri !== uri
    ? <Image source={{ uri }} style={style} onError={() => setFailedUri(uri)} />
    : <View style={[style as StyleProp<ViewStyle>, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryContainer }]}>
        <MaterialIcons name="person" size={24} color={Colors.primary} />
      </View>;
};
