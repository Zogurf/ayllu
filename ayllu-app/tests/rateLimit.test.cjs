const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('limite de publicacion de favores por cuenta (migracion 006)', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema extensions;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    const dir = path.resolve(__dirname, '../../supabase/migrations');
    for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort()) {
      await db.exec(fs.readFileSync(path.join(dir, name), 'utf8')
        .replace('create extension if not exists pgcrypto with schema extensions;', ''));
    }
    const a = '10000000-0000-4000-8000-000000000001';
    const b = '10000000-0000-4000-8000-000000000002';
    const login = async uid => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
      await db.exec('set role authenticated');
    };
    await db.query('insert into auth.users values ($1),($2)', [a, b]);
    for (const uid of [a, b]) {
      await login(uid);
      await db.query("select public.complete_community_profile_v2('Vecino','+51912345678','Mi Barrio',$1)", ['150101']);
    }
    let n = 0;
    const id = () => `20000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
    const op = () => `30000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
    const favor = fid => ({ id: fid, title: 'Presto herramienta', description: 'Préstamo solidario', category: 'herramientas',
      categoryLabel: 'Herramientas', mode: 'ofrezco', status: 'disponible', durationInfo: 'Hoy', contactChannel: 'ayllu',
      neighborhood: 'Mi Barrio', districtUbigeo: '150101' });
    const save = fid => db.query('select public.sync_community_favor($1,$2,$3)', [op(), JSON.stringify(favor(fid)), 'save']);

    await login(a);
    const first = id();
    await save(first);
    for (let i = 1; i < 10; i++) await save(id());
    await assert.rejects(save(id()), e => e.code === '53400' && /Límite alcanzado/.test(e.message));
    await save(first); // un reintento de un favor existente no cuenta contra el límite
    await login(b);
    await save(id()); // otra cuenta no se ve afectada
  } finally { await db.close(); }
});
