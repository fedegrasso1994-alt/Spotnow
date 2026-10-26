import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { SOURCE } from './checkpoint-artifact.mjs';

const exec = promisify(execFile);
export const DOCKER = '/Applications/Docker.app/Contents/Resources/bin/docker';
export const POSTGRES_IMAGE = 'ghcr.io/supabase/postgres:17.11.0.004';

/** Parse CLI-generated environment without executing the generated shell program. Never log values. */
export function parseSourceEnvironment(script) {
  const env = {};
  for (const match of script.matchAll(/(?:^|\n)\s*(?:export\s+)?(PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)=("(?:\\.|[^"\\])*"|'[^']*'|[^\s]+)/g)) {
    let value = match[2];
    if (value.startsWith('"')) value = value.slice(1, -1).replace(/\\(["\\$`])/g, '$1');
    else if (value.startsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  if (['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'].some(k => !env[k]) ||
      !/^[a-z0-9.-]+\.supabase\.(?:co|com)$/.test(env.PGHOST) ||
      !['5432', '6543'].includes(env.PGPORT) || env.PGDATABASE !== 'postgres' ||
      !(env.PGHOST === `db.${SOURCE}.supabase.co` || env.PGUSER.endsWith(`.${SOURCE}`)))
    throw new Error('RECOVERY_SOURCE_IDENTITY_REFUSED');
  return env;
}

export async function sourceEnvironment() {
  try {
    const result = await exec('supabase', ['db', 'dump', '--project-ref', SOURCE, '--dry-run'],
      { maxBuffer: 4 * 1024 * 1024, timeout: 60000 });
    return parseSourceEnvironment(result.stdout);
  } catch { throw new Error('RECOVERY_SOURCE_AUTH_OR_IDENTITY_UNAVAILABLE'); }
}

export function sourceProcess(env, command, args) {
  // Source reader only. The restore containers stay on their separate, internal network.
  const flags = Object.keys(env).flatMap(k => ['--env', k]);
  return spawn(DOCKER, ['run', '--rm', '-i', '--network', 'bridge', ...flags,
    POSTGRES_IMAGE, command, ...args], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
}
