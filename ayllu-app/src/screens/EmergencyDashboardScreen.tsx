import { EmptyCommunityState } from '../components/EmptyCommunityState';
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Modal,
  TextInput 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { notify } from '../utils/dialog';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { EmergencyReport, EmergencyStatus, CriticalResourceType } from '../types';
import { ReportVulnerabilityModal } from '../components/ReportVulnerabilityModal';
import { ManageEmergencyModal } from '../components/ManageEmergencyModal';
import { ContentReportModal } from '../components/ContentReportModal';
import { isPositiveQuantity, isReasonableText } from '../utils/validation';

export const EmergencyDashboardScreen: React.FC = () => {
  const { 
    filteredEmergencyReports, 
    updateEmergencyReportStatus, 
    filteredCriticalResources,
    addCriticalResource,
    emergencyMode,
    user, canCoordinate, sharedError, readPrivateReport, emergencyAuditEvents
  } = useApp();

  const [privateData,setPrivateData]=useState<Record<string,Record<string,string>>>({});
  const [notice,setNotice]=useState('');
  const [activeTab, setActiveTab] = useState<'reportes' | 'recursos' | 'trazabilidad'>('reportes');
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
  const [isSavingResource, setIsSavingResource] = useState(false);
  const [savingReportId, setSavingReportId] = useState<string | null>(null);

  const isAuthorized = canCoordinate;

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

  const handleStatusChange = async (report: EmergencyReport, newStatus: EmergencyStatus) => {
    if (savingReportId) return;
    if (!isAuthorized) {
      void notify('Acceso Restringido', 'Solo los coordinadores comunitarios o brigadas autorizadas pueden actualizar el estado de atención.');
      return;
    }
    setSavingReportId(report.id);
    try {
      await updateEmergencyReportStatus(report.id, newStatus);
      void notify('Tablero Actualizado', `Estado del reporte ${report.code} guardado como "${newStatus.toUpperCase()}" en el servidor.`);
    } catch (error) {
      void notify('No se actualizó el reporte', error instanceof Error ? error.message : 'Inténtalo nuevamente.');
    } finally {
      setSavingReportId(null);
    }
  };

  const handleCreateResource = async () => {
    if (isSavingResource) return;
    if (!isReasonableText(resName, 160) || !isPositiveQuantity(resQuantity)) {
      void notify('Revisa el recurso', 'Ingresa un nombre de hasta 160 caracteres y una cantidad mayor que cero (por ejemplo: 500 litros).');
      return;
    }
    if (resLocation.trim() && !isReasonableText(resLocation, 120)) {
      void notify('Ubicación no válida', 'La ubicación debe tener hasta 120 caracteres.');
      return;
    }

    setIsSavingResource(true);
    try {
      await addCriticalResource({
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
    } catch (error) {
      setIsSavingResource(false);
      void notify('No se guardó el recurso', error instanceof Error ? error.message : 'Inténtalo nuevamente.');
      return;
    }

    setResName('');
    setResQuantity('');
    setResLocation('');
    setShowAddResourceModal(false);
    void notify('Recurso guardado', 'El recurso quedó registrado y sincronizado con la red comunitaria.');
    setIsSavingResource(false);
  };

  return (
    <View style={styles.container}>
      {!!(notice || sharedError) && (
        <View style={styles.topNoticeBanner}>
          <MaterialIcons name="info-outline" size={16} color={Colors.primaryDark} />
          <Text accessibilityRole="alert" style={styles.topNoticeText}>{notice || sharedError}</Text>
        </View>
      )}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Module Header / Role Authorization Badge (RF-18) */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <View style={[styles.roleBadge, isAuthorized ? styles.roleBadgeAuth : styles.roleBadgeNormal]}>
                <MaterialIcons 
                  name={isAuthorized ? "security" : "shield"} 
                  size={14} 
                  color={isAuthorized ? Colors.tertiary : Colors.primary} 
                />
                <Text style={[styles.roleBadgeText, isAuthorized ? styles.roleBadgeTextAuth : styles.roleBadgeTextNormal]}>
                  {isAuthorized ? 'Rol: Coordinador / Brigadista' : `Rol: ${user.role.toUpperCase()} (Vista Protegida)`}
                </Text>
              </View>
              <Text style={styles.headerTitle}>Tablero de Auxilio y Emergencias</Text>
              <Text style={styles.headerDesc}>
                Monitoreo barrial rápido, asignación de brigadas y auxilio a familias vulnerables.
              </Text>
            </View>

            <View style={[styles.lockIconWrap, isAuthorized && styles.lockIconWrapAuth]}>
              <MaterialIcons name={isAuthorized ? "admin-panel-settings" : "lock"} size={18} color={isAuthorized ? Colors.tertiary : Colors.primary} />
            </View>
          </View>

          {/* Privacy Notice (RF-18 / RNF-12) */}
          <View style={styles.privacyNoticeRow}>
            <MaterialIcons name="privacy-tip" size={15} color={Colors.primary} />
            <Text style={styles.privacyNoticeText} numberOfLines={2}>
              {isAuthorized 
                ? 'Acceso auditado: La consulta de direcciones exactas y teléfonos queda registrada con tu firma.'
                : 'Privacidad protegida: Las direcciones y teléfonos de personas en riesgo están resguardados.'}
            </Text>
          </View>

          {/* Emergency Mode Status Card (RF-15) */}
          <View style={[styles.modeCard, emergencyMode.isActive ? styles.modeCardActive : styles.modeCardInactive]}>
            <View style={styles.modeCardTop}>
              <View style={styles.modeLeft}>
                <View style={[styles.modePulse, emergencyMode.isActive ? styles.modePulseActive : styles.modePulseInactive]} />
                <Text style={[styles.modeStatusText, emergencyMode.isActive ? styles.modeActiveText : styles.modeInactiveText]}>
                  {emergencyMode.isActive ? 'MODO EMERGENCIA ACTIVO' : 'MONITOREO PREVENTIVO ACTIVO'}
                </Text>
              </View>
              <Text style={styles.modeZoneText}>{emergencyMode.affectedNeighborhood || user.neighborhood}</Text>
            </View>

            <View style={styles.modeCardBottom}>
              <Text style={styles.modeTimestampText}>
                {emergencyMode.isActive
                  ? `Evento: ${emergencyMode.emergencyType} · Desde: ${emergencyMode.activatedAt}`
                  : 'Comunidad en calma · Red vecinal lista para responder'}
              </Text>
              {isAuthorized && (
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.manageEmergencyBtn, emergencyMode.isActive && styles.manageEmergencyBtnActive]}
                  onPress={() => setShowManageModal(true)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={emergencyMode.isActive ? "settings" : "warning-amber"}
                    size={14}
                    color={emergencyMode.isActive ? Colors.emergencyDark : Colors.primaryDark}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.manageEmergencyBtnText, emergencyMode.isActive && styles.manageEmergencyBtnTextActive]}>
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
            <MaterialIcons name="analytics" size={16} color={Colors.secondaryMuted} style={styles.metricIcon} />
            <Text style={styles.metricVal}>{totalCount}</Text>
            <Text style={styles.metricLbl}>Totales</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardPending]}>
            <MaterialIcons name="error-outline" size={16} color={Colors.emergency} style={styles.metricIcon} />
            <Text style={[styles.metricVal, { color: Colors.emergency }]}>{pendingCount}</Text>
            <Text style={[styles.metricLbl, { color: Colors.emergencyDark }]}>Pendientes</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardAttention]}>
            <MaterialIcons name="autorenew" size={16} color={Colors.primary} style={styles.metricIcon} />
            <Text style={[styles.metricVal, { color: Colors.primary }]}>{attentionCount}</Text>
            <Text style={[styles.metricLbl, { color: Colors.primaryDark }]}>En Atención</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardResolved]}>
            <MaterialIcons name="check-circle-outline" size={16} color={Colors.success} style={styles.metricIcon} />
            <Text style={[styles.metricVal, { color: Colors.success }]}>{resolvedCount}</Text>
            <Text style={[styles.metricLbl, { color: Colors.success }]}>Resueltos</Text>
          </View>
        </View>

        {/* Tabs: Reportes vs Recursos Críticos */}
        <View style={styles.subTabsContainer}>
          <TouchableOpacity accessibilityRole="button"
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

          <TouchableOpacity accessibilityRole="button"
            style={[styles.subTab, activeTab === 'recursos' && styles.subTabActive]}
            onPress={() => setActiveTab('recursos')}
          >
            <MaterialIcons
              name="inventory-2"
              size={16}
              color={activeTab === 'recursos' ? Colors.primary : Colors.secondaryMuted}
            />
            <Text style={[styles.subTabText, activeTab === 'recursos' && styles.subTabTextActive]}>
              Recursos críticos
            </Text>
          </TouchableOpacity>
          {canCoordinate && <TouchableOpacity accessibilityRole="button"
            style={[styles.subTab, activeTab === 'trazabilidad' && styles.subTabActive]}
            onPress={() => setActiveTab('trazabilidad')}
          >
            <MaterialIcons name="history" size={16} color={activeTab === 'trazabilidad' ? Colors.primary : Colors.secondaryMuted} />
            <Text style={[styles.subTabText, activeTab === 'trazabilidad' && styles.subTabTextActive]}>Trazabilidad</Text>
          </TouchableOpacity>}
        </View>

        {/* ======================================================== */}
        {/* SUBTAB 1: REPORTES DE AUXILIO (RF-17, RF-18, RF-19) */}
        {/* ======================================================== */}
        {activeTab === 'reportes' && (
          <View style={styles.tabContent}>
            {/* Create Report Button */}
            <TouchableOpacity accessibilityRole="button"
              style={styles.newReportBtn}
              onPress={() => setShowVulnerabilityModal(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add-alert" size={20} color="#ffffff" />
              <Text style={styles.newReportBtnText}>Reportar a una persona que necesita ayuda</Text>
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
                  <TouchableOpacity accessibilityRole="button"
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
                            Guardado sin conexión en el servidor. Aún no ha llegado a los coordinadores.
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
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={styles.auditAccessBtn}
                              onPress={() => {
                                void readPrivateReport(report.id)
                                  .then(data => setPrivateData(current => ({ ...current, [report.id]: data })))
                                  .catch(e => setNotice(e instanceof Error ? e.message : 'Error al consultar datos.'));
                              }}
                            >
                              <MaterialIcons name="security" size={15} color={Colors.tertiary} />
                              <Text style={styles.auditAccessBtnText}>
                                {privateData[report.id] ? 'Datos consultados (Acceso registrado en auditoría)' : 'Consultar datos privados protegidos (Acceso registrado)'}
                              </Text>
                            </TouchableOpacity>
                            <View style={styles.sensitiveTopRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.beneficiaryLabel}>Beneficiario(a) Protegido(a):</Text>
                                <Text style={styles.beneficiaryName}>
                                  {privateData[report.id]?.beneficiary_name ?? 'Datos privados no consultados'} {privateData[report.id]?.beneficiary_age ? `(${privateData[report.id].beneficiary_age} años)` : ''}
                                </Text>
                                <Text style={styles.beneficiaryAddress}>
                                  📍 {privateData[report.id]?.exact_address ?? ''}
                                </Text>
                              </View>
                              <TouchableOpacity accessibilityRole="button"
                                style={styles.callBeneficiaryBtn}
                                onPress={() => handleCall(privateData[report.id]?.contact_phone ?? '')}
                              >
                                <MaterialIcons name="call" size={16} color="#ffffff" />
                                <Text style={styles.callBeneficiaryText}>Llamar</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.phoneRow}>
                              <MaterialIcons name="phone-iphone" size={14} color={Colors.primary} />
                              <Text style={styles.phoneText}>{privateData[report.id]?.contact_phone ?? ''}</Text>
                              <View style={styles.verifiedTag}>
                                <Text style={styles.verifiedTagText}>Declarado por vecino</Text>
                              </View>
                            </View>
                          </View>
                        ) : (
                          // NEIGHBOR / PROVIDER VIEW (MASKED DATA - RF-18)
                          <View style={styles.sensitiveMasked}>
                            <View style={styles.maskedTopRow}>
                              <MaterialIcons name="lock" size={16} color={Colors.slateDim} />
                              <Text style={styles.maskedTitle}>
                                {isAuthorized ? 'Datos privados no consultados' : 'Ubicación general protegida'}
                              </Text>
                            </View>
                            <Text style={styles.maskedAddress}>
                              📍 {report.neighborhood} (Sector aprox. 350m a la redonda)
                            </Text>
                              <Text style={styles.maskedNote}>
                                {isAuthorized
                                  ? 'Los datos identificables se consultan únicamente con una sesión autorizada en el servidor.'
                                  : 'Por seguridad y privacidad, el nombre completo y la dirección exacta solo son accesibles para las brigadas de auxilio barrial.'}
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
                            <TouchableOpacity accessibilityRole="button"
                              style={styles.attendBtn}
                              onPress={() => handleStatusChange(report, 'atencion')}
                            >
                              <MaterialIcons name="directions-run" size={15} color="#ffffff" />
                              <Text style={styles.actionBtnText}>Tomar Caso / En Atención</Text>
                            </TouchableOpacity>
                          )}

                          {isAtencion && (
                            <TouchableOpacity accessibilityRole="button"
                              style={styles.resolveBtn}
                              onPress={() => handleStatusChange(report, 'resuelto')}
                            >
                              <MaterialIcons name="check-circle" size={15} color="#ffffff" />
                              <Text style={styles.actionBtnText}>Marcar Caso Resuelto</Text>
                            </TouchableOpacity>
                          )}

                          {isResuelto && (
                            <TouchableOpacity accessibilityRole="button"
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
                      <TouchableOpacity accessibilityRole="button"
                        style={styles.flagBtn}
                        onPress={() => setReportItemForModeration(report)}
                      >
                        <MaterialIcons name="flag" size={13} color={Colors.slateDim} />
                        <Text style={styles.flagText}>Reportar error o abuso</Text>
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
            {canCoordinate && <TouchableOpacity accessibilityRole="button"
              style={[styles.newReportBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setShowAddResourceModal(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add-box" size={20} color="#ffffff" />
              <Text style={styles.newReportBtnText}>Registrar / Ofrecer Recurso Crítico</Text>
            </TouchableOpacity>}

            <View style={styles.resourcesList}>
              {filteredCriticalResources.length === 0 && (
                <EmptyCommunityState
                  title="Todavía no hay recursos registrados en este alcance"
                  description={canCoordinate ? "Registra agua, alimentos u otros recursos disponibles para apoyar a tu comunidad." : "Los coordinadores registran aquí los recursos disponibles para el barrio."}
                  actionLabel={canCoordinate ? "Registrar un recurso" : "Ver reportes de la comunidad"}
                  onAction={() => canCoordinate ? setShowAddResourceModal(true) : setActiveTab('reportes')}
                />
              )}
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
                    <TouchableOpacity accessibilityRole="button"
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

        {activeTab === 'trazabilidad' && canCoordinate && (
          <View style={styles.tabContent}>
            <View style={styles.auditIntroBox}>
              <MaterialIcons name="security" size={16} color={Colors.primary} />
              <Text style={styles.auditIntro}>
                Registro inmutable de trazabilidad (RNF-12). Audita cambios de estado, intervenciones y visualizaciones sin exponer datos personales protegidos.
              </Text>
            </View>
            {emergencyAuditEvents.length === 0 ? (
              <EmptyCommunityState
                title="Sin acciones de emergencia registradas"
                description="Aquí se mostrará el historial inmutable de cambios de estado y brigadas asignadas durante las emergencias."
                actionLabel="Volver a reportes"
                onAction={() => setActiveTab('reportes')}
              />
            ) : (
              emergencyAuditEvents.map(event => {
                const eventIcons: Record<string, any> = {
                  report_status_changed: 'swap-horiz',
                  brigade_assigned: 'shield',
                  private_report_viewed: 'visibility',
                  emergency_mode_activated: 'warning',
                  emergency_mode_closed: 'check-circle',
                };
                const labels: Record<string, string> = {
                  report_status_changed: `Estado: ${event.details.from ?? 'nuevo'} → ${event.details.to ?? ''}`,
                  brigade_assigned: `Brigada: ${event.details.to || 'sin asignación'}`,
                  private_report_viewed: 'Consulta de información privada (Auditoría)',
                  emergency_mode_activated: `Modo de emergencia activado${event.details.emergency_type ? `: ${event.details.emergency_type}` : ''}`,
                  emergency_mode_closed: 'Modo de emergencia cerrado / Retorno a calma',
                };
                const iconName = eventIcons[event.eventType] || 'history';
                return (
                  <View key={event.id} style={styles.auditCard}>
                    <View style={styles.auditCardHeader}>
                      <View style={styles.auditIconCircle}>
                        <MaterialIcons name={iconName} size={16} color={Colors.primaryDark} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.auditTitle}>{labels[event.eventType] ?? 'Acción de emergencia'}</Text>
                        <Text style={styles.auditMeta}>
                          {event.reportId ? `Reporte #${event.reportId.slice(0, 8)} · ` : ''}
                          {new Date(event.createdAt).toLocaleString()} · Actor: {event.actorId.slice(0, 8)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
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
              <Text style={styles.modalSheetTitle}>Registrar recurso crítico</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar formulario de recurso" onPress={() => setShowAddResourceModal(false)}>
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
              maxLength={160}
            />

            <Text style={[styles.inputLbl, { marginTop: 10 }]}>Tipo de Recurso</Text>
            <View style={styles.resTypeRow}>
              {(['agua', 'generador', 'alimentos', 'refugio', 'botiquin'] as CriticalResourceType[]).map(t => (
                <TouchableOpacity accessibilityRole="button"
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
              maxLength={80}
            />

            <Text style={[styles.inputLbl, { marginTop: 10 }]}>Ubicación de Retiro en el Barrio</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="Ej. Salón Comunal o Patio Parroquial..."
              placeholderTextColor={Colors.slateDim}
              value={resLocation}
              onChangeText={setResLocation}
              maxLength={120}
            />

            <TouchableOpacity accessibilityRole="button" style={styles.createResBtn} onPress={handleCreateResource} disabled={isSavingResource}>
              <Text style={styles.createResBtnText}>{isSavingResource ? 'Guardando…' : 'Guardar Recurso'}</Text>
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
  topNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  topNoticeText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
    flex: 1,
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
  headerDesc: {
    fontSize: 11.5,
    color: Colors.secondaryMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  lockIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconWrapAuth: {
    backgroundColor: '#ffedd5',
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
  modePulseInactive: {
    backgroundColor: Colors.success,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manageEmergencyBtnActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  manageEmergencyBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  manageEmergencyBtnTextActive: {
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
  metricIcon: {
    marginBottom: 4,
  },
  metricCardPending: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  metricCardAttention: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f0f7ff',
  },
  metricCardResolved: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
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
  auditIntroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  auditIntro: {
    fontSize: 11.5,
    color: Colors.primaryDark,
    lineHeight: 16,
    flex: 1,
  },
  auditEmpty: { fontSize: 13, color: Colors.secondaryMuted, paddingVertical: 18, textAlign: 'center' },
  auditCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  auditCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  auditIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditTitle: { fontSize: 12.5, fontWeight: '700', color: Colors.secondary },
  auditMeta: { fontSize: 10.5, color: Colors.secondaryMuted, marginTop: 2 },
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
  auditAccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  auditAccessBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.tertiary,
  },
});
