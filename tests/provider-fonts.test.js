import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, mkdir, cp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {assertLocalFonts, assertApprovedRequests, checkLocalFonts} from '../scripts/check-third-party-runtime.mjs';

test('fonts preserve families, weights and Unicode subsets without external requests', async () => {
  const css = await readFile('public/fonts/fonts.css', 'utf8');
  assertLocalFonts(css);
  assert.equal([...css.matchAll(/@font-face/g)].length, 37);
  for (const weight of [400,500,600,700,800]) assert.ok(css.includes(`font-weight: ${weight};`));
  for (const family of ['Bebas Neue','Inter']) assert.ok(css.includes(`font-family: '${family}';`));
  assert.ok(css.includes('unicode-range:'));
  assert.ok(css.includes('font-display: swap;'));
  assertLocalFonts(await readFile('index.html', 'utf8'));
});

test('remote font links, imports and font sources fail the release guard', () => {
  for (const text of ['https://fonts.googleapis.com/css2', 'https://fonts.gstatic.com/x.woff2', '@import "https://external.example/style.css";', 'src:url(https://external.example/font.woff2)']) {
    assert.throws(() => assertLocalFonts(text));
  }
  assert.doesNotThrow(() => assertLocalFonts('src:url(/fonts/inter.woff2);'));
});

test('network trace rejects unapproved origins without exposing tokens', () => {
  const har = url => ({log:{entries:[{request:{url}}]}});
  assert.doesNotThrow(() => assertApprovedRequests(har('https://soma.example/fonts/x.woff2'), ['https://soma.example']));
  assert.throws(() => assertApprovedRequests(har('https://external.example/p?token=private'), []), error => !error.message.includes('private'));
  assert.throws(() => assertApprovedRequests(har('https://fonts.gstatic.com/x.woff2'), ['https://fonts.gstatic.com']));
});

test('both deployment configurations restrict fonts to same origin', async () => {
  for (const name of ['vercel.json','vercel.static.json']) {
    const config = JSON.parse(await readFile(name, 'utf8'));
    assert.ok(config.headers.find(h => h.source === '/(.*)').headers.some(h => h.key === 'Content-Security-Policy' && h.value.includes("font-src 'self'")));
  }
});

test('release guard verifies all font bytes and fails on a corrupted asset', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'soma-font-check-'));
  try {
    await cp('public/fonts', path.join(root, 'fonts'), {recursive:true});
    await mkdir(path.join(root, 'assets'));
    await cp('index.html', path.join(root, 'index.html'));
    assert.equal(await checkLocalFonts(root), 9);
    const manifest = JSON.parse(await readFile('docs/soma-fonts-manifest-2026-10-11.json', 'utf8'));
    await writeFile(path.join(root, manifest.assets[0].file.replace('public/', '')), 'corrupted');
    await assert.rejects(checkLocalFonts(root), /integrity/);
  } finally { await rm(root, {recursive:true, force:true}); }
});
