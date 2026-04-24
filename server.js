/**
 * Sovereign ERP – Hostinger Node.js entry point
 * 
 * Features:
 * 1. Self-healing build (detects missing BUILD_ID).
 * 2. Resource-limited build (1 CPU, limited memory for shared hosts).
 * 3. Maintenance Server during build phase.
 * 4. Retry-with-backoff for port binding (handles EADDRINUSE from zombie processes).
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const http = require('http');
const net  = require('net');

const ROOT     = __dirname;
const FRONTEND = path.join(ROOT, 'Frontend');
const PORT     = parseInt(process.env.PORT, 10) || 3000;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/** Wait for port to become free, with retries */
function waitForPort(port, maxRetries, delay) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    function tryPort() {
      attempt++;
      const tester = net.createServer();
      tester.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${port} busy (attempt ${attempt}/${maxRetries}). Retrying in ${delay / 1000}s...`);
          if (attempt >= maxRetries) {
            // Last resort: try to kill whatever is on the port
            try { execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' }); } catch (e) {}
            reject(new Error(`Port ${port} still in use after ${maxRetries} attempts.`));
          } else {
            setTimeout(tryPort, delay);
          }
        } else {
          reject(err);
        }
      });
      tester.once('listening', () => {
        tester.close(() => {
          log(`Port ${port} is free.`);
          resolve();
        });
      });
      tester.listen(port, '0.0.0.0');
    }
    tryPort();
  });
}

// ── Step 1: Build with Maintenance Server ───────────────────────────────────
async function ensureBuild() {
  const nextDir = path.join(FRONTEND, '.next');
  const buildId = path.join(FRONTEND, '.next', 'BUILD_ID');

  if (fs.existsSync(buildId)) {
    log('Build OK (BUILD_ID: ' + fs.readFileSync(buildId, 'utf8').trim() + ')');
    return;
  }

  log('BUILD_ID missing — need to build.');

  // Ensure dependencies are installed first (before binding to port)
  if (!findNextEntry()) {
    log('next CLI missing — running npm install...');
    try {
      execSync('npm install', { 
        cwd: ROOT, 
        stdio: 'inherit',
        env: { ...process.env, PATH: path.dirname(NODE_BIN) + path.delimiter + (process.env.PATH || '') }
      });
    } catch (e) {
      log('npm install failed: ' + e.message);
      process.exit(1);
    }
  }

  const nextEntry = findNextEntry();
  if (!nextEntry) {
    log('FATAL: Cannot find next CLI even after npm install.');
    process.exit(1);
  }

  // Wait for port to be free before starting maintenance server
  await waitForPort(PORT, 15, 3000);

  // Start maintenance server
  const connections = new Set();
  const maintenanceServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sovereign ERP | System Update</title>
        <style>
          body { background: #0A0A0F; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #111118; padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); text-align: center; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
          h1 { color: #2B7A42; margin-top: 0; font-size: 24px; }
          p { color: #A1A1AA; font-size: 15px; line-height: 1.6; }
          .spinner { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #2B7A42; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Sovereign ERP</h1>
          <p>We are currently updating the application. This usually takes 2-5 minutes.</p>
          <div class="spinner"></div>
          <p style="font-size: 12px;">This page will automatically refresh when ready.</p>
          <script>setTimeout(() => location.reload(), 20000);</script>
        </div>
      </body>
      </html>
    `);
  });

  maintenanceServer.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });

  maintenanceServer.listen(PORT, '0.0.0.0');
  log('Maintenance server listening on port: ' + PORT);

  if (fs.existsSync(nextDir)) {
    log('Cleaning partial .next directory...');
    fs.rmSync(nextDir, { recursive: true, force: true });
  }

  log('Starting build...');

  await new Promise((resolve, reject) => {
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

    build.on('error', (err) => reject(err));
    build.on('close', (code) => {
      if (code === 0) {
        log('Build successful.');
        resolve();
      } else {
        reject(new Error('Build failed with code ' + code));
      }
    });
  });

  // Stop maintenance server and release port
  log('Stopping maintenance server...');
  for (const conn of connections) conn.destroy();
  await new Promise((resolve) => maintenanceServer.close(resolve));
  log('Maintenance server stopped. Waiting for port release...');
  
  // Give OS time to fully release the port
  await new Promise((r) => setTimeout(r, 3000));
}

// ── Step 2: Run ──────────────────────────────────────────────────────────────
async function main() {
  await ensureBuild();

  const nextEntry = findNextEntry();
  if (!nextEntry) {
    log('FATAL: Cannot find next CLI for starting server.');
    process.exit(1);
  }

  // Wait for port to be completely free (handles zombie processes from previous runs)
  log('Waiting for port ' + PORT + ' to be available...');
  await waitForPort(PORT, 20, 2000);

  log('Starting Next.js production server...');

  const logStream = fs.createWriteStream(path.join(ROOT, 'production.log'), { flags: 'a' });
  
  const child = spawn(NODE_BIN, [nextEntry, 'start', '-H', '0.0.0.0', '-p', String(PORT)], {
    cwd: FRONTEND,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      NEXT_CPU_COUNT: '1',
      NODE_OPTIONS: '--max-old-space-size=1024',
      PATH: path.dirname(NODE_BIN) + path.delimiter + (process.env.PATH || ''),
    },
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  child.on('error', (err) => { 
    log('Spawn error: ' + err.message); 
    process.exit(1); 
  });
  
  child.on('close', (code) => { 
    log('Next.js process exited with code ' + code); 
    process.exit(code || 0); 
  });

  // Heartbeat every 60 seconds
  setInterval(() => {
    log('Heartbeat: alive');
  }, 60000);

  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT',  () => child.kill('SIGINT'));
}

main().catch(err => {
  log('Fatal main error: ' + err.stack);
  process.exit(1);
});
