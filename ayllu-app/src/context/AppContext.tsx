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
import { fetchShared, rpc } from '../services/shared';
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
  toggleEmergencyMode: (isActive: boolean, affectedZone?: string, emergencyType?: string) => Promise<void>;

  // Local Services & Directory
  services: LocalService[];
  filteredServices: LocalService[];
  addService: (service: Omit<LocalService, 'id' | 'createdAt' | 'avalesCount' | 'avalesUserIds' | 'isVerified' | 'isOfflinePending'>) => Promise<void>;
  toggleAval: (serviceId: string) => Promise<{ success: boolean; message: string }>;
  saveService: (service: LocalService, action?: 'save' | 'delete') => Promise<void>;
  sharedError: string;
  canCoordinate: boolean;
  readPrivateReport: (id: string) => Promise<Record<string, string>>;
  reportAval: (serviceId: string, reason: string) => void;

  // Cadena de Favores
  favors: CommunityFavor[];
  filteredFavors: CommunityFavor[];
  addFavor: (favor: Omit<CommunityFavor, 'id' | 'createdAt' | 'status' | 'distanceMeters' | 'favorsCompletedByAuthor' | 'isOfflinePending'>) => Promise<void>;
  updateFavorStatus: (favorId: string, status: FavorStatus) => Promise<void>;
  removeFavor: (favorId: string) => Promise<void>;
  refreshFavors: () => Promise<void>;
  loadMoreFavors: () => Promise<void>;
  hasMoreFavors: boolean;
  favorsError: string;
  editFavor: (id: string, title: string, description: string) => Promise<void>;

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
  addContentReport: (report: Omit<ContentReport, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  hideContentItem: (itemId: string, itemType: string, hidden?: boolean, reason?: string) => Promise<void>;

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
  
  const [services, setServices] = useState<LocalService[]>(supabase ? [] : INITIAL_SERVICES);
  const [favors, setFavors] = useState<CommunityFavor[]>(supabase ? [] : INITIAL_FAVORS);
  const [emergencyReports, setEmergencyReports] = useState<EmergencyReport[]>(supabase ? [] : INITIAL_EMERGENCY_REPORTS.map(redactEmergencyReport));
  const [criticalResources, setCriticalResources] = useState<CriticalResource[]>(supabase ? [] : INITIAL_CRITICAL_RESOURCES);
  const [contentReports, setContentReports] = useState<ContentReport[]>([]);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  const [favorLimit, setFavorLimit] = useState(50);
  const [hasMoreFavors, setHasMoreFavors] = useState(true);
  const [favorsError, setFavorsError] = useState('');
  const [sharedError, setSharedError] = useState('');
  const [canCoordinate, setCanCoordinate] = useState(false);

  // Load persisted offline state on startup
  useEffect(() => {
    (async () => {
      try {
        const savedUser = await OfflineStorage.getUserProfile();
        setUser({ ...savedUser, ...getLocation(resolveProfileUbigeo(savedUser) ?? '') });

        const savedServices = await OfflineStorage.getServices();
        setServices(supabase ? [] : savedServices);

        const savedFavors = await OfflineStorage.getFavors();
        setFavors(supabase ? savedFavors.filter(f=>f.isOfflinePending) : savedFavors);

        const savedReports = await OfflineStorage.getEmergencyReports();
        setEmergencyReports(supabase ? [] : savedReports);

        const savedResources = await OfflineStorage.getCriticalResources();
        setCriticalResources(supabase ? [] : savedResources);

        const savedMode = await OfflineStorage.getEmergencyMode();
        setEmergencyMode(supabase ? {...INITIAL_EMERGENCY_MODE,isActive:false} : savedMode);

        const savedQueue = await OfflineStorage.getSyncQueue();
        setSyncQueue(savedQueue);

        const savedSyncTime = await OfflineStorage.getLastSyncTime();
        setLastSyncTime(savedSyncTime);

        const savedContentReports = await OfflineStorage.getContentReports();
        setContentReports(supabase ? [] : savedContentReports);
      } catch (error) {
        console.warn('Could not restore local app state:', error);
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  // Update User Profile
  const updateProfile = (updates: Partial<UserProfile>) => {
    if (supabase && ((updates.id && updates.id !== user.id) || (updates.neighborhoodId && updates.neighborhoodId !== user.neighborhoodId))) {
      setFavorRevision(current => current + 1);
      setFavorLimit(50); setHasMoreFavors(true); setCanCoordinate(false);
      setServices([]); setFavors([]); setEmergencyReports([]); setCriticalResources([]); setContentReports([]);
      setEmergencyMode({...INITIAL_EMERGENCY_MODE,isActive:false});
    }
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

  const [favorRevision, setFavorRevision] = useState(0);
  const feedOwner = useRef(user.id);
  useEffect(() => { feedOwner.current = user.id; setFavorRevision(current => current + 1); }, [user.id, user.neighborhoodId]);

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
        const payload = item.payload as Record<string, unknown>;
        const favorId = item.type === 'favor' ? `favor:${payload.id}` : item.type === 'service_post' || item.type === 'aval' ? `service:${payload.id ?? payload.serviceId}` : item.id;
        if (item.ownerUserId !== user.id || feedOwner.current !== user.id) continue;
        if (!retryFailed && (item.retryable === false || (item.nextAttemptAt && Date.parse(item.nextAttemptAt) > Date.now()))) { if (favorId) blockedFavors.add(favorId); continue; }
        if (blockedFavors.has(favorId)) { failedCount += 1; continue; }
        try {
          setFavorRevision(current => current + 1);
          await submitQueuedItem(item);
          setFavorRevision(current => current + 1);
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
            errorMessage: error && typeof error === 'object' && 'message' in error ? String(error.message) : 'No se pudo sincronizar.',
            attempts: (item.attempts ?? 0) + 1,
            retryable: !(error && typeof error === 'object' && 'code' in error && /^(22|23|28|42|P0001)/.test(String(error.code))),
            nextAttemptAt: new Date(Date.now() + Math.min(300000, 2000 * 2 ** Math.min(item.attempts ?? 0, 8))).toISOString(),
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
  }, [isOnline, syncQueue.length, user.id]);

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
      void synchronizeQueue(false);
    }
  }, [isOnline, syncQueue.length, synchronizeQueue]);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setTimeout(() => { void synchronizeQueue(false); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [synchronizeQueue]);

  useEffect(() => {
    if (!isOnline || !syncQueue.length) return;
    const timer = setInterval(() => { void synchronizeQueue(false); }, 5000);
    return () => clearInterval(timer);
  }, [isOnline, syncQueue.length, synchronizeQueue]);

  const toggleEmergencyMode = async (active: boolean, _zone?: string, type = 'Ninguna') => {
    if (!isOnline || !user.neighborhoodId) throw new Error('Conéctate y completa tu barrio.');
    await rpc('set_emergency_mode', {p_neighborhood_id:user.neighborhoodId,p_active:active,p_type:type});
    setEmergencyMode({isActive:active,affectedNeighborhood:user.neighborhood,emergencyType:type,activatedAt:new Date().toISOString(),activatedBy:user.id});
  };

  const saveService = async (service: LocalService, action: 'save' | 'delete' = 'save') => {
    if (!supabase || !user.neighborhoodId) throw new Error('Inicia sesión y completa tu barrio.');
    if (service.authorId !== user.id) throw new Error('Solo el autor puede modificar el servicio.');
    await enqueueSyncItem({id:createUuid(),ownerUserId:user.id,type:'service_post',payload:{...service,action},status:'pending',title:`Servicio: ${service.title}`,createdAt:new Date().toISOString()});
    const updated=action==='delete' ? services.filter(s=>s.id!==service.id) : [{...service,isOfflinePending:true},...services.filter(s=>s.id!==service.id)];
    await OfflineStorage.saveServices(updated); setServices(updated);
  };
  const addService = async (data: Omit<LocalService, 'id' | 'createdAt' | 'avalesCount' | 'avalesUserIds' | 'isVerified' | 'isOfflinePending'>) => {
    await saveService({...data,authorId:user.id,districtUbigeo:resolveProfileUbigeo(user),id:createUuid(),createdAt:new Date().toISOString(),avalesCount:0,avalesUserIds:[],isVerified:false,isOfflinePending:true});
  };
  const toggleAval = async (serviceId: string) => {
    const target=services.find(s=>s.id===serviceId);
    if (!target) throw new Error('Servicio no encontrado.');
    if (target.neighborhood!==user.neighborhood || target.districtUbigeo!==resolveProfileUbigeo(user)) throw new Error('Solo puedes avalar servicios de tu barrio.');
    if (target.authorId===user.id) throw new Error('No puedes avalar tu propio servicio.');
    const removing=target.avalesUserIds.includes(user.id);
    await enqueueSyncItem({id:createUuid(),ownerUserId:user.id,type:'aval',payload:{serviceId,action:removing?'remove':'add'},status:'pending',createdAt:new Date().toISOString(),title:`Aval: ${target.title}`});
    const updated=services.map(s=>s.id===serviceId ? {...s,avalesUserIds:removing?s.avalesUserIds.filter(id=>id!==user.id):[...s.avalesUserIds,user.id],avalesCount:Math.max(0,s.avalesCount+(removing?-1:1))}:s);
    await OfflineStorage.saveServices(updated); setServices(updated);
    return {success:true,message:'Cambio guardado; pendiente de confirmación del servidor.'};
  };

  const reportAval = (serviceId: string, reason: string) => {
    const srv = services.find(s => s.id === serviceId);
    void addContentReport({
      itemId: serviceId,
      itemType: 'service',
      reportedItemTitle: srv ? `${srv.title} (${srv.providerName})` : 'Servicio',
      reportedBy: user.nickname,
      reason: 'Reporte de aval o servicio',
      details: reason,
    }).catch(() => setSharedError('No se pudo registrar la denuncia.'));
  };


  useEffect(() => {
    if (!supabase || !isOnline || !isHydrated || !user.neighborhoodId) return;
    let active=true;
    const refresh=async () => {
      if (syncInProgress.current) return;
      const revision=favorRevision;
      try {
        const data=await fetchShared(resolveProfileUbigeo(user) ?? '',user.neighborhoodId!);
        const queue=await OfflineStorage.getSyncQueue();
        if (!active || syncInProgress.current || revision!==favorRevision) return;
        const ownQueue=queue.filter(q=>q.ownerUserId===user.id);
        const pendingServices=ownQueue.filter(q=>q.type==='service_post');
        const byId=new Map(data.services.map(s=>[s.id,s]));
        for (const q of [...pendingServices].reverse()) {
          const p=q.payload as LocalService & {action?:string};
          if (p.action==='delete') byId.delete(p.id); else byId.set(p.id,{...p,isOfflinePending:true});
        }
        for (const q of [...ownQueue].reverse().filter(q=>q.type==='aval')) {
          const p=q.payload as {serviceId:string;action:string}; const service=byId.get(p.serviceId);
          if (service) { service.avalesUserIds=service.avalesUserIds.filter(id=>id!==user.id); if(p.action==='add') service.avalesUserIds.push(user.id); service.avalesCount=service.avalesUserIds.length; }
        }
        setServices([...byId.values()]); setCriticalResources(data.resources); setContentReports(data.moderation); setEmergencyMode(data.mode); setCanCoordinate(data.canCoordinate);
        setEmergencyReports(current=>[...current.filter(r=>ownQueue.some(q=>q.type==='emergency_report' && q.payload.reportId===r.id)),...data.reports]);
        setSharedError('');
      } catch(error) { if(active) setSharedError(error && typeof error==='object' && 'message' in error ? String(error.message) : 'No se pudo actualizar la comunidad.'); }
    };
    void refresh(); const timer=setInterval(()=>{void refresh();},15000);
    return ()=>{active=false;clearInterval(timer);};
  }, [user.id,user.neighborhoodId,isHydrated,isOnline,lastSyncTime,user,favorRevision]);

  const readPrivateReport = async (id: string): Promise<Record<string,string>> => rpc('read_emergency_private',{p_report_id:id});

  // Shared feed. Pending local changes take precedence over server snapshots.
  const refreshFavors = useCallback(async () => {
    if (!supabase || !isOnline || !isHydrated) return;
    const owner = user.id;
    const revision = favorRevision;
    if (syncInProgress.current) return;
    const district = resolveProfileUbigeo(user);
    if (!district) return;
    try {
      const remote = await fetchFavors(district, favorLimit);
      const queue = await OfflineStorage.getSyncQueue();
      if (owner !== feedOwner.current || revision !== favorRevision || syncInProgress.current) return;
      setFavors(current => {
        const updated = mergeFavorFeed(current, remote, queue, owner);
        void OfflineStorage.saveFavors(updated).catch(console.warn);
        return updated;
      });
      setHasMoreFavors(remote.length === favorLimit);
      setFavorsError('');
    } catch (error) {
      setFavorsError(error instanceof Error ? error.message : 'No se pudo actualizar el muro.');
    }
  }, [isOnline, isHydrated, user, favorLimit, favorRevision]);

  useEffect(() => {
    let active = true;
    const refresh = () => { if (active) void refreshFavors(); };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [refreshFavors, lastSyncTime, favorRevision]);

  const loadMoreFavors = async () => { setFavorLimit(current=>current+50); };

  const persistFavorChange = async (favor: CommunityFavor, action: 'save' | 'delete' = 'save') => {
    setFavorRevision(current => current + 1);
    if (favor.authorId !== user.id) throw new Error('Solo el autor puede cambiar este favor.');
    const nextVersion = (favor.version ?? 0) + 1;
    const updated = action === 'delete'
      ? favors.filter(f => f.id !== favor.id)
      : [{...favor,version:nextVersion}, ...favors.filter(f => f.id !== favor.id)];
    if (supabase) {
      const item: SyncQueueItem = {
        id: createUuid(), ownerUserId: user.id, type: 'favor',
        payload: { ...favor, version: favor.version ?? 0, action }, createdAt: new Date().toISOString(),
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

  const editFavor = async (id: string, title: string, description: string) => {
    const favor=favors.find(f=>f.id===id);
    if (!favor) throw new Error('Favor no encontrado.');
    if (!title.trim() || title.trim().length>160 || !description.trim() || description.trim().length>500) throw new Error('Revisa título y descripción.');
    await persistFavorChange({...favor,title:title.trim(),description:description.trim(),isOfflinePending:true});
  };

  const removeFavor = async (favorId: string) => {
    const favor = favors.find(f => f.id === favorId);
    if (!favor) return;
    if (favor.id.startsWith('fav-')) {
      // Legacy local drafts were never uploaded.
      setFavorRevision(current => current + 1);
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
    if (!isOnline) throw new Error('Conéctate para actualizar el reporte.');
    await rpc('update_emergency_status',{p_report_id:reportId,p_status:status,p_brigade:assignedBrigade ?? null});
    setEmergencyReports(current=>current.map(r=>r.id===reportId?{...r,status,assignedBrigade:assignedBrigade??r.assignedBrigade,updatedAt:new Date().toISOString()}:r));
  };

  const addCriticalResource = async (data: Omit<CriticalResource, 'id' | 'updatedAt'>) => {
    if (!isOnline) throw new Error('Conéctate para publicar recursos.');
    const match=data.quantity.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (!match || Number(match[1].replace(',','.'))<=0) throw new Error('Ingresa cantidad positiva y unidad.');
    const id=createUuid();
    await rpc('save_critical_resource',{p_id:id,p_content:data,p_quantity:Number(match[1].replace(',','.')),p_unit:match[2] || 'unidades',p_version:0});
    setCriticalResources(current=>[{...data,id,version:1,updatedAt:new Date().toISOString()},...current]);
  };

  const addContentReport = async (data: Omit<ContentReport, 'id' | 'createdAt' | 'status'>) => {
    if (!isOnline) throw new Error('Conéctate para registrar una denuncia.');
    const id=createUuid();
    await rpc('report_content',{p_id:id,p_item_id:data.itemId,p_item_type:data.itemType,p_reason:data.reason,p_details:data.details});
    setContentReports(current=>[{...data,id,status:'pending',createdAt:new Date().toISOString()},...current]);
  };

  const hideContentItem = async (itemId: string, itemType: string, hidden=true, reason='Revisión de denuncia vecinal') => {
    if (!isOnline) throw new Error('Conéctate para moderar.');
    await rpc('moderate_content',{p_item_id:itemId,p_item_type:itemType,p_hidden:hidden,p_reason:reason});
    setFavors(current=>current.map(f=>f.id===itemId?{...f,isHidden:hidden}:f));
    setServices(current=>current.map(s=>s.id===itemId?{...s,isHidden:hidden}:s));
    setContentReports(current=>current.map(r=>r.itemId===itemId?{...r,status:hidden?'hidden':'reviewed'}:r));
  };

  // Reset Demo Data
  const resetDemoData = async () => {
    if (supabase) throw new Error('El reinicio de demostración está deshabilitado con el servidor conectado.');
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
  const filteredServices = services.filter(s => !s.isHidden && (!s.isOfflinePending || s.authorId===user.id) && isNeighborhoodMatch(s));
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
        sharedError,
        canCoordinate,
        readPrivateReport,
        saveService,
        editFavor,
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
        loadMoreFavors,
        hasMoreFavors,
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
