import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="diversity-3" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Conoce Ayllu</Text>
                <Text style={styles.subtitle}>Tu red hiperlocal de cooperación mutua</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              accessibilityLabel="Cerrar tutorial"
            >
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Clave 1 */}
            <View style={styles.keyCard}>
              <View style={[styles.keyIconWrapper, { backgroundColor: Colors.tertiary }]}>
                <MaterialIcons name="crisis-alert" size={20} color="#ffffff" />
              </View>
              <View style={styles.keyContent}>
                <Text style={styles.keyTitle}>1. Modo Cotidiano vs. Emergencia</Text>
                <Text style={styles.keyDescription}>
                  En el día a día intercambia herramientas o apoya a tus vecinos. Si ocurre un sismo, lluvias o corte general, el comité activa el botón SOS comunitario al instante.
                </Text>
              </View>
            </View>

            {/* Clave 2 */}
            <View style={styles.keyCard}>
              <View style={[styles.keyIconWrapper, { backgroundColor: Colors.primary }]}>
                <MaterialIcons name="volunteer-activism" size={20} color="#ffffff" />
              </View>
              <View style={styles.keyContent}>
                <Text style={styles.keyTitle}>2. Cadena de Favores (Sin Dinero)</Text>
                <Text style={styles.keyDescription}>
                  100% solidario bajo el principio andino del Ayni. No hay transacciones monetarias ni comisiones; nos cuidamos y respaldamos como vecindad.
                </Text>
              </View>
            </View>

            {/* Clave 3 */}
            <View style={styles.keyCard}>
              <View style={[styles.keyIconWrapper, { backgroundColor: Colors.secondary }]}>
                <MaterialIcons name="wifi-off" size={20} color="#ffffff" />
              </View>
              <View style={styles.keyContent}>
                <Text style={styles.keyTitle}>3. 100% Offline y Privacidad</Text>
                <Text style={styles.keyDescription}>
                  Todo se guarda localmente en tu teléfono. Si cae la señal o internet, puedes consultar los contactos críticos y crear reportes que se enviarán solos al reconectar.
                </Text>
              </View>
            </View>

            {/* Privacy note */}
            <View style={styles.privacyNote}>
              <MaterialIcons name="verified-user" size={16} color={Colors.primary} />
              <Text style={styles.privacyText}>
                Tu dirección exacta y GPS jamás son públicos. Solo se comparte tu barrio general.
              </Text>
            </View>
          </ScrollView>

          {/* Action button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Entendido y Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 44,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginBottom: 16,
  },
  keyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  keyIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyContent: {
    flex: 1,
  },
  keyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 4,
  },
  keyDescription: {
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.secondaryMuted,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  privacyText: {
    fontSize: 11,
    color: Colors.primaryDark,
    flex: 1,
    lineHeight: 15,
  },
  footer: {
    paddingTop: 8,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
