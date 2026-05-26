# NFR Requirements — Unit 3: Handoff & Despliegue Gradual

> **Filosofía MVP**: hereda Units 1 y 2 NFRs. Solo enumera lo nuevo o lo que diverge específicamente para Unit 3 (handoff stub+email, rollout gate, dashboards read-path, alerting).
> **Plan Q&A**: Q1=A in-process timer node-cron, Q2=A best-effort SMTP, Q3=C retry+persist Slack, Q4=A operator+admin only, Q5=A PBT 3 funciones core.

---

## 1. Performance

### 1.1 Latency targets

| Endpoint / componente | SLO | Notas |
|---|---|---|
| `POST /chat` con handoff trigger (sin generar respuesta de IA) | **<1s p95** | bypass de `generate_response`; solo trigger + package + INSERT ticket; debería ser más rápido que `/chat` normal |
| `GET /admin/dashboard` | best-effort, <3s page load p95 esperado | hereda patrón U2 admin SLO best-effort (Q3=A Unit 2); FD ya fijó budget en R-DASH-3 |
| Cada query individual del dashboard | <500ms p95 esperado | R-DASH-1 índices `(timestamp, conversation_id)` heredados U1 |
| `GET /admin/escalations` (drill-down paginado) | best-effort | `LIMIT 50` default, índice parcial `WHERE handoff_triggered=true` |
| `GET /admin/conversations/:id` | best-effort, <1s esperado | join `turn_log_audit` + `handoff_ticket` por `conversation_id` |
| `POST /admin/rollout` (toggle/update %) | best-effort, <500ms esperado | UPDATE single-row + audit INSERT en mismo TX |
| `GET /widget/config` (rollout gate decision) | **<50ms p95** | cache 60s in-memory; hot path del widget |
| `SentimentScorer.score(text)` | **<5ms p95** | keyword scan sobre <100 entries seed; in-memory |
| `RolloutGate.shouldServeHermes()` | **<10ms p95** | sha256 hash + 1 modulo; con cache hit del config |
| `PackageBuilder.build()` | <3.5s p99 | incluye 1 SFCC call con timeout 3s (R-HO-11) + queries identidad |
| `AlertEvaluator.tick()` total | <30s | <100ms per rule × ≤50 reglas; cron de 60s da headroom 2× |
| Email send via SMTP | <2s p95 (mailhog local), Fase 2 según SMTP corporativo | con `withRetry(3)` aumenta hasta ~8s en peor caso |
| Slack webhook POST | <1s p95 | `withRetry(3, exponential, baseDelay=500ms)` |

**Sin SLO formal en MVP para los endpoints admin** (Q4 Unit 2 = best-effort). Sí hay SLO operacional implícito en `/chat` y en el widget hot-path porque afectan UX cliente directamente.

### 1.2 Throughput

- **Handoff trigger rate esperado MVP**: ≤30% de conversaciones → ≤30/día estimado con MVP volume. Cero presión sobre handoff_ticket table.
- **Dashboard hits**: 3-5 operadores × refresh manual = <20 page loads/hora total.
- **AlertEvaluator load**: 5 reglas builtin + <10 custom esperado = ~15 reglas × 60s tick. Suma a la carga del único Node process via `node-cron`.
- **Rollout gate hits**: cada hit al widget pasa por `shouldServeHermes()`. Con MVP traffic <1000 visits/día y cache 60s, prácticamente todas las decisiones son cache hits.

### 1.3 Optimization priorities (MVP)

- **Widget hot-path**: `/widget/config` y rollout decision son cache-hot — NO agregar latency aquí. Mantener cache 60s in-memory.
- **Dashboard queries**: con índices `(timestamp DESC, conversation_id)` ya planeados en Unit 1 §5 + nuevos índices Unit 3 §11 migrations, queries sub-segundo a MVP volume.
- **SentimentScorer**: lexicón se carga 1 vez al boot, scan O(n × m) con n=tokens del mensaje (≤500), m=keywords (≤100). Sub-ms.
- **AlertEvaluator**: cada regla es 1 SQL query agregada. Con `LIMIT` apropiado por ventana, todas <100ms.

---

## 2. Scalability

**Hereda Units 1 y 2**: vertical scaling solo MVP; sin Redis; sin queue; sin worker container separado.

**Específico Unit 3**:

| Recurso | Volumen MVP estimado | Comportamiento esperado |
|---|---|---|
| `handoff_ticket` | <30 rows/día = ~10k/año a full ramp | Tabla small; índices ok |
| `system_config` | 1 row siempre (single-row CHECK) | Trivial |
| `system_config_audit` | <50 rows/mes (cambios manuales del operador) | Trivial |
| `alert_rules` | 5 builtin + ≤10 custom esperado | Re-read cada tick (no cache) — volumen acepta |
| `alert_events` | ≤5 dispare/hora pico → <120/día | Mantenible; cleanup retention 90d en Fase 2 |
| `turn_log_audit` extension cols | 5 columnas nuevas nullable | Sin impacto en volumen U1 |

**Forward-looking Fase 2**:
- A 4 marcas × 5 países = ~20× MVP. Handoff_ticket llega a ~200k/año — sigue ok con índices.
- AlertEvaluator a 50+ reglas custom puede beneficiarse de pasar a worker container (TD-U3-3 abre la puerta).
- Email volume podría justificar SMTP service profesional (Mailgun/SendGrid) si delivery rate importa.

---

## 3. Availability

**Hereda Unit 1**: 99% objetivo MVP; restart `unless-stopped` Docker.

**Específico Unit 3**:

| Dependencia | Failure mode | Mitigación |
|---|---|---|
| SMTP (mailhog dev / corporate Fase 2) | Email no se envía | `withRetry(3)` + `withCircuitBreaker`; ticket queda en `delivery_failed*`; alerta builtin dispara; operador retoma manual |
| Slack webhook | Alerta no notificada | `withRetry(3, exponential)` (TD-U3-4); si falla, `alert_events.slack_status='failed'` + `notified=false` (visible en BM UI); cero data loss |
| SFCC (heredado U1) | `getOrderHistory` falla en `PackageBuilder` | Timeout 3s → `historico_pedidos=[]` + `degraded_fields=['historico_pedidos']` (R-HO-11); handoff continúa con paquete parcial |
| Postgres | Todo cae | Aceptable MVP; restart Docker |
| AlertEvaluator process (in-process) | Si Node crash → todo cae | Aceptable; mientras web esté arriba, evaluator también |

**Graceful degradation summary**:
- Sin SMTP: handoff tickets se persisten igual; operador atiende desde BM UI.
- Sin Slack: alertas se persisten igual; operador ve en feed.
- Sin SFCC: paquete sale con `degraded_fields`.
- Sin rollout cache: cada hit pega DB (acceptable a MVP volume).

---

## 4. Security (Unit 3 delta vs U1/U2)

### 4.1 Cumplimiento de las 15 reglas SECURITY (delta vs Units 1 y 2)

| Rule | U1/U2 status | U3 delta |
|---|---|---|
| SECURITY-01 (data classification + consent) | Aplicado U1 | Sin cambio — el handoff hereda el consent state de la conversación U1 |
| SECURITY-02 (anonymization en logs) | Aplicado U1 (PII hash en turn_log_audit) | **Extiende fuerte** — R-HO-10 separa audience `email` (cleartext PII para CX) vs `audit` (hash); `handoff_ticket.package_audit` solo lleva versión hash |
| SECURITY-03 (encryption) | Postgres TLS heredado | SMTP debe usar TLS en Fase 2 (TD-U3-1); MVP local mailhog plain ok |
| SECURITY-04 (HTTP headers) | Helmet + X-Frame-Options DENY en /admin/* (U2) | Sin cambio — las nuevas rutas U3 entran al mismo middleware |
| SECURITY-05 (input validation) | Zod en cada endpoint | **Aplicado** — Zod schemas para `/admin/rollout/*`, `/admin/alerts/*`, `/admin/handoff-tickets/*`; validación de `contact_info` (R-HOD-2) usa regex + Zod refine |
| SECURITY-06 (least privilege DB) | Roles `hermes_app`/`hermes_retention` (U1) | **Extiende** — añadir grants para las 6 tablas nuevas U3 al rol `hermes_app`; `system_config` con UPDATE solo al rol (no role distinto); `system_config_audit` SELECT/INSERT only (append-only) |
| SECURITY-07 (sandboxing) | Docker isolation heredado | Sin cambio |
| SECURITY-08 (access control) | JWT obligatorio en /admin/* (U2) | **Aplicado** — middleware JWT + `role IN ('operator','admin')` check para todas las rutas U3 admin (R-DASH-6); `brand_manager` rechazado con 403 |
| SECURITY-09 (hardening) | Errores genéricos U1/U2 | Sin cambio — mismo handler global captura errores U3 |
| SECURITY-10 (supply chain) | npm lockfile + audit (U2) | **Extiende** — nuevas deps `nodemailer`, `node-cron` pinneadas en lockfile; `npm audit` en CI cubre |
| SECURITY-11 (secure design) | Aplicado | **Aplicado fuerte** — kill switch como fail-closed (R-ROLL-1), paquete inválido bloquea handoff (R-HO-12), email solo después de INSERT (R-HOD-3) |
| SECURITY-12 (auth + credentials) | bcrypt 12 + JWT (U2) | Sin cambio — heredado |
| SECURITY-13 (data integrity / audit) | sign_offs + auth_audit_log append-only (U2) | **Extiende** — `handoff_ticket` (solo status/timestamps mutables), `system_config_audit` y `alert_events` append-only; columnas nuevas de `turn_log_audit` append-only (turn_log_audit ya lo era) |
| SECURITY-14 (alerting + monitoring) | Diferido a U3 | **Aplicado aquí** — sistema de alertas (R-ALERT-1..8) cubre la regla; reglas builtin para guardrail violation, CB open, latency p95, package incomplete, email delivery failure |
| SECURITY-15 (exception handling) | Handler global (U1) | Sin cambio |

### 4.2 PII handling específico (R-HO-10)

`HandoffPackage` se serializa con 2 audiences:

| Campo | Audience `email` (al CX) | Audience `audit` (a DB) |
|---|---|---|
| `customer_email` | cleartext | sha256 hash |
| `customer_phone` | cleartext | sha256 hash |
| `customer_id_hash` | hash (ya hashed upstream) | hash |
| `pedido_ids` (en historico_pedidos) | cleartext | hash |
| `mensaje_cliente` | cleartext (no es PII per se) | cleartext |
| `demografia_minima` (country/locale/brand) | cleartext | cleartext (no es PII identificable) |

**Implementación**: `PackageBuilder.serialize(pkg, audience)` — función pura, candidata a PBT (validar invariante: `serialize(pkg, 'audit').customer_email !== pkg.customer_email` cuando email presente).

### 4.3 RBAC para nuevos endpoints (Q4=A)

| Endpoint | Roles permitidos | Otros |
|---|---|---|
| `/admin/dashboard/*` (E2-S1) | `operator`, `admin` | brand_manager → 403 |
| `/admin/escalations/*` (E2-S2 drill-down) | `operator`, `admin` | brand_manager → 403 |
| `/admin/alerts/*` (E2-S3 CRUD) | `operator`, `admin` | brand_manager → 403 |
| `/admin/rollout/*` (kill switch + %) | `admin` solo (cambios sensibles) | operator → 403; brand_manager → 403 |
| `/admin/handoff-tickets/*` | `operator`, `admin` | brand_manager → 403 |
| `/admin/conversations/:id` | `operator`, `admin` | brand_manager → 403 |

**Implementación**: middleware `requireRole(['operator','admin'])` o `requireRole(['admin'])` aplicado a cada plugin Fastify de Unit 3.

### 4.4 Audit trail de cambios de rollout (R-ROLL-6)

Cada UPDATE a `system_config` desde la BM UI dispara INSERT en `system_config_audit` en el mismo TX. Campos: `actor_user_id`, `field_name`, `old_value`, `new_value`, `reason`, `changed_at`. Si el cliente UI no manda `reason` para cambios de `hermes_traffic_percentage`, se rechaza con 400 (forzar accountability).

### 4.5 Threat model específico Unit 3

| Threat | Mitigación |
|---|---|
| Operador malicioso baja % a 0 sin causa | `system_config_audit` deja rastro con `reason` obligatorio; alerta builtin si `hermes_traffic_percentage` cambia >50pp en una sola operación |
| Email spoofing al cliente | El bot NO envía email al cliente; solo al CX interno (`cx@patprimo.com`). Sin spoofing surface |
| PII leaking a logs | R-HO-10 (separación audience); PBT property en `serialize` |
| Slack webhook URL leaked | `SLACK_WEBHOOK_URL` en env var (no en código); rotación documentada en Fase 2 |
| AlertEvaluator DDOS por reglas mal configuradas | Validación al CREATE: `window_minutes ≥ 1`, no permite queries que escaneen toda la tabla sin `WHERE timestamp >` |
| Replay del email a CX (cliente reenvía mismo handoff) | El bot detecta `conversationId` ya con `handoff_ticket` activo y NO crea otro — el cliente ve el referencia anterior |
| Trigger forgery (alguien manda `source='handoff_button'` falso) | El field viene del frontend confiable; Zod valida enum exacto; sin acceso a otros triggers via API |

---

## 5. Reliability

**Hereda Units 1 y 2**: error budget 1%, circuit breaker patterns, retry exponential.

**Específico Unit 3**:

- **Idempotencia del handoff trigger**: una conversación entra a estado `handoff_in_progress` (R-HO-7); intentos posteriores en la misma conversación NO crean nuevos tickets.
- **Idempotencia de email**: `handoff_ticket.email_message_id` previene envíos duplicados; antes de SMTP send, check `IF email_message_id IS NULL THEN send`.
- **TX atomicity**: INSERT en `handoff_ticket` y INSERT en `system_config_audit` cuando aplique van en TX. SMTP send es fuera de TX (no se puede rollback un email enviado).
- **Cleanup retention** (Fase 2 — out of scope MVP): `alert_events` >90d → DELETE batch nightly; `system_config_audit` retention forever (audit obligation).
- **AlertEvaluator concurrency**: Postgres advisory lock (`pg_try_advisory_lock(:job_id)`) previene corridas paralelas si un tick toma >60s; el siguiente tick salta hasta que la lock se libere.

---

## 6. Maintainability

**Hereda Units 1 y 2**: TS strict, ESLint+Prettier, Vitest 70% lines coverage, fast-check PBT.

**Específico Unit 3 — PBT scope (Q5=A)**:

3 funciones puras entran a PBT con propiedades enunciadas en business-rules §8:

| Función | Propiedades | fast-check arbitraries |
|---|---|---|
| `SentimentScorer.score(text)` | (a) pure (mismo input → mismo output); (b) range clampada `[-1, 1]`; (c) monotonía: agregar keyword negativo nunca aumenta score; (d) intensificadores nunca invierten signo | `fc.string`, `fc.constantFrom(...keywords)`, `fc.tuple` |
| `RolloutGate.shouldServeHermes(identifier, config)` | (a) determinismo: mismo `identifier` + mismo `config` → mismo bool; (b) monotonía: `traffic_percentage` ↑ ⟹ buckets admitidos ⊇ anteriores; (c) kill switch absoluto: `enabled=false` ⟹ siempre `false` | `fc.uuid`, `fc.record({enabled, traffic_percentage, salt})` |
| `validatePackage(pkg)` | (a) rechazo iff falta cualquier campo obligatorio (`trigger`, `mensaje_cliente`, `intencion_clasificada`, `sentimiento_score`, `categoria_sugerida`, `conversation_transcript_url`); (b) `missing` array exactamente coincide con los faltantes | `fc.record(..., {requiredKeys: []})` con partial sampling |

**Tests específicos Unit 3 a generar en Code Generation**:
- `sentiment-scorer.service.test.ts` — PBT propiedades + tests example-based con frases ES Col
- `rollout-gate.service.test.ts` — PBT + cache invalidation
- `package-builder.service.test.ts` — happy path + degraded (SFCC timeout) + invalid package
- `delivery-adapter.service.test.ts` — SMTP retry + circuit breaker (con mock SMTP)
- `alert-evaluator.service.test.ts` — tick correcto + throttling + Slack retry
- `trigger-detector.service.test.ts` — orden de evaluación + 5 triggers + button bypass
- Integration: `/chat` con handoff trigger end-to-end usando mailhog real container

---

## 7. Observability

**Unit 3 ES en sí mismo el sistema de observability del producto Hermes.** El "observability read-path" (E2-S1..S3, M7) materializa los logs del write-path de Unit 1 en dashboards + alertas.

| Aspecto | Implementación |
|---|---|
| Métricas operativas | Queries directas a `turn_log_audit` con índices (Q3=A); KPIs derivados en runtime |
| Eventos críticos | Alertas builtin (R-ALERT-2): latency p95, guardrail violation, CB open, package incomplete, email delivery failure |
| Logging estructurado | Heredado U1 (pino JSON a stdout); Unit 3 agrega campos `handoff_trigger`, `sentiment_score`, `rollout_decision` |
| Audit trail | `handoff_ticket` (append-only en payload), `system_config_audit` (audit completo), `alert_events` (todos los disparos) |
| Drill-down a conversación | E2-S2 `GET /admin/conversations/:id` une todos los datos |

**Out of scope MVP** (Fase 2 candidates): Prometheus/Grafana, OpenTelemetry tracing distribuido, dashboards real-time vía WebSocket.

---

## 8. NFR-to-Story traceability (Unit 3 — 8 stories)

| AC Gherkin | NFRs cubiertos |
|---|---|
| **E2-S1** "Dashboard carga con KPIs frescos" | Performance: <3s page load, <500ms query. Reliability: best-effort sin queueing. Security: SECURITY-08 (JWT + role check). |
| **E2-S1** "Codificación visual de salud" | Maintainability: lógica de coloring en frontend, fácil ajustar thresholds. |
| **E2-S2** "Filtrar escalamientos por dimensión" | Performance: índices `(handoff_trigger, created_at DESC) WHERE handoff_triggered=true`. |
| **E2-S2** "Vista de conversación completa" | Performance: <1s join `turn_log_audit` + `handoff_ticket`. |
| **E2-S3** "Alerta por degradación KPI" | Performance: tick 60s; alerta delivered <60s post-breach. Reliability: retry+persist Slack (Q3=C). |
| **E2-S3** "Configuración de reglas sin redeploy" | Performance: cambios en `alert_rules` aplican <60s (próximo tick). |
| **E3-S1** "Sentimiento negativo dispara escalamiento" | Performance: SentimentScorer <5ms. Maintainability: PBT en scorer (Q5=A). |
| **E3-S1** "Request explícito del cliente" | Performance: `intent=explicit_handoff_request` reusa LLM call (cost cero). |
| **E3-S2** "Paquete de contexto incluye campos PRD §7" | Performance: <3.5s p99. Reliability: SFCC timeout 3s + degraded_fields fallback. Security: R-HO-10 PII handling. |
| **E3-S2** "Paquete vacío rechazado" | Reliability: R-HO-12 fail-closed; alerta `package_incomplete`. |
| **E3-S3** "Transferencia exitosa <60 segundos" | Performance: cliente recibe mensaje <5s (sync); email a CX <60s (async vía SMTP retry). |
| **E3-S3** "Sin agentes disponibles" | Reliability: R-HOD-8 horario hábil; ticket priorizado. |
| **E3-S3** "Métrica AHT humano post-handoff" | **Out of scope MVP** — AHT requiere closure workflow, Fase 2. |
| **E3-S4** "Botón visible desde primer turno" | Usability: a11y WCAG AA + keyboard focus. |
| **E3-S4** "Click activa handoff" | Performance: R-HO-4 button bypass directo a TriggerDetector. |
| **E4-S2** "Configuración de split de tráfico" | Performance: <500ms UPDATE + cache 60s propagación. |
| **E4-S2** "Rollback automático por degradación" | **Reformulado**: ahora es "kill switch manual + alertas guían al operador". Sin auto-rollback en MVP (Fase 2 candidate). |
| **E4-S2** "Sin afectar a Oct8ne (no-regression)" | **Eliminado** — Oct8ne no activo (blocker resuelto 2026-05-25). |

---

## 9. Out-of-scope NFRs (referencia)

- ❌ Load testing dashboards (3-5 operadores = sin necesidad)
- ❌ Auto-retry job para `delivery_failed` tickets (Fase 2)
- ❌ Auto-rollback de rollout basado en KPI degradado (Fase 2 — MVP requiere acción manual del operador alertado)
- ❌ Multi-region SMTP failover
- ❌ Real-time push de alertas via WebSocket al BM UI (polling cada 30s sirve para MVP)
- ❌ AHT/FCR métricas que requieren workflow de cierre del ticket en CX (Fase 2)
- ❌ Cleanup retention de `alert_events` / `system_config_audit` (Fase 2 job)
- ❌ Worker container separado para AlertEvaluator (Fase 2 si scale)
- ❌ PagerDuty / formal incident management
- ❌ A/B test "Hermes vs Hermes-variant" (Fase 2 — el rollout actual solo controla on/off + %)

Todos pasan a Fase 2.

---

## 10. Security Compliance Summary (stage = NFR Requirements Unit 3)

| Rule | Status Unit 3 | Notas |
|---|---|---|
| SECURITY-01 | Heredado U1 | Consent flujo U1 cubre |
| SECURITY-02 | **Aplicado fuerte** | R-HO-10 PII separation en `PackageBuilder.serialize` |
| SECURITY-03 | Parcial | SMTP TLS Fase 2; mailhog plain en dev acceptable |
| SECURITY-04 | Heredado U2 | Helmet aplica a rutas U3 también |
| SECURITY-05 | Aplicado | Zod schemas en todos los endpoints nuevos |
| SECURITY-06 | **Aplicado** | Grants para 6 tablas nuevas + audit table SELECT/INSERT only |
| SECURITY-07 | Heredado | Docker isolation |
| SECURITY-08 | **Aplicado fuerte** | `requireRole(['operator','admin'])` middleware en todas las rutas U3 |
| SECURITY-09 | Heredado U1/U2 | Mismo error handler |
| SECURITY-10 | **Aplicado** | nodemailer + node-cron pinneados + npm audit en CI |
| SECURITY-11 | **Aplicado fuerte** | Kill switch fail-closed, paquete inválido bloquea, email solo después de INSERT |
| SECURITY-12 | Heredado U2 | bcrypt + JWT |
| SECURITY-13 | **Aplicado** | handoff_ticket / system_config_audit / alert_events append-only en payload |
| **SECURITY-14** | **Aplicado primario aquí** | Sistema de alertas R-ALERT-1..8 cierra la regla diferida desde U1 |
| SECURITY-15 | Heredado U1 | Handler global |

*No hay findings bloqueantes en este stage.*
