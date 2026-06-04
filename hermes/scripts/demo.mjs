#!/usr/bin/env node
/**
 * Hermes Demo Day — one-command launcher.
 *
 * Uso: npm run demo
 *
 * Hace:
 *   1. Verifica Docker daemon + hermes/.env
 *   2. docker compose up -d --build (postgres + mailhog + hermes)
 *   3. Espera a que hermes reporte healthy
 *   4. Smoke /health
 *   5. Lanza cloudflared tunnel quick + captura URL pública
 *   6. Imprime resumen con endpoints + pedidos demo
 *   7. Queda corriendo hasta Ctrl+C (entonces tira cloudflared + docker compose)
 *
 * Cross-platform: detecta cloudflared en Windows (Program Files) o PATH (Mac/Linux).
 */

import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HERMES_DIR = join(__dirname, '..');

const step = (msg) => console.log(`\n→ ${msg}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ⚠ ${msg}`);
const fail = (msg) => { console.error(`  ✗ ${msg}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// Resolver cloudflared cross-platform
// ─────────────────────────────────────────────────────────────
function findCloudflared() {
  if (platform() === 'win32') {
    const winPaths = [
      'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
      'C:\\Program Files\\cloudflared\\cloudflared.exe',
    ];
    for (const p of winPaths) {
      if (existsSync(p)) return p;
    }
  }
  // Mac/Linux: asumir en PATH
  try {
    execSync('cloudflared --version', { stdio: 'pipe' });
    return 'cloudflared';
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Step 1 — Verificar Docker
// ─────────────────────────────────────────────────────────────
step('Verificando Docker daemon');
try {
  execSync('docker info', { stdio: 'pipe' });
  ok('Docker daemon corriendo');
} catch {
  fail('Docker no está corriendo. Abre Docker Desktop y reintenta.');
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Verificar .env
// ─────────────────────────────────────────────────────────────
step('Verificando hermes/.env');
const envPath = join(HERMES_DIR, '.env');
const envExamplePath = join(HERMES_DIR, '.env.example');
if (!existsSync(envPath)) {
  if (existsSync(envExamplePath)) {
    fail(`hermes/.env no existe. Copia .env.example: cp ${envExamplePath} ${envPath}`);
  } else {
    fail('hermes/.env y .env.example no existen. Configura las variables antes de continuar.');
  }
}
ok('.env presente');

// ─────────────────────────────────────────────────────────────
// Step 3 — docker compose up
// ─────────────────────────────────────────────────────────────
step('Levantando stack Docker (puede tardar 30-60s la primera vez)');
try {
  execSync('docker compose up -d --build', {
    cwd: HERMES_DIR,
    stdio: 'inherit',
  });
  ok('Stack iniciado');
} catch {
  fail('docker compose up falló');
}

// ─────────────────────────────────────────────────────────────
// Step 4 — Esperar a hermes healthy
// ─────────────────────────────────────────────────────────────
step('Esperando a que Hermes reporte healthy (max 90s)');
let healthy = false;
for (let i = 0; i < 30; i++) {
  try {
    const out = execSync('docker compose ps --format "{{.Service}}|{{.Status}}"', {
      cwd: HERMES_DIR,
      encoding: 'utf-8',
    });
    if (/hermes\|Up.*\(healthy\)/.test(out)) {
      healthy = true;
      break;
    }
  } catch {}
  process.stdout.write('.');
  await sleep(3000);
}
process.stdout.write('\n');
if (!healthy) {
  warn('Hermes no reportó (healthy) en 90s. Continuando — puede estar warming.');
} else {
  ok('Hermes healthy');
}

// ─────────────────────────────────────────────────────────────
// Step 5 — Smoke /health
// ─────────────────────────────────────────────────────────────
step('Smoke /health');
try {
  const res = execSync('curl -sS --max-time 5 http://localhost:3000/health', { encoding: 'utf-8' });
  if (res.includes('"status":"ok"')) {
    ok('/health → 200');
  } else {
    warn(`/health respondió pero status inesperado: ${res}`);
  }
} catch {
  fail('/health no responde en localhost:3000');
}

// ─────────────────────────────────────────────────────────────
// Step 6 — Cloudflare Tunnel
// ─────────────────────────────────────────────────────────────
const cfPath = findCloudflared();
let cfProcess = null;
let tunnelUrl = null;

if (!cfPath) {
  warn('cloudflared no encontrado.');
  warn('Para exposer Hermes a Internet (necesario para sandbox SFCC):');
  warn('  Windows:  winget install --id Cloudflare.cloudflared');
  warn('  Mac:      brew install cloudflared');
  warn('  Linux:    https://pkg.cloudflare.com/');
  warn('Demo continúa sin tunnel — solo localhost disponible.');
} else {
  step(`Lanzando Cloudflare Tunnel (cloudflared en ${cfPath})`);
  cfProcess = spawn(cfPath, ['tunnel', '--url', 'http://localhost:3000', '--protocol', 'http2'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const onData = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[\w-]+\.trycloudflare\.com/);
    if (match && !tunnelUrl) {
      tunnelUrl = match[0];
      ok(`Tunnel arriba: ${tunnelUrl}`);
      printSummary();
    }
  };
  cfProcess.stdout.on('data', onData);
  cfProcess.stderr.on('data', onData);

  cfProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n✗ cloudflared salió con código ${code}`);
    }
  });

  // Esperar hasta 20s a que aparezca la URL
  for (let i = 0; i < 20 && !tunnelUrl; i++) {
    process.stdout.write('.');
    await sleep(1000);
  }
  process.stdout.write('\n');
  if (!tunnelUrl) {
    warn('Tunnel no reportó URL en 20s. Demo continúa solo con localhost.');
    warn('Posibles causas: firewall corporativo bloqueando puerto 7844, WARP activo, o falta de conectividad.');
  }
}

if (!tunnelUrl) {
  printSummary();
}

// ─────────────────────────────────────────────────────────────
// Cleanup on SIGINT/SIGTERM
// ─────────────────────────────────────────────────────────────
let shuttingDown = false;
async function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n\n→ Cerrando demo...');

  if (cfProcess && !cfProcess.killed) {
    try {
      if (platform() === 'win32') {
        execSync(`taskkill /F /IM cloudflared.exe`, { stdio: 'ignore' });
      } else {
        cfProcess.kill('SIGTERM');
      }
      ok('cloudflared killed');
    } catch {
      warn('No se pudo matar cloudflared limpio (puede quedar huérfano)');
    }
  }

  try {
    execSync('docker compose down', { cwd: HERMES_DIR, stdio: 'inherit' });
    ok('Stack Docker tirado (volumen postgres preservado)');
  } catch {
    warn('docker compose down falló');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Keep alive
console.log('\n  Presiona Ctrl+C para cerrar todo limpio.');
setInterval(() => {}, 1 << 30);

// ─────────────────────────────────────────────────────────────
// Print summary
// ─────────────────────────────────────────────────────────────
function printSummary() {
  const line = '─'.repeat(72);
  console.log('\n' + line);
  console.log('  HERMES DEMO LISTO');
  console.log(line);
  console.log(`  Local:        http://localhost:3000`);
  console.log(`  Health:       http://localhost:3000/health`);
  console.log(`  Test widget:  http://localhost:3000/widget/test.html`);
  console.log(`  Widget config: http://localhost:3000/widget/config?brand=patprimo`);
  if (tunnelUrl) {
    console.log('');
    console.log(`  Tunnel HTTPS: ${tunnelUrl}`);
    console.log(`  Test público: ${tunnelUrl}/widget/test.html`);
  }
  console.log('');
  console.log('  Pedidos demo disponibles (SFCC_MODE=mock):');
  console.log('    PP-2026-0001  En tránsito   ETA 2026-06-05');
  console.log('    PP-2026-0002  Entregado     —');
  console.log('    PP-2026-0003  Procesando    ETA 2026-06-10');
  console.log('    PP-2026-0004  Cancelado     —');
  console.log('');
  console.log('  Smoke Caso 1 manual:');
  console.log(`    curl -X POST ${tunnelUrl || 'http://localhost:3000'}/chat \\`);
  console.log(`      -H "Content-Type: application/json" \\`);
  console.log(`      -d '{"conversation_id":"<uuid>","brand":"patprimo","message":"Si, acepto"}'`);
  console.log('');
  console.log('  Para parar todo: Ctrl+C aquí (o "npm run demo:stop" desde otra terminal)');
  console.log(line + '\n');
}
