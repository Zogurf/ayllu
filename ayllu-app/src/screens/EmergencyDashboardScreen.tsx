import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Alert,
  Modal,
  TextInput 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { EmergencyReport, EmergencyStatus, CriticalResource, CriticalResourceType } from '../types';
import { ReportVulnerabilityModal } from '../components/ReportVulnerabilityModal';
import { ManageEmergencyModal } from '../components/ManageEmergencyModal';
import { ContentReportModal } from '../components/ContentReportModal';

export const EmergencyDashboardScreen: React.FC = () => {
  const { 
    filteredEmergencyReports, 
    updateEmergencyReportStatus, 
    filteredCriticalResources,
    addCriticalResource,
    emergencyMode,
    user 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'reportes' | 'recursos'>('reportes');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  
  // Modals
  const [showVulnerabilityModal, setShowVulnerabilityModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [reportItemForModeration, setReportItemForModeration] = useState<EmergencyReport | null>(null);
  
  // Add Critical Resource Modal
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [resName, setResName] = useState('');
  const [resType, setResType] = useState<CriticalResourceType>('agua');
  const [resQuantity, setResQuantity] = useState('');
  const [resLocation, setResLocation] = useState('');

  const isAuthorized = user.role === 'coordinador' || user.role === 'admin';

  // Metrics
  const totalCount = filteredEmergencyReports.length;
  const pendingCount = filteredEmergencyReports.filter(r => r.status === 'pendiente').length;
  const attentionCount = filteredEmergencyReports.filter(r => r.status === 'atencion').length;
  const resolvedCount = filteredEmergencyReports.filter(r => r.status === 'resuelto' || r.status === 'cerrado').length;

  // Filtered reports
  const displayedReports = filteredEmergencyReports.filter(r => {
    if (statusFilter === 'todos') return true;
    return r.status === statusFilter;
  });

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleStatusChange = (report: EmergencyReport, newStatus: EmergencyStatus) => {
    if (!isAuthorized) {
      Alert.alert('Acceso Restringido', 'Solo los coordinadores comunitarios o brigadas autorizadas pueden actualizar el estado de atención.');
      return;
    }
    updateEmergencyReportStatus(report.id, newStatus);
    Alert.alert('Tablero Actualizado', `Reporte ${report.code} marcado como: "${newStatus.toUpperCase()}".`);
  };

  const handleCreateResource = () => {
    if (!resName.trim() || !resQuantity.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa el nombre del recurso y la cantidad disponible.');
      return;
    }

    addCriticalResource({
      name: resName.trim(),
      type: resType,
      typeLabel: resType.charAt(0).toUpperCase() + resType.slice(1),
      mode: 'disponible',
      quantity: resQuantity.trim(),
      neighborhood: user.neighborhood,
      locationDetails: resLocation.trim() || `Sector ${user.neighborhood}`,
      contactName: user.nickname,
      contactPhone: user.phone,
      validatedBy: isAuthorized ? `Validado: ${user.nickname}` : 'Registrado por vecino',
    });

    setResName('');
    setResQuantity('');
    setResLocation('');
    setShowAddResourceModal(false);
    Alert.alert('Recurso Registrado (RF-20)', '¡Recurso crítico disponible para la comunidad!');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Module Header / Role Authorization Badge (RF-18) */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View>
              <View style={[styles.roleBadge, isAuthorized ? styles.roleBadgeAuth : styles.roleBadgeNormal]}>
                <MaterialIcons 
                  name={isAuthorized ? "security" : "person"} 
                  size={14} 
                  color={isAuthorized ? Colors.tertiary : Colors.secondary} 
                />
                <Text style={[styles.roleBadgeText, isAuthorized ? styles.roleBadgeTextAuth : styles.roleBadgeTextNormal]}>
                  {isAuthorized ? 'Rol: Coordinador Autorizado' : `Rol: ${user.role.toUpperCase()} (Vista Protegida)`}
                </Text>
              </View>
              <Text style={styles.headerTitle}>Tablero de Emergencias Barrial</Text>
            </View>

            <View style={styles.lockIconWrap}>
              <MaterialIcons name="lock" size={18} color={isAuthorized ? Colors.tertiary : Colors.primary} />
            </View>
          </View>

          {/* Privacy Notice (RF-18 / RNF-12) */}
          <View style={styles.privacyNoticeRow}>
            <MaterialIcons name="verified-user" size={15} color={Colors.primary} />
            <Text style={styles.privacyNoticeText} numberOfLines={1}>
              {isAuthorized 
                ? 'Acceso a Datos Sensibles y Dirección Exacta Habilitado (RF-18)'
                : 'Direcciones exactas y teléfonos protegidos por privacidad (RF-18)'}
            </Text>
          </View>

          {/* Emergency Mode Status Card (RF-15) */}
          <View style={[styles.modeCard, emergencyMode.isActive ? styles.modeCardActive : styles.modeCardInactive]}>
            <View style={styles.modeCardTop}>
              <View style={styles.modeLeft}>
                <View style={[styles.modePulse, emergencyMode.isActive && styles.modePulseActive]} />
                <Text style={[styles.modeStatusText, emergencyMode.isActive ? styles.modeActiveText : styles.modeInactiveText]}>
                  {emergencyMode.isActive ? 'MODO EMERGENCIA ACTIVO' : 'MODO COTIDIANO ACTIVO'}
                </Text>
              </View>
              <Text style={styles.modeZoneText}>{emergencyMode.affectedNeighborhood}</Text>
            </View>

            <View style={styles.modeCardBottom}>
              <Text style={styles.modeTimestampText}>
                {emergencyMode.isActive ? `Iniciado: ${emergencyMode.activatedAt}` : 'Comunidad en calma'}
              </Text>
              {isAuthorized && (
                <TouchableOpacity
                  style={styles.manageEmergencyBtn}
                  onPress={() => setShowManageModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manageEmergencyBtnText}>
                    {emergencyMode.isActive ? 'Gestionar / Cerrar' : 'Activar Emergencia'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Metrics Grid (RF-19) */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{totalCount}</Text>
            <Text style={styles.metricLbl}>Totales</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#fca5a5' }]}>
            <Text style={[styles.metricVal, { color: Colors.emergency }]}>{pendingCount}</Text>
            <Text style={[styles.metricLbl, { color: Colors.emergencyDark }]}>Pendientes</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#bfdbfe' }]}>
            <Text style={[styles.metricVal, { color: Colors.primary }]}>{attentionCount}</Text>
            <Text style={[styles.metricLbl, { color: Colors.primaryDark }]}>En Atención</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: '#bbf7d0' }]}>
            <Text style={[styles.metricVal, { color: Colors.success }]}>{resolvedCount}</Text>
            <Text style={[styles.metricLbl, { color: Colors.success }]}>Resueltos</Text>
          </View>
        </View>

        {/* Tabs: Reportes vs Recursos Críticos */}
        <View style={styles.subTabsContainer}>
          <TouchableOpacity
            style={[styles.subTab, activeTab === 'reportes' && styles.subTabActive]}
            onPress={() => setActiveTab('reportes')}
          >
            <MaterialIcons
              name="report-problem"
              size={16}
              color={activeTab === 'reportes' ? Colors.emergency : Colors.secondaryMuted}
            />
            <Text style={[styles.subTabText, activeTab === 'reportes' && styles.subTabTextActive]}>
              Reportes de Auxilio ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeTab === 'recursos' && styles.subTabActive]}
            onPress={() => setActiveTab('recursos')}
          >
            <MaterialIcons
              name="inventory-2"
              size={16}
              color={activeTab === 'recursos' ? Colors.primary : Colors.secondaryMuted}
            />
            <Text style={[styles.subTabText, activeTab === 'recursos' && styles.subTabTextActive]}>
              Recursos Críticos (RF-20)
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* SUBTAB 1: REPORTES DE AUXILIO (RF-17, RF-18, RF-19) */}
        {/* ======================================================== */}
        {activeTab === 'reportes' && (
          <View style={styles.tabContent}>
            {/* Create Report Button */}
            <TouchableOpacity
              style={styles.newReportBtn}
              onPress={() => setShowVulnerabilityModal(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add-alert" size={20} color="#ffffff" />
              <Text style={styles.newReportBtnText}>Reportar Persona que Necesita Ayuda (RF-17)</Text>
            </TouchableOpacity>

            {/* Filter Chips by Status */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFiltersScroll}>
              {[
                { id: 'todos', label: `Todos (${totalCount})` },
                { id: 'pendiente', label: `Pendiente (${pendingCount})` },
                { id: 'atencion', label: `En atención (${attentionCount})` },
                { id: 'resuelto', label: `Resuelto (${resolvedCount})` },
              ].map(item => {
                const isSel = statusFilter === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.statusChip, isSel && styles.statusChipActive]}
                    onPress={() => setStatusFilter(item.id)}
                  >
                    <Text style={[styles.statusChipText, isSel && styles.statusChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Reports List */}
            <View style={styles.reportsList}>
              {displayedReports.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="check-circle-outline" size={38} color={Colors.border} />
                  <Text style={styles.emptyTitle}>No hay reportes en este estado</Text>
                  <Text style={styles.emptySubtitle}>Excelente noticia para la red de resiliencia comunitaria.</Text>
                </View>
              ) : (
                displayedReports.map(report => {
                  const isPending = report.status === 'pendiente';
                  const isAtencion = report.status === 'atencion';
                  const isResuelto = report.status === 'resuelto';

                  return (
                    <View key={report.id} style={styles.reportCard}>
                      {/* Offline flag (RF-23 / RF-25) */}
                      {report.isOfflinePending && (
                        <View style={styles.offlineAlertRow}>
                          <MaterialIcons name="cloud-queue" size={14} color={Colors.warningText} />
                          <Text style={styles.offlineAlertText}>
                            Guardado sin conexión en dispositivo (RF-25: No llega a coordinadores hasta sincronizar).
                          </Text>
                        </View>
                      )}

                      {/* Header */}
                      <View style={styles.reportHeader}>
                        <View style={styles.reportHeaderLeft}>
                          <View
                            style={[
                              styles.priorityBadge,
                              report.priority === 'urgente' || report.priority === 'alta'
                                ? styles.priorityHigh
                                : styles.priorityMed,
                            ]}
                          >
                            <Text style={styles.priorityBadgeText}>
                              {isPending ? 'Pendiente' : isAtencion ? 'En Atención' : 'Resuelto'} · Prioridad {report.priority.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.reportCode}>{report.code}</Text>
                        </View>
                        <Text style={styles.reportTime}>{report.createdAt}</Text>
                      </View>

                      {/* Title & Category */}
                      <View style={styles.titleRow}>
                        <MaterialIcons
                          name={
                            report.category === 'adulto_mayor'
                              ? 'elderly'
                              : report.category === 'salud'
                              ? 'medical-services'
                              : report.category === 'alimentos_agua'
                              ? 'water-drop'
                              : 'handyman'
                          }
                          size={18}
                          color={Colors.tertiary}
                        />
                        <Text style={styles.reportTitleText}>{report.title}</Text>
                      </View>

                      {/* ======================================================== */}
                      {/* SENSITIVE DATA CONTAINER (RF-18 / RNF-12) */}
                      {/* ======================================================== */}
                      <View style={[styles.sensitiveBox, isAuthorized ? styles.sensitiveBoxAuth : styles.sensitiveBoxMasked]}>
                        {isAuthorized ? (
                          // COORDINATOR / ADMIN VIEW (FULL DATA)
                          <View style={styles.sensitiveFull}>
                            <View style={styles.sensitiveTopRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.beneficiaryLabel}>Beneficiario(a) Protegido(a):</Text>
                                <Text style={styles.beneficiaryName}>
                                  {report.beneficiaryName} {report.beneficiaryAge ? `(${report.beneficiaryAge} años)` : ''}
                                </Text>
                                <Text style={styles.beneficiaryAddress}>
                                  📍 {report.exactAddress}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.callBeneficiaryBtn}
                                onPress={() => handleCall(report.contactPhone)}
                              >
                                <MaterialIcons name="call" size={16} color="#ffffff" />
                                <Text style={styles.callBeneficiaryText}>Llamar</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.phoneRow}>
                              <MaterialIcons name="phone-iphone" size={14} color={Colors.primary} />
                              <Text style={styles.phoneText}>{report.contactPhone}</Text>
                              <View style={styles.verifiedTag}>
                                <Text style={styles.verifiedTagText}>Verificado por vecino</Text>
                              </View>
                            </View>
                          </View>
                        ) : (
                          // NEIGHBOR / PROVIDER VIEW (MASKED DATA - RF-18)
                          <View style={styles.sensitiveMasked}>
                            <View style={styles.maskedTopRow}>
                              <MaterialIcons name="lock" size={16} color={Colors.slateDim} />
                              <Text style={styles.maskedTitle}>Ubicación General Protegida (RF-18)</Text>
                            </View>
                            <Text style={styles.maskedAddress}>
                              📍 {report.neighborhood} (Sector aprox. 350m a la redonda)
                            </Text>
                            <Text style={styles.maskedNote}>
                              Por seguridad y privacidad (RNF-12), el nombre completo y dirección exacta solo son accesibles para las brigadas de auxilio barrial.
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Requirement description */}
                      <View style={styles.descBox}>
                        <Text style={styles.descLabel}>Requerimiento inmediato:</Text>
                        <Text style={styles.descText}>{report.description}</Text>
                      </View>

                      {/* Assigned Brigade info */}
                      {report.assignedBrigade && (
                        <View style={styles.brigadeRow}>
                          <MaterialIcons name="shield" size={14} color={Colors.primary} />
                          <Text style={styles.brigadeText}>Brigada a cargo: {report.assignedBrigade}</Text>
                        </View>
                      )}

                      {/* Coordinator Status Actions (RF-19) */}
                      {isAuthorized && (
                        <View style={styles.statusActionRow}>
                          {isPending && (
                            <TouchableOpacity
                              style={styles.attendBtn}
                              onPress={() => handleStatusChange(report, 'atencion')}
                            >
                              <MaterialIcons name="directions-run" size={15} color="#ffffff" />
                              <Text style={styles.actionBtnText}>Tomar Caso / En Atención</Text>
                            </TouchableOpacity>
                          )}

                          {isAtencion && (
                            <TouchableOpacity
                              style={styles.resolveBtn}
                              onPress={() => handleStatusChange(report, 'resuelto')}
                            >
                              <MaterialIcons name="check-circle" size={15} color="#ffffff" />
                              <Text style={styles.actionBtnText}>Marcar Caso Resuelto</Text>
                            </TouchableOpacity>
                          )}

                          {isResuelto && (
                            <TouchableOpacity
                              style={styles.reopenBtn}
                              onPress={() => handleStatusChange(report, 'atencion')}
                            >
                              <MaterialIcons name="replay" size={15} color={Colors.secondary} />
                              <Text style={styles.reopenBtnText}>Reabrir Caso</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Report button */}
                      <TouchableOpacity
                        style={styles.flagBtn}
                        onPress={() => setReportItemForModeration(report)}
                      >
                        <MaterialIcons name="flag" size={13} color={Colors.slateDim} />
                        <Text style={styles.flagText}>Reportar error o abuso (RF-21)</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* SUBTAB 2: COORDINACIÓN DE RECURSOS CRÍTICOS (RF-20) */}
        {/* ======================================================== */}
        {activeTab === 'recursos' && (
          <View style={styles.tabContent}>
            <TouchableOpacity
              style={[styles.newReportBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setShowAddResourceModal(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add-box" size={20} color="#ffffff" />
              <Text style={styles.newReportBtnText}>Registrar / Ofrecer Recurso Crítico</Text>
            </TouchableOpacity>

            <View style={styles.resourcesList}>
              {filteredCriticalResources.map(res => (
                <View key={res.id} style={styles.resourceCard}>
                  <View style={styles.resourceHeader}>
                    <View style={styles.resourceIconCircle}>
                      <MaterialIcons
                        name={
                          res.type === 'agua'
                            ? 'water-drop'
                            : res.type === 'generador'
                            ? 'bolt'
                            : res.type === 'alimentos'
                            ? 'restaurant'
                            : 'night-shelter'
                        }
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resourceName}>{res.name}</Text>
                      <Text style={styles.resourceQuantity}>
                        Disponibilidad: <Text style={{ fontWeight: '800' }}>{res.quantity}</Text>
                      </Text>
                    </View>
                    <View style={styles.resourcePill}>
                      <Text style={styles.resourcePillText}>{res.typeLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.resourceLocationBox}>
                    <Text style={styles.resourceLoc}>📍 Ubicación: {res.locationDetails}</Text>
                    <Text style={styles.resourceContact}>
                      Contacto: {res.contactName} ({res.contactPhone})
                    </Text>
                  </View>

                  <View style={styles.resourceFooter}>
                    <Text style={styles.resourceValid}>{res.validatedBy}</Text>
                    <TouchableOpacity
                      style={styles.resCallBtn}
                      onPress={() => handleCall(res.contactPhone)}
                    >
                      <MaterialIcons name="call" size={14} color={Colors.primary} />
                      <Text style={styles.resCallText}>Llamar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: Report Vulnerability (RF-17) */}
      <ReportVulnerabilityModal
        visible={showVulnerabilityModal}
        onClose={() => setShowVulnerabilityModal(false)}
      />

      {/* Modal: Manage Emergency Mode (RF-15) */}
      <ManageEmergencyModal
        visible={showManageModal}
        onClose={() => setShowManageModal(false)}
      />

      {/* Modal: Report Item for Moderation (RF-21) */}
      {reportItemForModeration && (
        <ContentReportModal
          visible={!!reportItemForModeration}
          onClose={() => setReportItemForModeration(null)}
          itemId={reportItemForModeration.id}
          itemTitle={reportItemForModeration.title}
          itemType="emergency_report"
        />
      )}

      {/* Modal: Add Critical Resource (RF-20) */}
      <Modal visible={showAddResourceModal} transparent animationType="slide" onRequestClose={() => setShowAddResourceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalSheetTitle}>Registrar Recurso Crítico (RF-20)</Text>
              <TouchableOpacity onPress={() => setShowAddResourceModal(false)}>
                <MaterialIcons name="close" size={20} color={Colors.slateDim} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLbl}>Nombre del Recurso *</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Ej. Tanque de agua potable 500L, Generador..."
              placeholderTextColor={Colors.slateDim}
              value={resName}
              onChangeText={setResName}
            />

            <Text style={[styles.inputLbl, { marginTop: 10 }]}>Tipo de Recurso</Text>
            <View style={styles.resTypeRow}>
              {(['agua', 'generador', 'alimentos', 'refugio', 'botiquin'] as CriticalResourceType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.resTypeChip, resType === t && styles.resTypeChipActive]}
                  onPress={() => setResType(t)}
                >
                  <Text style={[styles.resTypeChipText, resType === t && styles.resTypeChipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLbl, { marginTop: 10 }]}>Cantidad / Capacidad *</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Ej. 500 Litros / 25 personas / 3.5 kW..."
              placeholderTextColor={Colors.slateDim}
              value={resQuantity}
              onChangeText={setResQuantity}
            />

            <Text style={[styles.inputLbl, { marginTop: 10 }]}>Ubicación de Retiro en el Barrio</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Ej. Salón Comunal o Patio Parroquial..."
              placeholderTextColor={Colors.slateDim}
              value={resLocation}
              onChangeText={setResLocation}
            />

            <TouchableOpacity style={styles.createResBtn} onPress={handleCreateResource}>
              <Text style={styles.createResBtnText}>Guardar Recurso</Text>
            </TouchableOpacity>
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
  scroll: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 4,
  },
  roleBadgeAuth: {
    backgroundColor: '#ffedd5',
  },
  roleBadgeNormal: {
    backgroundColor: Colors.surfaceSubtle,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  roleBadgeTextAuth: {
    color: Colors.tertiary,
  },
  roleBadgeTextNormal: {
    color: Colors.secondary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  lockIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  privacyNoticeText: {
    fontSize: 11,
    color: Colors.primaryDark,
    flex: 1,
    fontWeight: '500',
  },
  modeCard: {
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  modeCardActive: {
    backgroundColor: '#ffdada',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  modeCardInactive: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.slateDim,
  },
  modePulseActive: {
    backgroundColor: Colors.emergency,
  },
  modeStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeActiveText: {
    color: '#920028',
  },
  modeInactiveText: {
    color: Colors.secondary,
  },
  modeZoneText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.secondaryMuted,
  },
  modeCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  modeTimestampText: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
  },
  manageEmergencyBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  manageEmergencyBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.emergencyDark,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondary,
  },
  metricLbl: {
    fontSize: 9.5,
    color: Colors.secondaryMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  subTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    padding: 3,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  subTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.secondaryMuted,
  },
  subTabTextActive: {
    color: Colors.secondary,
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  newReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.emergency,
    height: 46,
    borderRadius: 12,
    marginBottom: 10,
  },
  newReportBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  statusFiltersScroll: {
    gap: 6,
    paddingBottom: 10,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  statusChipText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  reportsList: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  offlineAlertRow: {
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
  offlineAlertText: {
    fontSize: 10.5,
    color: Colors.warningText,
    flex: 1,
    fontWeight: '600',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityHigh: {
    backgroundColor: '#fee2e2',
  },
  priorityMed: {
    backgroundColor: '#eff6ff',
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.emergencyDark,
  },
  reportCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.slateDim,
  },
  reportTime: {
    fontSize: 10.5,
    color: Colors.slateDim,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
  },
  reportTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
    flex: 1,
  },
  sensitiveBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  sensitiveBoxAuth: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sensitiveBoxMasked: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sensitiveFull: {},
  sensitiveTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  beneficiaryLabel: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
  },
  beneficiaryName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 1,
  },
  beneficiaryAddress: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
    marginTop: 2,
  },
  callBeneficiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callBeneficiaryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  phoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  verifiedTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontSize: 9.5,
    color: Colors.primaryDark,
  },
  sensitiveMasked: {
    gap: 3,
  },
  maskedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  maskedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
  },
  maskedAddress: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
  },
  maskedNote: {
    fontSize: 10,
    color: Colors.slateDim,
    lineHeight: 14,
    marginTop: 2,
  },
  descBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  descLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.slateDim,
  },
  descText: {
    fontSize: 11.5,
    color: Colors.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
  brigadeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  brigadeText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  statusActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  attendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    height: 36,
    borderRadius: 8,
  },
  resolveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    height: 36,
    borderRadius: 8,
  },
  reopenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 36,
    borderRadius: 8,
  },
  reopenBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.secondary,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
  flagText: {
    fontSize: 10,
    color: Colors.slateDim,
  },
  // Critical resources
  resourcesList: {
    gap: 10,
  },
  resourceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resourceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  resourceQuantity: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  resourcePill: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resourcePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  resourceLocationBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
    gap: 2,
  },
  resourceLoc: {
    fontSize: 11,
    color: Colors.secondary,
  },
  resourceContact: {
    fontSize: 10.5,
    color: Colors.secondaryMuted,
  },
  resourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resourceValid: {
    fontSize: 10,
    color: Colors.slateDim,
  },
  resCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  resCallText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
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
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  inputLbl: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 4,
  },
  sheetInput: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 12.5,
    color: Colors.secondary,
  },
  resTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  resTypeChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resTypeChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  resTypeChipText: {
    fontSize: 11,
    color: Colors.secondaryMuted,
  },
  resTypeChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  createResBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  createResBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
