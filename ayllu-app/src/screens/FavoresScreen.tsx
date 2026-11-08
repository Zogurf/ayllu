import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { CommunityFavor, FavorStatus } from '../types';
import { PublishFavorModal } from '../components/PublishFavorModal';
import { ContentReportModal } from '../components/ContentReportModal';
import { ContactActionModal } from '../components/ContactActionModal';

const FILTER_TAGS = [
  { id: 'all', label: 'Todos' },
  { id: 'herramientas', label: 'Herramientas' },
  { id: 'acompanamiento', label: 'Acompañamiento' },
  { id: 'cuidado', label: 'Cuidado Mutuo' },
  { id: 'habilidades', label: 'Habilidades' },
  { id: 'donacion', label: 'Donaciones' },
  { id: 'urgent', label: 'Urgente' },
];

export const FavoresScreen: React.FC = () => {
  const { filteredFavors, updateFavorStatus, removeFavor, refreshFavors, favorsError, user, addFavor, editFavor, syncQueue, synchronizeQueue, hasMoreFavors, loadMoreFavors } = useApp();

  const [editing, setEditing] = useState<CommunityFavor | null>(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState('all');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [reportFavor, setReportFavor] = useState<CommunityFavor | null>(null);
  const [contactFavor, setContactFavor] = useState<CommunityFavor | null>(null);

  // Filter favors
  const displayedFavors = filteredFavors.filter(f => {
    if (selectedTag === 'all') return true;
    if (selectedTag === 'urgent') return f.isUrgent;
    return f.category === selectedTag;
  });

  const activeCount = filteredFavors.filter(f => f.status === 'disponible').length;
  const completedCount = filteredFavors.filter(f => f.status === 'resuelta').length;

  const runAction = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setActionError('');
    try { await action(); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'No se guardó el cambio.'); }
    finally { setBusy(false); }
  };
  const handleStatusChange = (favor: CommunityFavor, status: FavorStatus) => {
    void runAction(() => updateFavorStatus(favor.id, status));
  };
  const handleRemove = (id: string) => {
    if (confirmRemove !== id) { setConfirmRemove(id); return; }
    void runAction(async () => { await removeFavor(id); setConfirmRemove(null); });
  };
  const publishDraft = (favor: CommunityFavor) => {
    void runAction(async () => {
      await addFavor({ ...favor, neighborhood: user.neighborhood, authorId: user.id });
      await removeFavor(favor.id);
    });
  };

  return (
    <View style={styles.container}>
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={()=>setEditing(null)}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#ffffff'}}><Text>Editar favor</Text><TextInput accessibilityLabel="Título del favor" value={editing?.title ?? ''} maxLength={160} onChangeText={title=>setEditing(current=>current?{...current,title}:null)} style={{padding:12,borderWidth:1}}/><TextInput accessibilityLabel="Descripción del favor" value={editing?.description ?? ''} multiline maxLength={500} onChangeText={description=>setEditing(current=>current?{...current,description}:null)} style={{padding:12,borderWidth:1}}/><Text accessibilityRole="alert">{actionError}</Text><TouchableOpacity accessibilityRole="button" disabled={busy} onPress={()=>{void runAction(async()=>{if(editing) await editFavor(editing.id,editing.title,editing.description);setEditing(null);});}}><Text>Guardar cambios</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={()=>setEditing(null)}><Text>Cancelar</Text></TouchableOpacity></View></Modal>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={() => { void runAction(refreshFavors); }} />}>
        {!!(actionError || favorsError) && <Text accessibilityRole="alert" style={{ padding: 16, color: '#b91c1c' }}>{actionError || favorsError}</Text>}
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => { void runAction(refreshFavors); }} style={{ padding: 12 }}>
          <Text style={{ color: Colors.primary }}>Actualizar muro</Text>
        </TouchableOpacity>
        {hasMoreFavors && <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={()=>{void loadMoreFavors();}} style={{padding:12}}><Text>Cargar más favores</Text></TouchableOpacity>}
        {/* Banner Solidario Filosófico Ayllu (RF-11) */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerTopRow}>
            <View style={styles.bannerLeft}>
              <View style={styles.bannerIconWrap}>
                <MaterialIcons name="volunteer-activism" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.bannerTitle}>Cadena de Favores</Text>
                <Text style={styles.bannerSubtitle}>
                  Economía solidaria · Sin intercambio monetario
                </Text>
              </View>
            </View>

            <View style={styles.ayniBadge}>
              <MaterialIcons name="handshake" size={13} color={Colors.primary} />
              <Text style={styles.ayniBadgeText}>Ayni Activo</Text>
            </View>
          </View>

          <View style={styles.bannerSecurityRow}>
            <View style={styles.securityLeft}>
              <MaterialIcons name="verified-user" size={14} color={Colors.primary} />
              <Text style={styles.securityText}>Colaboración altruista protegida</Text>
            </View>
          </View>
        </View>

        {/* Main CTA Button & Impact Metrics */}
        <View style={styles.actionSection}>
          <TouchableOpacity accessibilityRole="button"
            style={styles.publishMainBtn}
            onPress={() => setShowPublishModal(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add-circle" size={22} color="#ffffff" />
            <Text style={styles.publishMainBtnText}>Pedir u Ofrecer Favor</Text>
          </TouchableOpacity>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricIconWrap}>
                <MaterialIcons name="cached" size={16} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.metricNumber}>{activeCount}</Text>
                <Text style={styles.metricLabel}>Favores en curso</Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#dcfce7' }]}>
                <MaterialIcons name="energy-savings-leaf" size={16} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.metricNumber}>{completedCount}</Text>
                <Text style={styles.metricLabel}>Favores resueltos</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter tags (Horizontal scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsScroll}
        >
          {FILTER_TAGS.map(tag => {
            const isSel = selectedTag === tag.id;
            const isUrgent = tag.id === 'urgent';
            return (
              <TouchableOpacity accessibilityRole="button"
                key={tag.id}
                style={[
                  styles.tagPill,
                  isSel && styles.tagPillActive,
                  isUrgent && isSel && styles.tagUrgentActive,
                ]}
                onPress={() => { setSelectedTag(tag.id); setConfirmRemove(null); }}
              >
                {isUrgent && (
                  <View style={[styles.urgentDot, isSel && styles.urgentDotActive]} />
                )}
                <Text
                  style={[
                    styles.tagText,
                    isSel && styles.tagTextActive,
                    isUrgent && styles.tagUrgentText,
                  ]}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Muro de Publicaciones Solidarias (RF-11, RF-12, RF-14) */}
        <View style={styles.feedContainer}>
          {displayedFavors.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="sentiment-dissatisfied" size={38} color={Colors.border} />
              <Text style={styles.emptyTitle}>No hay publicaciones en este filtro</Text>
              <Text style={styles.emptySubtitle}>
                Sé la primera persona en ofrecer o solicitar un favor solidario a tus vecinos.
              </Text>
            </View>
          ) : (
            displayedFavors.map(favor => {
              const syncError = syncQueue.find(q=>q.ownerUserId===user.id && q.type==='favor' && q.payload.id===favor.id && q.status==='error');
              const isAuthor = favor.authorId === user.id;

              return (
                <View key={favor.id} style={styles.favorCard}>
                  {/* Offline pending badge (RF-23, RF-25) */}
                  {favor.isOfflinePending && (
                    <View style={styles.offlinePendingBadge}>
                      <MaterialIcons name="cloud-queue" size={14} color={Colors.warningText} />
                      <Text style={styles.offlinePendingText}>
                        Guardado en este dispositivo; pendiente de compartir.
                      </Text>
                    </View>
                  )}

                  {syncError && <View style={{padding:12}}><Text accessibilityRole="alert">{syncError.errorMessage}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>{void runAction(async()=>{await synchronizeQueue(true);});}}><Text>Reintentar sincronización</Text></TouchableOpacity></View>}
                  {/* Header: Author, Verification, Neighborhood, Status */}
                  <View style={styles.favorHeader}>
                    <View style={styles.authorProfile}>
                      {!!favor.authorAvatar && <Image source={{ uri: favor.authorAvatar }} style={styles.authorAvatar} />}
                      <View>
                        <View style={styles.authorNameRow}>
                          <Text style={styles.authorName}>{favor.authorName}</Text>

                        </View>
                        <Text style={styles.neighborhoodDistance}>
                          📍 {favor.neighborhood}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.favorStatusColumn}>
                      <View
                        style={[
                          styles.statusBadge,
                          favor.status === 'disponible' ? styles.statusDisp : styles.statusRes,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            favor.status === 'disponible' ? styles.statusDispText : styles.statusResText,
                          ]}
                        >
                          {favor.status === 'disponible' ? 'Disponible' : favor.status === 'cerrada' ? 'Cerrada' : 'Resuelta'}
                        </Text>
                      </View>

                      {favor.isUrgent && (
                        <View style={styles.urgentPill}>
                          <Text style={styles.urgentPillText}>Urgente</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Mode & Category Pill */}
                  <View style={styles.categoryBadgeRow}>
                    <View style={styles.categoryPill}>
                      <MaterialIcons
                        name={favor.mode === 'ofrezco' ? "handshake" : "support"}
                        size={13}
                        color={Colors.secondary}
                      />
                      <Text style={styles.categoryPillText}>
                        {favor.categoryLabel} · {favor.mode === 'ofrezco' ? 'Ofrezco' : 'Solicito'}
                      </Text>
                    </View>
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.favorTitle}>{favor.title}</Text>
                  <Text style={styles.favorDesc}>{favor.description}</Text>

                  {/* Conditions & Duration box */}
                  <View style={styles.durationBox}>
                    <View style={styles.durationLeft}>
                      <MaterialIcons name="schedule" size={14} color={Colors.slateDim} />
                      <Text style={styles.durationText}>{favor.durationInfo}</Text>
                    </View>
                    <Text style={styles.solidaryTag}>Reciprocidad vecinal</Text>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.favorActions}>
                    {!isAuthor ? (
                      <>
                        <TouchableOpacity accessibilityRole="button"
                          style={styles.respondBtn}
                          onPress={() => {
                            setContactFavor(favor);
                          }}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons
                            name={favor.mode === 'ofrezco' ? "chat-bubble" : "favorite"}
                            size={16}
                            color="#ffffff"
                          />
                          <Text style={styles.respondBtnText}>
                            {favor.mode === 'ofrezco' ? 'Responder favor' : 'Brindar mi apoyo'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity accessibilityRole="button"
                          style={styles.reportIconBtn}
                          onPress={() => setReportFavor(favor)}
                          accessibilityLabel="Reportar publicación"
                        >
                          <MaterialIcons name="flag" size={16} color={Colors.slateDim} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      // Author management controls (RF-12)
                      <View style={styles.authorActionsRow}>
                        {confirmRemove !== favor.id && <>
                          <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={()=>setEditing({...favor})} style={styles.authorStatusBtn}><Text>Editar</Text></TouchableOpacity>
                          {favor.status!=='cerrada' && <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={()=>handleStatusChange(favor,'cerrada')} style={styles.authorStatusBtn}><Text>Cerrar</Text></TouchableOpacity>}
                          {favor.id.startsWith('fav-') && <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.authorStatusBtn} onPress={() => publishDraft(favor)}>
                            <Text style={styles.authorStatusText}>Compartir</Text>
                          </TouchableOpacity>}
                          <TouchableOpacity accessibilityRole="button"
                            disabled={busy || favor.id.startsWith('fav-')}
                            style={styles.authorStatusBtn}
                            onPress={() =>
                              handleStatusChange(
                                favor,
                                favor.status === 'disponible' ? 'resuelta' : 'disponible'
                              )
                            }
                          >
                            <MaterialIcons
                              name={favor.status === 'disponible' ? "check-circle" : "replay"}
                              size={14}
                              color={Colors.primary}
                            />
                            <Text style={styles.authorStatusText}>
                              {favor.status === 'disponible' ? 'Marcar Resuelto' : 'Reabrir'}
                            </Text>
                          </TouchableOpacity>
                        </>}
                        {confirmRemove === favor.id && (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Cancelar retiro del favor"
                            disabled={busy}
                            style={styles.authorStatusBtn}
                            onPress={() => setConfirmRemove(null)}
                          >
                            <Text style={styles.authorStatusText}>Cancelar</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={busy}
                          style={styles.authorDeleteBtn}
                          onPress={() => handleRemove(favor.id)}
                        >
                          <MaterialIcons name="delete-outline" size={14} color={Colors.emergencyDark} />
                          <Text style={styles.authorDeleteText}>{confirmRemove === favor.id ? 'Confirmar retiro' : 'Retirar'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Publish Favor Modal (3 Steps RF-13) */}
      <PublishFavorModal
        visible={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />

      {contactFavor && <ContactActionModal
        visible={!!contactFavor}
        onClose={() => setContactFavor(null)}
        favorId={contactFavor.id}
        targetName={contactFavor.authorName}
        targetItemTitle={contactFavor.title}
        channel={contactFavor.contactChannel}
        phone={contactFavor.authorPhone}
      />}

      {/* Report Modal */}
      {reportFavor && (
        <ContentReportModal
          visible={!!reportFavor}
          onClose={() => setReportFavor(null)}
          itemId={reportFavor.id}
          itemTitle={reportFavor.title}
          itemType="favor"
        />
      )}
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
  bannerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    marginTop: 1,
  },
  ayniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ayniBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.secondary,
  },
  bannerSecurityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  rnfTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  actionSection: {
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  publishMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  publishMainBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.secondary,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.secondaryMuted,
  },
  tagsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagUrgentActive: {
    backgroundColor: Colors.emergency,
    borderColor: Colors.emergency,
  },
  tagText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: Colors.secondaryMuted,
  },
  tagTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tagUrgentText: {
    color: Colors.emergencyDark,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.emergency,
  },
  urgentDotActive: {
    backgroundColor: '#ffffff',
  },
  feedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  favorCard: {
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
  offlinePendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  offlinePendingText: {
    fontSize: 10.5,
    color: Colors.warningText,
    flex: 1,
    fontWeight: '600',
  },
  favorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  neighborhoodDistance: {
    fontSize: 11,
    color: Colors.slateDim,
    marginTop: 1,
  },
  favorStatusColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusDisp: {
    backgroundColor: Colors.surfaceSubtle,
  },
  statusRes: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusDispText: {
    color: Colors.secondaryMuted,
  },
  statusResText: {
    color: Colors.success,
  },
  urgentPill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.emergencyDark,
  },
  categoryBadgeRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.secondary,
  },
  favorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 4,
  },
  favorDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.secondaryMuted,
    marginTop: 4,
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  durationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  solidaryTag: {
    fontSize: 10.5,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  favorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSubtle,
  },
  respondBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  respondBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  reportIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorActionsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  authorStatusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  authorStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  authorDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  authorDeleteText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.emergencyDark,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
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
});
