#!/usr/bin/env node
/**
 * Hermes Smoke Suite — batería de 10 casos contra el endpoint /chat.
 *
 * Uso: npm run smoke:suite
 *
 * Asume que Hermes está corriendo en localhost:3000 (`npm run demo` u otro mecanismo).
 *
 * Cobertura:
 *   1. Happy path:        en_transito (PP-2026-0001)
 *   2. Estado entregado:  (PP-2026-0002)
 *   3. Estado procesando: (PP-2026-0003)
 *   4. Estado cancelado:  (PP-2026-0004)
 *   5. Estado preparando: (PP-2026-0005)
 *   6. Estado en_reparto: (PP-2026-0006)
 *   7. Estado devolución: (PP-2026-0007)
 *   8. Pedido inexistente (PP-2026-9999) → respuesta "no encuentro"
 *   9. Consent denied: responder "No autorizo" → consent_denied_text
 *  10. Multi-turn flow: saludo → acepto → 2 consultas seguidas
 *
 * Cada caso verifica:
 *   - HTTP status code esperado
 *   - Latencia razonable (<2000ms per NFR §1)
 *   - Texto de la respuesta contiene strings esperados
 *
 * Exit code:
 *   0 — todos los casos pasaron
 *   1 — al menos un caso falló (detalle por caso)
 */

import { randomUUID } from 'node:crypto';

const BASE = process.env.HERMES_BASE_URL ?? 'http://localhost:3000';
const NFR_LATENCY_MAX = 2000;

let pass = 0;
let fail = 0;
const failures = [];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function step(n, name) {
  console.log(`\n[${String(n).padStart(2, '0')}] ${name}`);
}
function ok(msg) { console.log(`     ✓ ${msg}`); }
function nok(msg) { console.log(`     ✗ ${msg}`); }

async function sendChat(conversationId, message) {
  const start = Date.now();
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversationId,
      brand: 'patprimo',
      message,
    }),
  });
  const latency = Date.now() - start;
  const body = await res.json();
  return { status: res.status, body, latency };
}

function check(label, condition, detail) {
  if (condition) {
    pass++;
    ok(`${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    failures.push(`${label} — ${detail ?? 'falló'}`);
    nok(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function run() {
  console.log(`Smoke Suite — base ${BASE}`);
  console.log('═'.repeat(72));

  // Pre-check: el server responde
  step(0, 'Pre-check /health');
  try {
    const r = await fetch(`${BASE}/health`);
    const body = await r.json();
    check('GET /health 200', r.status === 200, `status=${r.status}`);
    check('status=ok', body.status === 'ok', `body=${JSON.stringify(body)}`);
  } catch (err) {
    nok(`/health no responde — ¿está Hermes corriendo? (npm run demo)`);
    fail++;
    return summary();
  }

  // Helper: completa el consent gate en una conversation nueva
  async function setupConsentedConversation() {
    const convId = randomUUID();
    await sendChat(convId, 'Hola'); // turno 1: consent_request
    const turn2 = await sendChat(convId, 'Si, acepto'); // turno 2: consent granted
    return { convId, consentResponse: turn2 };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Casos 1-7: cada estado del enum
  // ───────────────────────────────────────────────────────────────────────────

  const stateCases = [
    { n: 1, id: 'PP-2026-0001', expect: 'tránsito', extra: 'TCC' },
    { n: 2, id: 'PP-2026-0002', expect: 'entregado', extra: null },
    { n: 3, id: 'PP-2026-0003', expect: 'procesando', extra: '2026-06-10' },
    { n: 4, id: 'PP-2026-0004', expect: 'cancelado', extra: null },
    { n: 5, id: 'PP-2026-0005', expect: 'preparando', extra: 'bodega' },
    { n: 6, id: 'PP-2026-0006', expect: 'reparto', extra: 'Coordinadora' },
    { n: 7, id: 'PP-2026-0007', expect: 'devolución', extra: 'Envia' },
  ];

  for (const tc of stateCases) {
    step(tc.n, `Pedido ${tc.id} (esperado: ${tc.expect})`);
    const { convId } = await setupConsentedConversation();
    const r = await sendChat(convId, `Cual es el estado de mi pedido ${tc.id}?`);
    check('HTTP 200', r.status === 200, `got ${r.status}`);
    check(`latencia < ${NFR_LATENCY_MAX}ms`, r.latency < NFR_LATENCY_MAX, `${r.latency}ms`);
    check('respuesta contiene order_id', r.body.text?.includes(tc.id), `text="${r.body.text?.slice(0, 80)}..."`);
    check(
      `respuesta menciona estado "${tc.expect}"`,
      r.body.text?.toLowerCase().includes(tc.expect.toLowerCase()),
      `text="${r.body.text?.slice(0, 80)}..."`,
    );
    if (tc.extra) {
      check(
        `respuesta menciona "${tc.extra}"`,
        r.body.text?.toLowerCase().includes(tc.extra.toLowerCase()),
        null,
      );
    }
    check('tool get_order_status invocado', r.body.tools_called?.includes('get_order_status'), `tools=${JSON.stringify(r.body.tools_called)}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Caso 8: pedido inexistente → anti-enumeration (R-ID-2)
  // ───────────────────────────────────────────────────────────────────────────

  step(8, 'Pedido inexistente PP-2026-9999 (anti-enumeration)');
  {
    const { convId } = await setupConsentedConversation();
    const r = await sendChat(convId, 'Cual es el estado de mi pedido PP-2026-9999?');
    check('HTTP 200', r.status === 200, `got ${r.status}`);
    check(
      'respuesta "no encuentro" / "no se encontro"',
      /no encuentro|no se encontr/i.test(r.body.text ?? ''),
      `text="${r.body.text?.slice(0, 100)}"`,
    );
    check(
      'NO expone si el pedido existe o no (R-ID-2)',
      !/(no existe|no figura en|invalid)/i.test(r.body.text ?? ''),
      'respuesta debe ser genérica anti-enumeration',
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Caso 9: consent denied
  // ───────────────────────────────────────────────────────────────────────────

  step(9, 'Consent denied — usuario rechaza autorización');
  {
    const convId = randomUUID();
    await sendChat(convId, 'Hola'); // turn 1
    const r = await sendChat(convId, 'No, no autorizo'); // turn 2 → denied
    check('HTTP 200', r.status === 200, `got ${r.status}`);
    check(
      'early_exit_reason = consent_denied',
      r.body.early_exit_reason === 'consent_denied',
      `got ${r.body.early_exit_reason}`,
    );
    check(
      'respuesta menciona "autorización" o "correo"',
      /autorización|autorizaci|correo/i.test(r.body.text ?? ''),
      `text="${r.body.text?.slice(0, 80)}"`,
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Caso 10: multi-turn — 2 consultas distintas en misma conversación
  // ───────────────────────────────────────────────────────────────────────────

  step(10, 'Multi-turn — 2 consultas distintas misma conversación');
  {
    const { convId } = await setupConsentedConversation();
    const q1 = await sendChat(convId, 'Cual es el estado de mi pedido PP-2026-0001?');
    check('q1 — order_id PP-2026-0001 en respuesta', q1.body.text?.includes('PP-2026-0001'), null);
    const q2 = await sendChat(convId, 'Y mi pedido PP-2026-0008?');
    check('q2 — order_id PP-2026-0008 en respuesta', q2.body.text?.includes('PP-2026-0008'), null);
    check(
      'q2 — distinto turn_id que q1 (turn linkage)',
      q1.body.turn_id !== q2.body.turn_id,
      `q1=${q1.body.turn_id?.slice(0, 8)} q2=${q2.body.turn_id?.slice(0, 8)}`,
    );
  }

  summary();
}

function summary() {
  const total = pass + fail;
  const line = '═'.repeat(72);
  console.log('\n' + line);
  console.log(`  Resultado: ${pass}/${total} checks pasaron, ${fail} fallaron`);
  console.log(line);
  if (fail > 0) {
    console.log('\nFallas:');
    for (const f of failures) console.log(`  ✗ ${f}`);
    console.log('');
    process.exit(1);
  }
  console.log('  Todos los checks verde. Hermes listo para Demo Day. \n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n✗ Error inesperado:', err.message);
  console.error(err.stack);
  process.exit(1);
});
