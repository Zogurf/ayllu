const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const catalog = require('../src/data/ubigeo/catalog.json');
function loadModule(file, modules = {}) {
 const exports = {};
 const source = fs.readFileSync(require.resolve(file), 'utf8');
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
  { exports, Map, require: name => { if (name in modules) return modules[name]; throw new Error('Unexpected import: '+name); } });
 return exports;
}
const geo=loadModule('../src/lib/ubigeo.ts', {'../data/ubigeo/catalog.json':catalog});

test('catalog includes all source rows, unique padded codes and valid parents', () => {
 assert.equal(catalog.departments.length,25);
 assert.equal(catalog.provinces.length,196);
 assert.equal(catalog.districts.length,1892);
 for (const [kind,digits] of [['departments',2],['provinces',4],['districts',6]]) {
  assert.equal(new Set(catalog[kind].map(r=>r.code)).size,catalog[kind].length);
  assert.ok(catalog[kind].every(r=>new RegExp('^\\d{'+digits+'}$').test(r.code)));
 }
 for (const district of catalog.districts) assert.ok(geo.getLocation(district.code));
});
test('national hierarchy resolves Lima, Arequipa, Cusco and Callao', () => {
 for (const [code,department] of [['150101','LIMA'],['040101','AREQUIPA'],['080101','CUSCO'],['070101','CALLAO']]) assert.equal(geo.getLocation(code).region,department);
 assert.equal(geo.getLocation('999999'),undefined);
});
test('search ignores accents and case', () => {
 assert.equal(geo.normalizeSearch('  Áncash '),'ancash');
});
test('legacy profiles resolve only when district identity is unambiguous', () => {
 assert.equal(geo.resolveProfileUbigeo({district:'Cusco',region:'Cusco'}),'080101');
 const groups=new Map();
 for (const d of catalog.districts) {
  const l=geo.getLocation(d.code); const key=l.region+'|'+l.district;
  if(!groups.has(key)) groups.set(key,[]);
  groups.get(key).push(l);
 }
 const duplicates=[...groups.values()].find(rows=>rows.length>1);
 assert.ok(duplicates);
 const first=duplicates[0];
 assert.equal(geo.resolveProfileUbigeo({region:first.region,district:first.district}),undefined);
 assert.equal(geo.resolveProfileUbigeo(first),first.districtUbigeo);
});
test('district scope never includes an identically named barrio in another district', () => {
 const user={districtUbigeo:'150101',region:'LIMA',district:'LIMA',neighborhood:'Centro',coverageScope:3};
 assert.equal(geo.locationMatchesScope(user,{districtUbigeo:'040101',neighborhood:'Centro'}),false);
 assert.equal(geo.locationMatchesScope(user,{districtUbigeo:'150101',neighborhood:'Otro'}),true);
 assert.equal(geo.locationMatchesScope({...user,coverageScope:1},{districtUbigeo:'150101',neighborhood:'Otro'}),false);
});
test('legacy local records remain in Cusco and adjacency is limited to its demo', () => {
 const cusco={region:'Cusco',district:'Cusco',neighborhood:'San Blas',coverageScope:2};
 assert.equal(geo.locationMatchesScope(cusco,{neighborhood:'Santa Ana'},['Santa Ana']),true);
 assert.equal(geo.locationMatchesScope({...cusco,districtUbigeo:'150101'},{neighborhood:'Santa Ana'},['Santa Ana']),false);
});
test('profile save sends the selected ubigeo and normalizes the barrio', async () => {
 let args;
 const helper=loadModule('../src/lib/communityProfile.ts', {
  './ubigeo':geo,
  './supabase':{supabase:{rpc:async (name,params)=>{args={name,params};return {data:{neighborhood_id:'id',neighborhood_name:'Mi Barrio'},error:null};}}}
 });
 const result=await helper.saveCommunityProfile({nickname:'Vecino',phone:'+51912345678',region:'LIMA',district:'LIMA',districtUbigeo:'150101',neighborhood:'  Mi   Barrio  '});
 assert.equal(args.name,'complete_community_profile_v2');
 assert.equal(args.params.p_district_ubigeo,'150101');
 assert.equal(args.params.p_neighborhood_name,'Mi Barrio');
 assert.equal(result.neighborhoodId,'id');
 assert.equal(result.province,'LIMA');
});
test('profile save rejects unknown districts before contacting Supabase', async () => {
 const helper=loadModule('../src/lib/communityProfile.ts', {'./ubigeo':geo,'./supabase':{supabase:{rpc:()=>{throw new Error('should not be called');}}}});
 await assert.rejects(helper.saveCommunityProfile({nickname:'X',phone:'+51912345678',districtUbigeo:'999999',region:'',district:'',neighborhood:'Centro'}),/Selecciona/);
});
