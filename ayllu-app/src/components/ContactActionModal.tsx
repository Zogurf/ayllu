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
import { ContactChannel } from '../types';

interface ContactActionModalProps {
  visible: boolean;
  onClose: () => void;
  targetName: string;
  targetItemTitle: string;
  channel: ContactChannel;
  phone?: string;
}

export const ContactActionModal: React.FC<ContactActionModalProps> = ({
  visible,
  onClose,
  targetName,
  targetItemTitle,
  channel,
  phone,
}) => {
  const [message, setMessage] = useState('');
  const [hasSent, setHasSent] = useState(false);

  const handleSendAylluMessage = () => {
    if (!message.trim()) {
      Alert.alert('Mensaje requerido', 'Escribe unas palabras para el vecino.');
      return;
    }
    setHasSent(true);
    setTimeout(() => {
      Alert.alert(
        'Mensaje Enviado (RF-14)',
        `Tu mensaje ha sido enviado a ${targetName} a través de la red Ayllu protegida. Recibirás su respuesta sin exponer tu número celular.`,
        [
          {
            text: 'Aceptar',
            onPress: () => {
              setHasSent(false);
              setMessage('');
              onClose();
            },
          },
        ]
      );
    }, 600);
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
                <MaterialIcons name="chat" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Contactar a {targetName}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{targetItemTitle}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>

          {/* Channel Info */}
          <View style={styles.channelBadge}>
            <MaterialIcons 
              name={channel === 'ayllu' ? "security" : "phone"} 
              size={16} 
              color={Colors.primaryDark} 
            />
            <Text style={styles.channelText}>
              {channel === 'ayllu' 
                ? 'Canal Seguro: Mensajería interna Ayllu (Teléfono protegido - RNF-10)' 
                : `Canal Verificado: WhatsApp Vecinal (${phone || 'Directo'})`}
            </Text>
          </View>

          <Text style={styles.label}>Mensaje solidario</Text>
          <TextInput
            style={styles.textArea}
            placeholder={`Hola ${targetName}, me interesa coordinar este favor vecinal...`}
            placeholderTextColor={Colors.slateDim}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />

          <View style={styles.ethicsBox}>
            <MaterialIcons name="handshake" size={16} color={Colors.primary} />
            <Text style={styles.ethicsText}>
              Recuerda: Los favores en Ayllu son 100% solidarios y libres de dinero (Principio Ayni).
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleSendAylluMessage}
              disabled={hasSent}
            >
              <MaterialIcons name="send" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>
                {hasSent ? 'Enviando...' : 'Enviar Mensaje Protegido'}
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
    marginBottom: 12,
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
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  channelText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryDark,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    height: 90,
    fontSize: 13,
    color: Colors.secondary,
    textAlignVertical: 'top',
  },
  ethicsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  ethicsText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    flex: 1,
  },
  footer: {
    paddingTop: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
