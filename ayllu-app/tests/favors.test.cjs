const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function transport({ owner = 'owner', session = 'owner', result = 'favor-id', error = null } = {}) {
 const calls = [];
 const exports = {};
 const client = { auth: { getSession: async () => ({ data: { session: session ? { user: { id: session } } : null } }) },
   rpc: async (name, args) => { calls.push({ name, args }); return { data: result, error }; } };
 const source = fs.readFileSync(require.resolve('../src/services/syncTransport.ts'), 'utf8');
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: name => name === '../lib/supabase' ? { supabase: client } : {} });
 const item = { id: 'operation-id', ownerUserId: owner, type: 'favor', payload: { id: 'favor-id', action: 'delete' } };
 return { submit: () => exports.submitQueuedItem(item), calls };
}
test('outbox refuses another account and missing sessions before publishing', async () => {
 for (const options of [{owner:'other'}, {session:null}, {owner:null}]) {
  const {submit,calls} = transport(options); await assert.rejects(submit()); assert.equal(calls.length,0);
 }
});
test('retries preserve operation identity and deletion intent', async () => {
 const {submit,calls} = transport(); await submit(); await submit();
 assert.equal(calls[0].name,'sync_community_favor');
 assert.equal(calls[0].args.p_action,'delete');
 assert.equal(calls[0].args.p_operation_id,calls[1].args.p_operation_id);
});
test('server failures and mismatched acknowledgements do not acknowledge a favor', async () => {
 await assert.rejects(transport({error:{message:'backend unavailable'}}).submit(),/backend unavailable/);
 await assert.rejects(transport({result:'wrong-id'}).submit(),/no confirmó/);
});

function feedApi() {
 const exports = {};
 const source = fs.readFileSync(require.resolve('../src/services/favorFeed.ts'), 'utf8');
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
 return exports.mergeFavorFeed;
}
const sharedFavor = {id:'shared',authorId:'first',isOfflinePending:false,createdAt:'2026-11-08T12:00:00Z',status:'disponible'};
const pending = (action='save',status='disponible') => ({type:'favor',ownerUserId:'first',payload:{...sharedFavor,action,status},id:`${action}-${status}`});
test('switching accounts keeps the published favor visible despite the first account outbox', () => {
 const merge = feedApi();
 const result = merge([{...sharedFavor,isOfflinePending:true}],[sharedFavor],[pending()],'second');
 assert.equal(result.length,1); assert.equal(result[0].isOfflinePending,false);
});
test('another account pending deletion cannot hide the shared publication', () => {
 const merge = feedApi();
 assert.equal(merge([], [sharedFavor], [pending('delete')], 'second').length,1);
 assert.equal(merge([], [sharedFavor], [pending('delete')], 'first').length,0);
});
test('reconstructs own offline publications from outbox and applies the newest state last', () => {
 const merge = feedApi();
 const result = merge([],[],[pending('save','resuelta'),pending()],'first');
 assert.equal(result.length,1);assert.equal(result[0].status,'resuelta');assert.equal(result[0].isOfflinePending,true);
 assert.equal(merge([],[],[pending('delete'),pending()],'first').length,0);
});
