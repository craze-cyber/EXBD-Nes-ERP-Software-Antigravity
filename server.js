/**
 * Sovereign ERP – Hostinger Node.js entry point
 * 
 * Uses Next.js programmatic API with a custom HTTP server.
 * This is the most reliable way to run on Hostinger because:
 * 1. We control the HTTP server directly (works with both sockets and ports).
 * 2. No EADDRINUSE — single process, single server.
 * 3. No child process spawning — simpler and more stable.
 */
const path = require('path');
const fs   = require('fs');
const http = require('http');
const { execSync } = require('child_process');

const ROOT     = __dirname;
const FRONTEND = path.join(ROOT, 'Frontend');
const PORT     = process.env.PORT || 3000;
const NODE_BIN = process.execPath;

function log(msg) { console.log('[Sovereign ERP]', msg); }

// Global error handlers — keep process alive
process.on('uncaughtException', (err) => { log('UNCAUGHT: ' + err.stack); });
process.on('unhandledRejection', (reason) => { log('UNHANDLED: ' + reason); });

log('==================');
log('ROOT:     ' + ROOT);
log('FRONTEND: ' + FRONTEND);
log('PORT:     ' + PORT);
log('node:     ' + NODE_BIN);
log('==================');

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Step 1: Ensure build exists ─────────────────────────────────────────────

function ensureBuild() {
  const nextDir = path.join(FRONTEND, '.next');
  const buildId = path.join(nextDir, 'BUILD_ID');

  if (fs.existsSync(buildId)) {
    log('Build OK (BUILD_ID: ' + fs.readFileSync(buildId, 'utf8').trim() + ')');
    return;
  }

  log('BUILD_ID missing — need to build.');

  // Ensure next CLI exists
  if (!findNextEntry()) {
    log('next CLI missing — running npm install...');
    execSync('npm install', {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, PATH: path.dirname(NODE_BIN) + path.delimiter + (process.env.PATH || '') }
    });
  }

  const nextEntry = findNextEntry();
  if (!nextEntry) {
    log('FATAL: Cannot find next CLI.');
    process.exit(1);
  }

  // Clean partial builds
  if (fs.existsSync(nextDir)) {
    log('Cleaning partial .next directory...');
    fs.rmSync(nextDir, { recursive: true, force: true });
  }

  log('Starting synchronous build (this will take 2-5 minutes)...');
  execSync(`"${NODE_BIN}" "${nextEntry}" build --webpack`, {
    cwd: FRONTEND,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_CPU_COUNT: '1',
      NODE_OPTIONS: '--max-old-space-size=1024',
      PATH: path.dirname(NODE_BIN) + path.delimiter + (process.env.PATH || ''),
    },
  });

  if (!fs.existsSync(buildId)) {
    log('FATAL: Build completed but BUILD_ID not found.');
    process.exit(1);
  }

  log('Build successful!');
}

// ── Step 2: Start using Next.js programmatic API ────────────────────────────

async function main() {
  ensureBuild();

  // Require Next.js from the project
  const nextPath = path.join(FRONTEND, 'node_modules', 'next');
  if (!fs.existsSync(nextPath)) {
    log('FATAL: next module not found at ' + nextPath);
    process.exit(1);
  }

  const next = require(nextPath);

  log('Initializing Next.js app...');
  const app = next({
    dev: false,
    dir: FRONTEND,
    conf: {
      // Ensure it doesn't try to listen on its own port
    },
  });

  const handle = app.getRequestHandler();

  await app.prepare();
  log('Next.js app prepared.');

  // Create our own HTTP server
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  // Listen — works with both port numbers and Unix socket paths
  const isSocket = isNaN(parseInt(PORT, 10));
  
  if (isSocket) {
    // Unix socket — remove stale socket file if it exists
    if (fs.existsSync(PORT)) {
      fs.unlinkSync(PORT);
    }
    server.listen(PORT, () => {
      log('Server listening on socket: ' + PORT);
    });
  } else {
    server.listen(parseInt(PORT, 10), '0.0.0.0', () => {
      log('Server listening on http://0.0.0.0:' + PORT);
    });
  }

  server.on('error', (err) => {
    log('Server error: ' + err.message);
    if (err.code === 'EADDRINUSE') {
      log('Port ' + PORT + ' is busy. Retrying in 5 seconds...');
      setTimeout(() => {
        server.close();
        server.listen(parseInt(PORT, 10), '0.0.0.0');
      }, 5000);
    }
  });

  // Heartbeat
  setInterval(() => { log('Heartbeat: alive'); }, 120000);

  // Graceful shutdown
  const shutdown = () => {
    log('Shutting down...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  log('Fatal: ' + err.stack);
  process.exit(1);
});
