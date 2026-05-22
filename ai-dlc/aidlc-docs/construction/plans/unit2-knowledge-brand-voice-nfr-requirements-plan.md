# NFR Requirements Plan — Unit 2: Knowledge & Brand Voice

## Plan Overview

**Unit**: Unit 2 — Knowledge & Brand Voice
**Purpose**: Definir NFRs específicos a Unit 2 (auth performance, password policy, admin SLOs, browser support, migration strategy) + cerrar decisiones de tech stack residuales.

**Filosofía MVP**: Unit 2 hereda casi todo el stack de Unit 1. Las preguntas se enfocan en lo NUEVO (Brand Manager UI, auth) y en lo que cambia (migration de brand_configs).

**Input artifacts:**
- `aidlc-docs/construction/unit2-knowledge-brand-voice/functional-design/*` (4 archivos)
- `aidlc-docs/construction/unit1-core-agente/nfr-requirements/*` (heredar lo que aplique)
- `aidlc-docs/construction/unit1-core-agente/nfr-design/*` (patterns que se reusan)

**Lo que YA está definido (heredado de Unit 1):**
- Stack: TS+Node+Fastify+Postgres+pgvector+Bedrock+Zod+pg raw+pino
- Migrations tool: `postgres-migrations` (TD-1)
- Test stack: Vitest + Supertest, 70% lines coverage (TD-2..TD-5)
- Deployment local Docker Compose, sin Redis, sin queue
- Logger pino → stdout
- Security Baseline activa (15 reglas), PBT activa

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Bcrypt cost factor (auth performance vs security)

R-AUTH-1 fija bcrypt para password hashing. ¿Qué cost factor (saltRounds)?

A) **10 rounds** — más rápido (~80ms por hash en hardware moderno); aceptable security para MVP con 3-5 BM users.
B) **12 rounds** — industry standard 2024+ (~250ms por hash); login UX aceptable; recomendado OWASP.
C) **14 rounds** — agresivo (~1s por hash); mejor security forward-looking pero login lento.
X) Otro

[Answer]: B

---

### Question 2 — Password policy strictness

Para los Brand Manager users (cantidad esperada en MVP: 3-5 personas total, 1 BM Patprimo + 2-3 operadores + 1 admin), ¿qué política de password?

A) **Básica** — min 12 chars, sin requirement de complexity (sin "debe incluir mayúscula+número+símbolo"). Permite passphrases (más fáciles + más seguras). NO expiry obligatoria.
B) **Industria** — min 10 chars + al menos 1 uppercase + 1 number + 1 special char. Expiry cada 90 días.
C) **Estricta NIST 800-63B** — min 8 chars, check contra breached password lists (HIBP API), zxcvbn strength score ≥3, sin expiry forzada (NIST recomienda no forzar rotation).
X) Otro

[Answer]: A

---

### Question 3 — SLOs para endpoints admin

Los endpoints `/admin/*` se usan por 3-5 personas, intermitentemente. ¿Qué nivel de SLO?

A) **Best-effort** — sin SLO formal, igual que `/ab/decide` y `/health` en Unit 1. Performance "que funcione".
B) **p95 <500ms** para CRUD endpoints + p95 <100ms para auth (login). Documentado pero no auditado.
C) **p95 <2s** para todo /admin/* — relajado, evita over-engineering.
X) Otro

[Answer]: A

---

### Question 4 — Soporte de navegadores para BM UI

¿Qué browsers soporta el dashboard de Brand Manager?

A) **Desktop modern only** — Chrome/Firefox/Edge/Safari últimas 2 versiones. Sin IE11, sin mobile responsive (BMs operan en laptop corporativo).
B) **Modern + mobile responsive** — incluir layouts mobile (tablet+phone) en caso BM revise desde su celular.
C) **Modern + IE11/legacy** — máxima compatibilidad, agrega ~2 días de testing + polyfills.
X) Otro

[Answer]: A

---

### Question 5 — Migration strategy de `brand_configs` (Unit 1) → `brand_config_versions` (Unit 2)

domain-entities.md §7.1 plantea dos opciones para migrar la tabla:

A) **Rename in-place + ADD columns** — `ALTER TABLE brand_configs RENAME TO brand_config_versions` + ADD columns nuevas (version_id, status, author_id, etc.). Conserva la data del seed automáticamente.
B) **Drop + create new + seed** — DROP `brand_configs`; CREATE `brand_config_versions` con schema completo; migration inserta seed Patprimo. Más limpio, sin ALTER frágil.
C) **Dual-write transición** — ambas tablas existen un tiempo; M1 lee de la nueva con fallback a la vieja; feature flag controla. Más complejo, útil si MVP estuviera deployed en producción real (no es el caso).
X) Otro

[Answer]: B

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos (`nfr-requirements.md` + `tech-stack-decisions.md`).

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1=B, Q2=A, Q3=A, Q4=A, Q5=B — sin ambigüedades
- [x] Generar `nfr-requirements.md` — 10 secciones (perf, scale, avail, security delta vs U1 con foco SECURITY-12, reliability, maintainability, usability browser support, NFR-to-Story E4-S1, out-of-scope, security compliance)
- [x] Generar `tech-stack-decisions.md` — adiciones Unit 2 (bcrypt + jsonwebtoken + @fastify/jwt + EJS tentativo + diff server-side), migration DROP+CREATE+seed con SQL completo, decision log TD-U2-1..10, OD-FE-BM cerrada
- [x] Verificar consistencia con SECURITY (SECURITY-12 entra fuerte en Unit 2; resto delta documentado)
- [x] Security compliance summary
- [x] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)
