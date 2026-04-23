/**
 * Hostinger Node.js entry point.
 * Delegates to next start inside the Frontend workspace.
 */
const { execSync } = require('child_process');
const path = require('path');

const frontendDir = path.join(__dirname, 'Frontend');
const port = process.env.PORT || 3000;

console.log(`Starting Next.js server from ${frontendDir} on port ${port}`);

try {
  execSync(
    `node_modules/.bin/next start -p ${port}`,
    {
      cwd: frontendDir,
      stdio: 'inherit',
      env: { ...process.env },
    }
  );
} catch (err) {
  console.error('Failed to start Next.js server:', err.message);
  process.exit(1);
}
