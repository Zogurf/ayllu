import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SQLite from './sqliteDriver';
import { PrivateEmergencyReportData, PrivateReportStorage } from './privateReportStorage';
import {
  UserProfile,
  LocalService,
  CommunityFavor,
  EmergencyReport,
  CriticalResource,
  SyncQueueItem,
  EmergencyModeState,
  ContentReport,
} from '../types';
import {
  INITIAL_USER,
  INITIAL_SERVICES,
  INITIAL_FAVORS,
  INITIAL_EMERGENCY_REPORTS,
  INITIAL_CRITICAL_RESOURCES,
  INITIAL_EMERGENCY_MODE,
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

const TABLES = {
  services: 'local_services',
  favors: 'community_favors',
  reports: 'emergency_reports',
  resources: 'critical_resources',
  contentReports: 'content_reports',
} as const;

const createUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
  const random = Math.floor(Math.random() * 16);
  return (token === 'x' ? random : (random & 0x3) | 0x8).toString(16);
});

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let queueMutation: Promise<unknown> = Promise.resolve();

const withQueueLock = <T,>(operation: () => Promise<T>): Promise<T> => {
  const result = queueMutation.then(operation, operation);
  queueMutation = result.then(() => undefined, () => undefined);
  return result;
};

export const redactEmergencyReport = (report: EmergencyReport): EmergencyReport => ({
  ...report,
  title: `Reporte ${report.code}`,
  description: '',
  reportedBy: '',
  beneficiaryName: '',
  beneficiaryAge: undefined,
  exactAddress: '',
  contactPhone: '',
});

const migrateLegacyPrivateReports = async (reports: EmergencyReport[]): Promise<EmergencyReport[]> => {
  for (const report of reports) {
    if (!report.beneficiaryName && !report.exactAddress && !report.contactPhone) continue;
    try {
      if (!(await PrivateReportStorage.get(report.id))) {
        await PrivateReportStorage.save(report.id, {
          category: report.category,
          title: report.title,
          description: report.description,
          neighborhood: report.neighborhood,
          priority: report.priority,
          reportedBy: report.reportedBy,
          beneficiaryName: report.beneficiaryName,
          beneficiaryAge: report.beneficiaryAge,
          exactAddress: report.exactAddress,
          contactPhone: report.contactPhone,
          consentAt: '',
        });
      }
    } catch {
      // Legacy data is still redacted before it is written to the new store.
    }
  }
  return reports.map(redactEmergencyReport);
};

const migrateLegacyQueue = async (items: SyncQueueItem[]): Promise<SyncQueueItem[]> => {
  for (const item of items) {
    if (item.type !== 'emergency_report' || !item.payload || typeof item.payload !== 'object') continue;
    const legacy = item.payload as Record<string, unknown>;
    if (legacy.privateDataRef) continue;

    const reportId = typeof legacy.id === 'string' && /^[0-9a-f-]{36}$/i.test(legacy.id) ? legacy.id : createUuid();
    const privateDataRef = String(legacy.id ?? reportId);
    try {
      await PrivateReportStorage.save(privateDataRef, {
        category: String(legacy.category ?? 'rescate'),
        title: String(legacy.title ?? 'Reporte de emergencia'),
        description: String(legacy.description ?? ''),
        neighborhood: String(legacy.neighborhood ?? ''),
        priority: String(legacy.priority ?? 'media'),
        reportedBy: String(legacy.reportedBy ?? ''),
        beneficiaryName: String(legacy.beneficiaryName ?? ''),
        beneficiaryAge: legacy.beneficiaryAge == null ? undefined : Number(legacy.beneficiaryAge),
        exactAddress: String(legacy.exactAddress ?? ''),
        contactPhone: String(legacy.contactPhone ?? ''),
        consentAt: '',
      });
    } catch {
      // Remove the legacy plaintext payload below and retain a recoverable queue error.
    }

    item.id = /^[0-9a-f-]{36}$/i.test(item.id) ? item.id : createUuid();
    item.payload = { reportId, localReportId: legacy.id ?? reportId, privateDataRef };
    item.title = 'Reporte de emergencia';
    item.status = 'error';
    item.errorMessage = 'Reporte heredado: confirma nuevamente el consentimiento antes de enviarlo.';
  }
  return items;
};

const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (Platform.OS === 'web') throw new Error('SQLite nativo no está habilitado en Web.');
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync('ayllu-local.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS user_profile (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS emergency_mode (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS local_services (
          id TEXT PRIMARY KEY NOT NULL, neighborhood TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL, payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS community_favors (
          id TEXT PRIMARY KEY NOT NULL, neighborhood TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL, payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS emergency_reports (
          id TEXT PRIMARY KEY NOT NULL, neighborhood TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '',
          priority TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL, payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS critical_resources (
          id TEXT PRIMARY KEY NOT NULL, neighborhood TEXT NOT NULL DEFAULT '', mode TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL, payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS content_reports (
          id TEXT PRIMARY KEY NOT NULL, item_type TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL, payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sync_outbox (
          id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL,
          position INTEGER NOT NULL, payload TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS services_neighborhood_idx ON local_services(neighborhood);
        CREATE INDEX IF NOT EXISTS favors_neighborhood_status_idx ON community_favors(neighborhood, status);
        CREATE INDEX IF NOT EXISTS emergency_neighborhood_status_idx ON emergency_reports(neighborhood, status);
        CREATE INDEX IF NOT EXISTS resources_neighborhood_idx ON critical_resources(neighborhood);
        CREATE INDEX IF NOT EXISTS outbox_status_created_idx ON sync_outbox(status, created_at);
      `);
      await migrateAsyncStorageToSQLite(db);
      return db;
    })().catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
};

const writeList = async (db: SQLite.SQLiteDatabase, table: string, items: Record<string, unknown>[]): Promise<void> => {
  await db.withExclusiveTransactionAsync(async txn => {
    await txn.runAsync(`DELETE FROM ${table}`);
    for (const [position, item] of items.entries()) {
      const id = String(item.id ?? `item-${position}`);
      const payload = JSON.stringify(item);
      if (table === 'local_services') {
        await txn.runAsync('INSERT INTO local_services(id, neighborhood, status, created_at, position, payload) VALUES (?, ?, ?, ?, ?, ?)', id, String(item.neighborhood ?? ''), item.isHidden ? 'hidden' : 'active', String(item.createdAt ?? ''), position, payload);
      } else if (table === 'community_favors') {
        await txn.runAsync('INSERT INTO community_favors(id, neighborhood, status, created_at, position, payload) VALUES (?, ?, ?, ?, ?, ?)', id, String(item.neighborhood ?? ''), String(item.status ?? ''), String(item.createdAt ?? ''), position, payload);
      } else if (table === 'emergency_reports') {
        const safeItem = redactEmergencyReport(item as unknown as EmergencyReport);
        await txn.runAsync('INSERT INTO emergency_reports(id, neighborhood, status, priority, created_at, position, payload) VALUES (?, ?, ?, ?, ?, ?, ?)', id, String(item.neighborhood ?? ''), String(item.status ?? ''), String(item.priority ?? ''), String(item.createdAt ?? ''), position, JSON.stringify(safeItem));
      } else if (table === 'critical_resources') {
        await txn.runAsync('INSERT INTO critical_resources(id, neighborhood, mode, updated_at, position, payload) VALUES (?, ?, ?, ?, ?, ?)', id, String(item.neighborhood ?? ''), String(item.mode ?? ''), String(item.updatedAt ?? ''), position, payload);
      } else {
        await txn.runAsync('INSERT INTO content_reports(id, item_type, status, created_at, position, payload) VALUES (?, ?, ?, ?, ?, ?)', id, String(item.itemType ?? ''), String(item.status ?? ''), String(item.createdAt ?? ''), position, payload);
      }
    }
  });
  await db.runAsync('INSERT OR REPLACE INTO app_state(key, value) VALUES (?, ?)', `initialized:${table}`, '1');
};

const readList = async <T,>(db: SQLite.SQLiteDatabase, table: string): Promise<T[]> => {
  const rows = await db.getAllAsync<{ payload: string }>(`SELECT payload FROM ${table} ORDER BY position ASC`);
  return rows.map(row => JSON.parse(row.payload) as T);
};

const migrateAsyncStorageToSQLite = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  const marker = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', 'asyncstorage_migrated_v1');
  if (marker) return;

  const getLegacy = async <T,>(key: string): Promise<T | null> => {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  };

  const legacyServices = await getLegacy<LocalService[]>(STORAGE_KEYS.SERVICES);
  const legacyFavors = await getLegacy<CommunityFavor[]>(STORAGE_KEYS.FAVORS);
  const legacyReports = await getLegacy<EmergencyReport[]>(STORAGE_KEYS.EMERGENCY_REPORTS);
  const legacyResources = await getLegacy<CriticalResource[]>(STORAGE_KEYS.CRITICAL_RESOURCES);
  const legacyQueue = await getLegacy<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE);
  const legacyContentReports = await getLegacy<ContentReport[]>(STORAGE_KEYS.CONTENT_REPORTS);
  const legacyUser = await getLegacy<UserProfile>(STORAGE_KEYS.USER_PROFILE);
  const legacyEmergencyMode = await getLegacy<EmergencyModeState>(STORAGE_KEYS.EMERGENCY_MODE);
  const legacyLastSyncTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);

  if (legacyServices) await writeList(db, TABLES.services, legacyServices as unknown as Record<string, unknown>[]);
  if (legacyFavors) await writeList(db, TABLES.favors, legacyFavors as unknown as Record<string, unknown>[]);
  if (legacyReports) {
    const safeReports = await migrateLegacyPrivateReports(legacyReports);
    await writeList(db, TABLES.reports, safeReports as unknown as Record<string, unknown>[]);
  }
  if (legacyResources) await writeList(db, TABLES.resources, legacyResources as unknown as Record<string, unknown>[]);
  if (legacyQueue) {
    const safeQueue = await migrateLegacyQueue(legacyQueue);
    await saveQueueToDb(db, safeQueue);
  }
  if (legacyContentReports) await writeList(db, TABLES.contentReports, legacyContentReports as unknown as Record<string, unknown>[]);
  if (legacyUser) await db.runAsync('INSERT OR REPLACE INTO user_profile(id, payload) VALUES (?, ?)', 'current', JSON.stringify(legacyUser));
  if (legacyEmergencyMode) await db.runAsync('INSERT OR REPLACE INTO emergency_mode(id, payload) VALUES (?, ?)', 'current', JSON.stringify(legacyEmergencyMode));
  if (legacyLastSyncTime && legacyLastSyncTime !== 'Hoy 08:30 AM') {
    await db.runAsync('INSERT OR REPLACE INTO app_state(key, value) VALUES (?, ?)', 'last_sync_time', legacyLastSyncTime);
  }

  await db.runAsync('INSERT OR REPLACE INTO app_state(key, value) VALUES (?, ?)', 'asyncstorage_migrated_v1', '1');
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
};

const saveQueueToDb = async (db: SQLite.SQLiteDatabase, queue: SyncQueueItem[]): Promise<void> => {
  await db.withExclusiveTransactionAsync(async txn => {
    await txn.runAsync('DELETE FROM sync_outbox');
    for (const [position, item] of queue.entries()) {
      await txn.runAsync(
        'INSERT INTO sync_outbox(id, type, status, created_at, position, payload) VALUES (?, ?, ?, ?, ?, ?)',
        item.id, item.type, item.status, item.createdAt, position, JSON.stringify(item),
      );
    }
  });
};

const readQueueFromDb = async (db: SQLite.SQLiteDatabase): Promise<SyncQueueItem[]> => {
  const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM sync_outbox ORDER BY position ASC');
  return rows.map(row => JSON.parse(row.payload) as SyncQueueItem);
};

const getList = async <T,>(table: string, fallback: T[], legacyKey: string): Promise<T[]> => {
  if (Platform.OS === 'web') {
    const data = await AsyncStorage.getItem(legacyKey);
    return data ? JSON.parse(data) as T[] : fallback;
  }
  const db = await getDatabase();
  const rows = await readList<T>(db, table);
  if (rows.length) return rows;
  const initialized = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', `initialized:${table}`);
  if (initialized) return [];
  await writeList(db, table, fallback as unknown as Record<string, unknown>[]);
  return fallback;
};

const saveList = async <T,>(table: string, items: T[], legacyKey: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(legacyKey, JSON.stringify(items));
    return;
  }
  await writeList(await getDatabase(), table, items as unknown as Record<string, unknown>[]);
};

const getSingleton = async <T,>(table: 'user_profile' | 'emergency_mode', fallback: T, legacyKey: string): Promise<T> => {
  if (Platform.OS === 'web') {
    const data = await AsyncStorage.getItem(legacyKey);
    return data ? JSON.parse(data) as T : fallback;
  }
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ payload: string }>(`SELECT payload FROM ${table} WHERE id = ?`, 'current');
  return row ? JSON.parse(row.payload) as T : fallback;
};

const saveSingleton = async <T,>(table: 'user_profile' | 'emergency_mode', value: T, legacyKey: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(legacyKey, JSON.stringify(value));
    return;
  }
  const db = await getDatabase();
  await db.runAsync(`INSERT OR REPLACE INTO ${table}(id, payload) VALUES (?, ?)`, 'current', JSON.stringify(value));
};

export const OfflineStorage = {
  getUserProfile: () => getSingleton('user_profile', INITIAL_USER, STORAGE_KEYS.USER_PROFILE),
  saveUserProfile: (profile: UserProfile) => saveSingleton('user_profile', profile, STORAGE_KEYS.USER_PROFILE),
  getServices: () => getList(TABLES.services, INITIAL_SERVICES, STORAGE_KEYS.SERVICES),
  saveServices: (items: LocalService[]) => saveList(TABLES.services, items, STORAGE_KEYS.SERVICES),
  getFavors: () => getList(TABLES.favors, INITIAL_FAVORS, STORAGE_KEYS.FAVORS),
  saveFavors: (items: CommunityFavor[]) => saveList(TABLES.favors, items, STORAGE_KEYS.FAVORS),

  async getEmergencyReports(): Promise<EmergencyReport[]> {
    const reports = await getList(TABLES.reports, INITIAL_EMERGENCY_REPORTS, STORAGE_KEYS.EMERGENCY_REPORTS);
    if (Platform.OS === 'web') {
      const safeReports = await migrateLegacyPrivateReports(reports);
      if (JSON.stringify(safeReports) !== JSON.stringify(reports)) {
        await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_REPORTS, JSON.stringify(safeReports));
      }
      return safeReports;
    }
    // Scrub any pre-migration or seeded personal details from the query result before use.
    const safeReports = await migrateLegacyPrivateReports(reports);
    if (safeReports.some((report, index) => JSON.stringify(report) !== JSON.stringify(reports[index]))) {
      await writeList(await getDatabase(), TABLES.reports, safeReports as unknown as Record<string, unknown>[]);
    }
    return safeReports;
  },

  saveEmergencyReports: (items: EmergencyReport[]) => saveList(TABLES.reports, items.map(redactEmergencyReport), STORAGE_KEYS.EMERGENCY_REPORTS),
  savePrivateEmergencyReport: (reportId: string, data: PrivateEmergencyReportData) => PrivateReportStorage.save(reportId, data),
  getPrivateEmergencyReport: (reportId: string) => PrivateReportStorage.get(reportId),
  removePrivateEmergencyReport: (reportId: string) => PrivateReportStorage.remove(reportId),
  getCriticalResources: () => getList(TABLES.resources, INITIAL_CRITICAL_RESOURCES, STORAGE_KEYS.CRITICAL_RESOURCES),
  saveCriticalResources: (items: CriticalResource[]) => saveList(TABLES.resources, items, STORAGE_KEYS.CRITICAL_RESOURCES),
  getEmergencyMode: () => getSingleton('emergency_mode', INITIAL_EMERGENCY_MODE, STORAGE_KEYS.EMERGENCY_MODE),
  saveEmergencyMode: (value: EmergencyModeState) => saveSingleton('emergency_mode', value, STORAGE_KEYS.EMERGENCY_MODE),

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (Platform.OS === 'web') {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (!data) return [];
      const queue: SyncQueueItem[] = JSON.parse(data);
      const safeQueue = await migrateLegacyQueue(queue);
      if (JSON.stringify(safeQueue) !== data) await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(safeQueue));
      return safeQueue;
    }
    return readQueueFromDb(await getDatabase());
  },

  async saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      return;
    }
    await saveQueueToDb(await getDatabase(), queue);
  },

  async enqueueSyncItem(item: SyncQueueItem): Promise<SyncQueueItem[]> {
    return withQueueLock(async () => {
      const queue = await this.getSyncQueue();
      if (queue.some(existing => existing.id === item.id)) return queue;
      const next = [item, ...queue];
      await this.saveSyncQueue(next);
      return next;
    });
  },

  async updateSyncItem(item: SyncQueueItem): Promise<SyncQueueItem[]> {
    return withQueueLock(async () => {
      const queue = await this.getSyncQueue();
      const next = queue.map(existing => existing.id === item.id ? item : existing);
      await this.saveSyncQueue(next);
      return next;
    });
  },

  async acknowledgeSyncItem(id: string): Promise<SyncQueueItem[]> {
    return this.removeSyncItem(id);
  },

  async removeSyncItem(id: string): Promise<SyncQueueItem[]> {
    return withQueueLock(async () => {
      const queue = await this.getSyncQueue();
      const next = queue.filter(item => item.id !== id);
      await this.saveSyncQueue(next);
      return next;
    });
  },

  getContentReports: () => getList(TABLES.contentReports, [], STORAGE_KEYS.CONTENT_REPORTS),
  saveContentReports: (items: ContentReport[]) => saveList(TABLES.contentReports, items, STORAGE_KEYS.CONTENT_REPORTS),

  async getLastSyncTime(): Promise<string> {
    if (Platform.OS === 'web') {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
      return value && value !== 'Hoy 08:30 AM' ? value : '';
    }
    const row = await (await getDatabase()).getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', 'last_sync_time');
    return row?.value ?? '';
  },

  async setLastSyncTime(value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, value);
      return;
    }
    await (await getDatabase()).runAsync('INSERT OR REPLACE INTO app_state(key, value) VALUES (?, ?)', 'last_sync_time', value);
  },

  async resetAllToDemo(): Promise<void> {
    const reports = await this.getEmergencyReports();
    const queue = await this.getSyncQueue();
    const privateIds = new Set([
      ...reports.map(report => report.id),
      ...queue.map(item => String((item.payload as Record<string, unknown> | undefined)?.privateDataRef ?? '')),
    ].filter(Boolean));
    await Promise.all(Array.from(privateIds, id => this.removePrivateEmergencyReport(id)));

    if (Platform.OS === 'web') {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } else {
      const db = await getDatabase();
      await db.withExclusiveTransactionAsync(async txn => {
        for (const table of [...Object.values(TABLES), 'sync_outbox', 'user_profile', 'emergency_mode', 'app_state']) {
          await txn.runAsync(`DELETE FROM ${table}`);
        }
      });
    }

    await this.saveUserProfile(INITIAL_USER);
    await this.saveServices(INITIAL_SERVICES);
    await this.saveFavors(INITIAL_FAVORS);
    await this.saveEmergencyReports(INITIAL_EMERGENCY_REPORTS);
    await this.saveCriticalResources(INITIAL_CRITICAL_RESOURCES);
    await this.saveEmergencyMode(INITIAL_EMERGENCY_MODE);
    await this.saveSyncQueue([]);
    await this.saveContentReports([]);
    await this.setLastSyncTime('');
  },
};
