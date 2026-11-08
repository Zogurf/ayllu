import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

interface ContentReportModalProps {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  itemType: 'favor' | 'service' | 'emergency_report';
}

const REPORT_REASONS = [
  'Contenido incorrecto o engañoso',
  'Intento de cobro de dinero (Viola Ayni)',
  'Acoso, abuso o lenguaje inapropiado',
  'Datos de contacto falsos o desactualizados',
  'Otro motivo',
];

export const ContentReportModal: React.FC<ContentReportModalProps> = ({
  visible,
  onClose,
  itemId,
  itemTitle,
  itemType,
}) => {
  const { user, addContentReport } = useApp();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');

  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const handleSubmit = async () => {
    if(saving) return; setSaving(true); setError('');
    try {
    await addContentReport({
      itemId,
      itemType,
      reportedItemTitle: itemTitle,
      reportedBy: user.nickname,
      reason: selectedReason,
      details: details.trim() || 'Reportado por vecino vigilante de la comunidad.',
    });

    setDetails(''); onClose();
    } catch(e) {setError(e && typeof e==='object' && 'message' in e?String(e.message):'No se pudo guardar.');}
    finally {setSaving(false);}

  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

<Text accessibilityRole="alert">{error}</Text>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="flag" size={20} color={Colors.tertiary} />
              </View>
              <View>
                <Text style={styles.title}>Reportar contenido</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{itemTitle}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Motivo del Reporte *</Text>
          <View style={styles.reasonsList}>
            {REPORT_REASONS.map(r => {
              const isSel = selectedReason === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonItem, isSel && styles.reasonItemActive]}
                  onPress={() => setSelectedReason(r)}
                >
                  <MaterialIcons
                    name={isSel ? "radio-button-checked" : "radio-button-unchecked"}
                    size={18}
                    color={isSel ? Colors.tertiary : Colors.slateDim}
                  />
                  <Text style={[styles.reasonText, isSel && styles.reasonTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Detalles adicionales (opcional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe qué ocurrió..."
            placeholderTextColor={Colors.slateDim}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
              <MaterialIcons name="check" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>Enviar Reporte a Moderación</Text>
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
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
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
    maxWidth: 220,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 6,
  },
  reasonsList: {
    gap: 6,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonItemActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  reasonText: {
    fontSize: 12,
    color: Colors.secondary,
  },
  reasonTextActive: {
    fontWeight: '700',
    color: Colors.tertiary,
  },
  textArea: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    height: 70,
    fontSize: 12.5,
    color: Colors.secondary,
    textAlignVertical: 'top',
  },
  footer: {
    paddingTop: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.tertiary,
    height: 48,
    borderRadius: 12,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
