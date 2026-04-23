/**
 * Sovereign ERP – Hostinger Node.js entry point
 *
 * Runs next/dist/bin/next directly via the node binary.
 * This bypasses shell scripts (.bin/next) which may lack execute permissions
 * on Hostinger's shared hosting environment.
 */
const { execFileSync, spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT     = __dirname;
const FRONTEND = path.join(ROOT, 'Frontend');
const PORT     = process.env.PORT || '3000';
const NODE_BIN = process.execPath;

function log(msg) { console.log('[Sovereign ERP]', msg); }

log('ROOT:     ' + ROOT);
log('FRONTEND: ' + FRONTEND);
log('PORT:     ' + PORT);
log('node:     ' + NODE_BIN);

// ── Step 1: Locate next/dist/bin/next (plain JS file, no +x needed) ─────────
function findNextEntry() {
  const candidates = [
    path.join(ROOT,     'node_modules', 'next', 'dist', 'bin', 'next'),
    path.join(FRONTEND, 'node_modules', 'next', 'dist', 'bin', 'next'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const nextEntry = findNextEntry();
if (!nextEntry) {
  log('FATAL: Cannot find next/dist/bin/next. node_modules may be missing.');
  process.exit(1);
}
log('next CLI: ' + nextEntry);

// ── Step 2: Build if .next is missing ────────────────────────────────────────────
// Use `node next/dist/bin/next build` — avoids sh -c and permission issues
const nextDir = path.join(FRONTEND, '.next');
if (!fs.existsSync(nextDir)) {
  log('.next not found — running: node next build');
  try {
    execFileSync(NODE_BIN, [nextEntry, 'build'], {
      cwd: FRONTEND,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        // Ensure node binary dir is in PATH so any sub-processes work
        PATH: path.dirname(NODE_BIN) + ':' + (process.env.PATH || ''),
      },
    });
    log('Build complete.');
  } catch (err) {
    log('Build failed: ' + err.message);
    process.exit(1);
  }
} else {
  log('.next found — skipping build.');
}

// ── Step 3: Start ───────────────────────────────────────────────────────────
log('Starting: node next start -p ' + PORT);
const child = spawn(NODE_BIN, [nextEntry, 'start', '-p', PORT], {
  cwd: FRONTEND,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: process.env.NODE_ENV || 'production',
    PATH: path.dirname(NODE_BIN) + ':' + (process.env.PATH || ''),
  },
});

child.on('error', (err) => { log('Spawn error: ' + err.message); process.exit(1); });
child.on('close', (code) => { log('Exited: ' + code); process.exit(code || 0); });
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT',  () => child.kill('SIGINT'));
