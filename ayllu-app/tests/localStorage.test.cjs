const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(module) {
  const values = new Map();
  const storage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(`../src/storage/${module}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: () => ({ __esModule: true, default: storage }) });
  return { api: exports, values };
}
test('local avatar is isolated by account and overrides the provider photo', async () => {
  const { api } = load('avatarStorage');
  await api.saveLocalAvatar('alice', 'data:image/jpeg;base64,AAAA');
  assert.equal(await api.getLocalAvatar('alice', 'https://provider.example/photo'), 'data:image/jpeg;base64,AAAA');
  assert.equal(await api.getLocalAvatar('bob', 'https://provider.example/bob'), 'https://provider.example/bob');
  assert.equal(await api.getLocalAvatar('bob', 'javascript:bad'), '');
});
test('offline community cache is isolated by account and neighborhood', async () => {
  const { api } = load('sharedCache');
  await api.saveSharedSnapshot('alice', 'north', { services: [{id:'s1'}], reports: [], resources: [], mode: {isActive:false} });
  assert.equal((await api.loadSharedSnapshot('alice', 'north')).services[0].id, 's1');
  assert.equal(await api.loadSharedSnapshot('bob', 'north'), null);
  assert.equal(await api.loadSharedSnapshot('alice', 'south'), null);
});
test('offline favor cache does not cross account or district boundaries', async () => {
  const { api } = load('sharedCache');
  await api.saveFavorSnapshot('alice', '150101', [{id:'favor1'}]);
  assert.equal((await api.loadFavorSnapshot('alice', '150101'))[0].id, 'favor1');
  assert.equal((await api.loadFavorSnapshot('bob', '150101')).length, 0);
  assert.equal((await api.loadFavorSnapshot('alice', '080101')).length, 0);
});
