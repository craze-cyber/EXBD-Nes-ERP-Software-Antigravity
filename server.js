/**
 * Sovereign ERP – Hostinger Node.js entry point
 * 
 * Features:
 * 1. Self-healing build (detects missing BUILD_ID).
 * 2. Resource-limited build (1 CPU, limited memory for shared hosts).
 * 3. Maintenance Server: Responds with "Site Building" during the build phase
 *    to prevent 503 errors and satisfy the host's health checks.
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const http = require('http');

const ROOT     = __dirname;
const FRONTEND = path.join(ROOT, 'Frontend');
const PORT     = process.env.PORT || '3000';
const NODE_BIN = process.execPath;

function log(msg) { console.log('[Sovereign ERP]', msg); }

// Global error handlers
process.on('uncaughtException', (err) => { log('UNCAUGHT EXCEPTION: ' + err.stack); });
process.on('unhandledRejection', (reason) => { log('UNHANDLED REJECTION: ' + reason); });

log('==================');
log('ROOT:     ' + ROOT);
log('FRONTEND: ' + FRONTEND);
log('PORT:     ' + PORT);
log('node:     ' + NODE_BIN);
log('==================');

// ── Step 1: Locate next CLI ──────────────────────────────────────────────────
function findNextEntry() {
  const candidates = [
    path.join(ROOT,     'node_modules', 'next', 'dist', 'bin', 'next'),
    path.join(FRONTEND, 'node_modules', 'next', 'dist', 'bin', 'next'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      log('next CLI found: ' + c);
      return c;
    }
  }
  return null;
}

// ── Step 2: Build with Maintenance Server ───────────────────────────────────
async function ensureBuild() {
  const nextDir = path.join(FRONTEND, '.next');
  const buildId = path.join(FRONTEND, '.next', 'BUILD_ID');

  if (fs.existsSync(buildId)) {
    log('Build OK (BUILD_ID: ' + fs.readFileSync(buildId, 'utf8').trim() + ')');
    return;
  }

  // Start temporary server to prevent 503 during long build
  const maintenanceServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <div style="font-family:sans-serif;text-align:center;padding:50px;background:#0A0A0F;color:white;">
        <h1 style="color:#2B7A42;">Sovereign ERP</h1>
        <p>Updating and building application... This may take 2-5 minutes.</p>
        <p>This page will automatically refresh when ready.</p>
        <script>setTimeout(() => location.reload(), 15000);</script>
      </div>
    `);
  });

  if (isNaN(PORT)) {
    maintenanceServer.listen(PORT);
    log('Maintenance server listening on socket: ' + PORT);
  } else {
    maintenanceServer.listen(PORT, '0.0.0.0');
    log('Maintenance server listening on port: ' + PORT + ' (0.0.0.0)');
  }

  if (fs.existsSync(nextDir)) {
    log('Cleaning partial .next directory...');
    fs.rmSync(nextDir, { recursive: true, force: true });
  }

  // Ensure dependencies are installed
  if (!findNextEntry()) {
    log('next CLI missing — running npm install...');
    try {
      execSync('npm install', { 
        cwd: ROOT, 
        stdio: 'inherit',
        env: { ...process.env, PATH: path.dirname(NODE_BIN) + ':' + (process.env.PATH || '') }
      });
    } catch (e) {
      log('npm install failed: ' + e.message);
    }
  }

  const nextEntry = findNextEntry();
  if (!nextEntry) {
    log('FATAL: Cannot find next CLI even after npm install.');
    process.exit(1);
  }

  log('BUILD_ID missing — starting build...');
  
  return new Promise((resolve) => {
    // Explicitly use --webpack to avoid Turbopack thread issues on Hostinger
    const build = spawn(NODE_BIN, [nextEntry, 'build', '--webpack'], {
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

    build.on('error', (err) => {
      log('Build spawn error: ' + err.message);
      maintenanceServer.close(() => process.exit(1));
    });

    build.on('close', (code) => {
      maintenanceServer.close(() => {
        if (code === 0) {
          log('Build successful.');
          // Small delay to ensure port is released by the OS
          setTimeout(resolve, 2000);
        } else {
          log('Build failed with code ' + code);
          process.exit(1);
        }
      });
    });
  });
}

// ── Step 3: Run ──────────────────────────────────────────────────────────────
async function main() {
  await ensureBuild();

  const nextEntry = findNextEntry();
  log('Starting Next.js production server on ' + PORT);
  
  const startArgs = [nextEntry, 'start'];
  if (isNaN(PORT)) {
    startArgs.push('--port', PORT);
  } else {
    startArgs.push('--port', PORT, '--hostname', '0.0.0.0');
  }

  const child = spawn(NODE_BIN, startArgs, {
    cwd: FRONTEND,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      NEXT_CPU_COUNT: '1',
      NODE_OPTIONS: '--max-old-space-size=1024',
      PATH: path.dirname(NODE_BIN) + path.delimiter + (process.env.PATH || ''),
    },
  });

  child.on('error', (err) => { log('Spawn error: ' + err.message); process.exit(1); });
  child.on('close', (code) => { 
    log('Next.js process exited with code ' + code); 
    // Restart if it crashed? No, let Hostinger handle it or it might loop.
    process.exit(code || 0); 
  });

  // Heartbeat to prevent Hostinger from killing the process due to "inactivity"
  setInterval(() => {
    log('Heartbeat: Process is alive.');
  }, 300000); // Every 5 minutes

  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT',  () => child.kill('SIGINT'));
}

main().catch(err => {
  log('Fatal main error: ' + err.stack);
  process.exit(1);
});
