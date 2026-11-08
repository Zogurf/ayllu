import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { CommunityFavor, FavorCategory, FavorStatus } from '../types';
import { PublishFavorModal } from '../components/PublishFavorModal';
import { ContactActionModal } from '../components/ContactActionModal';
import { ContentReportModal } from '../components/ContentReportModal';

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
  const { filteredFavors, updateFavorStatus, removeFavor, user } = useApp();

  const [selectedTag, setSelectedTag] = useState('all');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [contactFavor, setContactFavor] = useState<CommunityFavor | null>(null);
  const [reportFavor, setReportFavor] = useState<CommunityFavor | null>(null);

  // Filter favors
  const displayedFavors = filteredFavors.filter(f => {
    if (selectedTag === 'all') return true;
    if (selectedTag === 'urgent') return f.isUrgent;
    return f.category === selectedTag;
  });

  const activeCount = filteredFavors.filter(f => f.status === 'disponible').length;
  const completedCount = filteredFavors.filter(f => f.status === 'resuelta').length + 142; // Seeded metric

  const handleStatusChange = (favor: CommunityFavor, newStatus: FavorStatus) => {
    updateFavorStatus(favor.id, newStatus);
    Alert.alert('Estado Actualizado', `El favor ahora figura como: "${newStatus.toUpperCase()}".`);
  };

  const handleRemove = (favorId: string) => {
    Alert.alert(
      'Retirar Publicación',
      '¿Deseas retirar esta publicación del muro vecinal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Retirar', style: 'destructive', onPress: () => removeFavor(favorId) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity
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
                <Text style={styles.metricLabel}>Completados mes</Text>
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
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tagPill,
                  isSel && styles.tagPillActive,
                  isUrgent && isSel && styles.tagUrgentActive,
                ]}
                onPress={() => setSelectedTag(tag.id)}
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
              const isAuthor = favor.authorId === user.id;

              return (
                <View key={favor.id} style={styles.favorCard}>
                  {/* Offline pending badge (RF-23, RF-25) */}
                  {favor.isOfflinePending && (
                    <View style={styles.offlinePendingBadge}>
                      <MaterialIcons name="cloud-queue" size={14} color={Colors.warningText} />
                      <Text style={styles.offlinePendingText}>
                        Guardado en tu móvil; aún no se ha compartido.
                      </Text>
                    </View>
                  )}

                  {/* Header: Author, Verification, Neighborhood, Status */}
                  <View style={styles.favorHeader}>
                    <View style={styles.authorProfile}>
                      <Image source={{ uri: favor.authorAvatar }} style={styles.authorAvatar} />
                      <View>
                        <View style={styles.authorNameRow}>
                          <Text style={styles.authorName}>{favor.authorName}</Text>
                          <MaterialIcons name="verified" size={15} color={Colors.primary} />
                        </View>
                        <Text style={styles.neighborhoodDistance}>
                          📍 {favor.neighborhood} (a ~{favor.distanceMeters}m)
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
                          {favor.status === 'disponible' ? 'Disponible' : 'Resuelta'}
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
                        <TouchableOpacity
                          style={styles.respondBtn}
                          onPress={() => setContactFavor(favor)}
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

                        <TouchableOpacity
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
                        <TouchableOpacity
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

                        <TouchableOpacity
                          style={styles.authorDeleteBtn}
                          onPress={() => handleRemove(favor.id)}
                        >
                          <MaterialIcons name="delete-outline" size={14} color={Colors.emergencyDark} />
                          <Text style={styles.authorDeleteText}>Retirar</Text>
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

      {/* Contact Neighbor Modal (RF-14) */}
      {contactFavor && (
        <ContactActionModal
          visible={!!contactFavor}
          onClose={() => setContactFavor(null)}
          targetName={contactFavor.authorName}
          targetItemTitle={contactFavor.title}
          channel={contactFavor.contactChannel}
          phone={contactFavor.authorPhone}
        />
      )}

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
