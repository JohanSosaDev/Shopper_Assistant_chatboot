# Business Rules — Unit 3: Handoff & Despliegue Gradual

> **Scope**: reglas numeradas con prefijos `R-SENT-*` (sentiment), `R-HO-*` (handoff triggers + paquete), `R-HOD-*` (handoff delivery), `R-ROLL-*` (rollout gate), `R-DASH-*` (dashboard), `R-ALERT-*` (alerting). Complementan las reglas de Unit 1 (R-PIPE-*, R-SH-*) y Unit 2 (R-BC-*, R-AUTH-*).

---

## §1 — Sentiment scoring (R-SENT-*)

**R-SENT-1 — Heurística keywords-based en MVP.** El `SentimentScorer.score(text)` retorna un número en `[-1, 1]` derivado de:
- Match contra lista de keywords negativos ES-CO seed (ej. `decepcionado`, `molesto`, `horrible`, `pésimo`, `queja`, `exigir`, `devolver YA`, `estafa`, `robo`, `nunca más`, `terrible`).
- Cada match base = -0.4 score. Intensificadores multiplican: MAYÚSCULAS (>=4 chars contiguos) ×1.5; repetición vocálica (`horriiible`) ×1.3; signos de exclamación (cada `!` adicional, max 3) +0.1 magnitud.
- Score se clampa a `[-1, 1]`. Si no hay matches, score = 0 (neutro).

**R-SENT-2 — Lexicón seed versionado.** La lista de keywords vive en `prompts/sentiment_lexicon_es_co.json` con campos `keyword`, `weight`, `category`. Se carga al boot. Cambios requieren PR y redeploy (sin live edit en MVP — Fase 2 puede traer un CRUD desde BM UI).

**R-SENT-3 — Threshold de handoff = -0.5.** Solo `score < -0.5` dispara trigger `sentiment_negative` (R-HO-1). Scores entre -0.5 y 0 se persisten en `turn_log_audit.sentiment_score` pero NO disparan handoff (telemetría para Fase 0).

**R-SENT-4 — Sentiment se calcula solo sobre el último mensaje del cliente.** No se acumula histórico de scores. Esto evita que una conversación entre con sentimiento neutro pero el bot escale por arrastre de turnos previos.

**R-SENT-5 — Texto truncado a 2000 chars.** Mensajes más largos se truncan antes del scoring. Esto acota tiempo de cómputo y matchea el límite de input guardrail de Unit 1 (R-SH-3).

---

## §2 — Triggers de handoff (R-HO-*)

**R-HO-1 — 5 triggers, evaluación en orden estricto.** El `TriggerDetector.evaluate(ctx)` evalúa en este orden y retorna el PRIMER trigger que matchee (sin concatenar):
1. `button_click` — el frontend mandó `source='handoff_button'`.
2. `explicit_request` — `intent === 'explicit_handoff_request'` (clasificado por LLM, R-HO-2).
3. `sentiment_negative` — `sentiment_score < -0.5` (R-SENT-3).
4. `out_of_scope_intent` — `intent IN {return_request, complaint, complex_search}`.
5. `low_confidence` — `confidence < 0.6` AND `ConversationState.consecutive_low_confidence_turns >= 1`.

Si ninguno matchea, retorna `null` y la pipeline continúa con `generate_response`.

**R-HO-2 — `explicit_handoff_request` es un intent del catálogo de classify_intent.** El LLM de Unit 1 clasifica un mensaje como `explicit_handoff_request` cuando el cliente pide explícitamente humano/persona/asesor (variantes formales e informales en ES-CO). El prompt del clasificador en Unit 1 incluye 3-5 few-shot examples cubriendo: "quiero hablar con una persona", "pásame con alguien", "necesito un humano", "ya no aguanto este bot".

**R-HO-3 — Low confidence dispara solo en el SEGUNDO turn fallido.** En el primer turn con `confidence < 0.6` el bot pide clarificación (R-PIPE-X de Unit 1). Si el siguiente turn del usuario también clasifica con `confidence < 0.6`, se incrementa `ConversationState.consecutive_low_confidence_turns` y se dispara `low_confidence`. Esto evita escalar prematuramente.

**R-HO-4 — Button click bypasea todo.** Si `source='handoff_button'`, no se evalúan los otros 4 triggers ni se genera respuesta. Es un trigger duro: el cliente quiere humano, punto.

**R-HO-5 — Trigger persistido en log.** Cada evaluación se persiste como `turn_log_audit.handoff_trigger` (enum, nullable). Permite hacer drill-down y agregaciones de E2-S2.

**R-HO-6 — Handoff es terminal del turn.** Disparado un trigger, el bot NO produce respuesta de IA en ese turn. El cliente recibe directamente el mensaje del Workflow C (R-HOD-1).

**R-HO-7 — Una sola transición por conversación.** Una vez que la conversación entra a estado `handoff_in_progress` (en `ConversationState`), nuevos mensajes del cliente NO se procesan por la pipeline de Hermes — se redirigen al captura de contact info (R-HOD-2). El estado solo sale via timeout o intervención manual del operador.

---

## §3 — Paquete de contexto (R-HO-*, continuación)

**R-HO-8 — Campos obligatorios del paquete.** `HandoffPackage` debe contener: `trigger`, `mensaje_cliente`, `intencion_clasificada`, `sentimiento_score`, `conversation_transcript_url`, `categoria_sugerida`. Si falta cualquiera, `validatePackage()` retorna `false` y el handoff falla (R-HO-12).

**R-HO-9 — Campos opcionales con degradación graceful.** `customer_id_hash`, `customer_email`, `demografia_minima`, `historico_pedidos`, `intento_del_bot` son opcionales. Si no están disponibles (guest sin consent; SFCC timeout; handoff en primer turn) el paquete se entrega igual con esos campos en `null` y un flag `degraded_fields: ['historico_pedidos', 'identity']` para que CX sepa qué falta.

**R-HO-10 — PII visible al agente, hasheada en logs.** El `HandoffPackage` que se envía por email contiene `customer_email`, `customer_phone` (si el cliente los dio) y `pedido_ids` en **cleartext** porque CX los necesita para operar. La copia que se persiste en `handoff_ticket.package_audit` y en `turn_log_audit` los anonimiza (hash sha256). Esta separación se hace en `PackageBuilder.serialize(audience: 'email' | 'audit')`.

**R-HO-11 — SFCC timeout = 3 segundos.** El call a `M3 SFCC.getOrderHistory()` durante `PackageBuilder.build()` tiene timeout duro de 3s (`withTimeout` lib Unit 1). Si falla, `historico_pedidos=[]` + `degraded_fields` incluye `'historico_pedidos'`. NO se reintenta — el handoff es time-sensitive.

**R-HO-12 — Paquete inválido bloquea handoff.** Si `validatePackage(pkg) === false`, el sistema:
- Persiste `handoff_ticket` con `status='package_invalid'` para auditoría.
- Envía al cliente: "Estamos teniendo un problema técnico, intenta en unos minutos."
- Dispara alerta `package_incomplete` (P3 Operador + P6 Admin) — R-ALERT-2.
- NO envía email a CX (evita ticket con contexto roto).

---

## §4 — Delivery del handoff (R-HOD-*)

**R-HOD-1 — Mensaje stub estándar al cliente.** Cuando se dispara handoff y el paquete es válido, el cliente recibe (mismo texto siempre, configurable en `system_config.handoff_stub_message`):
> "Te conectamos con un asesor humano. Por favor déjanos tu correo electrónico o número de WhatsApp y te respondemos en horario hábil (8am–6pm, lunes a sábado, hora Bogotá)."

**R-HOD-2 — Captura de contact info es libre-form pero validado.** El cliente envía su contact info en el siguiente mensaje. El sistema valida con regex permisiva:
- Email: `^[\w.+-]+@[\w-]+\.[\w.-]+$`
- Phone Col: `^(\+57)?\s?3\d{9}$|^\d{7,10}$`

Si la entrada no matchea ninguna, el bot pregunta: "No identifiqué tu contacto. ¿Puedes enviarlo como correo (`@`) o número (10 dígitos)?" — hasta 2 reintentos. Después del 2do fallo, el sistema crea el ticket con `contact_info='not_provided'` y agrega un flag `manual_followup_required=true`.

**R-HOD-3 — Persistencia antes del envío.** `handoff_ticket` se INSERT primero con `status='pending'`, luego se envía el email. Si el INSERT falla → reportar error 5xx al cliente, NO intentar email sin ticket persistido (evita huérfanos).

**R-HOD-4 — Email HTML + plain text.** El email a CX incluye ambas versiones (mime multipart). El HTML formatea el paquete en una tabla legible. El plain text está como fallback para clientes de email que bloquean HTML.

**R-HOD-5 — Subject prioritizado.** El subject del email lleva tag de prioridad derivada del trigger:
- `[ALTA]` para `sentiment_negative` y `out_of_scope_intent` con categoría `complaint`.
- `[NORMAL]` para el resto.

Formato: `[ALTA] Hermes Handoff HT-2026-0042 — sentiment_negative — patprimo.com`.

**R-HOD-6 — Retry SMTP con circuit breaker.** Email send usa `withRetry(3, backoff='exponential')` + `withCircuitBreaker` (Unit 1 lib). Si el breaker está abierto, el ticket se marca `status='delivery_failed_breaker'` y se programa retry diferido (Fase 2 — job background) o intervención manual.

**R-HOD-7 — Mensaje de cierre con referencia.** Tras delivery exitoso, el cliente recibe: "Listo, recibirás respuesta en X horas hábiles. Tu número de referencia es **HT-2026-NNNN**." El ID es el `ticket_id` corto (formato `HT-{año}-{secuencial-4-dígitos}`).

**R-HOD-8 — Fuera de horario hábil.** Si el handoff dispara fuera de horario hábil (definido en `system_config.handoff_business_hours_cron`), el mensaje al cliente cambia a: "Te respondemos el próximo día hábil (lunes 8am)". El email se envía igualmente (la cola se atiende cuando CX entra a trabajar).

---

## §5 — Rollout gate (R-ROLL-*)

**R-ROLL-1 — Kill switch tiene precedencia absoluta.** Si `system_config.hermes_enabled === false`, `shouldServeHermes()` retorna `false` sin importar `hermes_traffic_percentage`. Esto da al operador un kill switch confiable para incidentes.

**R-ROLL-2 — Hash determinístico con sal global.** El bucket se calcula:
```
identifier = customerIdHash ?? sessionId
bucket = sha256(identifier + system_config.rollout_salt)[0:8] interpretado como uint32, % 100
```
La sal global (`rollout_salt`) permite "re-rifar" los buckets si se cambia (ej. tras una mala iteración: cambiar la sal redistribuye los clientes sin afectar la lógica).

**R-ROLL-3 — Customer recurrente ve el mismo bucket cross-session.** Si `customerIdHash` está presente (cliente logueado y consentido), su asignación es estable a través de sesiones distintas. Esto permite mediciones de "experiencia de cliente recurrente con Hermes" honestas.

**R-ROLL-4 — Guests usan sessionId.** Sin `customerIdHash`, el bucket se calcula sobre `sessionId` (UUID generado al primer hit del widget, persistido en cookie httpOnly). Mismo guest, misma sesión → mismo bucket. Mismo guest, nueva sesión → bucket potencialmente distinto (aceptable; guests no son measurement-critical en MVP).

**R-ROLL-5 — Cache de 60s para `system_config`.** El `SystemConfigRepo.get()` cachea en memoria 60s. Cambios desde BM UI tardan ≤60s en propagar — aceptable para soft-launch ramp (operador no cambia % cada segundo).

**R-ROLL-6 — Cambios de config son auditables.** Cada UPDATE a `system_config` desde la BM UI se loguea en `system_config_audit` (timestamp, user_id, field, old_value, new_value, reason_text). Esto cumple R-AUTH-X de Unit 2 (audit trail para cambios de configuración).

**R-ROLL-7 — Validación de `hermes_traffic_percentage`.** Solo acepta enteros `[0, 100]`. Valores fuera de rango → 400. El BM UI también valida client-side.

**R-ROLL-8 — Excluded users ven mensaje offline, no error.** Si `shouldServeHermes() === false`, el widget muestra:
> "Atención por correo en horario hábil: cx@patprimo.com — o deja tu mensaje aquí y te respondemos."
+ formulario simple para email + mensaje. Esto NO es una experiencia "rota" — es un fallback gracioso.

**R-ROLL-9 — Seed defaults seguros.** Migración inicial siembra:
- `hermes_enabled = true`
- `hermes_traffic_percentage = 0`
- `rollout_salt = <32 bytes random generated at migration time>`

Con `traffic_percentage=0`, nadie ve Hermes hasta que el operador suba el % manualmente. Esto evita exposiciones accidentales.

---

## §6 — Dashboards (R-DASH-*)

**R-DASH-1 — Queries directas a `turn_log_audit` con índices.** Estrategia Q3=A. No hay materialized views ni snapshot tables en MVP. Performance budget: cada query <500ms p95.

**R-DASH-2 — Ventana por defecto = 24h.** Todos los KPIs del dashboard default usan ventana de 24h desde `NOW()`. El operador puede ajustar a 1h / 7d / 30d con un dropdown.

**R-DASH-3 — Page load total <3 segundos.** El endpoint del dashboard E2-S1 retorna todos los KPIs en una sola response JSON. Si alguna query individual excede 500ms, se ejecuta con `Promise.allSettled` y los KPIs lentos se renderizan con spinner (no bloquean los rápidos).

**R-DASH-4 — Filtros del drill-down (E2-S2).** Parámetros aceptados: `from`, `to` (ISO timestamps), `intent` (enum), `trigger` (enum handoff_trigger), `brand` (enum). Paginación: `limit` (default 50, max 200), `offset`.

**R-DASH-5 — Vista de conversación completa.** Endpoint `GET /admin/conversations/:id` une `turn_log_audit` + `handoff_ticket` por `conversation_id`. Retorna un objeto con `turns: []` y `handoff: {} | null`. El frontend renderiza chat-style.

**R-DASH-6 — Acceso restringido por rol.** Solo `operator` y `admin` pueden ver dashboards. `brand_manager` (rol de Unit 2) NO tiene acceso a `/admin/dashboard/*` ni a `/admin/escalations/*`. JWT scope se valida en middleware.

**R-DASH-7 — Datos en cleartext en UI, hasheados en exports.** El BM UI muestra al operador la info de PII (emails, # pedido) — es operación interna. Si el operador exporta drill-down a CSV, los campos sensibles se hashan o redactan (decisión de R-SH-X Unit 1 sobre privacy in exports).

---

## §7 — Alerting (R-ALERT-*)

**R-ALERT-1 — Slack webhook único en MVP.** Q4=B. Un solo `SLACK_WEBHOOK_URL` apunta al canal `#hermes-alerts`. Sin SMTP fallback en MVP — si el webhook falla, evento se loguea a stdout (`pino.warn`) y queda en `alert_events` (visible en BM UI).

**R-ALERT-2 — Reglas built-in seed (no editables por operador).** 5 reglas always-on al boot:
1. `latency_p95_breach`: 1ª respuesta p95 > 90s durante 10 min.
2. `guardrail_violation`: cualquier evento `guardrail_violated=true` → alerta inmediata sin throttling.
3. `circuit_breaker_open`: CB abierto >2 min consecutivos.
4. `package_incomplete`: handoff package falló validación (R-HO-12).
5. `email_delivery_failure_rate`: >5% delivery_failed en 1h.

Estas reglas se persisten en `alert_rules` con flag `is_builtin=true`; el CRUD del operador no puede borrarlas (solo desactivar temporalmente).

**R-ALERT-3 — Reglas custom CRUD (E2-S3).** Operador crea/edita reglas con campos:
- `name` (string)
- `metric` (enum: `latency_p95`, `latency_p50`, `cost_per_query`, `escalation_rate`, `csat_avg`, `guardrail_violation_count`, etc.)
- `window_minutes` (1..1440)
- `operator` (enum: `>`, `<`, `>=`, `<=`, `==`)
- `threshold` (numeric)
- `cooldown_minutes` (default 15, range 1..720)
- `severity` (enum: `low`, `medium`, `high`, `critical`)
- `active` (bool)

**R-ALERT-4 — Throttling per-rule.** Cada `rule_id` no puede notificar más de 1 vez cada `cooldown_minutes`. Eventos dentro del cooldown se persisten en `alert_events` con `notified=false`. Excepción: severidad `critical` ignora cooldown (siempre notifica).

**R-ALERT-5 — Eval cron cada 60s.** Background job evalúa todas las reglas activas en cada tick. Si el job toma >60s, se ejecuta secuencial (no se acumulan corridas paralelas — usar lock en Postgres advisory).

**R-ALERT-6 — Cambios de regla aplican en <1min.** Tras UPDATE a `alert_rules`, el siguiente tick del evaluador la usa. No hay cache; cada tick re-lee la tabla (volumen bajo, <50 reglas esperadas en MVP).

**R-ALERT-7 — Payload Slack texto plano + Markdown.** Slack incoming webhook acepta payload JSON con `text` y opcional `blocks`. MVP usa solo `text` con formato:
```
*[Hermes Alert] {rule.name}* — severidad: {rule.severity}
Métrica: {rule.metric} = {actual_value} ({rule.operator} {rule.threshold})
Ventana: últimos {rule.window_minutes} min
<{dashboard_link}|Ver dashboard>
```

**R-ALERT-8 — Tag de stakeholders en payload.** Reglas con `severity='critical'` agregan `<!channel>` al payload (notifica a todo el canal). `severity='high'` agrega `<@U_OPERATOR>` (id del operador on-call configurado en env). `medium`/`low` sin mención.

---

## §8 — Security & Compliance summary

| Aplicable | Regla | Cómo se cubre |
|---|---|---|
| SECURITY-1 (Anonymization in logs) | R-HO-10 | PII separada en audience='email' vs 'audit'; logs hashean. |
| SECURITY-2 (Append-only audit) | R-DASH-1 + R-HO-5 | `turn_log_audit` y `handoff_ticket` son append-only (UPDATE solo en campos status/audit, no en payload). |
| SECURITY-3 (Defense in depth) | R-HO-12 + R-ROLL-1 | Paquete inválido bloquea entrega; kill switch absoluto. |
| SECURITY-4 (Least privilege DB roles) | N/A en este unit | Heredado de Unit 1 NFR Design (rol `hermes_app` con privilegios mínimos sobre tablas Unit 3). |
| SECURITY-5 (Fail-closed) | R-HO-12, R-ROLL-8 | Errores en handoff → mensaje al cliente, no exposición de info. Excluded → mensaje offline, no error. |
| SECURITY-6 (PII en tránsito) | R-HOD-4 | Email vía SMTP TLS (MVP: mailhog local; Fase 2: corporate SMTP con TLS). |
| SECURITY-7 (Audit trail config changes) | R-ROLL-6 | `system_config_audit` para cambios de rollout. |
| SECURITY-8 (RBAC enforcement) | R-DASH-6 | Solo `operator`/`admin` accede dashboards; `brand_manager` excluido. |
| SECURITY-9..15 | Aplicables vía herencia de Unit 1 NFR | Sin cambios. |

**PBT compliance (property-based testing)**: las funciones puras que entran a PBT en Unit 3 son `SentimentScorer.score` (propiedades: idempotente, clampada a [-1,1], orden monotónico con intensificadores), `RolloutGate.shouldServeHermes` (propiedades: determinismo por identifier, monotónico con traffic_percentage, kill switch absoluto), `validatePackage` (propiedad: rechazo iff falta cualquier campo obligatorio).
