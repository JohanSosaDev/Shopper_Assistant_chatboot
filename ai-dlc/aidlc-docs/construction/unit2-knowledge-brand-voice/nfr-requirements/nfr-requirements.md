# NFR Requirements — Unit 2: Knowledge & Brand Voice

> **Filosofía MVP**: hereda Unit 1 NFRs. Solo enumera lo nuevo o lo que diverge específicamente para Unit 2.

---

## 1. Performance

### 1.1 Latency targets

| Endpoint | SLO | Notas |
|---|---|---|
| `POST /admin/auth/login` | best-effort, ~250-400ms esperado | dominado por bcrypt 12 rounds |
| `POST /admin/auth/logout` | best-effort, <100ms esperado | INSERT en revoked_tokens |
| `/admin/brands/:brand/configs` (CRUD) | best-effort | queries simples sobre tabla pequeña |
| `/admin/brands/:brand/configs/:id/activate` | best-effort, <500ms esperado | TX corta (2 UPDATEs) |
| M1 fresh-load de brand config | <50ms p95 | SELECT con índice partial active |

**Sin SLO formal en MVP** (Q3=A) — siguiendo el patrón de Unit 1 donde solo `/chat` tenía SLO comprometido.

### 1.2 Throughput
- BM UI usado por 3-5 personas, intermitentemente (probablemente <10 req/min total en peak)
- M1 fresh-load: 1 SELECT por turn de Caso 1; cubre 50 conv simultáneas sin problema.

### 1.3 Optimization priorities (MVP)
- Auth flow: bcrypt es el bottleneck conocido → 12 rounds es el ceiling razonable
- Sin cache en MVP (Q2=A NFR Unit 1) → cada `getActive()` es un SELECT a Postgres. Acceptable a 50 conv concurrent (R-IP1-4).

---

## 2. Scalability

**Hereda Unit 1**: vertical scaling solo MVP; sin Redis; sin queue.

**Específico Unit 2**:
- Tablas nuevas pequeñas — `brand_config_versions` (~10-50 rows total/year), `sign_offs` (~10-50/year), `brand_manager_users` (~5 rows), `revoked_tokens` (rotates), `auth_audit_log` (~1000/year @ 3-5 users).
- Sin partitioning necesario.
- Forward-looking: cuando Fase 2 expanda a las 4 marcas, `brand_config_versions` crece 4× pero sigue siendo small (no es turn_log_audit que es high-volume).

---

## 3. Availability

**Hereda Unit 1**: 99% objetivo MVP; restart unless-stopped Docker.

**Específico Unit 2**:
- Si BM UI cae, **M1 sigue funcionando** porque `brand_config_versions.status='active'` persiste — el chat al cliente final no se afecta.
- Si Postgres cae, **todo cae** (BM UI y M1). Aceptable MVP.

---

## 4. Security (Unit 2 introduce nuevo scope SECURITY-12)

### 4.1 Cumplimiento de las 15 reglas SECURITY (delta vs Unit 1)

| Rule | Unit 1 status | Unit 2 delta |
|---|---|---|
| SECURITY-04 (HTTP headers) | Aplicado a `/chat` | **Extiende a `/admin/*`**: mismas headers + agregar `X-Frame-Options: DENY` (BM UI nunca debe estar en iframe) |
| SECURITY-05 (input validation) | Zod en `/chat` controllers | **Extiende a admin**: cada endpoint admin con Zod schema; password en login validado client + server |
| SECURITY-06 (least privilege) | 2 roles Postgres | **Sin cambio** — los admin endpoints usan el mismo rol `hermes_app` (que ya tiene SELECT/INSERT sobre `brand_config_versions` + `sign_offs` agregadas a su grant) |
| SECURITY-08 (access control) | Consent gate en `/chat` | **Extiende fuerte**: JWT obligatorio en cada `/admin/*` excepto `/admin/auth/login`; CORS restricted al origin del admin UI; brand scope check |
| SECURITY-09 (hardening) | Aplicado | Mismo: errors genéricos; no internal info leak; `/admin/login` no revela si el email existe (R-AUTH genérico) |
| SECURITY-11 (secure design) | Aplicado | Workflow gobernanza draft→approved→active previene cambios accidentales (R-BC-*) |
| **SECURITY-12 (auth + credentials)** | Parcial Unit 1 (sin user auth) | **Aplicado fuerte Unit 2**: bcrypt 12 rounds (R-AUTH-1, Q1=B); JWT 8h (R-AUTH-2); brute-force lock 5 attempts/15min (R-AUTH-5); logout invalidation (R-AUTH-6); password policy básica (Q2=A) — ver §4.2 |
| SECURITY-13 (data integrity) | turn_log_audit append-only | **Extiende**: `sign_offs` + `auth_audit_log` append-only por design (R-SO-2, R-AUTH-7) |
| SECURITY-14 (alerting + monitoring) | Logs Postgres + pino stdout | `auth_audit_log` retention ≥90d; alertas formales en Unit 3 (mismo deferral que Unit 1) |
| SECURITY-15 (exception handling) | CC-2 global handler | Mismo handler maneja errores de `/admin/*` también |

### 4.2 Password policy detallada (Q2=A — básica, alineada NIST 800-63B moderna)

| Requisito | Valor |
|---|---|
| Longitud mínima | 12 chars |
| Longitud máxima | 128 chars |
| Complexity requirements | **NINGUNO** (no se exige mayúscula/número/símbolo) |
| Permite passphrases | Sí |
| Check contra breached lists | NO en MVP (HIBP API → Fase 2 si compliance lo exige) |
| Expiry | NO forzada (NIST 800-63B recomienda no rotar sin razón) |
| Reuse prevention | NO en MVP (3-5 users, riesgo bajo) |
| Storage | bcrypt(saltRounds=12) |
| Visibility | password input con `type=password` + opción "show/hide" en UI |

**Justificación**: pequeño número de users (3-5), comunicación inicial out-of-band, threat model interno bajo. Política moderna evita la trampa de "P@ssw0rd!2026" predictable.

### 4.3 Threat model específico Unit 2

| Threat | Mitigación |
|---|---|
| Credential stuffing en `/admin/auth/login` | Rate limit 5/15min/IP + lockout 30min después de 5 attempts (R-AUTH-5) |
| Brute force offline si DB hash leakea | bcrypt 12 rounds = ~250ms/intento × 2^60 combinations = inviable |
| JWT robado | Exp 8h + logout invalidation (R-AUTH-6) + sessionStorage (no localStorage) |
| Privilege escalation (BM toca otra marca) | Brand scope enforcement en middleware (R-AUTH-4) |
| Sign-off forgery | `approved_by` FK validated + JWT del request determina identity; sin endpoint público de "INSERT sign_off" arbitrario |
| Mass enumeration de versionIds | UUIDs no-secuenciales + auth gate; bajo riesgo |

---

## 5. Reliability

**Hereda Unit 1**: error budget 1%, circuit breaker patterns.

**Específico Unit 2**:
- Activación con TX atómica (R-BC-5) — si commit falla, NO hay versión en estado inconsistente.
- Cleanup job `revoked_tokens` corre daily; si falla, máximo crecimiento de tabla durante 1 día.
- Cleanup job `auth_audit_log` corre weekly purgando rows >90 días.

---

## 6. Maintainability

**Hereda Unit 1**: TS strict, ESLint+Prettier, Vitest 70% lines coverage (Q4 NFR Unit 1).

**Específico Unit 2**:
- **PBT extension activa** aplica a:
  - bcrypt wrapper (round-trip property: `compare(hash(p), p) === true`)
  - JWT sign/verify round-trip
  - Brand config state transitions (válidas vs inválidas)
- Tests específicos a generar en Code Generation Unit 2 (cuando se ejecute):
  - `auth.service.test.ts` — login success/fail/lockout/expired
  - `brand-config.service.test.ts` — state transitions + activation atomicity
  - `permissions.middleware.test.ts` — scope enforcement
  - `signoff.repo.test.ts` — append-only enforcement (intentar DELETE/UPDATE falla)
  - Integration: `/admin/auth/login` happy path + locked + invalid

---

## 7. Usability (BM UI)

### 7.1 Browser support (Q4=A — desktop modern only)

| Browser | Versión soportada |
|---|---|
| Chrome | últimas 2 versiones major |
| Firefox | últimas 2 versiones major |
| Edge | últimas 2 versiones major |
| Safari | últimas 2 versiones major |
| IE11, Opera, mobile browsers | **NO soportados** (graceful degradation; mensaje "tu navegador no es compatible") |

**Justificación**: BMs operan desde laptop corporativo PASH (Win + Edge/Chrome típicamente). Mobile / IE11 = trabajo sin ROI.

### 7.2 Layout
- **Desktop-first**: 1280px width como baseline.
- Sin mobile responsive en MVP.
- Min height 720px assumed.

### 7.3 a11y
- WCAG AA mínimo (igual que widget cliente Unit 1).
- Focus management + screen reader announcements para toasts y modales.

---

## 8. NFR-to-Story traceability (E4-S1)

| AC Gherkin (E4-S1) | NFRs cubiertos |
|---|---|
| "System prompt v1 validado por BM" | Performance: best-effort admin. Security: SECURITY-08 (JWT) + SECURITY-12 (auth). Reliability: TX atomicity (R-BC-5). |
| "Muestra semanal post-launch" | **Out of scope MVP (Q5=C de FD)** — sin NFR en Unit 2. |
| "Veto mid-launch dispara rollback" | Performance: activation <500ms esperado. Reliability: TX atomicity en rollback. Security: SECURITY-13 audit trail. |
| "Versionado de configuraciones" | SECURITY-13 (sign_offs append-only). Storage: tabla `brand_config_versions` con índices apropiados. |

---

## 9. Out-of-scope NFRs (referencia)

- ❌ Load testing para admin endpoints (3-5 users = sin necesidad)
- ❌ Multi-region failover de auth
- ❌ MFA (multi-factor) para BM users (Fase 2 si compliance lo exige)
- ❌ SSO integration (Okta/Auth0/etc.) — Fase 2
- ❌ HIBP integration (breached password check) — Fase 2
- ❌ Mobile responsive
- ❌ IE11 / legacy browser support
- ❌ Real-time collaborative editing
- ❌ Audit log dashboard/UI (Fase 2)

Todos pasan a Fase 2.

---

## 10. Security Compliance Summary (stage = NFR Requirements Unit 2)

| Rule | Status | Notas |
|---|---|---|
| SECURITY-04 | Aplicado | Helmet + X-Frame-Options DENY en `/admin/*` |
| SECURITY-05 | Aplicado | Zod en cada admin endpoint |
| SECURITY-08 | Aplicado | JWT + brand scope check |
| SECURITY-09 | Aplicado | Errores genéricos, no info leak |
| SECURITY-11 | Aplicado | Workflow gobernanza |
| **SECURITY-12** | **Aplicado fuerte** | bcrypt 12 + JWT + brute-force + logout invalidation; password policy NIST-aligned |
| SECURITY-13 | Aplicado | sign_offs + auth_audit_log append-only |
| SECURITY-14 | Aplicado | retention 90d en auth_audit_log; cleanup jobs daily/weekly |
| Otros | N/A o heredado de Unit 1 | — |

*No hay findings bloqueantes en este stage.*
