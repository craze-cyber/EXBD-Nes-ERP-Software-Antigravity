/**
 * Sovereign ERP – Hostinger Node.js entry point
 *
 * Hostinger deploys git-tracked files to `nodejs/` but the .next/ build
 * output is gitignored and never copied there. This script builds the app
 * on first start if .next/ is missing, then starts the server.
 */
const { execFileSync, spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT     = __dirname;
const FRONTEND = path.join(ROOT, 'Frontend');
const PORT     = process.env.PORT || '3000';

// npm lives next to the node binary on Hostinger
const NODE_BIN = process.execPath;
const NPM_BIN  = path.join(path.dirname(NODE_BIN), 'npm');

function log(msg) { console.log('[Sovereign ERP]', msg); }

log('==================');
log('ROOT:     ' + ROOT);
log('FRONTEND: ' + FRONTEND);
log('PORT:     ' + PORT);
log('node:     ' + NODE_BIN);
log('npm:      ' + NPM_BIN + (fs.existsSync(NPM_BIN) ? ' ✓' : ' ✗'));
log('==================');

// ── Step 1: Install deps if node_modules is missing ──────────────────────────
if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
  log('node_modules missing — running npm install...');
  execFileSync(NPM_BIN, ['install'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  log('npm install complete.');
}

// ── Step 2: Build if .next is missing ────────────────────────────────────────
const nextDir = path.join(FRONTEND, '.next');
if (!fs.existsSync(nextDir)) {
  log('.next not found — running npm run build...');
  try {
    execFileSync(NPM_BIN, ['run', 'build', '--workspace=@sovereign/frontend'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    log('Build complete.');
  } catch (err) {
    log('Build failed: ' + err.message);
    process.exit(1);
  }
} else {
  log('.next exists — skipping build.');
}

// ── Step 3: Find next/dist/bin/next ──────────────────────────────────────────
function findNextEntry() {
  const candidates = [
    path.join(ROOT,     'node_modules', 'next', 'dist', 'bin', 'next'),
    path.join(FRONTEND, 'node_modules', 'next', 'dist', 'bin', 'next'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { log('next CLI: ' + c); return c; }
  }
  return null;
}

const nextEntry = findNextEntry();
if (!nextEntry) {
  log('FATAL: Cannot find next/dist/bin/next');
  process.exit(1);
}

// ── Step 4: Start Next.js ─────────────────────────────────────────────────────
log('Starting next start on port ' + PORT);

const child = spawn(NODE_BIN, [nextEntry, 'start', '-p', PORT], {
  cwd: FRONTEND,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
});

child.on('error', (err) => { log('Spawn error: ' + err.message); process.exit(1); });
child.on('close', (code) => { log('Exited: ' + code); process.exit(code || 0); });
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT',  () => child.kill('SIGINT'));
