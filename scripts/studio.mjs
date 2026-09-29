// Launches Prisma Studio (classic CLI) against the Neon database.
// Why this exists: the project's Prisma 8 CLI has no `studio` command,
// and the v7 CLI chokes on the v8 `prisma.config.ts`, so we run a pinned
// v7 binary (`prisma-v7` devDependency) from the OS temp dir with an
// explicit `--url` loaded from the project `.env`.
// Usage: npm run studio  (wait for "Studio ready", then open http://localhost:5555)
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
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

const prismaBin = join(projectRoot, 'node_modules', 'prisma-v7', 'build', 'index.js');
if (!existsSync(prismaBin)) {
  console.error(`Missing ${prismaBin} — run: npm i -D prisma-v7@npm:prisma@7.10.0`);
  process.exit(1);
}

console.log('DB host:', new URL(url).host);

const child = spawn(
  process.execPath,
  [prismaBin, 'studio', '--url', url, '--port', '5555', '--browser', 'none'],
  { cwd: tmpdir(), stdio: 'inherit' }
);

child.on('error', (err) => {
  console.error('Failed to start Studio:', err.message);
  process.exit(1);
});
process.on('SIGINT', () => child.kill('SIGINT'));

const deadline = Date.now() + 90000;
let ready = false;
while (Date.now() < deadline) {
  if (child.exitCode !== null) {
    console.error(`Studio exited (code ${child.exitCode}) before becoming ready.`);
    process.exit(child.exitCode ?? 1);
  }
  await delay(1000);
  try {
    const res = await fetch('http://localhost:5555/');
    if (res.ok) {
      ready = true;
      break;
    }
  } catch {
    // not up yet
  }
}

if (!ready) {
  console.error('Timed out waiting for Studio at http://localhost:5555');
  child.kill();
  process.exit(1);
}

console.log('Studio ready — open http://localhost:5555');
await new Promise((resolve) => child.on('exit', resolve));
process.exit(child.exitCode ?? 0);
