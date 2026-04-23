/**
 * Sovereign ERP – Hostinger Node.js entry point
 *
 * Runs the Next.js CLI directly using `process.execPath` (the node binary)
 * to run `next/dist/bin/next start`. No shell needed, no PATH lookup,
 * no binary script resolution issues.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT     = __dirname;
const FRONTEND = path.join(ROOT, 'Frontend');
const PORT     = process.env.PORT || '3000';

console.log('[Sovereign ERP] ==================');
console.log('[Sovereign ERP] ROOT:    ', ROOT);
console.log('[Sovereign ERP] FRONTEND:', FRONTEND);
console.log('[Sovereign ERP] PORT:    ', PORT);
console.log('[Sovereign ERP] node:    ', process.execPath);
console.log('[Sovereign ERP] ==================');

// Locate next/dist/bin/next (the actual JS entry point, not a shell script)
function findNextEntry() {
  const candidates = [
    path.join(ROOT,     'node_modules', 'next', 'dist', 'bin', 'next'),
    path.join(FRONTEND, 'node_modules', 'next', 'dist', 'bin', 'next'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      console.log('[Sovereign ERP] next CLI found:', c);
      return c;
    }
    console.log('[Sovereign ERP] not found:', c);
  }
  return null;
}

const nextEntry = findNextEntry();

if (!nextEntry) {
  console.error('[Sovereign ERP] FATAL: Cannot locate next/dist/bin/next. Is node_modules installed?');
  process.exit(1);
}

if (!fs.existsSync(path.join(FRONTEND, '.next'))) {
  console.error('[Sovereign ERP] FATAL: Frontend/.next not found. Did the build succeed?');
  process.exit(1);
}

// Spawn node directly (no shell) — guaranteed to work
const child = spawn(
  process.execPath,            // /usr/bin/node or wherever node lives
  [nextEntry, 'start', '-p', PORT],
  {
    cwd: FRONTEND,             // run from Frontend/ so .next is found
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
  }
);

child.on('error', (err) => {
  console.error('[Sovereign ERP] Spawn error:', err.message);
  process.exit(1);
});

child.on('close', (code) => {
  console.log('[Sovereign ERP] Exited with code:', code);
  process.exit(code || 0);
});

process.on('SIGTERM', () => { child.kill('SIGTERM'); });
process.on('SIGINT',  () => { child.kill('SIGINT');  });
