import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Switch, 
  Alert, 
  Image 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { SavedPlace, UserRole } from '../types';
import { SavedPlacesModal } from '../components/SavedPlacesModal';
import { saveCommunityProfile } from '../lib/communityProfile';
import { NeighborhoodModal } from '../components/NeighborhoodModal';
import { normalizePeruMobilePhone, isReasonableText } from '../utils/validation';
import { supabase } from '../lib/supabase';
import * as Location from 'expo-location';
import { MessagingInboxModal } from '../components/MessagingInboxModal';

interface ProfileScreenProps {
  onOpenTutorial: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenTutorial }) => {
  const { 
    user, 
    updateProfile, 
    setUserRole, 
    setCoverageScope,
    isOnline, 
    syncQueue, 
    synchronizeQueue, 
    removeSyncQueueItem,
    canCoordinate,
    contentReports,
    hideContentItem,
    resetDemoData 
  } = useApp();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nickname, setNickname] = useState(user.nickname);
  const [phone, setPhone] = useState(user.phone);
  const [showNeighborhoodModal, setShowNeighborhoodModal] = useState(false);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [showInbox, setShowInbox] = useState(false);

  const handleSaveName = () => {
    if (!isReasonableText(nickname, 80)) {
      Alert.alert('Revisa el apodo', 'Ingresa entre 1 y 80 caracteres.');
      return;
    }
    const normalizedPhone = normalizePeruMobilePhone(phone);
    if (!normalizedPhone) {
      Alert.alert('Teléfono inválido', 'Ingresa un celular peruano válido de 9 dígitos que empiece con 9.');
      return;
    }
    if (supabase) {
      void (async () => {
        try {
          const savedLocation = await saveCommunityProfile({ ...user, nickname: nickname.trim(), phone: normalizedPhone });
          updateProfile({ ...savedLocation, nickname: nickname.trim(), phone: normalizedPhone });
          setIsEditingName(false);
          Alert.alert('Perfil actualizado', 'Tus datos vecinales se guardaron en la comunidad.');
        } catch (error) {
          Alert.alert('No se actualizó el perfil', error instanceof Error ? error.message : 'Inténtalo nuevamente.');
        }
      })();
      return;
    }
    updateProfile({ nickname: nickname.trim(), phone: normalizedPhone });
    setIsEditingName(false);
    Alert.alert('Perfil Actualizado', 'Tus datos vecinales han sido guardados.');
  };

  const handleGpsToggle = (enabled: boolean) => {
    setGpsError('');
    if (!enabled) { updateProfile({ gpsEnabled: false, coords: undefined }); return; }
    Alert.alert('Ubicación GPS', 'Ayllu usará la ubicación mientras utilizas la app para calcular distancias aproximadas. Las coordenadas se guardan en este dispositivo y no se publican.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Permitir', onPress: () => { void (async () => {
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (!permission.granted) throw new Error('Permite el acceso a la ubicación mientras usas Ayllu.');
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          updateProfile({ gpsEnabled: true, coords });
        } catch (error) {
          setGpsError(error instanceof Error ? error.message : 'No se pudo obtener la ubicación.');
          updateProfile({ gpsEnabled: false, coords: undefined });
        }
      })(); } },
    ]);
  };
  const distanceFromCurrent = (place: SavedPlace) => {
    if (!user.coords || !place.coords) return undefined;
    const rad=(value:number)=>value*Math.PI/180;
    const dLat=rad(place.coords.latitude-user.coords.latitude),dLon=rad(place.coords.longitude-user.coords.longitude);
    const a=Math.sin(dLat/2)**2+Math.cos(rad(user.coords.latitude))*Math.cos(rad(place.coords.latitude))*Math.sin(dLon/2)**2;
    return Math.round(6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
  };

  const handleManualSync = async () => {
    const res = await synchronizeQueue();
    Alert.alert(
      'Sincronización',
      res.success
        ? `El servidor confirmó ${res.count} elemento(s).`
        : `${res.count} confirmado(s), ${res.failed} pendiente(s). ${res.message ?? 'No se recibió confirmación del servidor.'}`,
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Bar Offline/Sync (RNF-04) */}
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
            <Text style={styles.statusTitle}>
              {isOnline ? 'Modo Ayllu Conectado' : 'Modo Ayllu Sin Conexión (Offline)'}
            </Text>
          </View>
          <Text style={styles.toggleConnText}>Estado de red real</Text>
        </View>

        {/* Profile Card & Geographic Header (RF-01, RF-05) */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <View style={styles.nicknameRow}>
                <Text style={styles.nickname}>{user.nickname}</Text>
                <TouchableOpacity onPress={() => setIsEditingName(!isEditingName)}>
                  <MaterialIcons name="edit" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.phoneText}>📞 {user.phone}</Text>
              <Text style={styles.locationSummary}>
                Distrito de {user.district} · {user.province ? `${user.province} · ` : ''}{user.region}
              </Text>
            </View>
          </View>

          {isEditingName && (
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Apodo o Nombre barrial:</Text>
              <TextInput
                style={styles.editInput}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Nombre o apodo..."
              />
              <Text style={[styles.editLabel, { marginTop: 8 }]}>Teléfono móvil para alertas:</Text>
              <TextInput
                style={styles.editInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Teléfono..."
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveName}>
                <Text style={styles.saveEditText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Active Neighborhood Row (RF-01, RF-05) */}
          <View style={styles.neighborhoodBox}>
            <View style={styles.neighborhoodLeft}>
              <View style={styles.geoIconWrap}>
                <MaterialIcons name="location-on" size={18} color={Colors.primary} />
              </View>
              <View>
                <View style={styles.activeZoneRow}>
                  <Text style={styles.neighborhoodName}>{user.neighborhood}</Text>
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>Zona Activa</Text>
                  </View>
                </View>
                <Text style={styles.geoDetailText}>Distrito {user.district} • Región {user.region}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.editGeoBtn} 
              onPress={() => setShowNeighborhoodModal(true)}
            >
              <MaterialIcons name="edit-location-alt" size={16} color={Colors.secondary} />
              <Text style={styles.editGeoText}>Cambiar</Text>
            </TouchableOpacity>
          </View>

          {/* Banner Privacidad RNF-10 */}
          <View style={styles.privacyBanner}>
            <MaterialIcons name="shield" size={18} color={Colors.primary} />
            <Text style={styles.privacyBannerText}>
              <Text style={{ fontWeight: '700' }}>Privacidad: </Text>
              Tu dirección exacta nunca se comparte. Solo se muestra tu barrio general en el uso cotidiano.
            </Text>
          </View>
        </View>

        {/* Coverage Scope Switcher (RF-03) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Alcance y direcciones guardadas</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Selecciona el alcance para filtrar pedidos de ayuda y servicios en tu comunidad:
          </Text>

          {/* Scope 1 */}
          {supabase && <TouchableOpacity
            style={styles.signOutBtn}
            onPress={() => setShowInbox(true)}
          >
            <MaterialIcons name="chat" size={18} color={Colors.primary} />
            <Text style={styles.signOutBtnText}>Mensajes</Text>
          </TouchableOpacity>}
          <TouchableOpacity
            style={[styles.scopeOption, user.coverageScope === 1 && styles.scopeOptionActive]}
            onPress={() => setCoverageScope(1)}
          >
            <View style={styles.scopeLeft}>
              <View style={[styles.scopeIcon, user.coverageScope === 1 && styles.scopeIconActive]}>
                <MaterialIcons name="place" size={18} color={user.coverageScope === 1 ? Colors.primary : Colors.slateDim} />
              </View>
              <View>
                <Text style={styles.scopeTitle}>Mi Barrio Únicamente</Text>
                <Text style={styles.scopeDesc}>{user.neighborhood} (Aprox. 450 m a la redonda)</Text>
              </View>
            </View>
            <MaterialIcons
              name={user.coverageScope === 1 ? "check-circle" : "radio-button-unchecked"}
              size={20}
              color={user.coverageScope === 1 ? Colors.primary : Colors.border}
            />
          </TouchableOpacity>

          {/* Saved addresses replace adjacent-neighborhood expansion. */}
          <TouchableOpacity style={[styles.scopeOption, showSavedPlaces && styles.scopeOptionActive]} onPress={() => setShowSavedPlaces(true)}>
            <View style={styles.scopeLeft}><View style={[styles.scopeIcon, { backgroundColor: Colors.primaryContainer }]}><MaterialIcons name="bookmark" size={18} color={Colors.primary}/></View><View><Text style={styles.scopeTitle}>Mis direcciones</Text><Text style={styles.scopeDesc}>{user.savedPlaces?.length ?? 0} guardadas · {user.activePlaceId ? user.savedPlaces?.find(place=>place.id===user.activePlaceId)?.label ?? user.neighborhood : user.neighborhood}</Text></View></View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.primary}/>
          </TouchableOpacity>

          {/* Scope 3 */}
          <TouchableOpacity
            style={[styles.scopeOption, user.coverageScope === 3 && styles.scopeOptionActive]}
            onPress={() => setCoverageScope(3)}
          >
            <View style={styles.scopeLeft}>
              <View style={[styles.scopeIcon, user.coverageScope === 3 && styles.scopeIconActive]}>
                <MaterialIcons name="location-city" size={18} color={user.coverageScope === 3 ? Colors.primary : Colors.slateDim} />
              </View>
              <View>
                <Text style={styles.scopeTitle}>Todo el distrito de {user.district}</Text>
                <Text style={styles.scopeDesc}>Visibilidad en todos los sectores del distrito</Text>
              </View>
            </View>
            <MaterialIcons
              name={user.coverageScope === 3 ? "check-circle" : "radio-button-unchecked"}
              size={20}
              color={user.coverageScope === 3 ? Colors.primary : Colors.border}
            />
          </TouchableOpacity>
        </View>

        {/* GPS Permission (RF-02 / RNF-11) */}
        <View style={styles.sectionCard}>
          <View style={styles.gpsRow}>
            <View style={styles.gpsLeft}>
              <MaterialIcons name="share-location" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsTitle}>Ubicación GPS Opcional</Text>
                <Text style={styles.gpsSubtitle}>
                  Solo calcula cercanía estimada. La app funciona normalmente si se desactiva.
                </Text>
                {gpsError ? <Text accessibilityRole="alert" style={{ color: Colors.emergencyDark }}>{gpsError}</Text> : user.gpsEnabled && user.coords ? <Text style={styles.gpsSubtitle}>Ubicación obtenida. Distancias a direcciones guardadas:</Text> : null}
                {user.gpsEnabled && user.coords && (user.savedPlaces ?? []).filter(place=>place.coords).map(place=><Text key={place.id} style={styles.gpsSubtitle}>{place.label}: {distanceFromCurrent(place)} m</Text>)}
              </View>
            </View>
            <Switch
              value={user.gpsEnabled}
              onValueChange={handleGpsToggle}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={user.gpsEnabled ? Colors.primary : '#ffffff'}
            />
          </View>
        </View>

        {/* Demo-only local role switcher. */}
        {!supabase && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Conmutador de Roles (Demostración)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Solo cambia la vista de esta demo. No verifica identidad ni concede permisos reales; los datos de demostración no son privados.
          </Text>

          <View style={styles.rolesGrid}>
            {(
              [
                { id: 'vecino', label: 'Vecino', desc: 'Consulta y favores' },
                { id: 'proveedor', label: 'Proveedor', desc: 'Ofrece servicios' },
                { id: 'coordinador', label: 'Coordinador', desc: 'Activa SOS y ve datos sensibles' },
                { id: 'admin', label: 'Admin', desc: 'Modera y gestiona' },
              ] as { id: UserRole; label: string; desc: string }[]
            ).map(r => {
              const isSel = user.role === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleTile, isSel && styles.roleTileActive]}
                  onPress={() => setUserRole(r.id)}
                >
                  <MaterialIcons
                    name={isSel ? "radio-button-checked" : "radio-button-unchecked"}
                    size={16}
                    color={isSel ? Colors.primary : Colors.slateDim}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleTileName, isSel && styles.roleTileNameActive]}>
                      {r.label}
                    </Text>
                    <Text style={styles.roleTileDesc}>{r.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        )}

        {/* OFFLINE SYNC QUEUE MANAGER (RF-23, RF-24, RF-25) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Cola de Sincronización Offline</Text>
            <View style={[styles.rfTag, { backgroundColor: syncQueue.length > 0 ? '#fef3c7' : '#dbeafe' }]}>
              <Text style={[styles.rfTagText, { color: syncQueue.length > 0 ? Colors.warningText : Colors.primaryDark }]}>
                {syncQueue.length} pendiente(s)
              </Text>
            </View>
          </View>

          {syncQueue.length === 0 ? (
            <Text style={styles.emptyQueueText}>
              No hay elementos pendientes en la cola local. Todos tus reportes y favores están sincronizados con la red comunitaria.
            </Text>
          ) : (
            <View style={styles.queueList}>
              {syncQueue.map(item => (
                <View key={item.id} style={styles.queueItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.queueItemTitle}>{item.title}</Text>
                    <Text style={styles.queueItemStatus}>
                      {item.status === 'error'
                        ? `Error al enviar: ${item.errorMessage ?? 'se conserva para reintentar'}`
                        : 'Pendiente de confirmación del servidor (solo en este dispositivo)'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeQueueBtn}
                    onPress={() => removeSyncQueueItem(item.id)}
                  >
                    <MaterialIcons name="delete-outline" size={16} color={Colors.emergencyDark} />
                  </TouchableOpacity>
                </View>
              ))}

              {isOnline && (
                <TouchableOpacity style={styles.syncAllBtn} onPress={handleManualSync}>
                  <MaterialIcons name="sync" size={16} color="#ffffff" />
                  <Text style={styles.syncAllBtnText}>Sincronizar ahora</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* CONTENT MODERATION PANEL (RF-21) - Visible to Admin & Coordinator */}
        {canCoordinate && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Bandeja de Moderación Comunitaria</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Reportes enviados por vecinos sobre publicaciones o avales presuntamente engañosos:
            </Text>

            {contentReports.length === 0 ? (
              <Text style={styles.emptyQueueText}>
                No hay denuncias de contenido pendientes de revisión.
              </Text>
            ) : (
              contentReports.map(rep => (
                <View key={rep.id} style={styles.modReportCard}>
                  <View style={styles.modTopRow}>
                    <Text style={styles.modItemTitle}>{rep.reportedItemTitle}</Text>
                    <View style={styles.modStatusBadge}>
                      <Text style={styles.modStatusText}>{rep.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.modReason}>Motivo: {rep.reason}</Text>
                  <Text style={styles.modDetails}>{rep.details}</Text>

                  {rep.itemType !== 'emergency_report' && (
                    <TouchableOpacity
                      style={styles.hideContentBtn}
                      onPress={() => {
                        void hideContentItem(rep.itemId, rep.itemType, rep.status!=='hidden', rep.reason).then(()=>Alert.alert('Moderación','Decisión confirmada por el servidor.')).catch(e=>Alert.alert('No se pudo moderar',e.message));
                      }}
                    >
                      <MaterialIcons name="visibility-off" size={14} color="#ffffff" />
                      <Text style={styles.hideContentText}>{rep.status==='hidden'?'Restaurar contenido':'Ocultar contenido denunciado'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Tutorial & Demo Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.tutorialBtn} onPress={onOpenTutorial}>
            <MaterialIcons name="school" size={18} color={Colors.primary} />
            <Text style={styles.tutorialBtnText}>Volver a ver el tutorial inicial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              Alert.alert(
                'Restablecer Datos de Demostración',
                '¿Deseas reiniciar la aplicación al estado inicial del prototipo?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Restablecer', style: 'destructive', onPress: resetDemoData },
                ]
              );
            }}
          >
            <MaterialIcons name="restart-alt" size={18} color={Colors.emergencyDark} />
            <Text style={styles.resetBtnText}>Restablecer Datos Demo</Text>
          </TouchableOpacity>
          {supabase && (
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={async () => {
                if (!supabase) return;
                try {
                  const { error } = await supabase.auth.signOut();
                  if (error) throw error;
                } catch (error) {
                  Alert.alert('No se pudo cerrar sesión', error instanceof Error ? error.message : 'Inténtalo nuevamente.');
                }
              }}
            >
              <MaterialIcons name="logout" size={18} color={Colors.secondary} />
              <Text style={styles.signOutBtnText}>Cerrar sesión</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Neighborhood Selection Modal (RF-01, RF-05) */}
      <SavedPlacesModal
        visible={showSavedPlaces}
        places={user.savedPlaces ?? []}
        activePlaceId={user.activePlaceId}
        onClose={() => setShowSavedPlaces(false)}
        onAdd={(place: SavedPlace) => updateProfile({ savedPlaces: [...(user.savedPlaces ?? []), place] })}
        onDelete={(id: string) => updateProfile({ savedPlaces: (user.savedPlaces ?? []).filter(place => place.id !== id) })}
        onSelect={(place: SavedPlace) => { updateProfile({ region: place.region, province: place.province, district: place.district, districtUbigeo: place.districtUbigeo, neighborhood: place.neighborhood, neighborhoodId: place.neighborhoodId, activePlaceId: place.id, activePlaceLabel: place.label, activePlaceAddress: place.addressLine, ...(supabase ? { role: 'vecino' as const } : {}) }); setCoverageScope(1); }}
      />
      <NeighborhoodModal
        visible={showNeighborhoodModal}
        onClose={() => setShowNeighborhoodModal(false)}
      />
      <MessagingInboxModal visible={showInbox} onClose={() => setShowInbox(false)} />
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: Colors.primary,
  },
  offlineDot: {
    backgroundColor: Colors.warning,
  },
  statusTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  toggleConnBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  toggleConnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  profileInfo: {
    flex: 1,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nickname: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary,
  },
  phoneText: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
    marginTop: 1,
  },
  locationSummary: {
    fontSize: 10.5,
    color: Colors.slateDim,
    marginTop: 2,
  },
  editSection: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  editLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 4,
  },
  editInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    color: Colors.secondary,
  },
  saveEditBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveEditText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  neighborhoodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  neighborhoodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  geoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  neighborhoodName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.secondary,
  },
  activeTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  activeTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  geoDetailText: {
    fontSize: 10.5,
    color: Colors.slateDim,
    marginTop: 1,
  },
  editGeoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editGeoText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondary,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  privacyBannerText: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
    lineHeight: 14,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.secondary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    marginBottom: 10,
  },
  rfTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rfTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
    marginBottom: 6,
  },
  scopeOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  scopeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scopeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeIconActive: {
    backgroundColor: Colors.primaryContainer,
  },
  scopeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  scopeDesc: {
    fontSize: 10.5,
    color: Colors.slateDim,
    marginTop: 1,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  gpsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  gpsTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.secondary,
  },
  gpsSubtitle: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
    marginTop: 2,
  },
  rolesGrid: {
    gap: 6,
  },
  roleTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSubtle,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleTileActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  roleTileName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  roleTileNameActive: {
    color: Colors.primaryDark,
  },
  roleTileDesc: {
    fontSize: 10.5,
    color: Colors.slateDim,
  },
  emptyQueueText: {
    fontSize: 11,
    color: Colors.slateDim,
    lineHeight: 16,
  },
  queueList: {
    gap: 6,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  queueItemTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.secondary,
  },
  queueItemStatus: {
    fontSize: 10,
    color: Colors.warningText,
    marginTop: 1,
  },
  removeQueueBtn: {
    padding: 6,
  },
  syncAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    height: 38,
    borderRadius: 8,
    marginTop: 6,
  },
  syncAllBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modReportCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 8,
  },
  modTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    flex: 1,
  },
  modStatusBadge: {
    backgroundColor: '#fed7aa',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.tertiary,
  },
  modReason: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.tertiary,
    marginTop: 4,
  },
  modDetails: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
    marginTop: 2,
  },
  hideContentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.emergencyDark,
    height: 32,
    borderRadius: 6,
    marginTop: 8,
  },
  hideContentText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomActions: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 32,
    gap: 8,
  },
  tutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tutorialBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    height: 40,
    borderRadius: 12,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.emergencyDark,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 42,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },
  signOutBtnText: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
});
