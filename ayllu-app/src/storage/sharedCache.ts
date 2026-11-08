import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CommunityFavor, LocalService, EmergencyReport, CriticalResource, EmergencyModeState } from '../types';

export interface SharedSnapshot {
  services: LocalService[];
  reports: EmergencyReport[];
  resources: CriticalResource[];
  mode: EmergencyModeState;
}
const key = (owner: string, neighborhood: string) => `@ayllu_shared:${owner}:${neighborhood}`;
export async function saveSharedSnapshot(owner: string, neighborhood: string, snapshot: SharedSnapshot) {
  // Only community-readable data. Private RPC responses, moderation and audit are never cached here.
  await AsyncStorage.setItem(key(owner, neighborhood), JSON.stringify(snapshot));
}
export async function loadSharedSnapshot(owner: string, neighborhood: string): Promise<SharedSnapshot | null> {
  const raw = await AsyncStorage.getItem(key(owner, neighborhood));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SharedSnapshot;
    return Array.isArray(value.services) && Array.isArray(value.reports) && Array.isArray(value.resources) && value.mode ? value : null;
  } catch { return null; }
}

export async function saveFavorSnapshot(owner: string, district: string, favors: CommunityFavor[]) {
  await AsyncStorage.setItem(`@ayllu_favors:${owner}:${district}`, JSON.stringify(favors));
}
export async function loadFavorSnapshot(owner: string, district: string): Promise<CommunityFavor[]> {
  const raw = await AsyncStorage.getItem(`@ayllu_favors:${owner}:${district}`);
  try { const value = JSON.parse(raw ?? '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
