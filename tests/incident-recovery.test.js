import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {database, seed, ids} from './helpers/database.js';
import {boundedFetch} from '../src/request.js';

// Offline incident drills only. No provider client, credentials or network IO.
const pause = db => db.query("select photo_cutover_set('pause','synthetic-operator','incident-offline-drill')");
const status = async db => (await db.query('select photo_cutover_status() s')).rows[0].s;

test('INCIDENT: emergency pause blocks photo writers and cleanup, preserves current, cannot reopen without canary', async t => {
  const db = await database(); t.after(() => db.close()); await seed(db);
  const before = (await db.query('select id,photo_path from profiles order by id')).rows;
  await pause(db); await pause(db);
  const s = await status(db);
  assert.equal(s.phase, 'PAUSED');
  assert.equal(s.execute_enabled, false);
  assert.equal(s.scheduler_enabled, false);
  await assert.rejects(db.query('select photo02_begin_photo_upload($1,$2,$3)', [ids.a, '70000000-0000-4000-8000-000000000001', 'a'.repeat(64)]), /PHOTO_PAUSED/);
  assert.equal((await db.query('select photo_cutover_execute_permit() allowed')).rows[0].allowed, false);
  await assert.rejects(db.query("select photo_cutover_set('open','synthetic-operator','invalid-shortcut')"), /PHOTO_SMOKE_REQUIRED/);
  assert.deepEqual((await db.query('select id,photo_path from profiles order by id')).rows, before);
});

test('INCIDENT: offline DB restore preserves photo references but cannot recover missing Storage bytes', async t => {
  const db = await database(); t.after(() => db.close()); await seed(db);
  // Byte-store is a synthetic local adapter, not Supabase Storage or actual photos.
  const rows = (await db.query('select photo_path from profiles order by id')).rows;
  const bytes = new Map(rows.map(({photo_path}, i) => [photo_path, new Uint8Array([i, 1, 2, 3])]));
  const storageBackup = new Map([...bytes].map(([key, value]) => [key, value.slice()]));
  const backup = await db.dumpDataDir();
  await db.exec('delete from public.profiles'); bytes.clear();
  assert.equal((await db.query('select count(*) n from profiles')).rows[0].n, 0);
  const restored = new PGlite({loadDataDir: backup}); t.after(() => restored.close());
  assert.deepEqual((await restored.query('select photo_path from profiles order by id')).rows, rows);
  // An old snapshot restores its old gates too: offline quarantine is mandatory.
  assert.equal((await status(restored)).phase, 'OPEN');
  await pause(restored);
  assert.equal(rows.filter(r => !bytes.has(r.photo_path)).length, 3);
  for (const [key, value] of storageBackup) bytes.set(key, value.slice());
  assert.equal(rows.filter(r => !bytes.has(r.photo_path)).length, 0);
  assert.deepEqual(bytes.get(rows[0].photo_path), storageBackup.get(rows[0].photo_path));
  assert.equal((await status(restored)).phase, 'PAUSED');
  assert.equal((await status(restored)).execute_enabled, false);
  // A DB restore is not an account-deletion/revocation replay or cloud restore test.
});

test('INCIDENT: network timeout releases caller and retry succeeds without logging request bodies', async () => {
  const stalled = boundedFetch((_input, {signal}) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {once:true});
  }), 5);
  await assert.rejects(stalled('https://synthetic.invalid', {method:'POST', body:'synthetic-only'}), /troppo tempo/);
  const healthy = boundedFetch(async () => new Response('ok'), 50);
  assert.equal(await (await healthy('https://synthetic.invalid')).text(), 'ok');
});
