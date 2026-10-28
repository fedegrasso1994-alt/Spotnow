import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, access, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createCipheriv } from 'node:crypto';
import { makeManifest, validateManifest, sealCheckpoint, openCheckpoint, fileDigest } from '../scripts/recovery/checkpoint-artifact.mjs';
import { parseSourceEnvironment } from '../scripts/recovery/source-connection.mjs';
import { checkInventory, storageDownloadArgs } from '../scripts/recovery/capture-staging.mjs';
import {makeContract,EXCLUDED_DATA}from'../scripts/recovery/session-contract.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'soma-recovery-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = [
    { name: 'database.dump', kind: 'database', input: join(root, 'db') },
    { name: 'metadata.json', kind: 'metadata', input: join(root, 'metadata') },
    { name: 'photos/canonical.bin', kind: 'photo', input: join(root, 'photo'), bucket: 'profile-photos', storage_key: 'synthetic/photo.jpg' },
    { name: 'auth-projection/users.csv', kind:'auth_projection',auth_table:'auth.users',input:join(root,'users.csv') },
    { name: 'auth-projection/identities.csv', kind:'auth_projection',auth_table:'auth.identities',input:join(root,'identities.csv') },
  ];
  await writeFile(files[0].input, 'SYNTHETIC DB ARTIFACT ONLY');
  await writeFile(files[1].input, '{"synthetic":true}');
  await writeFile(files[2].input, randomBytes(65537));
  await writeFile(files[3].input,'SYNTHETIC DURABLE USER\n');await writeFile(files[4].input,'');
  const manifest = await makeManifest({ snapshotAt: '2026-10-26T12:00:00Z', files, contract:makeContract([...EXCLUDED_DATA],[]) });
  return { root, files, manifest, key: randomBytes(32), output: join(root, 'checkpoint.enc') };
}

test('RECOVERY: authenticated streaming archive round-trip preserves DB, mapping and photo hashes', async t => {
  const f = await fixture(t); const sealed = await sealCheckpoint(f);
  assert.match(sealed.state, /not_restore_attested/);
  const dir = join(f.root, 'restored');
  assert.deepEqual(await openCheckpoint({ input: f.output, key: f.key, outputDir: dir }), f.manifest);
  for (const entry of f.manifest.files) assert.deepEqual(await fileDigest(join(dir, entry.name)), { size: entry.size, sha256: entry.sha256 });
  assert.equal((await stat(f.output)).mode & 0o777, 0o600);
  assert.equal((await stat(dir)).mode & 0o777, 0o700);
  assert.equal((await readFile(f.output)).includes(Buffer.from('SYNTHETIC DB')), false);
});

for(const version of [1,2])test(`RECOVERY: authenticated obsolete manifest v${version} is rejected before extraction`,async t=>{
 const f=await fixture(t),m={...f.manifest,version};
 const magic=Buffer.from('SOMA-RECOVERY-1\n'),nonce=randomBytes(12),c=createCipheriv('aes-256-gcm',f.key,nonce);c.setAAD(magic);
 const encoded=Buffer.from(JSON.stringify(m)),len=Buffer.alloc(4);len.writeUInt32BE(encoded.length);
 const parts=await Promise.all(f.files.map(x=>readFile(x.input)));
 await writeFile(f.output,Buffer.concat([magic,nonce,c.update(Buffer.concat([len,encoded,...parts])),c.final(),c.getAuthTag()]));
 const dir=join(f.root,'obsolete');await assert.rejects(openCheckpoint({input:f.output,key:f.key,outputDir:dir}),/MANIFEST/);await assert.rejects(access(dir));
});

test('RECOVERY: both named durable Auth projection files are mandatory',async t=>{
 const f=await fixture(t);
 for(const table of ['auth.users','auth.identities'])assert.throws(()=>validateManifest({...f.manifest,files:f.manifest.files.filter(x=>x.auth_table!==table)}),/AUTH_PROJECTION_REQUIRED/);
});

for (const mutation of ['ciphertext', 'tag', 'nonce', 'header', 'truncate']) {
  test(`RECOVERY: ${mutation} corruption is rejected with no materialized payload left`, async t => {
    const f = await fixture(t); await sealCheckpoint(f);
    let b = await readFile(f.output);
    if (mutation === 'truncate') b = b.subarray(0, b.length - 19);
    else b[mutation === 'header' ? 0 : mutation === 'nonce' ? 16 : mutation === 'tag' ? b.length - 1 : 80] ^= 1;
    await writeFile(f.output, b);
    const dir = join(f.root, 'rejected');
    await assert.rejects(openCheckpoint({ input: f.output, key: f.key, outputDir: dir }));
    await assert.rejects(access(dir));
  });
}

test('RECOVERY: wrong or malformed key cannot restore or leave plaintext', async t => {
  const f = await fixture(t); await sealCheckpoint(f);
  await assert.rejects(openCheckpoint({ input: f.output, key: randomBytes(32), outputDir: join(f.root, 'wrong') }));
  await assert.rejects(access(join(f.root, 'wrong')));
  await assert.rejects(sealCheckpoint({ ...f, key: randomBytes(16) }), /CHECKPOINT_KEY/);
});

test('RECOVERY: missing and changed inputs never publish a valid artifact; retry uses fresh identity', async t => {
  const f = await fixture(t);
  await writeFile(f.files[2].input, 'changed after snapshot');
  await assert.rejects(sealCheckpoint(f), /CHECKPOINT_FILE_CHANGED/);
  await assert.rejects(access(f.output));
  const manifest = await makeManifest({ snapshotAt: f.manifest.snapshot_at, files: f.files, contract:f.manifest.contract });
  assert.notEqual(manifest.checkpoint_id, f.manifest.checkpoint_id);
  await sealCheckpoint({ ...f, manifest });
  await openCheckpoint({ input: f.output, key: f.key, outputDir: join(f.root, 'retry') });
  await rm(f.files[2].input);
  await assert.rejects(sealCheckpoint({ ...f, output: join(f.root, 'missing') }));
  await assert.rejects(access(join(f.root, 'missing')));
});

test('RECOVERY: repeated/concurrent publication cannot overwrite an existing checkpoint', async t => {
  const f = await fixture(t);
  const results = await Promise.allSettled([sealCheckpoint(f), sealCheckpoint(f)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const original = await fileDigest(f.output);
  await assert.rejects(sealCheckpoint(f), /EEXIST/);
  assert.deepEqual(await fileDigest(f.output), original);
});

test('RECOVERY: source, completeness, duplicate mapping and traversal fail closed', async t => {
  const f = await fixture(t);
  for (const update of [
    { source_ref: 'other-project' }, { snapshot_at: 'invalid' }, { files: [] },
    { files: f.manifest.files.filter(x => x.kind !== 'database') },
    { files: [...f.manifest.files, f.manifest.files[0]] },
    { files: f.manifest.files.map((x, i) => i === 2 ? { ...x, name: '../escape' } : x) },
    { files: f.manifest.files.map((x, i) => i === 2 ? { ...x, storage_key: '/absolute' } : x) },
  ]) assert.throws(() => validateManifest({ ...f.manifest, ...update }));
  await assert.rejects(sealCheckpoint({ ...f, files: f.files.slice(0, 2) }), /INCOMPLETE/);
  await assert.rejects(access(f.output));
});

test('RECOVERY: symlinks and existing restore directories are refused', async t => {
  const f = await fixture(t);
  const link = join(f.root, 'link'); await symlink(f.files[0].input, link);
  await assert.rejects(fileDigest(link), /REGULAR_FILE/);
  await sealCheckpoint(f);
  await assert.rejects(openCheckpoint({ input: f.output, key: f.key, outputDir: f.root }), /EEXIST/);
  assert.equal((await readFile(f.files[0].input, 'utf8')).includes('SYNTHETIC'), true);
});

test('RECOVERY: even authenticated payloads with a wrong per-file hash are rejected', async t => {
  const f = await fixture(t);
  const m = structuredClone(f.manifest); m.files[0].sha256 = '0'.repeat(64);
  const magic = Buffer.from('SOMA-RECOVERY-1\n'), nonce = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', f.key, nonce); c.setAAD(magic);
  const encoded = Buffer.from(JSON.stringify(m)), len = Buffer.alloc(4); len.writeUInt32BE(encoded.length);
  const parts = await Promise.all(f.files.map(x => readFile(x.input)));
  await writeFile(f.output, Buffer.concat([magic, nonce, c.update(Buffer.concat([len, encoded, ...parts])), c.final(), c.getAuthTag()]));
  const dir = join(f.root, 'bad-hash');
  await assert.rejects(openCheckpoint({ input: f.output, key: f.key, outputDir: dir }), /HASH_MISMATCH/);
  await assert.rejects(access(dir));
});

test('RECOVERY: CLI source parsing never executes shell and refuses other cloud projects', () => {
  const text = 'export PGHOST="aws-0-eu-west-1.pooler.supabase.com"\nexport PGPORT="5432"\nexport PGUSER="cli_login_postgres.zjinjtkekmaqtxsuyvho"\nexport PGPASSWORD="SYNTHETIC_PASSWORD"\nexport PGDATABASE="postgres"\n';
  assert.equal(parseSourceEnvironment(text).PGDATABASE, 'postgres');
  assert.throws(() => parseSourceEnvironment(text.replace('zjinjtkekmaqtxsuyvho', 'another-project')), /IDENTITY_REFUSED/);
  assert.throws(() => parseSourceEnvironment(text.replace('pooler.supabase.com', 'example.com')), /IDENTITY_REFUSED/);
  assert.throws(() => parseSourceEnvironment(text.replace('5432', '1234')), /IDENTITY_REFUSED/);
  assert.throws(() => parseSourceEnvironment(text.replace('export PGPASSWORD="SYNTHETIC_PASSWORD"', '')), /IDENTITY_REFUSED/);
  assert.equal(parseSourceEnvironment(text+'echo should-not-be-executed\n').PGPORT, '5432');
});

test('RECOVERY: missing current bytes, unclassified objects and foreign buckets block capture',()=>{
 const object={bucket:'profile-photos',storage_key:'synthetic/photo.jpg',size:100,mime:'image/jpeg',referenced:true};
 const meta={other_bucket_objects:0,objects:[object],current_required:[object.storage_key]};
 assert.equal(checkInventory(meta),meta);
 assert.throws(()=>checkInventory({...meta,current_required:['synthetic/missing.jpg']}),/CURRENT_OBJECT_MISSING/);
 assert.throws(()=>checkInventory({...meta,other_bucket_objects:1}),/INVENTORY_SCOPE/);
 for(const changed of [{referenced:false},{mime:'image/png'},{size:0},{storage_key:'../outside.jpg'}])
  assert.throws(()=>checkInventory({...meta,objects:[{...object,...changed}]}),/OBJECT_CLASSIFICATION/);
 assert.throws(()=>checkInventory({...meta,objects:[object,object]}),/OBJECT_CLASSIFICATION/);
});

test('RECOVERY: Storage download is source-pinned, explicitly experimental and never remote-to-remote',()=>{
 const object={bucket:'profile-photos',storage_key:'synthetic/photo.jpg'};
 const args=storageDownloadArgs(object,'/tmp/private/photo.jpg');
 assert.deepEqual(args,['storage','cp','--experimental','--project-ref','zjinjtkekmaqtxsuyvho','ss:///profile-photos/synthetic/photo.jpg','/tmp/private/photo.jpg']);
 assert.throws(()=>storageDownloadArgs(object,'ss:///other-bucket/copy.jpg'),/DOWNLOAD_SCOPE/);
 assert.throws(()=>storageDownloadArgs({...object,bucket:'foreign'},'/tmp/photo.jpg'),/DOWNLOAD_SCOPE/);
});
