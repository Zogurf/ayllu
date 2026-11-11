import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 600;

function toSecureStoreKey(key: string, suffix: string | number): string {
  const sanitized = key.replace(/[^A-Za-z0-9._-]/g, '_');
  return `${sanitized}_${suffix}`;
}

const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    try {
      const partsKey = toSecureStoreKey(key, 'parts');
      const count = Number(await SecureStore.getItemAsync(partsKey));
      if (!Number.isInteger(count) || count < 1) return null;
      const parts = await Promise.all(Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(toSecureStoreKey(key, index)),
      ));
      return parts.some(part => part == null) ? null : parts.join('');
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    const partsKey = toSecureStoreKey(key, 'parts');
    const previousCount = Number(await SecureStore.getItemAsync(partsKey)) || 0;
    const parts = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];
    for (let index = 0; index < parts.length; index += 1) {
      await SecureStore.setItemAsync(toSecureStoreKey(key, index), parts[index]);
    }
    await SecureStore.setItemAsync(partsKey, String(parts.length));
    for (let index = parts.length; index < previousCount; index += 1) {
      await SecureStore.deleteItemAsync(toSecureStoreKey(key, index));
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    try {
      const partsKey = toSecureStoreKey(key, 'parts');
      const count = Number(await SecureStore.getItemAsync(partsKey)) || 0;
      await Promise.all([
        SecureStore.deleteItemAsync(partsKey),
        ...Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(toSecureStoreKey(key, index))),
      ]);
    } catch {
      // Ignored
    }
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && publishableKey
  ? createClient(url, publishableKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        flowType: 'pkce',
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  const updateAuthRefresh = (state: string | null | undefined) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };
  updateAuthRefresh(AppState.currentState);
  AppState.addEventListener('change', updateAuthRefresh);
}
