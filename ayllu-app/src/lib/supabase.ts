import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 600;
const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    const count = Number(await SecureStore.getItemAsync(`${key}:parts`));
    if (!Number.isInteger(count) || count < 1) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, index) =>
      SecureStore.getItemAsync(`${key}:${index}`),
    ));
    return parts.some(part => part == null) ? null : parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    const previousCount = Number(await SecureStore.getItemAsync(`${key}:parts`)) || 0;
    const parts = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) ?? [''];
    for (let index = 0; index < parts.length; index += 1) {
      await SecureStore.setItemAsync(`${key}:${index}`, parts[index]);
    }
    await SecureStore.setItemAsync(`${key}:parts`, String(parts.length));
    for (let index = parts.length; index < previousCount; index += 1) {
      await SecureStore.deleteItemAsync(`${key}:${index}`);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    const count = Number(await SecureStore.getItemAsync(`${key}:parts`)) || 0;
    await Promise.all([
      SecureStore.deleteItemAsync(`${key}:parts`),
      ...Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}:${index}`)),
    ]);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
