import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

interface ManageEmergencyModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMERGENCY_TYPES = [
  'Lluvias Intensas e Inundaciones',
  'Alerta Sísmica / Derrumbes',
  'Corte General de Agua / Luz',
  'Emergencia Sanitaria / Médica',
  'Incendio Estructural',
];

export const ManageEmergencyModal: React.FC<ManageEmergencyModalProps> = ({ visible, onClose }) => {
  const { emergencyMode, toggleEmergencyMode, user } = useApp();

  const [isActive, setIsActive] = useState(emergencyMode.isActive);
  const [selectedType, setSelectedType] = useState(emergencyMode.emergencyType || EMERGENCY_TYPES[0]);
  const [customDetails, setCustomDetails] = useState('');

  const handleSave = () => {
    const finalType = customDetails.trim() ? `${selectedType} - ${customDetails.trim()}` : selectedType;
    toggleEmergencyMode(isActive, user.neighborhood, finalType);

    Alert.alert(
      'Gestión de Emergencias (RF-15)',
      isActive 
        ? `Modo Emergencia ACTIVADO para ${user.neighborhood}. Se priorizarán recursos y reportes críticos en la pantalla principal.` 
        : `Modo Emergencia DESACTIVADO para ${user.neighborhood}. Retomando Modo Cotidiano.`,
      [{ text: 'Entendido', onPress: onClose }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="security" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Control del Modo Emergencia</Text>
                <Text style={styles.subtitle}>Autoridad: {user.nickname} ({user.role})</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>

          {/* Switch Active / Inactive */}
          <View style={styles.stateSelector}>
            <TouchableOpacity
              style={[styles.stateOption, !isActive && styles.stateOptionActiveNormal]}
              onPress={() => setIsActive(false)}
            >
              <MaterialIcons 
                name="check-circle" 
                size={18} 
                color={!isActive ? Colors.success : Colors.slateDim} 
              />
              <Text style={[styles.stateOptionText, !isActive && styles.stateOptionTextActive]}>
                Modo Cotidiano
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stateOption, isActive && styles.stateOptionActiveEmergency]}
              onPress={() => setIsActive(true)}
            >
              <MaterialIcons 
                name="warning" 
                size={18} 
                color={isActive ? Colors.emergency : Colors.slateDim} 
              />
              <Text style={[styles.stateOptionText, isActive && styles.stateEmergencyTextActive]}>
                Modo Emergencia SOS
              </Text>
            </TouchableOpacity>
          </View>

          {isActive && (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Tipo de Emergencia Comunitaria *</Text>
              <View style={styles.typesList}>
                {EMERGENCY_TYPES.map(t => {
                  const isSel = selectedType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, isSel && styles.typeChipActive]}
                      onPress={() => setSelectedType(t)}
                    >
                      <Text style={[styles.typeChipText, isSel && styles.typeChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>Detalle adicional / Instrucciones para vecinos</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Mantenerse alejados de la ladera de Carmen Alto..."
                placeholderTextColor={Colors.slateDim}
                value={customDetails}
                onChangeText={setCustomDetails}
              />
            </View>
          )}

          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>
              RF-16: Al activar la emergencia, la pantalla principal priorizará automáticamente los contactos de auxilio, alertas de vulnerabilidad y recursos críticos.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.submitBtn, isActive ? styles.submitBtnAlert : styles.submitBtnNormal]} 
              onPress={handleSave}
            >
              <MaterialIcons name="save" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>
                {isActive ? 'Activar Modo Emergencia' : 'Cerrar Emergencia y Volver a Normalidad'}
              </Text>
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
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 4,
    gap: 8,
    marginBottom: 14,
  },
  stateOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  stateOptionActiveNormal: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  stateOptionActiveEmergency: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  stateOptionText: {
    fontSize: 12,
    color: Colors.secondaryMuted,
    fontWeight: '500',
  },
  stateOptionTextActive: {
    color: Colors.success,
    fontWeight: '700',
  },
  stateEmergencyTextActive: {
    color: Colors.emergencyDark,
    fontWeight: '700',
  },
  formContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 6,
  },
  typesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: '#ffdada',
    borderColor: '#fca5a5',
  },
  typeChipText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  typeChipTextActive: {
    color: Colors.emergencyDark,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: Colors.secondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 11,
    color: Colors.primaryDark,
    flex: 1,
    lineHeight: 15,
  },
  footer: {
    paddingTop: 8,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  submitBtnAlert: {
    backgroundColor: Colors.emergency,
  },
  submitBtnNormal: {
    backgroundColor: Colors.secondary,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
