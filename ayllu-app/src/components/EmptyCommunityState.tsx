import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface Props {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export const EmptyCommunityState: React.FC<Props> = ({ title, description, actionLabel, onAction }) => (
  <View style={styles.container}>
    <MaterialIcons name="diversity-3" size={36} color={Colors.primary} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    <TouchableOpacity accessibilityRole="button" onPress={onAction} style={styles.button}>
      <Text style={styles.buttonText}>{actionLabel}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.secondary, textAlign: 'center' },
  description: { fontSize: 13, lineHeight: 20, color: Colors.secondaryMuted, textAlign: 'center' },
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.primary },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
});
