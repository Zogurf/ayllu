const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
 const db = new PGlite();
 try {
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema extensions;
 create table auth.users (id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
 const migrations = path.resolve(__dirname, '../../supabase/migrations');
 for (const name of fs.readdirSync(migrations).filter(n => n.endsWith('.sql')).sort()) {
   if (process.env.AYLLU_TEST_MISSING_AUDIT === '1' && name.startsWith('202611080008_')) await db.exec('drop table public.emergency_audit_events cascade');
   if (process.env.AYLLU_TEST_RESOURCE_RETURN_DRIFT === '1' && name.startsWith('202611080009_')) {
     await db.exec("drop function public.save_critical_resource(uuid,jsonb,numeric,text,integer); create function public.save_critical_resource(p_id uuid,p_content jsonb,p_quantity numeric,p_unit text,p_version integer) returns jsonb language sql as $$ select '{}'::jsonb $$;");
   }
   await db.exec(fs.readFileSync(path.join(migrations,name),'utf8').replace('create extension if not exists pgcrypto with schema extensions;', ''));
 }
 const owner='10000000-0000-4000-8000-000000000001';
 const neighbor='10000000-0000-4000-8000-000000000002';
 const outsider='10000000-0000-4000-8000-000000000003';
 const id='20000000-0000-4000-8000-000000000001';
 let operation=0;
 const op=()=>`30000000-0000-4000-8000-${String(++operation).padStart(12,'0')}`;
 const login=async uid=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');};
 await db.query('insert into auth.users values ($1),($2),($3)',[owner,neighbor,outsider]);
 for (const [uid,district] of [[owner,'150101'],[neighbor,'150101'],[outsider,'040101']]) {
   await login(uid);
   await db.query("select public.complete_community_profile_v2('Vecino','+51912345678','Mi Barrio',$1)",[district]);
 }
 const favor={id,title:'Presto herramienta',description:'Préstamo solidario',category:'herramientas',categoryLabel:'Herramientas',mode:'ofrezco',status:'disponible',durationInfo:'Hoy',contactChannel:'ayllu',neighborhood:'Mi Barrio',districtUbigeo:'150101',authorName:'FAKE',authorPhone:'PRIVATE'};
 const save=(key,data=favor,action='save')=>db.query('select public.sync_community_favor($1,$2,$3)',[key,JSON.stringify(data),action]);
 await login(owner);
 const createOp=op(); await save(createOp); await save(createOp);
 let rows=(await db.query('select * from public.community_favors')).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].author_id,owner);
 assert.equal(rows[0].content.authorName,'Vecino');assert.equal(rows[0].content.authorPhone,'');
 await assert.rejects(db.query("update public.community_favors set status='resuelta'"),/permission denied/);
 await assert.rejects(save(op(),{...favor,id:'20000000-0000-4000-8000-000000000002',title:''}),/Revisa/);
 await save(op(),{...favor,status:'resuelta'});
 await save(createOp); // A retry of create must not reopen a resolved favor.
 assert.equal((await db.query('select status from public.community_favors')).rows[0].status,'resuelta');
 await login(neighbor);
 assert.equal((await db.query('select * from public.community_favors')).rows.length,1);
 await assert.rejects(save(op()),/Solo el autor/);
 await assert.rejects(save(op(),favor,'delete'),/Solo el autor/);
 await login(outsider);
 assert.equal((await db.query('select * from public.community_favors')).rows.length,0);
 await assert.rejects(save(op(),{...favor,id:'20000000-0000-4000-8000-000000000003'}),/barrio del borrador/);
 await login(owner);
 const del=op();await save(del,favor,'delete');await save(del,favor,'delete');
 await assert.rejects(save(op()),/retirada/);
 assert.equal((await db.query('select * from public.community_favors where not deleted')).rows.length,0);
 await login(owner);
 const neighborhoodId=(await db.query('select neighborhood_id from public.profiles where id=$1',[owner])).rows[0].neighborhood_id;
 const serviceId='40000000-0000-4000-8000-000000000001';
 const service={id:serviceId,title:'Gasfitería de prueba',description:'Servicio ficticio',category:'gasfiteria',categoryLabel:'Gasfitería',neighborhood:'Mi Barrio',districtUbigeo:'150101',sharePhone:false};
 const serviceOp=op();
 const saveService=()=>db.query('select public.sync_local_service($1,$2,$3)',[serviceOp,JSON.stringify(service),'save']);
 await saveService(); await saveService();
 assert.equal((await db.query('select id from public.local_services where id=$1',[serviceId])).rows.length,1);
 const emergencyId='50000000-0000-4000-8000-000000000001';
 const report={id:emergencyId,neighborhood_id:neighborhoodId,category:'salud',title:'Reporte de prueba',description:'Simulación',priority:'alta'};
 const privateReport={beneficiary_name:'Persona ficticia',exact_address:'Dirección ficticia',contact_phone:'',consent_at:new Date().toISOString(),consent_version:'ayllu-emergency-v1'};
 const emergencyOp=op();
 const sendReport=()=>db.query('select public.sync_emergency_report($1,$2,$3)',[emergencyOp,JSON.stringify(report),JSON.stringify(privateReport)]);
 await sendReport(); await sendReport();
 assert.equal((await db.query('select id from public.emergency_reports where id=$1',[emergencyId])).rows.length,1);
 await assert.rejects(db.query('select * from public.emergency_report_private'),/permission denied/);
 await assert.rejects(db.query('select public.read_emergency_private($1)',[emergencyId]),/permiso/);
 const resourceId='60000000-0000-4000-8000-000000000001';
 const resource={name:'Agua de prueba',type:'agua',mode:'disponible',neighborhood:'Mi Barrio',districtUbigeo:'150101'};
 const saveResource=(quantity,version)=>db.query('select public.save_critical_resource($1,$2,$3,$4,$5)',[resourceId,JSON.stringify(resource),quantity,'litros',version]);
 await assert.rejects(saveResource(10,0),/coordinadores/);
 await db.exec('reset role');
 await db.query("update public.community_memberships set role='coordinador' where user_id=$1",[owner]);
 await login(owner);
 await saveResource(10,0); await saveResource(10,0);
 await saveResource(20,1);
 await assert.rejects(saveResource(30,1),/cambió/);
 const privateResult=(await db.query('select public.read_emergency_private($1) as data',[emergencyId])).rows[0].data;
 assert.equal(privateResult.beneficiary_name,'Persona ficticia');
 assert.equal((await db.query("select id from public.emergency_audit_events where event_type='private_report_viewed'")).rows.length,1);
 await db.exec('reset role; set role anon');
 await assert.rejects(db.query('select * from public.community_favors'),/permission denied/);
 await assert.rejects(save(op()),/permission denied/);
 await assert.rejects(saveResource(10,0),/permission denied/);
 console.log('PASS: migrations, favors, services, emergency idempotency, audited private access, resource permissions/version checks, RLS and anonymous denial');
 } finally { await db.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
