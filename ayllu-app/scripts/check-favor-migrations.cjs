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
 await db.exec('reset role; set role anon');
 await assert.rejects(db.query('select * from public.community_favors'),/permission denied/);
 await assert.rejects(save(op()),/permission denied/);
 console.log('PASS: migrations, district RLS, ownership, validation, private phone, idempotency, deletion and anonymous denial');
 } finally { await db.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
