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
  let buildError = null;
  const connections = new Set();
  const maintenanceServer = http.createServer((req, res) => {
    res.writeHead(buildError ? 500 : 200, { 'Content-Type': 'text/html' });
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
          .error { color: #EF4444; background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 10px; border: 1px solid rgba(239, 68, 68, 0.2); font-family: monospace; font-size: 12px; margin-top: 20px; text-align: left; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Sovereign ERP</h1>
          ${buildError ? `
            <p>A problem occurred during the system update.</p>
            <div class="error">${buildError}</div>
            <p style="font-size: 12px; margin-top: 20px;">Please check Hostinger Runtime Logs for details.</p>
          ` : `
            <p>We are currently updating the application and building fresh assets. This process usually takes 2-5 minutes.</p>
            <div class="spinner"></div>
            <p style="font-size: 12px;">This page will automatically refresh when ready.</p>
            <script>setTimeout(() => location.reload(), 20000);</script>
          `}
        </div>
      </body>
      </html>
    `);
  });

  maintenanceServer.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });

  const stopMaintenance = (cb) => {
    log('Stopping maintenance server and forcing connection close...');
    for (const conn of connections) conn.destroy();
    maintenanceServer.close(cb);
  };

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
        env: { ...process.env, PATH: path.dirname(NODE_BIN) + path.delimiter + (process.env.PATH || '') }
      });
    } catch (e) {
      log('npm install failed: ' + e.message);
      buildError = 'npm install failed: ' + e.message;
    }
  }

  const nextEntry = findNextEntry();
  if (!nextEntry && !buildError) {
    buildError = 'FATAL: Cannot find next CLI even after npm install.';
  }

  if (buildError) {
    return new Promise(() => {}); 
  }

  log('BUILD_ID missing — starting build...');
  
  return new Promise((resolve) => {
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
      buildError = 'Build spawn error: ' + err.message;
    });

    build.on('close', (code) => {
      if (code === 0) {
        log('Build successful.');
        stopMaintenance(() => {
          log('Port released. Waiting 5 seconds for OS cleanup...');
          setTimeout(resolve, 5000);
        });
      } else {
        log('Build failed with code ' + code);
        buildError = 'Build failed with code ' + code + '. See logs for details.';
      }
    });
  });
}

// ── Step 3: Run ──────────────────────────────────────────────────────────────
async function main() {
  await ensureBuild();

  log('Starting Next.js production server directly...');
  
  const nextEntry = findNextEntry();
  if (!nextEntry) {
    log('FATAL: Cannot find next CLI for starting server.');
    process.exit(1);
  }

  const logStream = fs.createWriteStream(path.join(ROOT, 'production.log'), { flags: 'a' });
  
  const child = spawn(NODE_BIN, [nextEntry, 'start', '-p', String(PORT)], {
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
    fs.appendFileSync(path.join(ROOT, 'production.log'), 'Spawn error: ' + err.message + '\n');
    process.exit(1); 
  });
  
  child.on('close', (code) => { 
    log('Next.js process exited with code ' + code); 
    fs.appendFileSync(path.join(ROOT, 'production.log'), 'Next.js process exited with code ' + code + '\n');
    process.exit(code || 0); 
  });

  // Heartbeat
  setInterval(() => {
    log('Heartbeat: Process is alive.');
  }, 300000);

  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT',  () => child.kill('SIGINT'));
}

main().catch(err => {
  log('Fatal main error: ' + err.stack);
  process.exit(1);
});
