/**
 * Sovereign ERP – Hostinger Node.js entry point
 *
 * Uses npm workspaces to delegate to `next start` inside Frontend/.
 * npm handles all binary path resolution correctly across platforms.
 */
const { spawn } = require('child_process');

const PORT     = process.env.PORT || '3000';
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log('[Sovereign ERP] Starting...');
console.log('[Sovereign ERP] PORT:', PORT);
console.log('[Sovereign ERP] NODE_ENV:', NODE_ENV);
console.log('[Sovereign ERP] CWD:', __dirname);

const child = spawn(
  'npm',
  ['run', 'start', '--workspace=@sovereign/frontend'],
  {
    shell: true,          // required so the OS finds npm via PATH
    cwd: __dirname,       // run from monorepo root
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV,
    },
  }
);

child.on('error', (err) => {
  console.error('[Sovereign ERP] Failed to start:', err.message);
  process.exit(1);
});

child.on('close', (code) => {
  console.log('[Sovereign ERP] Process closed with code:', code);
  process.exit(code || 0);
});

process.on('SIGTERM', () => { console.log('SIGTERM'); child.kill('SIGTERM'); });
process.on('SIGINT',  () => { console.log('SIGINT');  child.kill('SIGINT');  });
