// Launches Prisma Studio (classic CLI) against the Neon database.
// Why this exists: the project's Prisma 8 CLI has no `studio` command,
// and the v7 CLI chokes on the v8 `prisma.config.ts`, so we run it from
// the OS temp dir with an explicit `--url` loaded from the project `.env`.
// Usage: npm run studio  (then open http://localhost:5555)
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envLine = readFileSync(join(projectRoot, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((line) => line.startsWith('DATABASE_URL='));
const url = envLine?.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '');

if (!url) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('DB host:', new URL(url).host);
console.log('Starting Studio at http://localhost:5555 ...');

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['-p', 'prisma@7.10.0', 'prisma', 'studio', '--url', url, '--port', '5555', '--browser', 'none'],
  { cwd: tmpdir(), stdio: 'inherit' }
);
process.exit(result.status ?? 1);
