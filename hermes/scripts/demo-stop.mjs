#!/usr/bin/env node
/**
 * Hermes Demo Day — cleanup explícito.
 *
 * Uso: npm run demo:stop
 *
 * Mata cualquier cloudflared corriendo + tira el stack Docker.
 * Útil si el script principal se cae o queda un proceso huérfano.
 */

import { execSync, spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HERMES_DIR = join(__dirname, '..');

console.log('→ Matando cloudflared...');
if (platform() === 'win32') {
  spawnSync('taskkill', ['/F', '/IM', 'cloudflared.exe'], { stdio: 'ignore' });
} else {
  spawnSync('pkill', ['-f', 'cloudflared tunnel'], { stdio: 'ignore' });
}
console.log('  ✓ cloudflared killed (si estaba corriendo)');

console.log('→ Tirando stack Docker (volumen postgres preservado)...');
try {
  execSync('docker compose down', { cwd: HERMES_DIR, stdio: 'inherit' });
  console.log('  ✓ Stack down');
} catch {
  console.error('  ✗ docker compose down falló (¿Docker no corre?)');
  process.exit(1);
}

console.log('\nPara borrar TAMBIÉN el volumen postgres (perder migrations + seed):');
console.log('  cd hermes && docker compose down -v');
