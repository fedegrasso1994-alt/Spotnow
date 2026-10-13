import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// This release guard covers font dependencies, not every possible network call.
export function assertLocalFonts(content) {
  if (/fonts\.(?:googleapis|gstatic)\.com|@import\s+(?:url\s*\()?\s*["']?(?:https?:)?\/\//i.test(content)) {
    throw new Error('Remote font or stylesheet dependency');
  }
  for (const match of content.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
    if (/(?:\.woff2?|\.ttf|\.otf)(?:[?#]|$)/i.test(match[1]) && !match[1].startsWith('/fonts/')) {
      throw new Error('Font must be served from /fonts/');
    }
  }
}

// Optional sanitized HAR check: caller supplies only explicitly approved origins.
// Never print URLs, queries, headers or bodies containing user/session data.
export function assertApprovedRequests(har, approvedOrigins) {
  const allowed = new Set(approvedOrigins);
  for (const entry of har?.log?.entries ?? []) {
    const url = new URL(entry.request.url);
    if (!allowed.has(url.origin)) throw new Error(`Unapproved request origin: ${url.origin}`);
    if (/^fonts\.(googleapis|gstatic)\.com$/i.test(url.hostname)) throw new Error('Remote font request');
  }
}

export async function checkLocalFonts(root = 'dist') {
  const manifest = JSON.parse(await readFile('docs/soma-fonts-manifest-2026-10-11.json', 'utf8'));
  const css = await readFile(path.join(root, 'fonts/fonts.css'), 'utf8');
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  assertLocalFonts(css);
  assertLocalFonts(html);
  if (!html.includes('/fonts/fonts.css')) throw new Error('Missing local font stylesheet');
  const refs = new Set([...css.matchAll(/url\(([^)]+)\)/g)].map(m => m[1]));
  for (const asset of manifest.assets) {
    const local = '/' + asset.file.replace(/^public\//, '');
    if (!refs.has(local)) throw new Error('Font manifest/stylesheet mismatch');
    const bytes = await readFile(path.join(root, local.slice(1)));
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Font integrity mismatch');
  }
  if (refs.size !== manifest.assets.length) throw new Error('Untracked font asset');
  for (const file of await readdir(path.join(root, 'assets'))) {
    if (/\.(css|js)$/.test(file)) assertLocalFonts(await readFile(path.join(root, 'assets', file), 'utf8'));
  }
  for (const family of ['inter', 'bebasneue']) {
    if (!(await readFile(path.join(root, `fonts/LICENSE-${family}.txt`), 'utf8')).includes('SIL OPEN FONT LICENSE')) {
      throw new Error('Missing font license');
    }
  }
  return manifest.assets.length;
}
