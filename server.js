/**
 * Sovereign ERP – Hostinger Node.js entry point
 *
 * In an npm workspace (monorepo), packages like `next` are hoisted to the
 * ROOT node_modules. This file uses an absolute path to find `next` and
 * starts it from the correct working directory (Frontend/).
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR     = __dirname;
const FRONTEND_DIR = path.join(ROOT_DIR, 'Frontend');
const PORT         = process.env.PORT || '3000';
const IS_WINDOWS   = process.platform === 'win32';

// Resolve the `next` binary – check root first (hoisted), then Frontend
function resolveNextBin() {
  const candidates = [
    path.join(ROOT_DIR, 'node_modules', '.bin', IS_WINDOWS ? 'next.cmd' : 'next'),
    path.join(FRONTEND_DIR, 'node_modules', '.bin', IS_WINDOWS ? 'next.cmd' : 'next'),
    path.join(ROOT_DIR, 'node_modules', '.bin', 'next'),
    path.join(FRONTEND_DIR, 'node_modules', '.bin', 'next'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const nextBin = resolveNextBin();

console.log('=== Sovereign ERP Server ===');
console.log('Root dir:     ', ROOT_DIR);
console.log('Frontend dir: ', FRONTEND_DIR);
console.log('Next.js bin:  ', nextBin || 'NOT FOUND');
console.log('.next exists: ', fs.existsSync(path.join(FRONTEND_DIR, '.next')) ? 'YES' : 'NO - BUILD MISSING');
console.log('PORT:         ', PORT);
console.log('NODE_ENV:     ', process.env.NODE_ENV || 'production');
console.log('============================');

if (!nextBin) {
  console.error('FATAL: next binary not found in any node_modules. Run npm install first.');
  process.exit(1);
}

if (!fs.existsSync(path.join(FRONTEND_DIR, '.next'))) {
  console.error('FATAL: .next build directory not found. Run npm run build first.');
  process.exit(1);
}

const child = spawn(nextBin, ['start', '--port', PORT], {
  cwd: FRONTEND_DIR,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
});

child.on('error', (err) => {
  console.error('Failed to start Next.js process:', err.message);
  process.exit(1);
});

child.on('close', (code) => {
  console.log('Next.js process exited with code:', code);
  process.exit(code || 0);
});

process.on('SIGTERM', () => { console.log('SIGTERM received'); child.kill('SIGTERM'); });
process.on('SIGINT',  () => { console.log('SIGINT received');  child.kill('SIGINT');  });
