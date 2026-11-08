import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export function getAuthRedirectUrl(): string {
  // Return to the existing web entry point; no server route is required.
  if (Platform.OS === 'web') return window.location.origin + window.location.pathname;
  return AuthSession.makeRedirectUri({ scheme: 'ayllu', path: 'auth/callback' });
}

const exchanges = new Map<string, Promise<void>>();

export async function completeAuthCallback(url: string): Promise<void> {
  if (!supabase) return;
  const callback = new URL(url);
  const expected = new URL(getAuthRedirectUrl());
  if (callback.protocol !== expected.protocol || callback.host !== expected.host || callback.pathname !== expected.pathname) return;
  const params = callback.searchParams;
  const clearWebCallback = () => {
    if (Platform.OS !== 'web') return;
    for (const key of ['code', 'error', 'error_code', 'error_description']) params.delete(key);
    const fragment = new URLSearchParams(callback.hash.slice(1));
    if (fragment.has('error')) callback.hash = '';
    window.history.replaceState(window.history.state, '', callback.pathname + callback.search + callback.hash);
  };
  const error = params.get('error') ?? new URLSearchParams(callback.hash.slice(1)).get('error');
  if (error) {
    clearWebCallback();
    throw new Error('No se pudo autorizar el acceso. Inténtalo nuevamente o usa tu correo.');
  }
  const code = params.get('code');
  if (!code) return;
  let exchange = exchanges.get(code);
  if (!exchange) {
    const client = supabase;
    exchange = (async () => {
      const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
      if (exchangeError) throw new Error('No se pudo recuperar la sesión. Vuelve a iniciar sesión.');
    })();
    exchanges.set(code, exchange);
    // Bound duplicate suppression for the browser result and deep-link event.
    if (exchanges.size > 10) exchanges.delete(exchanges.keys().next().value!);
  }
  try {
    await exchange;
  } finally {
    clearWebCallback();
  }
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Configura Supabase para iniciar sesión.');
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('El proveedor no devolvió una dirección de acceso.');
  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return;
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success') await completeAuthCallback(result.url);
  // Closing the browser is a normal cancellation; keep the login screen available.
}
