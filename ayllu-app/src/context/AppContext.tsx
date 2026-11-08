import { getLocation, locationMatchesScope, resolveProfileUbigeo } from '../lib/ubigeo';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as Network from 'expo-network';
import { 
  UserProfile, 
  UserRole, 
  CoverageScope, 
  LocalService, 
  CommunityFavor, 
  EmergencyReport, 
  CriticalResource, 
  EmergencyModeState, 
  SyncQueueItem, 
  ContentReport,
  FavorStatus,
  EmergencyStatus
} from '../types';
import { OfflineStorage, redactEmergencyReport } from '../storage/offlineStorage';
import { fetchFavors } from '../services/favors';
import { mergeFavorFeed } from '../services/favorFeed';
import { submitQueuedItem } from '../services/syncTransport';
import { supabase } from '../lib/supabase';
import { 
  INITIAL_USER, 
  INITIAL_SERVICES, 
  INITIAL_FAVORS, 
  INITIAL_EMERGENCY_REPORTS, 
  INITIAL_CRITICAL_RESOURCES,
  INITIAL_EMERGENCY_MODE,
  INITIAL_NEIGHBORHOODS
} from '../storage/mockData';

interface AppContextType {
  isHydrated: boolean;
  // User Profile & Roles
  user: UserProfile;
  updateProfile: (profile: Partial<UserProfile>) => void;
  setUserRole: (role: UserRole) => void;
  setCoverageScope: (scope: CoverageScope) => void;
  
  // Connectivity & Offline
  isOnline: boolean;
  lastSyncTime: string;
  syncQueue: SyncQueueItem[];
  synchronizeQueue: (retryFailed?: boolean) => Promise<{ success: boolean; count: number; failed: number; message?: string }>;
  removeSyncQueueItem: (id: string) => void;

  // Emergency Mode
  emergencyMode: EmergencyModeState;
  toggleEmergencyMode: (isActive: boolean, affectedZone?: string, emergencyType?: string) => void;

  // Local Services & Directory
  services: LocalService[];
  filteredServices: LocalService[];
  addService: (service: Omit<LocalService, 'id' | 'createdAt' | 'avalesCount' | 'avalesUserIds' | 'isVerified' | 'isOfflinePending'>) => Promise<void>;
  toggleAval: (serviceId: string) => { success: boolean; message: string };
  reportAval: (serviceId: string, reason: string) => void;

  // Cadena de Favores
  favors: CommunityFavor[];
  filteredFavors: CommunityFavor[];
  addFavor: (favor: Omit<CommunityFavor, 'id' | 'createdAt' | 'status' | 'distanceMeters' | 'favorsCompletedByAuthor' | 'isOfflinePending'>) => Promise<void>;
  updateFavorStatus: (favorId: string, status: FavorStatus) => Promise<void>;
  removeFavor: (favorId: string) => Promise<void>;
  refreshFavors: () => Promise<void>;
  favorsError: string;

  // Emergency Reports & Sensitive Data
  emergencyReports: EmergencyReport[];
  filteredEmergencyReports: EmergencyReport[];
  addEmergencyReport: (report: Omit<EmergencyReport, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  updateEmergencyReportStatus: (reportId: string, status: EmergencyStatus, assignedBrigade?: string) => Promise<void>;

  // Critical Resources
  criticalResources: CriticalResource[];
  filteredCriticalResources: CriticalResource[];
  addCriticalResource: (resource: Omit<CriticalResource, 'id' | 'updatedAt'>) => Promise<void>;

  // Moderation
  contentReports: ContentReport[];
  addContentReport: (report: Omit<ContentReport, 'id' | 'createdAt' | 'status'>) => void;
  hideContentItem: (itemId: string, itemType: string) => void;

  // UI state
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
  resetDemoData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const createUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
  const random = Math.floor(Math.random() * 16);
  return (token === 'x' ? random : (random & 0x3) | 0x8).toString(16);
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [emergencyMode, setEmergencyMode] = useState<EmergencyModeState>(INITIAL_EMERGENCY_MODE);
  
  const [services, setServices] = useState<LocalService[]>(INITIAL_SERVICES);
  const [favors, setFavors] = useState<CommunityFavor[]>(INITIAL_FAVORS);
  const [emergencyReports, setEmergencyReports] = useState<EmergencyReport[]>(INITIAL_EMERGENCY_REPORTS.map(redactEmergencyReport));
  const [criticalResources, setCriticalResources] = useState<CriticalResource[]>(INITIAL_CRITICAL_RESOURCES);
  const [contentReports, setContentReports] = useState<ContentReport[]>([]);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  const [favorsError, setFavorsError] = useState('');

  // Load persisted offline state on startup
  useEffect(() => {
    (async () => {
      try {
        const savedUser = await OfflineStorage.getUserProfile();
        setUser({ ...savedUser, ...getLocation(resolveProfileUbigeo(savedUser) ?? '') });

        const savedServices = await OfflineStorage.getServices();
        setServices(savedServices);

        const savedFavors = await OfflineStorage.getFavors();
        setFavors(savedFavors);

        const savedReports = await OfflineStorage.getEmergencyReports();
        setEmergencyReports(savedReports);

        const savedResources = await OfflineStorage.getCriticalResources();
        setCriticalResources(savedResources);

        const savedMode = await OfflineStorage.getEmergencyMode();
        setEmergencyMode(savedMode);

        const savedQueue = await OfflineStorage.getSyncQueue();
        setSyncQueue(savedQueue);

        const savedSyncTime = await OfflineStorage.getLastSyncTime();
        setLastSyncTime(savedSyncTime);

        const savedContentReports = await OfflineStorage.getContentReports();
        setContentReports(savedContentReports);
      } catch (error) {
        console.warn('Could not restore local app state:', error);
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  // Update User Profile
  const updateProfile = (updates: Partial<UserProfile>) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    OfflineStorage.saveUserProfile(updated);
  };

  const setUserRole = (role: UserRole) => {
    updateProfile({ role });
    // Demo roles only affect layout; private report data never comes from local role state.
  };

  const setCoverageScope = (coverageScope: CoverageScope) => {
    updateProfile({ coverageScope });
  };

  const favorRevision = useRef(0);
  const feedOwner = useRef(user.id);
  useEffect(() => { feedOwner.current = user.id; favorRevision.current += 1; }, [user.id, user.neighborhoodId]);

  // Drain the persistent outbox sequentially. An item leaves it only after server acknowledgement.
  const syncInProgress = useRef(false);
  const synchronizeQueue = useCallback(async (retryFailed = true): Promise<{ success: boolean; count: number; failed: number; message?: string }> => {
    if (!isOnline) return { success: false, count: 0, failed: syncQueue.length, message: 'Sin conexión a internet.' };
    if (syncInProgress.current) return { success: false, count: 0, failed: 0, message: 'La sincronización ya está en curso.' };
    syncInProgress.current = true;

    let acknowledgedCount = 0;
    let failedCount = 0;
    let queue: SyncQueueItem[] = [];
    const blockedFavors = new Set<string>();
    try {
      queue = await OfflineStorage.getSyncQueue();
      for (const item of [...queue].reverse()) {
        const favorId = item.type === 'favor' ? String((item.payload as Record<string, unknown>).id) : '';
        if (blockedFavors.has(favorId)) { failedCount += 1; continue; }
        if (item.status === 'error' && !retryFailed) { if (favorId) blockedFavors.add(favorId); continue; }
        try {
          favorRevision.current += 1;
          await submitQueuedItem(item);
          favorRevision.current += 1;
          queue = await OfflineStorage.acknowledgeSyncItem(item.id);
          setSyncQueue(queue);
          acknowledgedCount += 1;

          if (item.type === 'favor') {
            const payload = item.payload as Record<string, unknown>;
            const remaining = queue.some(entry => entry.type === 'favor' && (entry.payload as Record<string, unknown>).id === payload.id);
            setFavors(current => {
              const updated = current.map(favor => favor.id === payload.id ? { ...favor, isOfflinePending: remaining } : favor);
              void OfflineStorage.saveFavors(updated).catch(console.warn);
              return updated;
            });
          }
          if (item.type === 'emergency_report') {
            const payload = item.payload as Record<string, unknown>;
            const reportId = String(payload.localReportId ?? payload.reportId);
            const privateDataRef = String(payload.privateDataRef ?? reportId);
            setEmergencyReports(current => {
              const updated = current.map(report => report.id === reportId ? { ...report, isOfflinePending: false } : report);
              void OfflineStorage.saveEmergencyReports(updated).catch(error => console.warn('Could not persist synced report state:', error));
              return updated;
            });
            void OfflineStorage.removePrivateEmergencyReport(privateDataRef).catch(error => console.warn('Could not remove synced private cache:', error));
          }
        } catch (error) {
          if (favorId) blockedFavors.add(favorId);
          const failedItem: SyncQueueItem = {
            ...item,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Error desconocido al sincronizar.',
          };
          queue = await OfflineStorage.updateSyncItem(failedItem);
          setSyncQueue(queue);
          failedCount += 1;
        }
      }
    } finally {
      syncInProgress.current = false;
    }

    if (acknowledgedCount > 0) {
      const now = new Date().toISOString();
      setLastSyncTime(now);
      await OfflineStorage.setLastSyncTime(now);
    }
    return {
      success: failedCount === 0,
      count: acknowledgedCount,
      failed: failedCount,
      message: failedCount > 0 ? 'Los elementos sin confirmación del servidor permanecen en la cola.' : undefined,
    };
  }, [isOnline, syncQueue.length]);

  const removeSyncQueueItem = (id: string) => {
    void OfflineStorage.removeSyncItem(id).then(setSyncQueue);
  };

  const enqueueSyncItem = async (item: SyncQueueItem) => {
    const queue = await OfflineStorage.enqueueSyncItem(item);
    setSyncQueue(queue);
    return queue;
  };

  useEffect(() => {
    const updateConnectivity = (state: Network.NetworkState) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    };

    void Network.getNetworkStateAsync().then(updateConnectivity).catch(() => setIsOnline(false));
    const subscription = Network.addNetworkStateListener(updateConnectivity);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      void synchronizeQueue(true);
    }
  }, [isOnline, syncQueue.length, synchronizeQueue]);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setTimeout(() => { void synchronizeQueue(true); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [synchronizeQueue]);

  // Emergency Mode Management (RF-15)
  const toggleEmergencyMode = (isActive: boolean, affectedZone?: string, emergencyType?: string) => {
    const now = new Date();
    const formatted = `Hoy ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const nextMode: EmergencyModeState = {
      isActive,
      affectedNeighborhood: affectedZone || user.neighborhood,
      emergencyType: emergencyType || (isActive ? 'Alerta Meteorológica / Sismo' : 'Ninguna'),
      activatedAt: formatted,
      activatedBy: user.nickname,
    };
    setEmergencyMode(nextMode);
    OfflineStorage.saveEmergencyMode(nextMode);
  };

  // Local Services & Avales (RF-08, RF-09)
  const addService = async (data: Omit<LocalService, 'id' | 'createdAt' | 'avalesCount' | 'avalesUserIds' | 'isVerified' | 'isOfflinePending'>) => {
    const newService: LocalService = {
      ...data,
      districtUbigeo: resolveProfileUbigeo(user),
      id: `srv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      avalesCount: 0,
      avalesUserIds: [],
      isVerified: false,
      isOfflinePending: true,
    };

    const updated = [newService, ...services];
    if (!isOnline) {
      const queueItem: SyncQueueItem = {
        id: `sync-srv-${Date.now()}`,
        ownerUserId: user.id,
        type: 'service_post',
        payload: newService,
        createdAt: new Date().toISOString(),
        status: 'pending',
        title: `Publicación de servicio: ${newService.title}`,
      };
      await enqueueSyncItem(queueItem);
    }
    await OfflineStorage.saveServices(updated);
    setServices(updated);
  };

  // RF-08: Otorgar Visto Bueno Vecinal (1 solo aval activo por usuario)
  const toggleAval = (serviceId: string): { success: boolean; message: string } => {
    const targetService = services.find(s => s.id === serviceId);
    if (!targetService) return { success: false, message: 'Servicio no encontrado' };

    const alreadyAvaled = targetService.avalesUserIds.includes(user.id);
    let nextCount = targetService.avalesCount;
    let nextUserIds = [...targetService.avalesUserIds];

    if (alreadyAvaled) {
      // Retirar aval
      nextCount = Math.max(0, nextCount - 1);
      nextUserIds = nextUserIds.filter(id => id !== user.id);
    } else {
      // Otorgar aval
      nextCount += 1;
      nextUserIds.push(user.id);
    }

    const updatedServices = services.map(s => {
      if (s.id === serviceId) {
        return {
          ...s,
          avalesCount: nextCount,
          avalesUserIds: nextUserIds,
        };
      }
      return s;
    });

    setServices(updatedServices);
    OfflineStorage.saveServices(updatedServices);

    if (!isOnline) {
      const queueItem: SyncQueueItem = {
        id: `sync-aval-${Date.now()}`,
        ownerUserId: user.id,
        type: 'aval',
        payload: { serviceId, userId: user.id, action: alreadyAvaled ? 'remove' : 'add' },
        createdAt: 'Ahora',
        status: 'pending',
        title: `Aval vecinal para ${targetService.providerName}`,
      };
      void enqueueSyncItem(queueItem).catch(error => console.warn('Could not persist aval in outbox:', error));
    }

    return {
      success: true,
      message: alreadyAvaled ? 'Aval retirado con éxito.' : '¡Aval vecinal otorgado! Gracias por fortalecer la confianza barrial.',
    };
  };

  const reportAval = (serviceId: string, reason: string) => {
    const srv = services.find(s => s.id === serviceId);
    addContentReport({
      itemId: serviceId,
      itemType: 'service',
      reportedItemTitle: srv ? `${srv.title} (${srv.providerName})` : 'Servicio',
      reportedBy: user.nickname,
      reason: 'Reporte de aval o servicio',
      details: reason,
    });
  };

  // Shared feed. Pending local changes take precedence over server snapshots.
  const refreshFavors = useCallback(async () => {
    if (!supabase || !isOnline || !isHydrated) return;
    const owner = user.id;
    const revision = favorRevision.current;
    if (syncInProgress.current) return;
    const district = resolveProfileUbigeo(user);
    if (!district) return;
    try {
      const remote = await fetchFavors(district);
      const queue = await OfflineStorage.getSyncQueue();
      if (owner !== feedOwner.current || revision !== favorRevision.current || syncInProgress.current) return;
      setFavors(current => {
        const updated = mergeFavorFeed(current, remote, queue, owner);
        void OfflineStorage.saveFavors(updated).catch(console.warn);
        return updated;
      });
      setFavorsError('');
    } catch (error) {
      setFavorsError(error instanceof Error ? error.message : 'No se pudo actualizar el muro.');
    }
  }, [isOnline, isHydrated, user]);

  useEffect(() => {
    let active = true;
    const refresh = () => { if (active) void refreshFavors(); };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [refreshFavors, lastSyncTime]);

  const persistFavorChange = async (favor: CommunityFavor, action: 'save' | 'delete' = 'save') => {
    favorRevision.current += 1;
    if (favor.authorId !== user.id) throw new Error('Solo el autor puede cambiar este favor.');
    const updated = action === 'delete'
      ? favors.filter(f => f.id !== favor.id)
      : [favor, ...favors.filter(f => f.id !== favor.id)];
    if (supabase) {
      const item: SyncQueueItem = {
        id: createUuid(), ownerUserId: user.id, type: 'favor',
        payload: { ...favor, action }, createdAt: new Date().toISOString(),
        status: 'pending', title: `Favor: ${favor.title}`,
      };
      // Save the durable operation first; retries reuse its identifier.
      const queue = await OfflineStorage.enqueueSyncItem(item);
      await OfflineStorage.saveFavors(updated);
      setFavors(updated);
      setSyncQueue(queue);
      return;
    }
    await OfflineStorage.saveFavors(updated);
    setFavors(updated);
  };

  const addFavor = async (favorData: Omit<CommunityFavor, 'id' | 'createdAt' | 'status' | 'distanceMeters' | 'favorsCompletedByAuthor' | 'isOfflinePending'>) => {
    if (supabase && !user.neighborhoodId) throw new Error('Completa tu perfil y barrio antes de publicar.');
    await persistFavorChange({ ...favorData, authorId: user.id,
      districtUbigeo: resolveProfileUbigeo(user), id: supabase ? createUuid() : `fav-${createUuid()}`, createdAt: new Date().toISOString(),
      status: 'disponible', distanceMeters: 0, isOfflinePending: true,
    });
  };

  const updateFavorStatus = async (favorId: string, status: FavorStatus) => {
    const favor = favors.find(f => f.id === favorId);
    if (!favor) throw new Error('Favor no encontrado.');
    await persistFavorChange({ ...favor, status, isOfflinePending: true });
  };

  const removeFavor = async (favorId: string) => {
    const favor = favors.find(f => f.id === favorId);
    if (!favor) return;
    if (favor.id.startsWith('fav-')) {
      // Legacy local drafts were never uploaded.
      favorRevision.current += 1;
      const saved = await OfflineStorage.getFavors();
      const updated = saved.filter(f => f.id !== favorId);
      for (const item of await OfflineStorage.getSyncQueue()) {
        if (item.type === 'favor' && (item.payload as Record<string, unknown>).id === favorId && item.ownerUserId === user.id) {
          setSyncQueue(await OfflineStorage.removeSyncItem(item.id));
        }
      }
      await OfflineStorage.saveFavors(updated);
      setFavors(updated);
      return;
    }
    await persistFavorChange(favor, 'delete');
  };

  // Emergency Reports (RF-17, RF-18, RF-19)
  const addEmergencyReport = async (reportData: Omit<EmergencyReport, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const id = createUuid();
    const codeNum = Math.floor(100 + Math.random() * 900);
    const newReport: EmergencyReport = {
      ...reportData,
      districtUbigeo: resolveProfileUbigeo(user),
      id,
      code: `#AY-${codeNum}`,
      createdAt: 'Ahora',
      updatedAt: 'Ahora',
      status: 'pendiente',
      isOfflinePending: true,
    };

    const updatedReports = [newReport, ...emergencyReports];
    await OfflineStorage.savePrivateEmergencyReport(id, {
      category: reportData.category,
      title: reportData.title,
      description: reportData.description,
      neighborhood: reportData.neighborhood,
      districtUbigeo: resolveProfileUbigeo(user),
      neighborhoodId: user.neighborhoodId,
      priority: reportData.priority,
      reportedBy: reportData.reportedBy,
      beneficiaryName: reportData.beneficiaryName,
      beneficiaryAge: reportData.beneficiaryAge,
      exactAddress: reportData.exactAddress,
      contactPhone: reportData.contactPhone,
      consentAt: new Date().toISOString(),
    });

    const queueItem: SyncQueueItem = {
      id: createUuid(),
      ownerUserId: user.id,
      type: 'emergency_report',
      payload: { privateDataRef: id, reportId: id },
      createdAt: new Date().toISOString(),
      status: 'pending',
      title: `Reporte de Emergencia ${newReport.code}`,
    };
    try {
      const queue = await OfflineStorage.enqueueSyncItem(queueItem);
      const publicReports = updatedReports.map(redactEmergencyReport);
      await OfflineStorage.saveEmergencyReports(publicReports);
      setEmergencyReports(publicReports);
      setSyncQueue(queue);
    } catch (error) {
      setSyncQueue(await OfflineStorage.removeSyncItem(queueItem.id));
      await OfflineStorage.removePrivateEmergencyReport(id);
      throw error;
    }
  };

  const updateEmergencyReportStatus = async (reportId: string, status: EmergencyStatus, assignedBrigade?: string) => {
    const updated = emergencyReports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status,
          assignedBrigade: assignedBrigade !== undefined ? assignedBrigade : r.assignedBrigade,
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });
    await OfflineStorage.saveEmergencyReports(updated);
    setEmergencyReports(updated);
  };

  // Critical Resources (RF-20)
  const addCriticalResource = async (data: Omit<CriticalResource, 'id' | 'updatedAt'>) => {
    const newResource: CriticalResource = {
      ...data,
      districtUbigeo: resolveProfileUbigeo(user),
      id: `res-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    const updated = [newResource, ...criticalResources];
    await OfflineStorage.saveCriticalResources(updated);
    setCriticalResources(updated);
  };

  // Content Moderation (RF-21)
  const addContentReport = (reportData: Omit<ContentReport, 'id' | 'createdAt' | 'status'>) => {
    const newReport: ContentReport = {
      ...reportData,
      id: `cr-${Date.now()}`,
      createdAt: 'Ahora',
      status: 'pending',
    };
    const updated = [newReport, ...contentReports];
    setContentReports(updated);
    OfflineStorage.saveContentReports(updated);
  };

  const hideContentItem = (itemId: string, itemType: string) => {
    if (itemType === 'favor') {
      setFavors(prev => prev.map(f => f.id === itemId ? { ...f, isHidden: true } : f));
    } else if (itemType === 'service') {
      setServices(prev => prev.map(s => s.id === itemId ? { ...s, isHidden: true } : s));
    }
    // Update moderation reports
    setContentReports(prev => prev.map(cr => cr.itemId === itemId ? { ...cr, status: 'hidden' } : cr));
  };

  // Reset Demo Data
  const resetDemoData = async () => {
    await OfflineStorage.resetAllToDemo();
    setUser(INITIAL_USER);
    setServices(INITIAL_SERVICES);
    setFavors(INITIAL_FAVORS);
    setEmergencyReports(INITIAL_EMERGENCY_REPORTS.map(redactEmergencyReport));
    setCriticalResources(INITIAL_CRITICAL_RESOURCES);
    setEmergencyMode(INITIAL_EMERGENCY_MODE);
    setSyncQueue([]);
    setLastSyncTime('');
    setContentReports([]);
  };

  // Geographic filtering logic (RF-03)
  const adjacentNames = INITIAL_NEIGHBORHOODS.filter(n => n.isAdjacent).map(n => n.name);
  const isNeighborhoodMatch = (item: { neighborhood: string; districtUbigeo?: string }) => locationMatchesScope(user, item, adjacentNames);
  const filteredServices = services.filter(s => !s.isHidden && isNeighborhoodMatch(s));
  const filteredFavors = favors.filter(f => !f.isHidden && (!f.isOfflinePending || f.authorId === user.id) && isNeighborhoodMatch(f));
  const filteredEmergencyReports = emergencyReports.filter(r => isNeighborhoodMatch(r));
  const filteredCriticalResources = criticalResources.filter(r => isNeighborhoodMatch(r));

  return (
    <AppContext.Provider
      value={{
        isHydrated,
        user,
        updateProfile,
        setUserRole,
        setCoverageScope,
        isOnline,
        lastSyncTime,
        syncQueue,
        synchronizeQueue,
        removeSyncQueueItem,
        emergencyMode,
        toggleEmergencyMode,
        services,
        filteredServices,
        addService,
        toggleAval,
        reportAval,
        favors,
        filteredFavors,
        addFavor,
        refreshFavors,
        favorsError,
        updateFavorStatus,
        removeFavor,
        emergencyReports,
        filteredEmergencyReports,
        addEmergencyReport,
        updateEmergencyReportStatus,
        criticalResources,
        filteredCriticalResources,
        addCriticalResource,
        contentReports,
        addContentReport,
        hideContentItem,
        showTutorial,
        setShowTutorial,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
