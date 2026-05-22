# Infrastructure Design Plan — Unit 2: Knowledge & Brand Voice

## Plan Overview

**Unit**: Unit 2
**Purpose**: Documentar el delta de infraestructura introducido por Unit 2 (env vars nuevas, migration de tabla, bootstrap del primer Brand Manager user) + actualizar deployment-architecture quick-start. Sin nuevos servicios Docker.

**Filosofía MVP**: hereda casi todo de Unit 1 Infrastructure Design. Solo agrega lo nuevo para BM.

**Input artifacts:**
- `construction/unit2-knowledge-brand-voice/nfr-design/nfr-design-patterns.md`
- `construction/unit2-knowledge-brand-voice/nfr-design/logical-components.md` (delta vs Unit 1)
- `construction/unit2-knowledge-brand-voice/nfr-requirements/tech-stack-decisions.md` (migration SQL completo + env vars)
- `construction/unit1-core-agente/infrastructure-design/*` (deployment-architecture a extender)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Bootstrap del primer Brand Manager user

R-AUTH-8 prohíbe self-signup. ¿Cómo se crea el primer BM en un nuevo deployment?

A) **Migration con seed SQL** — la migration de Unit 2 inserta un BM user seed (`bm-patprimo@pash.com.co`) con password placeholder hashada. Operador hace login con password placeholder y la cambia en primer uso. Más automatizado.
B) **CLI script `npm run create-bm`** — script interactivo que pregunta email + password + brand_scopes y inserta el user. Más explícito; password nunca queda en migration history.
C) **SQL manual** — el dev/admin abre psql y ejecuta INSERT con hash bcrypt generado on-the-fly. Más artesanal pero sin código adicional.
X) Otro

[Answer]: B

---

### Question 2 — Feature flag `ADMIN_UI_ENABLED` default

¿Qué default ponemos al feature flag de Unit 2 NFR-D §5?

A) **Default `true` siempre** — BM UI siempre habilitado (incluyendo MVP demo). Simplifica setup.
B) **Default `false`; documentar en quickstart cómo flippearlo a true** — más defensivo si alguien deploya sin pensar en auth setup; pero agrega un paso al quickstart.
C) **Default `true` en dev, requerido explícito en prod** — diferencia por `NODE_ENV`; más complejo, sin valor MVP.
X) Otro

[Answer]: A

---

### Question 3 — Backup considerations para `sign_offs`

`sign_offs` es append-only y tiene valor legal/auditable. ¿Cambia la decisión Q4=C de Unit 1 ("sin backup MVP")?

A) **Mantener Q4=C — sin backup automatizado** — `sign_offs` es low-volume; si se pierde el volumen Docker, el seed migration recrea data básica; la pérdida de sign-offs históricos en MVP es aceptable (no hay tráfico real).
B) **Backup manual on-demand antes de demos importantes** — `npm run backup` snapshot pre-Demo Day; no automatización pero sí runbook.
C) **Backup automático daily solo para `sign_offs` + `auth_audit_log` + `consent_log`** — script cron que extrae solo estas 3 tablas críticas; el resto es regenerable.
X) Otro

[Answer]: B

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos (`infrastructure-design.md` + `deployment-architecture.md`) — el segundo extiende el quick-start de Unit 1 con los pasos de Unit 2.

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1=B, Q2=A, Q3=B — sin ambigüedades
- [x] Generar `infrastructure-design.md` — delta vs Unit 1: 4 nuevas env vars, migration sequence 0001-0006, CLI script `create-bm` interactivo, BM UI static serving, backup script on-demand, npm scripts adicionales
- [x] Generar `deployment-architecture.md` — quick-start completo 8 pasos (Unit 1 + Unit 2 end-to-end), env vars matrix de 22 variables, `.env.example` consolidado, backup runbook Demo Day, rollback procedures delta (UI brick, version brick, forgot password), Demo Day flow BM UI con cambio en vivo + rollback
- [x] Security compliance summary
- [x] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)
