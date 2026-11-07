import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserProfile, 
  LocalService, 
  CommunityFavor, 
  EmergencyReport, 
  CriticalResource, 
  SyncQueueItem, 
  EmergencyModeState,
  ContentReport 
} from '../types';
import { 
  INITIAL_USER, 
  INITIAL_SERVICES, 
  INITIAL_FAVORS, 
  INITIAL_EMERGENCY_REPORTS, 
  INITIAL_CRITICAL_RESOURCES,
  INITIAL_EMERGENCY_MODE 
} from './mockData';

const STORAGE_KEYS = {
  USER_PROFILE: '@ayllu_user_profile',
  SERVICES: '@ayllu_services',
  FAVORS: '@ayllu_favors',
  EMERGENCY_REPORTS: '@ayllu_emergency_reports',
  CRITICAL_RESOURCES: '@ayllu_critical_resources',
  EMERGENCY_MODE: '@ayllu_emergency_mode',
  SYNC_QUEUE: '@ayllu_sync_queue',
  CONTENT_REPORTS: '@ayllu_content_reports',
  LAST_SYNC_TIME: '@ayllu_last_sync_time',
};

export const OfflineStorage = {
  // User Profile
  async getUserProfile(): Promise<UserProfile> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : INITIAL_USER;
    } catch {
      return INITIAL_USER;
    }
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Error saving user profile offline:', e);
    }
  },

  // Services Directory
  async getServices(): Promise<LocalService[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SERVICES);
      return data ? JSON.parse(data) : INITIAL_SERVICES;
    } catch {
      return INITIAL_SERVICES;
    }
  },

  async saveServices(services: LocalService[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    } catch (e) {
      console.warn('Error saving services offline:', e);
    }
  },

  // Cadena de Favores
  async getFavors(): Promise<CommunityFavor[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORS);
      return data ? JSON.parse(data) : INITIAL_FAVORS;
    } catch {
      return INITIAL_FAVORS;
    }
  },

  async saveFavors(favors: CommunityFavor[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORS, JSON.stringify(favors));
    } catch (e) {
      console.warn('Error saving favors offline:', e);
    }
  },

  // Emergency Reports
  async getEmergencyReports(): Promise<EmergencyReport[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_REPORTS);
      return data ? JSON.parse(data) : INITIAL_EMERGENCY_REPORTS;
    } catch {
      return INITIAL_EMERGENCY_REPORTS;
    }
  },

  async saveEmergencyReports(reports: EmergencyReport[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.warn('Error saving emergency reports offline:', e);
    }
  },

  // Critical Resources
  async getCriticalResources(): Promise<CriticalResource[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CRITICAL_RESOURCES);
      return data ? JSON.parse(data) : INITIAL_CRITICAL_RESOURCES;
    } catch {
      return INITIAL_CRITICAL_RESOURCES;
    }
  },

  async saveCriticalResources(resources: CriticalResource[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CRITICAL_RESOURCES, JSON.stringify(resources));
    } catch (e) {
      console.warn('Error saving critical resources offline:', e);
    }
  },

  // Emergency Mode State
  async getEmergencyMode(): Promise<EmergencyModeState> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_MODE);
      return data ? JSON.parse(data) : INITIAL_EMERGENCY_MODE;
    } catch {
      return INITIAL_EMERGENCY_MODE;
    }
  },

  async saveEmergencyMode(modeState: EmergencyModeState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_MODE, JSON.stringify(modeState));
    } catch (e) {
      console.warn('Error saving emergency mode offline:', e);
    }
  },

  // Sync Queue (RF-23, RF-24, RF-25)
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.warn('Error saving sync queue offline:', e);
    }
  },

  // Content Moderation Reports (RF-21)
  async getContentReports(): Promise<ContentReport[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTENT_REPORTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveContentReports(reports: ContentReport[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONTENT_REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.warn('Error saving content reports offline:', e);
    }
  },

  // Last Sync Timestamp
  async getLastSyncTime(): Promise<string> {
    try {
      const time = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
      return time || 'Hoy 08:30 AM';
    } catch {
      return 'Hoy 08:30 AM';
    }
  },

  async setLastSyncTime(time: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, time);
    } catch (e) {
      console.warn('Error saving sync time offline:', e);
    }
  },

  // Reset demo data helper
  async resetAllToDemo(): Promise<void> {
    try {
      await AsyncStorage.clear();
      await this.saveUserProfile(INITIAL_USER);
      await this.saveServices(INITIAL_SERVICES);
      await this.saveFavors(INITIAL_FAVORS);
      await this.saveEmergencyReports(INITIAL_EMERGENCY_REPORTS);
      await this.saveCriticalResources(INITIAL_CRITICAL_RESOURCES);
      await this.saveEmergencyMode(INITIAL_EMERGENCY_MODE);
      await this.saveSyncQueue([]);
      await this.setLastSyncTime('Hoy 08:30 AM');
    } catch (e) {
      console.warn('Error resetting demo data:', e);
    }
  }
};
