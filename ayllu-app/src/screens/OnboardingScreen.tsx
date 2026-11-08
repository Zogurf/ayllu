import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Switch, 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { notify } from '../utils/dialog';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { NeighborhoodModal } from '../components/NeighborhoodModal';
import { TutorialModal } from '../components/TutorialModal';
import { AylluLogo } from '../components/AylluLogo';
import { getLocation, resolveProfileUbigeo } from '../lib/ubigeo';
import { saveCommunityProfile } from '../lib/communityProfile';
import { normalizePeruMobilePhone, isReasonableText } from '../utils/validation';
import { supabase } from '../lib/supabase';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { user, updateProfile } = useApp();

  const selectedLocation = getLocation(resolveProfileUbigeo(user) ?? '');
  const [nickname, setNickname] = useState(user.nickname || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [showNeighborhoodModal, setShowNeighborhoodModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleRegister = async () => {
    if (!isReasonableText(nickname, 80)) {
      void notify('Revisa el nombre', 'Ingresa un apodo de entre 1 y 80 caracteres.');
      return;
    }

    const normalizedPhone = normalizePeruMobilePhone(phone);
    if (!normalizedPhone) {
      void notify('Teléfono inválido', 'Ingresa un celular peruano válido de 9 dígitos que empiece con 9.');
      return;
    }
    if (!resolveProfileUbigeo(user) || !user.neighborhood.trim()) {
      void notify('Barrio requerido', 'Selecciona departamento, provincia, distrito y escribe tu barrio o sector.');
      return;
    }

    let authenticatedUserId: string | undefined;
    let savedLocation = {};
    if (supabase) {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          void notify('Sesión requerida', 'Inicia sesión nuevamente para guardar tu perfil en la comunidad.');
          return;
        }
        authenticatedUserId = sessionData.session.user.id;
        savedLocation = await saveCommunityProfile({ ...user, nickname: nickname.trim(), phone: normalizedPhone });
      } catch (error) {
        void notify('No se guardó el perfil', error instanceof Error ? error.message : 'Inténtalo nuevamente.');
        return;
      }
    }

    updateProfile({
      ...savedLocation,
      ...(authenticatedUserId ? { id: authenticatedUserId, role: 'vecino' as const } : {}),
      nickname: nickname.trim(),
      phone: normalizedPhone,
      gpsEnabled,
      isRegistered: true,
      coords: undefined,
    });

    void notify('¡Bienvenido(a) a Ayllu!', 'Tu cuenta vecinal ha sido creada con éxito. Tu red de apoyo mutuo está activa.').then(() => onComplete());
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header Compacto Minimalista y Elegante */}
        <View style={styles.header}>
          <AylluLogo size={44} rounded />
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Únete a Ayllu</Text>
              <View style={styles.comunalBadge}>
                <Text style={styles.comunalBadgeText}>COMUNAL</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Resiliencia y apoyo comunitario hiperlocal
            </Text>
          </View>
        </View>

        {/* Tutorial Button (RF-04) Civic Horizon Card */}
        <TouchableOpacity accessibilityRole="button"
          style={styles.tutorialCard}
          onPress={() => setShowTutorial(true)}
          activeOpacity={0.85}
        >
          <View style={styles.tutorialLeft}>
            <View style={styles.tutorialIconCircle}>
              <MaterialIcons name="lightbulb" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.tutorialTitle}>¿Primera vez aquí? Conoce Ayllu</Text>
              <Text style={styles.tutorialSubtitle}>Ver guía rápida en 3 claves cívicas</Text>
            </View>
          </View>
          <View style={styles.tutorialChevron}>
            <MaterialIcons name="chevron-right" size={18} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Formulario de Registro Geográfico (RF-01, RF-02) */}
        <View style={styles.formCard}>
          {/* Identidad Comunitaria */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.inputLabel}>¿Cómo te conocen en el barrio?</Text>
              <Text style={styles.requiredLabel}>* Obligatorio</Text>
            </View>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="sentiment-satisfied" size={18} color={Colors.slateDim} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej. Doña Rosa, Chalo, Migue..."
                placeholderTextColor={Colors.slateDim}
                value={nickname}
                onChangeText={setNickname}
                maxLength={80}
              />
            </View>
          </View>

          {/* Teléfono Móvil de Alerta */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.inputLabel}>Teléfono móvil</Text>
              <Text style={styles.hintLabel}>SMS / Alertas de emergencia</Text>
            </View>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="smartphone" size={18} color={Colors.slateDim} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="984 123 456"
                placeholderTextColor={Colors.slateDim}
                value={phone}
                onChangeText={setPhone}
                maxLength={18}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Jerarquía Geográfica Obligatoria (RF-01) */}
          <View style={styles.geoHierarchySection}>
            <View style={styles.geoHierarchyHeader}>
              <Text style={styles.geoHierarchyTitle}>Tu ubicación en Perú</Text>
            </View>

            <View style={styles.geoGrid}>
              <View style={styles.geoBox}>
                <Text style={styles.geoLabel}>REGIÓN</Text>
                <Text style={styles.geoValue}>{selectedLocation?.region ?? 'Seleccionar'}</Text>
              </View>
              <View style={styles.geoBox}>
                <Text style={styles.geoLabel}>PROVINCIA</Text>
                <Text style={styles.geoValue}>{selectedLocation?.province ?? 'Seleccionar'}</Text>
              </View>
              <View style={styles.geoBox}>
                <Text style={styles.geoLabel}>DISTRITO</Text>
                <Text style={styles.geoValue}>{selectedLocation?.district ?? 'Seleccionar'}</Text>
              </View>
            </View>

            {/* Selector de Barrio Interactivo con Modal */}
            <TouchableOpacity accessibilityRole="button"
              style={styles.neighborhoodSelectBtn}
              onPress={() => setShowNeighborhoodModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.neighborhoodSelectLeft}>
                <View style={styles.neighborhoodIcon}>
                  <MaterialIcons name="location-city" size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.neighborhoodLabel}>Ubicación y barrio / sector *</Text>
                  <Text style={styles.neighborhoodSelectedText}>{user.neighborhood || 'Seleccionar ubicación'}</Text>
                </View>
              </View>
              <MaterialIcons name="edit-location-alt" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Toggle GPS Opcional (RF-02 / RNF-11) */}
          <View style={styles.gpsSection}>
            <View style={styles.gpsHeader}>
              <View style={styles.gpsLeft}>
                <MaterialIcons name="share-location" size={20} color={Colors.primary} />
                <Text style={styles.gpsTitle}>GPS opcional para cercanía</Text>
              </View>
              <Switch
                value={gpsEnabled}
                onValueChange={setGpsEnabled}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={gpsEnabled ? Colors.primary : '#ffffff'}
              />
            </View>
            <Text style={styles.gpsExplanation}>
              <Text style={{ fontWeight: '700', color: Colors.secondary }}>No es obligatorio. </Text>
              Solo calcula distancias estimadas dentro de tu red vecinal. Tu ubicación precisa jamás se comparte ni se guarda en servidores públicos.
            </Text>
          </View>
        </View>

        {/* Botón Principal CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.ctaButton}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            <MaterialIcons name="how-to-reg" size={20} color="#ffffff" />
            <Text style={styles.ctaButtonText}>Crear Mi Cuenta Vecinal</Text>
          </TouchableOpacity>

          {/* Indicador de Privacidad y Accesibilidad (RNF-06 / RNF-10) */}
          <View style={styles.privacyBottomRow}>
            <MaterialIcons name="verified-user" size={16} color={Colors.primary} />
            <Text style={styles.privacyBottomText}>
              Sin DNI obligatorio. Respaldo cifrado local apto para emergencias sin internet.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Neighborhood Selector Modal */}
      <NeighborhoodModal
        visible={showNeighborhoodModal}
        onClose={() => setShowNeighborhoodModal(false)}
        onSelect={location => updateProfile({ ...location, neighborhoodId: undefined })}
      />

      {/* Tutorial Modal */}
      <TutorialModal
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.secondary,
  },
  comunalBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  comunalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    marginTop: 2,
  },
  tutorialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  tutorialLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tutorialIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorialTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.secondary,
  },
  tutorialSubtitle: {
    fontSize: 10.5,
    color: Colors.primaryDark,
    marginTop: 1,
  },
  tutorialChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 14,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  requiredLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.tertiary,
  },
  hintLabel: {
    fontSize: 10,
    color: Colors.slateDim,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    height: 44,
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondary,
  },
  geoHierarchySection: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSubtle,
    gap: 8,
  },
  geoHierarchyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  geoHierarchyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  rfTag: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rfTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.secondaryMuted,
  },
  geoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  geoBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  geoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.slateDim,
    letterSpacing: 0.5,
  },
  geoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 2,
  },
  neighborhoodSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 10,
  },
  neighborhoodSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  neighborhoodIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neighborhoodLabel: {
    fontSize: 9.5,
    color: Colors.secondaryMuted,
    fontWeight: '600',
  },
  neighborhoodSelectedText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginTop: 1,
  },
  gpsSection: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  gpsExplanation: {
    fontSize: 10.5,
    lineHeight: 15,
    color: Colors.secondaryMuted,
    marginTop: 6,
  },
  ctaContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 10,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    height: 50,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  privacyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  privacyBottomText: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
    textAlign: 'center',
  },
});
