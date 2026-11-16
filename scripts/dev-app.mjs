// Runs the desktop app in development: compiles the main process, starts Vite, launches Electron.
import { execSync, spawn } from 'node:child_process';
import electron from 'electron';
import { createServer } from 'vite';

execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });

const server = await createServer();
await server.listen();
const url = server.resolvedUrls.local[0];

const child = spawn(electron, ['.'], { stdio: 'inherit', env: { ...process.env, VITE_DEV_SERVER_URL: url } });
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
