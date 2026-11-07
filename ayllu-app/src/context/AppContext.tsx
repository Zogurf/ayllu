import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { OfflineStorage } from '../storage/offlineStorage';
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
  // User Profile & Roles
  user: UserProfile;
  updateProfile: (profile: Partial<UserProfile>) => void;
  setUserRole: (role: UserRole) => void;
  setCoverageScope: (scope: CoverageScope) => void;
  
  // Connectivity & Offline
  isOnline: boolean;
  toggleConnectivity: () => void;
  lastSyncTime: string;
  syncQueue: SyncQueueItem[];
  synchronizeQueue: () => Promise<{ success: boolean; count: number }>;
  removeSyncQueueItem: (id: string) => void;

  // Emergency Mode
  emergencyMode: EmergencyModeState;
  toggleEmergencyMode: (isActive: boolean, affectedZone?: string, emergencyType?: string) => void;

  // Local Services & Directory
  services: LocalService[];
  filteredServices: LocalService[];
  addService: (service: Omit<LocalService, 'id' | 'createdAt' | 'avalesCount' | 'avalesUserIds' | 'isVerified'>) => void;
  toggleAval: (serviceId: string) => { success: boolean; message: string };
  reportAval: (serviceId: string, reason: string) => void;

  // Cadena de Favores
  favors: CommunityFavor[];
  filteredFavors: CommunityFavor[];
  addFavor: (favor: Omit<CommunityFavor, 'id' | 'createdAt' | 'status' | 'distanceMeters' | 'favorsCompletedByAuthor'>) => void;
  updateFavorStatus: (favorId: string, status: FavorStatus) => void;
  removeFavor: (favorId: string) => void;

  // Emergency Reports & Sensitive Data
  emergencyReports: EmergencyReport[];
  filteredEmergencyReports: EmergencyReport[];
  addEmergencyReport: (report: Omit<EmergencyReport, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateEmergencyReportStatus: (reportId: string, status: EmergencyStatus, assignedBrigade?: string) => void;

  // Critical Resources
  criticalResources: CriticalResource[];
  filteredCriticalResources: CriticalResource[];
  addCriticalResource: (resource: Omit<CriticalResource, 'id' | 'updatedAt'>) => void;

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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Hoy 08:30 AM');
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [emergencyMode, setEmergencyMode] = useState<EmergencyModeState>(INITIAL_EMERGENCY_MODE);
  
  const [services, setServices] = useState<LocalService[]>(INITIAL_SERVICES);
  const [favors, setFavors] = useState<CommunityFavor[]>(INITIAL_FAVORS);
  const [emergencyReports, setEmergencyReports] = useState<EmergencyReport[]>(INITIAL_EMERGENCY_REPORTS);
  const [criticalResources, setCriticalResources] = useState<CriticalResource[]>(INITIAL_CRITICAL_RESOURCES);
  const [contentReports, setContentReports] = useState<ContentReport[]>([]);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Load persisted offline state on startup
  useEffect(() => {
    (async () => {
      const savedUser = await OfflineStorage.getUserProfile();
      setUser(savedUser);

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
  };

  const setCoverageScope = (coverageScope: CoverageScope) => {
    updateProfile({ coverageScope });
  };

  // Toggle Simulated Connectivity
  const toggleConnectivity = () => {
    setIsOnline(prev => {
      const next = !prev;
      // If switching back online and there are items in queue, attempt auto-sync
      if (next && syncQueue.length > 0) {
        setTimeout(() => {
          synchronizeQueue();
        }, 500);
      }
      return next;
    });
  };

  // Synchronize Offline Queue (RF-24: Prevents Duplicates)
  const synchronizeQueue = async (): Promise<{ success: boolean; count: number }> => {
    if (syncQueue.length === 0) return { success: true, count: 0 };

    const count = syncQueue.length;
    
    // Mark pending favors and reports as synced in local memory
    setFavors(prev => prev.map(f => ({ ...f, isOfflinePending: false })));
    setEmergencyReports(prev => prev.map(r => ({ ...r, isOfflinePending: false })));

    // Clear the queue
    setSyncQueue([]);
    await OfflineStorage.saveSyncQueue([]);

    const now = new Date();
    const formatted = `Hoy ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setLastSyncTime(formatted);
    await OfflineStorage.setLastSyncTime(formatted);

    return { success: true, count };
  };

  const removeSyncQueueItem = (id: string) => {
    const updated = syncQueue.filter(item => item.id !== id);
    setSyncQueue(updated);
    OfflineStorage.saveSyncQueue(updated);
  };

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
  const addService = (data: Omit<LocalService, 'id' | 'createdAt' | 'avalesCount' | 'avalesUserIds' | 'isVerified'>) => {
    const newService: LocalService = {
      ...data,
      id: `srv-${Date.now()}`,
      createdAt: 'Hoy',
      avalesCount: 0,
      avalesUserIds: [],
      isVerified: true,
    };

    const updated = [newService, ...services];
    setServices(updated);
    OfflineStorage.saveServices(updated);

    if (!isOnline) {
      const queueItem: SyncQueueItem = {
        id: `sync-srv-${Date.now()}`,
        type: 'service_post',
        payload: newService,
        createdAt: 'Ahora',
        status: 'pending',
        title: `Publicación de servicio: ${newService.title}`,
      };
      const nextQueue = [queueItem, ...syncQueue];
      setSyncQueue(nextQueue);
      OfflineStorage.saveSyncQueue(nextQueue);
    }
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
        type: 'aval',
        payload: { serviceId, userId: user.id, action: alreadyAvaled ? 'remove' : 'add' },
        createdAt: 'Ahora',
        status: 'pending',
        title: `Aval vecinal para ${targetService.providerName}`,
      };
      const nextQueue = [queueItem, ...syncQueue];
      setSyncQueue(nextQueue);
      OfflineStorage.saveSyncQueue(nextQueue);
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

  // Cadena de Favores (RF-11 to RF-14)
  const addFavor = (favorData: Omit<CommunityFavor, 'id' | 'createdAt' | 'status' | 'distanceMeters' | 'favorsCompletedByAuthor'>) => {
    const newFavor: CommunityFavor = {
      ...favorData,
      id: `fav-${Date.now()}`,
      createdAt: 'Ahora',
      status: 'disponible',
      distanceMeters: Math.floor(Math.random() * 350) + 50,
      favorsCompletedByAuthor: 1,
      isOfflinePending: !isOnline,
    };

    const updatedFavors = [newFavor, ...favors];
    setFavors(updatedFavors);
    OfflineStorage.saveFavors(updatedFavors);

    if (!isOnline) {
      const queueItem: SyncQueueItem = {
        id: `sync-fav-${Date.now()}`,
        type: 'favor',
        payload: newFavor,
        createdAt: 'Ahora',
        status: 'pending',
        title: `Favor: ${newFavor.title}`,
      };
      const nextQueue = [queueItem, ...syncQueue];
      setSyncQueue(nextQueue);
      OfflineStorage.saveSyncQueue(nextQueue);
    }
  };

  const updateFavorStatus = (favorId: string, status: FavorStatus) => {
    const updated = favors.map(f => f.id === favorId ? { ...f, status } : f);
    setFavors(updated);
    OfflineStorage.saveFavors(updated);
  };

  const removeFavor = (favorId: string) => {
    const updated = favors.filter(f => f.id !== favorId);
    setFavors(updated);
    OfflineStorage.saveFavors(updated);
  };

  // Emergency Reports (RF-17, RF-18, RF-19)
  const addEmergencyReport = (reportData: Omit<EmergencyReport, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const codeNum = Math.floor(100 + Math.random() * 900);
    const newReport: EmergencyReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      code: `#AY-${codeNum}`,
      createdAt: 'Ahora',
      updatedAt: 'Ahora',
      status: 'pendiente',
      isOfflinePending: !isOnline,
    };

    const updatedReports = [newReport, ...emergencyReports];
    setEmergencyReports(updatedReports);
    OfflineStorage.saveEmergencyReports(updatedReports);

    if (!isOnline) {
      const queueItem: SyncQueueItem = {
        id: `sync-rep-${Date.now()}`,
        type: 'emergency_report',
        payload: newReport,
        createdAt: 'Ahora',
        status: 'pending',
        title: `Reporte de Emergencia ${newReport.code}: ${newReport.title}`,
      };
      const nextQueue = [queueItem, ...syncQueue];
      setSyncQueue(nextQueue);
      OfflineStorage.saveSyncQueue(nextQueue);
    }
  };

  const updateEmergencyReportStatus = (reportId: string, status: EmergencyStatus, assignedBrigade?: string) => {
    const updated = emergencyReports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status,
          assignedBrigade: assignedBrigade !== undefined ? assignedBrigade : r.assignedBrigade,
          updatedAt: 'Ahora',
        };
      }
      return r;
    });
    setEmergencyReports(updated);
    OfflineStorage.saveEmergencyReports(updated);
  };

  // Critical Resources (RF-20)
  const addCriticalResource = (data: Omit<CriticalResource, 'id' | 'updatedAt'>) => {
    const newResource: CriticalResource = {
      ...data,
      id: `res-${Date.now()}`,
      updatedAt: 'Hoy',
    };
    const updated = [newResource, ...criticalResources];
    setCriticalResources(updated);
    OfflineStorage.saveCriticalResources(updated);
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
    setEmergencyReports(INITIAL_EMERGENCY_REPORTS);
    setCriticalResources(INITIAL_CRITICAL_RESOURCES);
    setEmergencyMode(INITIAL_EMERGENCY_MODE);
    setSyncQueue([]);
    setLastSyncTime('Hoy 08:30 AM');
    setContentReports([]);
  };

  // Geographic filtering logic (RF-03)
  const isNeighborhoodMatch = (itemNeighborhood: string): boolean => {
    if (user.coverageScope === 3) return true; // Distrito completo
    if (user.coverageScope === 1) return itemNeighborhood === user.neighborhood; // Mi Barrio únicamente
    
    // Scope 2: Mi barrio + Colindantes
    if (itemNeighborhood === user.neighborhood) return true;
    const matchObj = INITIAL_NEIGHBORHOODS.find(n => n.name === itemNeighborhood);
    return !!matchObj?.isAdjacent;
  };

  const filteredServices = services.filter(s => !s.isHidden && isNeighborhoodMatch(s.neighborhood));
  const filteredFavors = favors.filter(f => !f.isHidden && isNeighborhoodMatch(f.neighborhood));
  const filteredEmergencyReports = emergencyReports.filter(r => isNeighborhoodMatch(r.neighborhood));
  const filteredCriticalResources = criticalResources.filter(r => isNeighborhoodMatch(r.neighborhood));

  return (
    <AppContext.Provider
      value={{
        user,
        updateProfile,
        setUserRole,
        setCoverageScope,
        isOnline,
        toggleConnectivity,
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
