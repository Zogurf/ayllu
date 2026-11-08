const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(os = 'ios', result = { type: 'cancel' }) {
  const calls = { exchanges: [], oauth: [], browser: [], navigation: [], cleanup: [] };
  const client = { auth: {
    exchangeCodeForSession: async code => { calls.exchanges.push(code); return { error: code === 'invalid' ? new Error('invalid') : null }; },
    signInWithOAuth: async options => { calls.oauth.push(options); return { data: { url: 'https://provider.example/authorize' }, error: null }; },
  } };
  const exports = {};
  const context = {
    exports, URL, URLSearchParams,
    window: { location: { origin: 'https://ayllu.example', pathname: '/', assign: url => calls.navigation.push(url) }, history: { state: null, replaceState: (...args) => calls.cleanup.push(args[2]) } },
    require: name => ({
      'react-native': { Platform: { OS: os } },
      'expo-auth-session': { makeRedirectUri: () => 'ayllu://auth/callback' },
      'expo-web-browser': { openAuthSessionAsync: async (...args) => { calls.browser.push(args); return result; } },
      './supabase': { supabase: client },
    })[name],
  };
  const source = fs.readFileSync(require.resolve('../src/lib/socialAuth.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { api: exports, calls };
}

test('ignores codes delivered to a different callback', async () => {
  const { api, calls } = setup();
  for (const url of ['evil://auth/callback?code=x', 'ayllu://other/callback?code=x', 'ayllu://auth/other?code=x']) await api.completeAuthCallback(url);
  assert.equal(calls.exchanges.length, 0);
});
test('exchanges duplicate native callbacks only once', async () => {
  const { api, calls } = setup();
  await Promise.all([api.completeAuthCallback('ayllu://auth/callback?code=ok'), api.completeAuthCallback('ayllu://auth/callback?code=ok')]);
  assert.deepEqual(calls.exchanges, ['ok']);
});
test('web exchanges code and removes it while preserving unrelated parameters', async () => {
  const { api, calls } = setup('web');
  await api.completeAuthCallback('https://ayllu.example/?code=ok&lang=es#section');
  assert.deepEqual(calls.exchanges, ['ok']);
  assert.deepEqual(calls.cleanup, ['/?lang=es#section']);
});
test('rejected provider authorization is reported and cleared', async () => {
  const { api, calls } = setup('web');
  await assert.rejects(api.completeAuthCallback('https://ayllu.example/?error=access_denied&error_description=secret'), /autorizar/);
  assert.deepEqual(calls.cleanup, ['/']);
  assert.equal(calls.exchanges.length, 0);
});
test('failed exchange removes the stale web code and permits a new attempt', async () => {
  const { api, calls } = setup('web');
  await assert.rejects(api.completeAuthCallback('https://ayllu.example/?code=invalid'), /sesión/);
  await api.completeAuthCallback('https://ayllu.example/?code=new');
  assert.deepEqual(calls.exchanges, ['invalid', 'new']);
  assert.deepEqual(calls.cleanup, ['/', '/']);
});
test('native success uses the returned callback and Google account picker', async () => {
  const { api, calls } = setup('ios', { type: 'success', url: 'ayllu://auth/callback?code=ok' });
  await api.signInWithGoogle();
  assert.equal(calls.oauth[0].provider, 'google');
  assert.equal(calls.oauth[0].options.queryParams.prompt, 'select_account');
  assert.equal(calls.browser[0][1], 'ayllu://auth/callback');
  assert.deepEqual(calls.exchanges, ['ok']);
});
test('native cancellation does not create a session', async () => {
  const { api, calls } = setup();
  await api.signInWithGoogle();
  assert.equal(calls.exchanges.length, 0);
  assert.equal(calls.oauth[0].provider, 'google');
});
test('web sends OAuth to the current tab with a matching return URL', async () => {
  const { api, calls } = setup('web');
  await api.signInWithGoogle();
  assert.equal(calls.oauth[0].options.redirectTo, 'https://ayllu.example/');
  assert.equal(calls.oauth[0].options.skipBrowserRedirect, true);
  assert.equal(calls.navigation.length, 1);
  assert.equal(calls.browser.length, 0);
});
