import type { SQLiteDatabase } from 'expo-sqlite';
export type { SQLiteDatabase } from 'expo-sqlite';

// Web persistence uses AsyncStorage; do not bundle SQLite's native/WASM driver.
export async function openDatabaseAsync(_name: string): Promise<SQLiteDatabase> {
  throw new Error('SQLite nativo no está habilitado en Web.');
}
