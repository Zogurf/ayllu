import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { ServiceCategory } from '../types';
import { normalizePeruMobilePhone, isReasonableText } from '../utils/validation';
import { notify } from '../utils/dialog';
import { OfflineStorage } from '../storage/offlineStorage';
import { supabase } from '../lib/supabase';

interface PublishServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

const SERVICE_CATEGORIES: { id: ServiceCategory; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'carpinteria', label: 'Carpintería', icon: 'handyman' },
  { id: 'gasfiteria', label: 'Gasfitería', icon: 'plumbing' },
  { id: 'electricidad', label: 'Electricidad', icon: 'bolt' },
  { id: 'cuidados', label: 'Cuidados / Salud', icon: 'medical-services' },
  { id: 'cerrajeria', label: 'Cerrajería', icon: 'key' },
  { id: 'educacion', label: 'Clases / Talleres', icon: 'school' },
  { id: 'otros', label: 'Otros Servicios', icon: 'build' },
];

export const PublishServiceModal: React.FC<PublishServiceModalProps> = ({ visible, onClose }) => {
  const { user, addService, isOnline, synchronizeQueue } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('gasfiteria');
  const [description, setDescription] = useState('');
  const [addressApprox, setAddressApprox] = useState('');
  const [phone, setPhone] = useState(user.phone || '');
  const [sharePhone,setSharePhone]=useState(false);
  const [submitError,setSubmitError]=useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!isReasonableText(title, 160) || !isReasonableText(description, 500)) {
      setSubmitError('El título debe tener hasta 160 caracteres y la descripción hasta 500.');
      return;
    }
    const normalizedPhone = normalizePeruMobilePhone(phone);
    if (sharePhone && !normalizedPhone) {
      setSubmitError('Ingresa un celular peruano válido de 9 dígitos que empiece con 9.');
      return;
    }

    const catObj = SERVICE_CATEGORIES.find(c => c.id === category);
    setIsSubmitting(true);
    setSubmitError('');
    let published = false;
    try {
      const id = await addService({
        title: title.trim(),
        category,
        categoryLabel: catObj ? catObj.label : 'General',
        providerName: user.nickname,
        providerPhone: sharePhone ? normalizedPhone ?? '' : '',
        sharePhone,
        neighborhood: user.neighborhood,
        addressApprox: addressApprox.trim() || `Barrio ${user.neighborhood}`,
        description: description.trim(),
        avatarUrl: user.avatarUrl,
      });
      if (supabase && isOnline) {
        try {
          await synchronizeQueue(false);
          const queue = await OfflineStorage.getSyncQueue();
          published = !queue.some(item => item.type === 'service_post' && item.payload.id === id);
        } catch { /* The durable queue retains the service for a retry. */ }
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo guardar el servicio.');
      setIsSubmitting(false);
      return;
    }

    setTitle(''); setDescription(''); setAddressApprox(''); setIsSubmitting(false); onClose();
    setSharePhone(false);
    void notify(published ? 'Servicio publicado' : 'Servicio guardado en este dispositivo', published
      ? 'Tu oferta ya está disponible para tu comunidad.'
      : supabase ? 'Todavía está pendiente de envío. Puedes revisar el estado o reintentar en el directorio.'
      : 'Estás en modo demostración. Solo se verá en este dispositivo.');

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
                <MaterialIcons name="build" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Ofrecer Oficio o Servicio</Text>
                <Text style={styles.subtitle}>Directorio comunitario de {user.neighborhood}</Text>
              </View>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar publicación de servicio" style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>

          {!!submitError && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={16} color={Colors.emergencyDark} />
              <Text accessibilityRole="alert" style={styles.errorBannerText}>{submitError}</Text>
            </View>
          )}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Category selection */}
            <Text style={styles.label}>Categoría de Oficio *</Text>
            <View style={styles.categoryGrid}>
              {SERVICE_CATEGORIES.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <MaterialIcons 
                      name={cat.icon} 
                      size={16} 
                      color={isSelected ? Colors.primary : Colors.slateDim} 
                    />
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title / Specialty */}
            <Text style={[styles.label, { marginTop: 14 }]}>Especialidad o Nombre del Servicio *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Gasfitería e instalaciones de agua caliente..."
              placeholderTextColor={Colors.slateDim}
              value={title}
              onChangeText={setTitle}
              maxLength={160}
            />

            {/* Description */}
            <Text style={[styles.label, { marginTop: 14 }]}>Descripción de tu Experiencia *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Años de experiencia en el barrio, trabajos que realizas, disponibilidad..."
              placeholderTextColor={Colors.slateDim}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            {/* Zone / Street reference (without exposing exact home) */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              Zona de atención en el barrio
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`Ej. Cerca de Plazoleta ${user.neighborhood}...`}
              placeholderTextColor={Colors.slateDim}
              value={addressApprox}
              onChangeText={setAddressApprox}
              maxLength={120}
            />
            <Text style={styles.helperText}>
              Por tu privacidad, no pongas número interior ni dirección exacta de tu hogar.
            </Text>

            {/* Phone contact */}
            <Text style={[styles.label, { marginTop: 14 }]}>Teléfono de Contacto Vecinal</Text>
            <TextInput
              style={styles.input}
              placeholder="984 123 456"
              placeholderTextColor={Colors.slateDim}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={18}
            />

            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sharePhone }}
              onPress={() => setSharePhone(!sharePhone)}
              style={[styles.consentBox, sharePhone && styles.consentBoxChecked]}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={sharePhone ? "check-box" : "check-box-outline-blank"}
                size={20}
                color={sharePhone ? Colors.primary : Colors.slateDim}
              />
              <Text style={styles.consentText}>
                Autorizo compartir el teléfono de mi perfil con vecinos autenticados del distrito.
              </Text>
            </TouchableOpacity>

            <View style={styles.scopeNoticeBox}>
              <MaterialIcons name="share-location" size={16} color={Colors.primary} />
              <Text style={styles.scopeNoticeText}>
                Se publicará en {user.neighborhood}. Podrán consultarlo cuentas del distrito.
              </Text>
            </View>
          </ScrollView>

          {/* Action button */}
          <View style={styles.footer}>
            <TouchableOpacity accessibilityRole="button" style={styles.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
              <MaterialIcons name={isSubmitting ? 'hourglass-top' : 'add-circle'} size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>{isSubmitting ? 'Guardando…' : 'Guardar servicio'}</Text>
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
  body: {
    maxHeight: 380,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  categoryChipText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  categoryChipTextActive: {
    color: Colors.primaryDark,
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
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 10.5,
    color: Colors.slateDim,
    marginTop: 4,
  },
  footer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitError: { color: Colors.emergencyDark, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 12, lineHeight: 18 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorBannerText: {
    fontSize: 12,
    color: Colors.emergencyDark,
    fontWeight: '600',
    flex: 1,
  },
  consentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 12,
  },
  consentBoxChecked: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  consentText: {
    fontSize: 11.5,
    color: Colors.secondary,
    lineHeight: 16,
    flex: 1,
  },
  scopeNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  scopeNoticeText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '500',
    flex: 1,
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
