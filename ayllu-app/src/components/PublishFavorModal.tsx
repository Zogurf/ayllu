import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { FavorCategory, FavorMode, ContactChannel } from '../types';
import { isReasonableText } from '../utils/validation';

interface PublishFavorModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: FavorCategory; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'herramientas', label: 'Herramientas', icon: 'handyman' },
  { id: 'acompanamiento', label: 'Acompañamiento', icon: 'personal-injury' },
  { id: 'cuidado', label: 'Cuidado Mutuo', icon: 'volunteer-activism' },
  { id: 'donacion', label: 'Donación de Materiales', icon: 'inventory-2' },
  { id: 'movilidad', label: 'Movilidad Solidaria', icon: 'directions-car' },
  { id: 'habilidades', label: 'Intercambio Habilidades', icon: 'school' },
];

const DURATION_CHIPS = [
  'Hoy mismo',
  'Fin de semana',
  'Por 2 a 3 días',
  'Acordar por interno',
  'Donación definitiva'
];

export const PublishFavorModal: React.FC<PublishFavorModalProps> = ({ visible, onClose }) => {
  const { user, addFavor } = useApp();

  // 3-step state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [mode, setMode] = useState<FavorMode>('ofrezco');
  const [category, setCategory] = useState<FavorCategory>('herramientas');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInfo, setDurationInfo] = useState('Fin de semana');
  const [contactChannel, setContactChannel] = useState<ContactChannel>('ayllu');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const resetForm = () => {
    setCurrentStep(1);
    setMode('ofrezco');
    setCategory('herramientas');
    setTitle('');
    setDescription('');
    setDurationInfo('Fin de semana');
    setContactChannel('ayllu');
    setIsUrgent(false);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!isReasonableText(title, 160)) {
        Alert.alert('Revisa el título', 'Escribe un título de hasta 160 caracteres.');
        return;
      }
      if (description.trim() && !isReasonableText(description, 500)) {
        Alert.alert('Revisa la descripción', 'La descripción debe tener entre 1 y 500 caracteres.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    const catObj = CATEGORIES.find(c => c.id === category);
    try {
      await addFavor({
        title: title.trim(),
        description: description.trim() || 'Coordinación vecinal directa solidaria.',
        category,
        categoryLabel: catObj ? catObj.label : 'General',
        mode,
        authorId: user.id,
        authorName: user.nickname,
        authorPhone: user.phone,
        neighborhood: user.neighborhood,
        durationInfo,
        contactChannel,
        isUrgent,
        authorAvatar: user.avatarUrl,
      });
      resetForm();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se guardó el favor. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {!!submitError && <Text accessibilityRole="alert" style={{ color: '#b91c1c', padding: 12 }}>{submitError}</Text>}
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.categoryIconWrap}>
                <MaterialIcons name="handshake" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Publicar Favor Vecinal</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={20} color={Colors.slateDim} />
            </TouchableOpacity>
          </View>

          {/* Stepper Progress Bar (RF-13) */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperRow}>
              {/* Step 1 Indicator */}
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
                  {currentStep > 1 ? (
                    <MaterialIcons name="check" size={12} color="#ffffff" />
                  ) : (
                    <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>
                  Categoría
                </Text>
              </View>

              <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />

              {/* Step 2 Indicator */}
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
                  {currentStep > 2 ? (
                    <MaterialIcons name="check" size={12} color="#ffffff" />
                  ) : (
                    <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>
                  Detalles
                </Text>
              </View>

              <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />

              {/* Step 3 Indicator */}
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, currentStep === 3 && styles.stepCircleActive]}>
                  <Text style={[styles.stepNumber, currentStep === 3 && styles.stepNumberActive]}>3</Text>
                </View>
                <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelActive]}>
                  Privacidad
                </Text>
              </View>
            </View>

            <Text style={styles.stepperSubtext}>
              <Text style={styles.boldPrimary}>Paso {currentStep} de 3: </Text>
              {currentStep === 1 && 'Selecciona modalidad y categoría.'}
              {currentStep === 2 && 'Define los términos del préstamo o auxilio.'}
              {currentStep === 3 && 'Canal de contacto y principio Ayni solidario.'}
            </Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* ======================================================== */}
            {/* STEP 1: Modalidad y Categoría */}
            {/* ======================================================== */}
            {currentStep === 1 && (
              <View style={styles.stepContent}>
                <Text style={styles.sectionHeading}>Modalidad de colaboración</Text>
                <View style={styles.modeToggle}>
                  <TouchableOpacity
                    style={[styles.modeButton, mode === 'ofrezco' && styles.modeButtonActive]}
                    onPress={() => setMode('ofrezco')}
                  >
                    <MaterialIcons 
                      name="handshake" 
                      size={18} 
                      color={mode === 'ofrezco' ? Colors.primary : Colors.secondaryMuted} 
                    />
                    <Text style={[styles.modeButtonText, mode === 'ofrezco' && styles.modeButtonTextActive]}>
                      Ofrecer ayuda
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeButton, mode === 'solicito' && styles.modeButtonActive]}
                    onPress={() => setMode('solicito')}
                  >
                    <MaterialIcons 
                      name="support" 
                      size={18} 
                      color={mode === 'solicito' ? Colors.primary : Colors.secondaryMuted} 
                    />
                    <Text style={[styles.modeButtonText, mode === 'solicito' && styles.modeButtonTextActive]}>
                      Pedir auxilio
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Selecciona una Categoría</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(cat => {
                    const isSelected = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryTile, isSelected && styles.categoryTileActive]}
                        onPress={() => setCategory(cat.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={cat.icon}
                          size={22}
                          color={isSelected ? Colors.primary : Colors.slateDim}
                        />
                        <Text
                          style={[styles.categoryTileLabel, isSelected && styles.categoryTileLabelActive]}
                          numberOfLines={2}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Urgency toggle */}
                <TouchableOpacity
                  style={[styles.urgencyToggle, isUrgent && styles.urgencyToggleActive]}
                  onPress={() => setIsUrgent(!isUrgent)}
                >
                  <MaterialIcons 
                    name={isUrgent ? "check-box" : "check-box-outline-blank"} 
                    size={20} 
                    color={isUrgent ? Colors.emergency : Colors.slateDim} 
                  />
                  <Text style={[styles.urgencyText, isUrgent && styles.urgencyTextActive]}>
                    Marcar como necesidad prioritaria / urgente
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ======================================================== */}
            {/* STEP 2: Detalles del Favor */}
            {/* ======================================================== */}
            {currentStep === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.inputLabel}>
                  {mode === 'ofrezco' ? '¿Qué ofreces a tus vecinos?' : '¿Qué ayuda necesitas?'} *
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    mode === 'ofrezco'
                      ? 'Ej. Escalera de aluminio de 4 metros...'
                      : 'Ej. Acompañamiento a cita médica...'
                  }
                  placeholderTextColor={Colors.slateDim}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={160}
                />

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                  Descripción y condiciones solidarias
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Detalles sobre uso, devolución, cuidados o especificaciones..."
                  placeholderTextColor={Colors.slateDim}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                  Disponibilidad o duración estimada
                </Text>
                <View style={styles.chipsRow}>
                  {DURATION_CHIPS.map(chip => {
                    const isSelected = durationInfo === chip;
                    return (
                      <TouchableOpacity
                        key={chip}
                        style={[styles.durationChip, isSelected && styles.durationChipActive]}
                        onPress={() => setDurationInfo(chip)}
                      >
                        <Text
                          style={[styles.durationChipText, isSelected && styles.durationChipTextActive]}
                        >
                          {chip}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* STEP 3: Privacidad y Principio Ayni */}
            {/* ======================================================== */}
            {currentStep === 3 && (
              <View style={styles.stepContent}>
                {/* Ayni Badge */}
                <View style={styles.ayniNotice}>
                  <View style={styles.ayniTopRow}>
                    <MaterialIcons name="verified" size={18} color={Colors.primary} />
                    <Text style={styles.ayniTitle}>Principio Ayni</Text>
                  </View>
                  <Text style={styles.ayniText}>
                    Sin intercambio monetario. Economía comunitaria basada en la reciprocidad andina y confianza vecinal.
                  </Text>
                </View>

                <Text style={[styles.sectionHeading, { marginTop: 14 }]}>
                  ¿Cómo prefieres que te contacten?
                </Text>

                {/* Option 1: Ayllu internal message */}
                <TouchableOpacity
                  style={[
                    styles.channelCard,
                    contactChannel === 'ayllu' && styles.channelCardActive,
                  ]}
                  onPress={() => setContactChannel('ayllu')}
                >
                  <MaterialIcons
                    name={contactChannel === 'ayllu' ? "radio-button-checked" : "radio-button-unchecked"}
                    size={20}
                    color={contactChannel === 'ayllu' ? Colors.primary : Colors.slateDim}
                  />
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelTitle}>Mensajería interna Ayllu (Recomendado)</Text>
                    <Text style={styles.channelDesc}>
                      Protege tu número de teléfono personal frente a desconocidos.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: WhatsApp verificado */}
                <TouchableOpacity
                  style={[
                    styles.channelCard,
                    contactChannel === 'whatsapp' && styles.channelCardActive,
                  ]}
                  onPress={() => setContactChannel('whatsapp')}
                >
                  <MaterialIcons
                    name={contactChannel === 'whatsapp' ? "radio-button-checked" : "radio-button-unchecked"}
                    size={20}
                    color={contactChannel === 'whatsapp' ? Colors.primary : Colors.slateDim}
                  />
                  <View style={styles.channelInfo}>
                    <Text style={styles.channelTitle}>WhatsApp verificado vecinal</Text>
                    <Text style={styles.channelDesc}>
                      Solo visible para vecinos autenticados en el barrio.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Scope Note */}
                <View style={styles.scopeBox}>
                  <MaterialIcons name="near-me" size={16} color={Colors.primary} />
                  <Text style={styles.scopeText}>
                    Alcance visible: {user.neighborhood} (aprox. 450 m a la redonda)
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <MaterialIcons name="arrow-back" size={18} color={Colors.secondary} />
                <Text style={styles.backButtonText}>Atrás</Text>
              </TouchableOpacity>
            )}

            {currentStep < 3 ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Siguiente paso</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.publishButton} onPress={handleSubmit} disabled={isSubmitting}>
                <MaterialIcons name="check" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>{isSubmitting ? 'Guardando…' : 'Guardar Favor'}</Text>
              </TouchableOpacity>
            )}
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slateDim,
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.slateDim,
  },
  stepLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  stepperSubtext: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    marginTop: 8,
  },
  boldPrimary: {
    fontWeight: '700',
    color: Colors.primary,
  },
  body: {
    maxHeight: 380,
  },
  stepContent: {
    paddingVertical: 4,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryMuted,
  },
  modeButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTile: {
    width: '48%',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTileActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  categoryTileLabel: {
    fontSize: 11,
    color: Colors.secondary,
    flex: 1,
    fontWeight: '500',
  },
  categoryTileLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  urgencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
  },
  urgencyToggleActive: {
    backgroundColor: '#fee2e2',
  },
  urgencyText: {
    fontSize: 12,
    color: Colors.secondary,
    flex: 1,
  },
  urgencyTextActive: {
    color: Colors.emergencyDark,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 6,
  },
  textInput: {
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  durationChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  durationChipText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  durationChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  ayniNotice: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  ayniTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ayniTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  ayniText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    lineHeight: 15,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  channelCardActive: {
    backgroundColor: '#ffffff',
    borderColor: Colors.primary,
  },
  channelInfo: {
    flex: 1,
  },
  channelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  channelDesc: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
    marginTop: 2,
  },
  scopeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
  },
  scopeText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  publishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
