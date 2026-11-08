import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  Linking, 
  Modal 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { LocalService, EmergencyContact } from '../types';
import { supabase } from '../lib/supabase';
import { INITIAL_EMERGENCY_CONTACTS } from '../storage/mockData';
import { PublishServiceModal } from '../components/PublishServiceModal';
import { ContentReportModal } from '../components/ContentReportModal';

const FILTER_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'carpinteria', label: 'Carpintería' },
  { id: 'cuidados', label: 'Cuidados' },
  { id: 'gasfiteria', label: 'Gasfitería' },
  { id: 'electricidad', label: 'Electricidad' },
  { id: 'cerrajeria', label: 'Cerrajería' },
  { id: 'educacion', label: 'Educación' },
];

export const DirectoryScreen: React.FC = () => {
  const { filteredServices, toggleAval, user, sharedError, saveService, syncQueue, synchronizeQueue } = useApp();

  const [activeTab, setActiveTab] = useState<'oficios' | 'emergencias'>('oficios');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [detailService, setDetailService] = useState<LocalService | null>(null);
  const [reportService, setReportService] = useState<LocalService | null>(null);
  const [protocolContact, setProtocolContact] = useState<EmergencyContact | null>(null);
  const [pendingCall, setPendingCall] = useState<{ phone: string; label: string } | null>(null);
  const [callError, setCallError] = useState('');

  // Filtered services
  const displayedServices = filteredServices.filter(s => {
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const [notice,setNotice]=useState('');
  const [editService,setEditService]=useState<LocalService|null>(null);
  const [confirmRemove,setConfirmRemove]=useState<string|null>(null);
  const handleAval = async (service: LocalService) => {
    try { const res=await toggleAval(service.id); setNotice(res.message); }
    catch(error) {setNotice(error instanceof Error ? error.message : 'No se pudo guardar el aval.');}
  };

  const handleCall = (phone: string, label = phone) => {
    const normalizedPhone = phone.replace(/[^\d+]/g, '');
    if (!normalizedPhone) {
      setCallError('Este contacto no tiene un número de teléfono válido.');
      setPendingCall({ phone: '', label });
      return;
    }
    setCallError('');
    setPendingCall({ phone: normalizedPhone, label });
  };

  const confirmCall = async () => {
    if (!pendingCall?.phone) return;
    try {
      await Linking.openURL(`tel:${pendingCall.phone}`);
      setPendingCall(null);
      setCallError('');
    } catch {
      setCallError('No se pudo abrir la aplicación Teléfono en este dispositivo.');
    }
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="alert" style={{padding:8}}>{notice || sharedError}</Text>
      <Modal visible={!!editService} transparent onRequestClose={()=>setEditService(null)}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#fff'}}><Text>Editar servicio</Text><TextInput value={editService?.title??''} maxLength={160} onChangeText={title=>setEditService(s=>s?{...s,title}:null)} accessibilityLabel="Título del servicio"/><TextInput value={editService?.description??''} maxLength={500} multiline onChangeText={description=>setEditService(s=>s?{...s,description}:null)} accessibilityLabel="Descripción del servicio"/><Text>{notice}</Text><TouchableOpacity onPress={()=>{if(editService) void saveService(editService).then(()=>setEditService(null)).catch(e=>setNotice(e.message));}}><Text>Guardar</Text></TouchableOpacity><TouchableOpacity onPress={()=>setEditService(null)}><Text>Cancelar</Text></TouchableOpacity></View></Modal>
      {/* Segmented Switch (RF-06 vs RF-10) */}
      <View style={styles.switchWrapper}>
        <View style={styles.switchContainer}>
          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'oficios' && styles.switchTabActive]}
            onPress={() => setActiveTab('oficios')}
          >
            <MaterialIcons
              name="handyman"
              size={17}
              color={activeTab === 'oficios' ? Colors.primary : Colors.secondaryMuted}
            />
            <Text
              style={[
                styles.switchTabText,
                activeTab === 'oficios' && styles.switchTabTextActive,
              ]}
            >
              Oficios Barriales
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchTab, activeTab === 'emergencias' && styles.switchTabActive]}
            onPress={() => setActiveTab('emergencias')}
          >
            <MaterialIcons
              name="emergency"
              size={17}
              color={activeTab === 'emergencias' ? Colors.emergency : Colors.secondaryMuted}
            />
            <Text
              style={[
                styles.switchTabText,
                activeTab === 'emergencias' && styles.switchTabTextActiveEmergency,
              ]}
            >
              Red de Emergencia
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ======================================================== */}
      {/* TAB 1: OFICIOS BARRIALES (RF-06, RF-07, RF-08, RF-09) */}
      {/* ======================================================== */}
      {activeTab === 'oficios' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search Bar + Publish Action */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={19} color={Colors.slateDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar gasfitería, cerrajería, carpintero..."
                placeholderTextColor={Colors.slateDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="cancel" size={16} color={Colors.slateDim} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowPublishModal(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add-circle" size={16} color="#ffffff" />
              <Text style={styles.addButtonText}>Ofrecer</Text>
            </TouchableOpacity>
          </View>

          {/* Category Chips Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {FILTER_CATEGORIES.map(cat => {
              const isSel = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, isSel && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Providers List */}
          <View style={styles.cardsContainer}>
            {displayedServices.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={40} color={Colors.border} />
                <Text style={styles.emptyTitle}>No se encontraron oficios</Text>
                <Text style={styles.emptySubtitle}>
                  Prueba ampliando el radio de búsqueda a barrios colindantes en tu perfil.
                </Text>
              </View>
            ) : (
              displayedServices.map(service => {
                const userHasAvaled = service.avalesUserIds.includes(user.id);
                return (
                  <View key={service.id} style={styles.card}>
                    {/* Card Top: Avatar, Name, Category, Avales Badge */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardProfile}>
                        <Image source={{ uri: service.avatarUrl }} style={styles.providerAvatar} />
                        <View style={styles.providerInfo}>
                          <View style={styles.nameRow}>
                            <Text style={styles.providerName}>{service.providerName}</Text>
                          </View>
                          <Text style={styles.serviceTitle}>{service.title}</Text>
                          <View style={styles.locationRow}>
                            <MaterialIcons name="location-on" size={13} color={Colors.slateDim} />
                            <Text style={styles.locationText} numberOfLines={1}>
                              {service.addressApprox}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* RF-08 Avales Pill */}
                      <View style={[styles.avalBadge, userHasAvaled && styles.avalBadgeActive]}>
                        <MaterialIcons 
                          name="recommend" 
                          size={14} 
                          color={userHasAvaled ? Colors.primaryDark : Colors.primary} 
                        />
                        <Text style={[styles.avalBadgeText, userHasAvaled && styles.avalBadgeTextActive]}>
                          {service.avalesCount} Avales
                        </Text>
                      </View>
                    </View>

                    {service.isOfflinePending && <Text>Pendiente de confirmación del servidor.</Text>}
                    {syncQueue.filter(q=>q.ownerUserId===user.id && q.status==='error' && (q.payload.id===service.id || q.payload.serviceId===service.id)).map(q=><TouchableOpacity key={q.id} onPress={()=>{void synchronizeQueue(true);}}><Text accessibilityRole="alert">{q.errorMessage} · Reintentar</Text></TouchableOpacity>)}
                    {service.authorId===user.id && <View style={{flexDirection:'row',gap:16,padding:12}}><TouchableOpacity onPress={()=>setEditService({...service})}><Text>Editar</Text></TouchableOpacity><TouchableOpacity onPress={()=>{if(confirmRemove!==service.id){setConfirmRemove(service.id);return;} void saveService(service,'delete').catch(e=>setNotice(e.message));}}><Text>{confirmRemove===service.id?'Confirmar retiro':'Retirar'}</Text></TouchableOpacity>{confirmRemove===service.id && <TouchableOpacity onPress={()=>setConfirmRemove(null)}><Text>Cancelar</Text></TouchableOpacity>}</View>}
                    {/* Description */}
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {service.description}
                    </Text>

                    {/* Actions */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.avalActionBtn, userHasAvaled && styles.avalActionBtnActive]}
                        onPress={() => handleAval(service)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={userHasAvaled ? "thumb-up" : "thumb-up-off-alt"}
                          size={16}
                          color={userHasAvaled ? Colors.primaryDark : Colors.primary}
                        />
                        <Text style={[styles.avalActionText, userHasAvaled && styles.avalActionTextActive]}>
                          {userHasAvaled ? 'Avalado (Quitar)' : 'Avalar (+1)'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => setDetailService(service)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.detailsBtnText}>Ver Ficha</Text>
                        <MaterialIcons name="arrow-forward" size={14} color="#ffffff" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.reportBtn}
                        onPress={() => setReportService(service)}
                        accessibilityLabel="Reportar servicio"
                      >
                        <MaterialIcons name="flag" size={16} color={Colors.slateDim} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* Disclaimer RF-09 */}
            <View style={styles.disclaimerBox}>
              <MaterialIcons name="info-outline" size={15} color={Colors.slateDim} />
              <Text style={styles.disclaimerText}>
                Los avales son otorgados por vecinos del mismo barrio. No constituyen una garantía legal ni técnica de calidad o seguridad.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RED DE EMERGENCIA (RF-10) */}
      {/* ======================================================== */}
      {activeTab === 'emergencias' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Offline synced header banner */}
          <View style={styles.emergencyBanner}>
            <View style={styles.emergencyIconWrap}>
              <MaterialIcons name="emergency" size={20} color={Colors.emergency} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyBannerTitle}>Líneas de Respuesta Inmediata</Text>
              <Text style={styles.emergencyBannerDesc}>
                Contactos de emergencia disponibles en este dispositivo.
              </Text>
            </View>
          </View>

          <View style={styles.nationalEmergencyCard}>
            <Text style={styles.nationalEmergencyTitle}>Líneas de emergencia en Perú</Text>
            <Text style={styles.nationalEmergencyDesc}>
              La central única 911 sigue en implementación; su primera etapa está prevista para Lima y Callao. Mientras no se confirme que está operativa, usa las líneas activas de cada entidad.
            </Text>
            <View style={styles.nationalEmergencyActions}>
              <TouchableOpacity style={styles.nationalEmergencyButton} onPress={() => handleCall('105', 'Policía Nacional (105)')}>
                <MaterialIcons name="local-police" size={17} color="#ffffff" />
                <Text style={styles.nationalEmergencyButtonText}>Policía · 105</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nationalEmergencyButton} onPress={() => handleCall('116', 'Bomberos (116)')}>
                <MaterialIcons name="local-fire-department" size={17} color="#ffffff" />
                <Text style={styles.nationalEmergencyButtonText}>Bomberos · 116</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Emergency Contacts List */}
          <View style={styles.cardsContainer}>
            {(supabase ? [] : INITIAL_EMERGENCY_CONTACTS).map(contact => (
              <View key={contact.id} style={styles.emergencyCard}>
                <View style={styles.emergencyCardHeader}>
                  <View style={styles.emergencyProfile}>
                    <View
                      style={[
                        styles.emergencyIconCircle,
                        contact.isOfficial ? styles.iconOfficial : styles.iconBrigade,
                      ]}
                    >
                      <MaterialIcons
                        name={contact.iconName as any}
                        size={20}
                        color={contact.isOfficial ? Colors.emergency : Colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emergencyName}>{contact.name}</Text>
                      <Text style={styles.emergencySpecialty}>{contact.specialty}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusPillBadge,
                      contact.isOfficial ? styles.pillOfficial : styles.pillBrigade,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        contact.isOfficial ? styles.pillOfficialText : styles.pillBrigadeText,
                      ]}
                    >
                      {contact.statusBadge}
                    </Text>
                  </View>
                </View>

                {/* Validation note (RF-10) */}
                <View style={styles.validationRow}>
                  <View style={styles.validLeft}>
                    <MaterialIcons name="verified-user" size={13} color={Colors.primary} />
                    <Text style={styles.validText}>Validado: {contact.validatedBy}</Text>
                  </View>
                  <Text style={styles.updatedText}>{contact.updatedAt}</Text>
                </View>

                {/* Call & Protocol Actions */}
                <View style={styles.emergencyActions}>
                  <TouchableOpacity
                    style={[
                      styles.callBtn,
                      contact.isOfficial ? styles.callBtnOfficial : styles.callBtnBrigade,
                    ]}
                    onPress={() => handleCall(contact.phone, contact.name)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="call" size={16} color="#ffffff" />
                    <Text style={styles.callBtnText}>
                      Llamar {contact.phone.length <= 4 ? `al ${contact.phone}` : 'Directo'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.protocolBtn}
                    onPress={() => setProtocolContact(contact)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="info" size={16} color={Colors.secondary} />
                    <Text style={styles.protocolBtnText}>Protocolo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ======================================================== */}
      {/* MODAL: FICHA DETALLADA DE PROVEEDOR (RF-08 / RF-09) */}
      {/* ======================================================== */}
      {detailService && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setDetailService(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.dragHandle} />
              
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ficha de Proveedor Barrial</Text>
                <TouchableOpacity onPress={() => setDetailService(null)}>
                  <MaterialIcons name="close" size={20} color={Colors.slateDim} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalProfileRow}>
                <Image source={{ uri: detailService.avatarUrl }} style={styles.detailAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{detailService.providerName}</Text>
                  <Text style={styles.detailTitle}>{detailService.title}</Text>
                  <Text style={styles.detailLocation}>
                    📍 {detailService.neighborhood} • {detailService.addressApprox}
                  </Text>
                </View>
              </View>

              <View style={styles.detailAvalBox}>
                <MaterialIcons name="recommend" size={22} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailAvalCount}>
                    {detailService.avalesCount} Avales Vecinales Otorgados
                  </Text>
                  <Text style={styles.detailAvalNote}>
                    Respaldado por vecinos residentes en la misma localidad comunitaria.
                  </Text>
                </View>
              </View>

              <Text style={styles.detailSectionLabel}>Descripción y Oficio</Text>
              <Text style={styles.detailDescText}>{detailService.description}</Text>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity 
                  style={styles.modalAvalBtn} 
                  onPress={() => {
                    handleAval(detailService);
                    setDetailService(null);
                  }}
                >
                  <MaterialIcons name="thumb-up" size={18} color={Colors.primary} />
                  <Text style={styles.modalAvalText}>Dar Visto Bueno</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalCallBtn} 
                  onPress={() => handleCall(detailService.providerPhone)}
                >
                  <MaterialIcons name="call" size={18} color="#ffffff" />
                  <Text style={styles.modalCallText}>Llamar al {detailService.providerPhone}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL: PROTOCOLO DE EMERGENCIA */}
      {/* ======================================================== */}
      {protocolContact && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setProtocolContact(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.dragHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Protocolo de Respuesta</Text>
                <TouchableOpacity onPress={() => setProtocolContact(null)}>
                  <MaterialIcons name="close" size={20} color={Colors.slateDim} />
                </TouchableOpacity>
              </View>

              <Text style={styles.detailName}>{protocolContact.name}</Text>
              <Text style={styles.detailTitle}>{protocolContact.specialty}</Text>

              <View style={styles.protocolBox}>
                <Text style={styles.protocolTitle}>Instrucciones de Emergencia:</Text>
                <Text style={styles.protocolDesc}>
                  {protocolContact.protocol || 'Contactar de inmediato en caso de riesgo a la vida o integridad física.'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modalCallBtn, { marginTop: 14 }]}
                onPress={() => {
                  handleCall(protocolContact.phone);
                  setProtocolContact(null);
                }}
              >
                <MaterialIcons name="call" size={18} color="#ffffff" />
                <Text style={styles.modalCallText}>Llamar ahora ({protocolContact.phone})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Publish Service Modal */}
      <PublishServiceModal
        visible={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />

      {/* Report Modal */}
      {reportService && (
        <ContentReportModal
          visible={!!reportService}
          onClose={() => setReportService(null)}
          itemId={reportService.id}
          itemTitle={reportService.title}
          itemType="service"
        />
      )}

      <Modal visible={!!pendingCall} transparent animationType="fade" onRequestClose={() => setPendingCall(null)}>
        <View style={styles.callConsentOverlay}>
          <View style={styles.callConsentCard}>
            <MaterialIcons name="call" size={28} color={Colors.emergency} />
            <Text style={styles.callConsentTitle}>¿Permites abrir Teléfono?</Text>
            <Text style={styles.callConsentText}>
              Ayllu abrirá el marcador con {pendingCall?.label} ({pendingCall?.phone}). No iniciará la llamada por sí sola; confirma la llamada en la aplicación Teléfono.
            </Text>
            {!!callError && <Text accessibilityRole="alert" style={styles.callConsentError}>{callError}</Text>}
            <View style={styles.callConsentActions}>
              <TouchableOpacity style={styles.callConsentCancel} onPress={() => { setPendingCall(null); setCallError(''); }}>
                <Text style={styles.callConsentCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!pendingCall?.phone} style={[styles.callConsentAllow, !pendingCall?.phone && { opacity: 0.5 }]} onPress={() => { void confirmCall(); }}>
                <Text style={styles.callConsentAllowText}>Permitir y continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  switchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 3,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  switchTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  switchTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.secondaryMuted,
  },
  switchTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  switchTabTextActiveEmergency: {
    color: Colors.emergencyDark,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: Colors.secondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  chipsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  serviceTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  locationText: {
    fontSize: 10.5,
    color: Colors.slateDim,
  },
  avalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  avalBadgeActive: {
    backgroundColor: '#dbeafe',
  },
  avalBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  avalBadgeTextActive: {
    color: Colors.primaryDark,
  },
  cardDesc: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
    lineHeight: 16,
    marginVertical: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSubtle,
  },
  avalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avalActionBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  avalActionText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.secondary,
  },
  avalActionTextActive: {
    color: Colors.primaryDark,
  },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  detailsBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  reportBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.surfaceSubtle,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 6,
  },
  disclaimerText: {
    fontSize: 10.5,
    color: Colors.slateDim,
    flex: 1,
    lineHeight: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  // Emergency styles
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  emergencyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBannerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#991b1b',
  },
  emergencyBannerDesc: {
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 1,
  },
  nationalEmergencyCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  nationalEmergencyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.secondary,
  },
  nationalEmergencyDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: Colors.secondaryMuted,
    marginTop: 5,
    marginBottom: 10,
  },
  nationalEmergencyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  nationalEmergencyButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: Colors.emergency,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  nationalEmergencyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emergencyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emergencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  emergencyProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  emergencyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconOfficial: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  iconBrigade: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  emergencyName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  emergencySpecialty: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    marginTop: 1,
  },
  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillOfficial: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  pillBrigade: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pillOfficialText: {
    color: Colors.emergencyDark,
  },
  pillBrigadeText: {
    color: Colors.primaryDark,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 10,
  },
  validLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  updatedText: {
    fontSize: 10,
    color: Colors.slateDim,
  },
  emergencyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  callBtnOfficial: {
    backgroundColor: Colors.emergency,
  },
  callBtnBrigade: {
    backgroundColor: Colors.secondary,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  callConsentOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  callConsentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  callConsentTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.secondary,
    marginTop: 10,
  },
  callConsentText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.secondaryMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  callConsentError: {
    color: Colors.emergencyDark,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  callConsentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
  },
  callConsentCancel: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callConsentCancelText: {
    color: Colors.secondary,
    fontWeight: '700',
  },
  callConsentAllow: {
    flex: 1.3,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callConsentAllowText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  protocolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  protocolBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  modalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  detailAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  detailName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },
  detailTitle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  detailLocation: {
    fontSize: 11,
    color: Colors.slateDim,
    marginTop: 2,
  },
  detailAvalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  detailAvalCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  detailAvalNote: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
    marginTop: 1,
  },
  detailSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 4,
  },
  detailDescText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.secondaryMuted,
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalAvalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  modalAvalText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  modalCallBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  modalCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  protocolBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  protocolTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 4,
  },
  protocolDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.secondaryMuted,
  },
});
