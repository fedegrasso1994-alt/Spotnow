import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, constants } from 'node:fs';
import { open, mkdir, rename, rm, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { validateContract } from './session-contract.mjs';

export const SOURCE = 'zjinjtkekmaqtxsuyvho';
const MAGIC = Buffer.from('SOMA-RECOVERY-1\n');
const MAX_MANIFEST = 8 * 1024 * 1024;
const fail = code => { throw new Error(code); };
const nameOK = s => typeof s === 'string' && s.length < 512 &&
  /^[a-zA-Z0-9_./-]+$/.test(s) && !s.startsWith('/') &&
  s.split('/').every(x => x && x !== '.' && x !== '..');
const digest = () => createHash('sha256');
const read = path => createReadStream(path, { flags: constants.O_RDONLY | constants.O_NOFOLLOW });

export async function fileDigest(path) {
  if (!(await lstat(path)).isFile()) fail('CHECKPOINT_REGULAR_FILE_REQUIRED');
  let size = 0; const hash = digest();
  for await (const chunk of read(path)) { size += chunk.length; hash.update(chunk); }
  return { size, sha256: hash.digest('hex') };
}

export function validateManifest(m) {
  if (m?.version !== 1 || m.source_ref !== SOURCE ||
      !/^[0-9a-f-]{36}$/.test(m.checkpoint_id ?? '') ||
      !Number.isFinite(Date.parse(m.snapshot_at)) ||
      !Array.isArray(m.files) || !m.files.length || m.files.length > 100000)
    fail('CHECKPOINT_MANIFEST');
  validateContract(m.contract);
  const names = new Set();
  for (const f of m.files) {
    if (!nameOK(f.name) || names.has(f.name) ||
        !Number.isSafeInteger(f.size) || f.size <= 0 || !/^[0-9a-f]{64}$/.test(f.sha256 ?? '') ||
        !['database', 'metadata', 'photo'].includes(f.kind)) fail('CHECKPOINT_FILE_MANIFEST');
    names.add(f.name);
    if (f.kind === 'photo' && (f.bucket !== 'profile-photos' || !nameOK(f.storage_key)))
      fail('CHECKPOINT_PHOTO_MAPPING');
  }
  if (m.files.filter(f => f.kind === 'database').length !== 1 ||
      !m.files.some(f => f.kind === 'metadata')) fail('CHECKPOINT_DATABASE_METADATA_REQUIRED');
  const photoKeys = m.files.filter(f => f.kind === 'photo').map(f => f.storage_key);
  if (new Set(photoKeys).size !== photoKeys.length) fail('CHECKPOINT_DUPLICATE_MAPPING');
  return m;
}

export async function makeManifest({ sourceRef = SOURCE, snapshotAt, files, contract }) {
  const entries = [];
  for (const { input, ...entry } of files) entries.push({ ...entry, ...await fileDigest(input) });
  return validateManifest({ version: 1, source_ref: sourceRef,
    checkpoint_id: randomUUID(), snapshot_at: snapshotAt, contract, files: entries });
}

function checkKey(key) { if (!Buffer.isBuffer(key) || key.length !== 32) fail('CHECKPOINT_KEY'); }

/** Local artifact only: does not attest DB coverage, upload, replay or restore success. */
export async function sealCheckpoint({ manifest, files, key, output }) {
  checkKey(key); validateManifest(manifest);
  if (files.length !== manifest.files.length) fail('CHECKPOINT_INCOMPLETE');
  const encoded = Buffer.from(JSON.stringify(manifest));
  if (encoded.length > MAX_MANIFEST) fail('CHECKPOINT_MANIFEST_SIZE');
  const length = Buffer.alloc(4); length.writeUInt32BE(encoded.length);
  const nonce = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(MAGIC);
  const partial = output + '.partial-' + randomUUID();
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  // Reserve the destination exclusively: an existing valid backup must never be overwritten.
  const reserved = await open(output, 'wx', 0o600); await reserved.close();
  try {
    const start = await open(partial, 'wx', 0o600);
    await start.writeFile(Buffer.concat([MAGIC, nonce])); await start.close();
    async function* content() {
      yield length; yield encoded;
      for (let i = 0; i < manifest.files.length; i++) {
        const expected = manifest.files[i], actual = files[i];
        if (actual.name !== expected.name || !(await lstat(actual.input)).isFile())
          fail('CHECKPOINT_INCOMPLETE');
        const hash = digest(); let size = 0;
        for await (const chunk of read(actual.input)) {
          size += chunk.length; if (size > expected.size) fail('CHECKPOINT_FILE_CHANGED');
          hash.update(chunk); yield chunk;
        }
        if (size !== expected.size || hash.digest('hex') !== expected.sha256)
          fail('CHECKPOINT_FILE_CHANGED');
      }
    }
    await pipeline(Readable.from(content()), cipher, createWriteStream(partial, { flags: 'a', mode: 0o600 }));
    const end = await open(partial, 'a');
    await end.writeFile(cipher.getAuthTag()); await end.sync(); await end.close();
    await rename(partial, output);
    return { ...await fileDigest(output), checkpoint_id: manifest.checkpoint_id,
      state: 'sealed_integrity_candidate_not_restore_attested' };
  } catch (error) {
    await rm(partial, { force: true }); await rm(output, { force: true }); throw error;
  }
}

/** Authenticate the complete ciphertext BEFORE parsing or materializing any payload file. */
export async function openCheckpoint({ input, key, outputDir }) {
  checkKey(key);
  const stat = await lstat(input);
  if (!stat.isFile() || stat.size < MAGIC.length + 12 + 16 + 4) fail('CHECKPOINT_TRUNCATED');
  await mkdir(outputDir, { mode: 0o700 }); // existing directory is deliberately refused
  const plain = join(outputDir, '.authenticated-payload');
  try {
    const file = await open(input, 'r');
    const header = Buffer.alloc(MAGIC.length + 12), tag = Buffer.alloc(16);
    await file.read(header, 0, header.length, 0);
    await file.read(tag, 0, 16, stat.size - 16); await file.close();
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) fail('CHECKPOINT_FORMAT');
    const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));
    decipher.setAAD(MAGIC); decipher.setAuthTag(tag);
    await pipeline(createReadStream(input, { start: header.length, end: stat.size - 17 }),
      decipher, createWriteStream(plain, { flags: 'wx', mode: 0o600 }));
    const p = await open(plain, 'r');
    try {
      const length = Buffer.alloc(4); if ((await p.read(length, 0, 4, 0)).bytesRead !== 4) fail('CHECKPOINT_TRUNCATED');
      const n = length.readUInt32BE(); if (!n || n > MAX_MANIFEST) fail('CHECKPOINT_MANIFEST_SIZE');
      const encoded = Buffer.alloc(n);
      if ((await p.read(encoded, 0, n, 4)).bytesRead !== n) fail('CHECKPOINT_TRUNCATED');
      const manifest = validateManifest(JSON.parse(encoded.toString('utf8')));
      let offset = 4 + n;
      for (const f of manifest.files) {
        const output = join(outputDir, f.name);
        await mkdir(dirname(output), { recursive: true, mode: 0o700 });
        if (offset + f.size > (await p.stat()).size) fail('CHECKPOINT_TRUNCATED');
        await pipeline(createReadStream(plain, { start: offset, end: offset + f.size - 1 }),
          createWriteStream(output, { flags: 'wx', mode: 0o600 }));
        const actual = await fileDigest(output);
        if (actual.size !== f.size || actual.sha256 !== f.sha256) fail('CHECKPOINT_HASH_MISMATCH');
        offset += f.size;
      }
      if (offset !== (await p.stat()).size) fail('CHECKPOINT_TRAILING_DATA');
      await rm(plain); return manifest;
    } finally { await p.close(); }
  } catch (error) {
    await rm(outputDir, { recursive: true, force: true }); throw error;
  }
}
