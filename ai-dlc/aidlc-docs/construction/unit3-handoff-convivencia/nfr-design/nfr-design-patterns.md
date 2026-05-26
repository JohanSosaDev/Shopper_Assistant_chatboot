# NFR Design Patterns — Unit 3: Handoff & Despliegue Gradual

> **Filosofía MVP**: hereda Units 1 y 2 (retry, breaker, error hierarchy, branded types, pino, fail-closed, JWT, role middleware). Solo agrega lo nuevo de Unit 3.
> **Plan Q&A NFR-D**: Q1=A SMTP retry 3+breaker 5/60s, Q2=A custom TtlCache, Q3=A sync lexicon read + Zod, Q4=A single advisory lock + secuencial, Q5=A template literals + escapeHtml.

---

## 1. SMTP resilience pattern (Q1=A)

### 1.1 Wrapper sobre nodemailer

**Pattern**: 1 service singleton `SmtpAdapter` envuelto en `withRetry` + `withCircuitBreaker` (libs de Unit 1). Composición fuera del adapter para mantenerlo puro.

```ts
// hermes/src/lib/adapters/smtp.ts
export class SmtpAdapter {
  constructor(private readonly transporter: nodemailer.Transporter, private readonly from: string) {}

  async send(opts: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (!info.messageId) throw new SmtpDeliveryError('no message id returned');
    return { messageId: info.messageId };
  }
}
```

### 1.2 Composition root wiring (Q1=A config)

```ts
// hermes/src/composition.ts
const smtpAdapter = new SmtpAdapter(
  nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,  // false in mailhog dev, true in Fase 2 prod
  }),
  env.SMTP_FROM,
);

const resilientSmtpSend = withCircuitBreaker(
  withRetry(smtpAdapter.send.bind(smtpAdapter), {
    attempts: 3,
    baseDelayMs: 1000,
    backoff: 'exponential',
    maxDelayMs: 8000,
  }),
  {
    failureThreshold: 5,
    openDurationMs: 60_000,
    halfOpenSuccessesToClose: 1,
    name: 'smtp',
  },
);
```

**Worst case latency**: 1s + 2s + 4s = ~7s antes de declarar fallido. Si breaker abre, `delivery_failed_breaker` se asigna inmediato (zero retry waste).

### 1.3 Failure mapping

| Failure | Resultado en `handoff_ticket` | Alerta |
|---|---|---|
| Retries agotados | `status='delivery_failed'` | Suma a `email_delivery_failure_rate` metric |
| Breaker open | `status='delivery_failed_breaker'` | Builtin `circuit_breaker_open` dispara |
| Mailhog/SMTP server down | Retry exhausts → `delivery_failed` | Idem |
| Auth failure (Fase 2 con TLS) | Retry inútil → primer error abort sin reintentar | Logger.error con detalle |

---

## 2. Slack webhook adapter pattern (Q3 plan = C, NFR-D extiende)

### 2.1 Adapter custom

**Pattern**: thin wrapper sobre `undici` (ya en stack U1); sin lib externa de Slack.

```ts
// hermes/src/lib/adapters/slack.ts
export type SlackPostResult =
  | { ok: true; status: 'ok' }
  | { ok: false; status: 'failed' | 'no_webhook_configured'; error?: string };

export class SlackAdapter {
  constructor(private readonly webhookUrl: string | null) {}

  async post(payload: { text: string; blocks?: unknown[] }): Promise<SlackPostResult> {
    if (!this.webhookUrl) return { ok: false, status: 'no_webhook_configured' };
    const res = await undici.request(this.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.statusCode >= 200 && res.statusCode < 300) return { ok: true, status: 'ok' };
    const body = await res.body.text();
    throw new SlackWebhookError(`status=${res.statusCode} body=${body.slice(0, 200)}`);
  }
}
```

### 2.2 Resilient wiring

```ts
const slackAdapter = new SlackAdapter(env.SLACK_WEBHOOK_URL ?? null);
const resilientSlackPost = withRetry(slackAdapter.post.bind(slackAdapter), {
  attempts: 3,
  baseDelayMs: 500,
  backoff: 'exponential',
  maxDelayMs: 4000,
});
```

**Sin circuit breaker para Slack** — rate limits son transitorios; un breaker abierto silenciaría alertas críticas exactamente cuando más se necesitan.

### 2.3 Failure handling

Si las 3 attempts fallan, `AlertEvaluator` recibe el error y lo persiste:

```ts
try {
  await resilientSlackPost({ text, blocks });
  await alertEventsRepo.insert({ ...event, notified: true, slack_status: 'ok' });
} catch (err) {
  logger.warn({ err, ruleId: rule.rule_id }, 'slack post failed after retries');
  await alertEventsRepo.insert({ ...event, notified: false, slack_status: 'failed' });
}
```

Cero data loss — el evento queda en `alert_events` visible desde BM UI.

---

## 3. AlertEvaluator pattern + advisory lock (Q4=A)

### 3.1 Scheduler integration con node-cron

```ts
// hermes/src/jobs/alert-evaluator.job.ts
import cron from 'node-cron';
const ALERT_EVALUATOR_LOCK_ID = 47821001;  // arbitrary unique int

export function registerAlertEvaluatorJob(deps: { pg: Pool; alertEvaluator: AlertEvaluator; logger: Logger }) {
  cron.schedule('*/1 * * * *', async () => {
    const lockClient = await deps.pg.connect();
    try {
      const lockRes = await lockClient.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked', [ALERT_EVALUATOR_LOCK_ID]
      );
      if (!lockRes.rows[0].locked) {
        deps.logger.warn('AlertEvaluator: previous tick still running, skipping');
        return;
      }
      try {
        await deps.alertEvaluator.tick();
      } finally {
        await lockClient.query('SELECT pg_advisory_unlock($1)', [ALERT_EVALUATOR_LOCK_ID]);
      }
    } catch (err) {
      deps.logger.error({ err }, 'AlertEvaluator tick failed');
    } finally {
      lockClient.release();
    }
  });
}
```

### 3.2 Tick sequential eval

```ts
// hermes/src/services/alert-evaluator.service.ts
async tick(): Promise<void> {
  const rules = await this.alertRulesRepo.findActive();
  for (const rule of rules) {
    try {
      await this.evaluateRule(rule);
    } catch (err) {
      this.logger.warn({ err, ruleId: rule.rule_id }, 'rule evaluation failed; continuing');
    }
  }
}

private async evaluateRule(rule: AlertRule): Promise<void> {
  const actualValue = await this.metricsCalculator.compute(rule.metric, rule.window_minutes);
  const breaches = this.compareThreshold(actualValue, rule.operator, rule.threshold);
  if (!breaches) return;

  const lastEvent = await this.alertEventsRepo.findLatest(rule.rule_id);
  const throttled = lastEvent?.cooldown_until && lastEvent.cooldown_until > new Date();
  const shouldNotify = !throttled || rule.severity === 'critical';  // critical bypasses

  if (shouldNotify) {
    const slackResult = await this.slackPost({
      text: this.formatAlertText(rule, actualValue),
    });
    await this.alertEventsRepo.insert({
      rule_id: rule.rule_id,
      actual_value: actualValue,
      notified: slackResult.ok,
      slack_status: slackResult.status,
      cooldown_until: new Date(Date.now() + rule.cooldown_minutes * 60_000),
    });
  } else {
    await this.alertEventsRepo.insert({
      rule_id: rule.rule_id,
      actual_value: actualValue,
      notified: false,
      slack_status: null,
      cooldown_until: null,  // throttled, no nuevo cooldown
    });
  }
}
```

**Invariantes asegurados**:
- ≤1 tick concurrente (advisory lock).
- Si un rule eval falla, los demás continúan (try-catch per-rule).
- Throttling persistido en `alert_events.cooldown_until`.

---

## 4. RolloutGate cache pattern (Q2=A)

### 4.1 TtlCache genérico

```ts
// hermes/src/lib/ttl-cache.ts
export class TtlCache<K, V> {
  private store = new Map<K, { value: V; expiresAt: number }>();
  constructor(private readonly defaultTtlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
```

### 4.2 SystemConfigRepo con cache

```ts
// hermes/src/repositories/system-config.repo.ts
export class SystemConfigRepo {
  private cache = new TtlCache<'config', SystemConfig>(60_000);  // 60s TTL

  constructor(private readonly pg: Pool) {}

  async get(): Promise<SystemConfig> {
    const cached = this.cache.get('config');
    if (cached) return cached;

    const { rows } = await this.pg.query('SELECT * FROM system_config WHERE id = 1');
    if (rows.length === 0) throw new InternalError('system_config row missing');
    const config = parseSystemConfigRow(rows[0]);
    this.cache.set('config', config);
    return config;
  }

  async update(patch: Partial<SystemConfig>, audit: { actorUserId: string; reason: string }): Promise<void> {
    await withTransaction(this.pg, async (client) => {
      for (const [field, newValue] of Object.entries(patch)) {
        const { rows: oldRows } = await client.query('SELECT * FROM system_config WHERE id = 1');
        await client.query(`UPDATE system_config SET ${field} = $1, updated_at = NOW() WHERE id = 1`, [newValue]);
        await client.query(
          `INSERT INTO system_config_audit (actor_user_id, field_name, old_value, new_value, reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [audit.actorUserId, field, JSON.stringify(oldRows[0][field]), JSON.stringify(newValue), audit.reason]
        );
      }
    });
    this.cache.invalidate('config');  // próxima get() refresca
  }
}
```

**Invariante**: invalidación inmediata tras update; el siguiente `get()` lee DB. Cambios desde la BM UI se reflejan en ≤60s sin invalidación explicita en otros nodos (si Fase 2 trae horizontal scaling, agregar pub/sub Redis para invalidación cross-instance).

---

## 5. SentimentScorer lexicon loading (Q3=A)

### 5.1 Sync read + Zod validation en composition

```ts
// hermes/src/composition.ts
import { readFileSync } from 'node:fs';

const LexiconEntrySchema = z.object({
  keyword: z.string().min(1),
  weight: z.number().min(-1).max(1),
  category: z.string(),
});
const LexiconSchema = z.array(LexiconEntrySchema);

function loadLexicon(): readonly LexiconEntry[] {
  const raw = readFileSync('prompts/sentiment_lexicon_es_co.json', 'utf8');
  const parsed = JSON.parse(raw);
  return LexiconSchema.parse(parsed);  // throws ZodError if invalid
}

const lexicon = loadLexicon();  // fail-fast at boot
const sentimentScorer = new SentimentScorer(lexicon);
```

### 5.2 Scorer implementation

```ts
// hermes/src/services/sentiment-scorer.service.ts
export class SentimentScorer {
  constructor(private readonly lexicon: readonly LexiconEntry[]) {}

  score(text: string): number {
    const normalized = this.normalize(text);
    let raw = 0;
    for (const entry of this.lexicon) {
      if (normalized.includes(entry.keyword)) {
        const multiplier = this.intensifierMultiplier(text, entry.keyword);
        raw += entry.weight * multiplier;
      }
    }
    return this.clamp(raw, -1, 1);
  }

  private normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  private intensifierMultiplier(text: string, keyword: string): number {
    let mult = 1;
    if (/[A-Z]{4,}/.test(text)) mult *= 1.5;                    // SCREAMING
    if (/(.)\1{2,}/.test(text)) mult *= 1.3;                    // repetición vocálica
    const exclam = (text.match(/!/g) ?? []).length;
    mult *= 1 + Math.min(exclam, 3) * 0.1;                       // signos exclamación cap 3
    return mult;
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }
}
```

**Función pura** (sin DB, sin I/O) → candidata directa a PBT.

### 5.3 PBT properties (Q5=A NFR-R)

```ts
// hermes/tests/sentiment-scorer.pbt.test.ts
test.prop([fc.string()])('score is always in [-1, 1]', (text) => {
  const s = scorer.score(text);
  expect(s).toBeGreaterThanOrEqual(-1);
  expect(s).toBeLessThanOrEqual(1);
});

test.prop([fc.string()])('score is pure (same input → same output)', (text) => {
  expect(scorer.score(text)).toBe(scorer.score(text));
});

test.prop([fc.string()])('adding a negative keyword never increases score', (baseText) => {
  const before = scorer.score(baseText);
  const after = scorer.score(baseText + ' horrible');
  expect(after).toBeLessThanOrEqual(before);
});
```

---

## 6. Email rendering pattern (Q5=A)

### 6.1 Funciones puras

```ts
// hermes/src/services/email-renderer.ts
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderHandoffEmailHtml(pkg: HandoffPackage, shortId: string): string {
  const e = escapeHtml;
  return `<!doctype html>
<html><body style="font-family: Arial, sans-serif;">
  <h2>Hermes Handoff ${e(shortId)}</h2>
  <p><strong>Trigger:</strong> ${e(pkg.trigger)} · <strong>Sentimiento:</strong> ${pkg.sentimiento_score}</p>
  <h3>Cliente</h3>
  <ul>
    <li>Email: ${pkg.customer_email ? e(pkg.customer_email) : '<i>no provisto</i>'}</li>
    <li>Teléfono: ${pkg.customer_phone ? e(pkg.customer_phone) : '<i>no provisto</i>'}</li>
  </ul>
  <h3>Conversación</h3>
  <p><strong>Último mensaje del cliente:</strong></p>
  <blockquote>${e(pkg.mensaje_cliente)}</blockquote>
  <p><strong>Intención clasificada:</strong> ${e(pkg.intencion_clasificada)} (confidence ${pkg.intencion_confidence})</p>
  ${pkg.intento_del_bot ? `<p><strong>Último intento del bot:</strong></p><blockquote>${e(pkg.intento_del_bot)}</blockquote>` : ''}
  <h3>Pedidos recientes (top 5)</h3>
  ${pkg.historico_pedidos.length > 0
    ? `<ul>${pkg.historico_pedidos.map((o) => `<li>${e(o.order_id)} — ${e(o.status)}</li>`).join('')}</ul>`
    : '<i>No hay pedidos o SFCC no respondió.</i>'}
  <p><a href="${e(pkg.conversation_transcript_url)}">Ver transcripción completa en dashboard</a></p>
</body></html>`;
}

export function renderHandoffEmailText(pkg: HandoffPackage, shortId: string): string {
  return [
    `Hermes Handoff ${shortId}`,
    ``,
    `Trigger: ${pkg.trigger} | Sentimiento: ${pkg.sentimiento_score}`,
    ``,
    `Cliente:`,
    `  Email: ${pkg.customer_email ?? '(no provisto)'}`,
    `  Teléfono: ${pkg.customer_phone ?? '(no provisto)'}`,
    ``,
    `Último mensaje del cliente:`,
    `  "${pkg.mensaje_cliente}"`,
    ``,
    `Intención: ${pkg.intencion_clasificada} (confidence ${pkg.intencion_confidence})`,
    pkg.intento_del_bot ? `Último intento del bot: "${pkg.intento_del_bot}"` : '',
    ``,
    `Pedidos recientes:`,
    pkg.historico_pedidos.length > 0
      ? pkg.historico_pedidos.map((o) => `  - ${o.order_id} — ${o.status}`).join('\n')
      : '  (sin pedidos o SFCC timeout)',
    ``,
    `Ver dashboard: ${pkg.conversation_transcript_url}`,
  ].filter(Boolean).join('\n');
}

export function renderHandoffEmailSubject(ticket: HandoffTicket): string {
  const tag = ticket.priority === 'high' ? '[ALTA]' : '[NORMAL]';
  return `${tag} Hermes Handoff ${ticket.ticket_short_id} — ${ticket.trigger} — ${ticket.brand}.com`;
}
```

**Testing**: snapshot tests sobre output (Vitest `toMatchInlineSnapshot`) — verifica que el formato no cambia accidentalmente.

---

## 7. RBAC middleware extension (Q4 NFR-R = A)

### 7.1 `requireRole` decorator

```ts
// hermes/src/plugins/role-guard.plugin.ts
type Role = 'brand_manager' | 'operator' | 'admin';

export function requireRole(allowed: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }
    if (!allowed.includes(req.user.role as Role)) {
      reply.code(403).send({ error: 'forbidden' });
      return;
    }
  };
}
```

### 7.2 Usage en routes Unit 3

```ts
// hermes/src/plugins/m7-dashboard.plugin.ts
fastify.get('/admin/dashboard/kpis', {
  preHandler: [fastify.authenticate, requireRole(['operator', 'admin'])],
}, dashboardController.getKpis);

// hermes/src/plugins/m8-rollout.plugin.ts
fastify.patch('/admin/rollout/traffic-percentage', {
  preHandler: [fastify.authenticate, requireRole(['admin'])],  // solo admin
  schema: { body: PatchTrafficSchema },
}, rolloutController.updateTrafficPercentage);
```

**Composición con `requireBrandScope`** (de Unit 2): los endpoints U3 NO usan brand scope porque son cross-brand (operativos). Los U2 (brand config) sí.

---

## 8. Error mapping — extender error hierarchy de Unit 1

### 8.1 Nuevos errors Unit 3

```ts
// hermes/src/models/errors.ts (extensión)
export class SmtpDeliveryError extends BaseError {
  readonly code = 'SMTP_DELIVERY_FAILED';
  readonly httpStatus = 502;
}

export class SlackWebhookError extends BaseError {
  readonly code = 'SLACK_WEBHOOK_FAILED';
  readonly httpStatus = 502;
}

export class HandoffPackageInvalidError extends BaseError {
  readonly code = 'HANDOFF_PACKAGE_INVALID';
  readonly httpStatus = 500;
}

export class HandoffAlreadyInProgressError extends BaseError {
  readonly code = 'HANDOFF_ALREADY_IN_PROGRESS';
  readonly httpStatus = 409;
}

export class RolloutDisabledError extends BaseError {
  readonly code = 'ROLLOUT_DISABLED';
  readonly httpStatus = 503;
}

export class AlertRuleValidationError extends ValidationError {
  readonly code = 'ALERT_RULE_INVALID';
}
```

### 8.2 Mapping a respuestas HTTP

El global error handler de Unit 1 ya mapea `BaseError.httpStatus`. Sin cambios en handler — solo agregar los nuevos códigos al `error code → user-facing message` table.

| Error code | User-facing message (cliente final) | Operator-facing message (BM UI) |
|---|---|---|
| `SMTP_DELIVERY_FAILED` | "Ya tomamos tu consulta; un asesor te contactará" | "Email failed after 3 retries — ver detalle en `handoff_ticket`" |
| `HANDOFF_PACKAGE_INVALID` | "Estamos teniendo un problema técnico, intenta en unos minutos" | "Validation failed — ver `package_audit.degraded_fields`" |
| `HANDOFF_ALREADY_IN_PROGRESS` | "Tu solicitud ya fue recibida (ref XYZ)" | (no debe surgir en UI; defensa contra duplicates) |
| `ROLLOUT_DISABLED` | "Atención por correo en horario hábil" | "Hermes está OFF; revisar `system_config.hermes_enabled`" |

---

## 9. Logging extension

### 9.1 Nuevos campos en `turn_log_audit`

El logger de Unit 1 (`pino`) ya escribe JSON estructurado a stdout. Unit 3 agrega 5 campos al payload del turn log via `TurnLogRepo.append`:

```ts
{
  // ... existing U1 fields
  handoff_triggered: boolean,
  handoff_trigger: HandoffTrigger | null,
  sentiment_score: number | null,    // -1..1
  add_to_cart: boolean,
  guardrail_violated: boolean,
}
```

### 9.2 Nuevos log events (pino)

| Event name (`event` field) | Payload | Cuando |
|---|---|---|
| `handoff_triggered` | `{conversationId, trigger, ticketShortId}` | TriggerDetector detecta |
| `handoff_package_built` | `{conversationId, ticketShortId, degradedFields}` | PackageBuilder completa |
| `handoff_delivery_succeeded` | `{ticketShortId, messageId}` | SMTP retorna |
| `handoff_delivery_failed` | `{ticketShortId, reason, attempts}` | Tras retries |
| `rollout_admitted` / `rollout_excluded` | `{identifier_hash, bucket, threshold}` | RolloutGate decide (logger.debug — alto volumen) |
| `rollout_skipped` | `{reason}` | Kill switch off |
| `alert_dispatched` | `{ruleId, severity, actualValue, threshold}` | AlertEvaluator notifica |
| `alert_throttled` | `{ruleId, cooldownUntil}` | Throttling activo |

Nivel `info` para eventos operativos; `debug` para rollout decisions (alto volumen); `warn` para retries; `error` para failures tras retries.

---

## 10. Out-of-scope patterns (Fase 2)

- Distributed cache (Redis pub/sub) para invalidación de `system_config` cross-instance.
- Auto-retry job que reintenta `delivery_failed*` tickets cada N minutos.
- Slack circuit breaker (decidido fuera de scope para evitar silencing alertas críticas).
- LLM-based sentiment fallback cuando keywords no matchean ("explicabilidad" para Fase 2).
- Email template per-brand (4 marcas con voice distinta).
- Multi-channel handoff (WhatsApp Business Cloud API).

---

## 11. Security Compliance Summary (stage = NFR Design Unit 3)

| Rule | Aplicación |
|---|---|
| SECURITY-02 | Helper `escapeHtml` en email renderer previene XSS si email se abre en webmail; PII serializada con `audience` separation upstream (R-HO-10) |
| SECURITY-05 | Zod validation del lexicon al boot (fail-fast en payload corrupto) |
| SECURITY-08 | `requireRole(['operator','admin'])` o `['admin']` por endpoint U3 |
| SECURITY-09 | Errores genéricos al cliente; detalle solo en logs (`error code` mapping table §8.2) |
| SECURITY-10 | Sin libs externas para Slack/sentiment/cache — reduce supply chain surface |
| SECURITY-11 | Fail-closed en RolloutGate, PackageBuilder, AlertEvaluator (errores aislados per-rule, no cascada) |
| SECURITY-13 | Audit insertion en mismo TX que UPDATE de `system_config` (R-ROLL-6 + §4.2 patrón) |
| SECURITY-14 | Sistema completo de alertas implementado aquí (cron + thresholds + Slack + persistence) |

*No hay findings bloqueantes en este stage.*
