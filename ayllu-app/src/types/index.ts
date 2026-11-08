// Ayllu - Types Definition

export type UserRole = 'vecino' | 'proveedor' | 'coordinador' | 'admin';

export type CoverageScope = 1 | 2 | 3; // 1: Mi Barrio, 2: Colindantes, 3: Distrito

export interface Neighborhood {
  id: string;
  name: string;
  district: string;
  region: string;
  isAdjacent?: boolean; // Whether adjacent to San Blas
}

export interface SavedPlace {
  id: string; label: string; addressLine: string; region: string; province: string; district: string; districtUbigeo: string; neighborhood: string; neighborhoodId?: string; coords?: { latitude: number; longitude: number };
}

export interface UserProfile {
  id: string;
  nickname: string;
  phone: string;
  region: string;
  district: string;
  province?: string;
  neighborhoodId?: string;
  neighborhood: string;
  districtUbigeo?: string;
  gpsEnabled: boolean;
  coords?: {
    latitude: number;
    longitude: number;
  };
  role: UserRole;
  coverageScope: CoverageScope;
  savedPlaces?: SavedPlace[];
  activePlaceId?: string;
  activePlaceLabel?: string;
  activePlaceAddress?: string;
  avatarUrl: string;
  isRegistered: boolean;
}

export type ServiceCategory = 
  | 'carpinteria' 
  | 'cuidados' 
  | 'gasfiteria' 
  | 'electricidad' 
  | 'cerrajeria' 
  | 'educacion' 
  | 'otros';

export interface LocalService {
  authorId?: string;
  sharePhone?: boolean;
  id: string;
  title: string;
  category: ServiceCategory;
  categoryLabel: string;
  providerName: string;
  providerPhone: string;
  neighborhood: string;
  districtUbigeo?: string;
  addressApprox: string;
  description: string;
  avalesCount: number;
  avalesUserIds: string[]; // List of user IDs who gave 'Visto Bueno'
  isVerified: boolean;
  avatarUrl: string;
  createdAt: string;
  isHidden?: boolean;
  isOfflinePending?: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  statusBadge: string; // '24/7' | 'Oficial' | 'Voluntario'
  validatedBy: string;
  updatedAt: string;
  protocol?: string;
  iconName: string;
  isOfficial?: boolean;
}

export type FavorCategory = 
  | 'herramientas' 
  | 'acompanamiento' 
  | 'cuidado' 
  | 'donacion' 
  | 'movilidad' 
  | 'habilidades';

export type FavorMode = 'ofrezco' | 'solicito';

export type FavorStatus = 'disponible' | 'resuelta' | 'cerrada';

export type ContactChannel = 'ayllu' | 'whatsapp';

export interface CommunityFavor {
  version?: number;
  sharePhone?: boolean;
  id: string;
  title: string;
  description: string;
  category: FavorCategory;
  categoryLabel: string;
  mode: FavorMode; // ofrezco vs solicito
  status: FavorStatus;
  authorId: string;
  authorName: string;
  authorPhone: string;
  neighborhood: string;
  districtUbigeo?: string;
  distanceMeters: number;
  durationInfo: string;
  contactChannel: ContactChannel;
  isUrgent: boolean;
  authorAvatar: string;
  favorsCompletedByAuthor?: number;
  createdAt: string;
  isHidden?: boolean;
  isOfflinePending?: boolean;
}

export type EmergencyCategory = 
  | 'salud' 
  | 'adulto_mayor' 
  | 'alimentos_agua' 
  | 'infraestructura' 
  | 'rescate';

export type EmergencyPriority = 'media' | 'alta' | 'urgente';

export type EmergencyStatus = 'pendiente' | 'atencion' | 'resuelto' | 'cerrado';

export interface EmergencyReport {
  isHidden?: boolean;
  id: string;
  code: string; // e.g. #AY-801
  category: EmergencyCategory;
  categoryLabel: string;
  title: string;
  description: string;
  neighborhood: string;
  districtUbigeo?: string;
  // Sensitive Data (Protected by RF-18 / RNF-12)
  exactAddress: string;
  beneficiaryName: string;
  beneficiaryAge?: number;
  contactPhone: string;
  priority: EmergencyPriority;
  status: EmergencyStatus;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  assignedBrigade?: string;
  isOfflinePending?: boolean;
}

export type CriticalResourceType = 
  | 'agua' 
  | 'alimentos' 
  | 'botiquin' 
  | 'generador' 
  | 'refugio' 
  | 'herramientas';

export interface CriticalResource {
  version?: number;
  id: string;
  name: string;
  type: CriticalResourceType;
  typeLabel: string;
  mode: 'disponible' | 'solicitado';
  quantity: string;
  neighborhood: string;
  districtUbigeo?: string;
  locationDetails: string;
  contactName: string;
  contactPhone: string;
  validatedBy: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  ownerUserId?: string;
  type: 'favor' | 'emergency_report' | 'service_post' | 'aval';
  payload: any;
  createdAt: string;
  status: 'pending' | 'synced' | 'error';
  errorMessage?: string;
  attempts?: number;
  nextAttemptAt?: string;
  retryable?: boolean;
  title: string;
}

export interface ContentReport {
  id: string;
  itemId: string;
  itemType: 'favor' | 'service' | 'emergency_report';
  reportedItemTitle: string;
  reportedBy: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'hidden';
  createdAt: string;
}

export interface EmergencyModeState {
  isActive: boolean;
  affectedNeighborhood: string;
  emergencyType: string;
  activatedAt: string;
  activatedBy: string;
}

export interface EmergencyAuditEvent {
  id: number;
  reportId: string | null;
  actorId: string;
  eventType: string;
  details: Record<string, string | null>;
  createdAt: string;
}
