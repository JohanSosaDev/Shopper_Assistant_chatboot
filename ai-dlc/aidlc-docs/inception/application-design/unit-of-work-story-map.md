# Story-to-Unit Mapping — Hermes

> **Verificación**: cada una de las 16 stories de `stories.md` está asignada a **exactamente 1 unidad** + las 10 MH features siguen cubiertas.

---

## 1. Mapping table (16 stories → 3 units)

| Story | Persona primary | Epic (stories.md) | Unit | Justificación |
|---|---|---|---|---|
| E1-S1 — Saludo + transparencia + autorización | P1 Cliente final | E1 Order Tracking | **Unit 1** | Onboarding del turno; pre-requisito de todo. M1 + M6 (consent gate). |
| E1-S2 — Identificación dual SFCC + guest | P1 Cliente final | E1 Order Tracking | **Unit 1** | M4 — auth dual. Pre-requisito de Caso 1. |
| E1-S3 — Tool call `get_order_status` | P6 Admin/Dev (impl); P1 (beneficiary) | E1 Order Tracking | **Unit 1** | M3 — tool implementation. Core del MVP. |
| E1-S4 — Respuesta voz Patprimo | P4 Brand Manager (defines); P1 (beneficiary) | E1 Order Tracking | **Unit 1** | M1 — render con grounding. Usa **seed bootstrap** de brand config; el CRUD real va a Unit 2 (E4-S1). |
| E1-S5 — Guardrails anti-jailbreak | P6 Admin/Dev | E1 Order Tracking | **Unit 1** | M1 — guardrails de input/output. Pre-requisito de cualquier deploy seguro. |
| E1-S6 — Logging completo del turno | P5 Compliance | E1 Order Tracking | **Unit 1** | M7 write-path. Pre-requisito de SECURITY-14 + compliance LATAM. |
| E2-S1 — Dashboard del operador con KPIs | P3 Operador | E2 Operations | **Unit 3** | M7 read-path. Daniela necesita el dashboard para operar; va junto con escalations/alerts (también Unit 3). |
| E2-S2 — Drill-down de escalamientos | P3 Operador | E2 Operations | **Unit 3** | M7 read-path. Drill-down sobre conversaciones que escalaron (M5 Unit 3). |
| E2-S3 — Alertas configurables | P3 Operador | E2 Operations | **Unit 3** | M7 alerting. Las reglas iniciales son sobre handoff failures + guardrail violations — naturalmente Unit 3. |
| E2-S4 — Fase 0 instrumentación baseline | P3 Operador; P6 Admin/Dev | E2 Operations | **Unit 1** | Es **meta-instrumentación pre-launch** — captura baseline del modelo actual. Necesita el LoggerService (Unit 1) operativo para reusar el mismo data lake. |
| E3-S1 — Detección triggers de handoff | P6 Admin/Dev | E3 Human Handoff | **Unit 3** | M5 — core del handoff. |
| E3-S2 — Construcción paquete contexto | P2 Agente humano | E3 Human Handoff | **Unit 3** | M5 — depende de M3 `getOrderHistory` y M6 `anonymizePII` (integration points IP-2, IP-3). |
| E3-S3 — Transferencia operativa Oct8ne | P6 Admin/Dev | E3 Human Handoff | **Unit 3** | M5 — integración con widget Oct8ne. |
| E3-S4 — Botón "Hablar con persona" persistente | P1 Cliente final | E3 Human Handoff | **Unit 3** | M5 — coordinación con frontend widget (depende de OD-5). |
| E4-S1 — Voz Patprimo + sign-off Brand Manager | P4 Brand Manager | E4 Cross-cutting | **Unit 2** | M8 CRUD + sign-off + versioning + rollback. **Story gruesa** que cubre MH-3 completo. |
| E4-S2 — Convivencia A/B Oct8ne + rollback | P6 Admin/Dev; P3 Operador | E4 Cross-cutting | **Unit 3** | M8 A/B routing. Depende del brand config de Unit 2 + del orquestador de Unit 1. |

---

## 2. Conteo por unidad

| Unit | Stories | % del total |
|---|---|---|
| Unit 1 — Core Agente | 7 | 44% |
| Unit 2 — Knowledge & Brand Voice | 1 | 6% |
| Unit 3 — Handoff & Convivencia | 8 | 50% |
| **Total** | **16** | **100%** |

> **Nota sobre balance**: Unit 1 (44%) y Unit 3 (50%) cargan la mayoría del peso. Unit 2 (6%) es solo 1 story pero **gruesa** — implementa CRUD + versioning + sign-off + activate/rollback (~3-5 días de trabajo según planning §6 del execution-plan). El balance real de esfuerzo es ~Unit 1: 45% · Unit 2: 15% · Unit 3: 40%.

---

## 3. MH Coverage verification

¿Las 10 MUST HAVE features del PRD §8 siguen cubiertas? **Sí — 10/10**.

| MH | Feature | Cubierto por (story → unit) |
|---|---|---|
| MH-1 | Caso 1 estado de pedido | E1-S3 + E1-S2 + E1-S4 → **Unit 1** |
| MH-2 | Identificación dual | E1-S2 → **Unit 1** |
| MH-3 | Per-brand voice Patprimo | E1-S4 (runtime consumer, Unit 1) + E4-S1 (CRUD + sign-off, Unit 2) |
| MH-4 | Handoff de primera clase | E3-S1 + E3-S2 + E3-S3 + E3-S4 → **Unit 3** |
| MH-5 | Compliance baseline | E1-S1 + E1-S6 → **Unit 1** |
| MH-6 | Transparencia "soy IA" | E1-S1 → **Unit 1** |
| MH-7 | Logs auditables | E1-S6 (write, Unit 1) + E2-S1, S2, S3 (read, Unit 3) |
| MH-8 | Guardrails anti-jailbreak | E1-S5 → **Unit 1** |
| MH-9 | Convivencia Oct8ne A/B + rollback | E4-S2 → **Unit 3** |
| MH-10 | Fase 0 instrumentación | E2-S4 → **Unit 1** |

**Cross-unit MH features** (las 2 que cruzan):
- **MH-3** se entrega por una combinación de Unit 1 (consumer) + Unit 2 (provider). Ambos contribuyen.
- **MH-7** se entrega por una combinación de Unit 1 (write-path) + Unit 3 (read-path / dashboards).

Esto es intencional — son features con dos capas (productor + consumidor) y separarlas por unit refleja el orden de construcción.

---

## 4. Persona coverage verification

Cada persona en `personas.md` tiene al menos una story que le entrega valor directo:

| Persona | Stories que le sirven (primary) | Unit |
|---|---|---|
| P1 Cliente final | E1-S1, E1-S2, E1-S4, E3-S4 | Unit 1 + Unit 3 |
| P2 Agente humano | E3-S2 | Unit 3 |
| P3 Operador (Daniela) | E2-S1, E2-S2, E2-S3, E2-S4 | Unit 1 + Unit 3 |
| P4 Brand Manager | E1-S4 (defines voice), E4-S1 (sign-off) | Unit 1 + Unit 2 |
| P5 Compliance / DPO | E1-S6 | Unit 1 |
| P6 Admin/Dev | E1-S3, E1-S5, E3-S1, E3-S3, E4-S2 | Unit 1 + Unit 3 |
| P7 Sponsor | E2-S1 (read-only), E2-S4 (baseline) | Unit 1 + Unit 3 |

**Conclusión**: las 7 personas tienen entregables en ≥1 unidad. P3 Operador y P6 Admin/Dev son los más involucrados (lógico — son los personas operativos).

---

## 5. Sanity check final

- [x] **Cada story está asignada a exactamente 1 unidad** — verificado en tabla §1.
- [x] **Las 16 stories están asignadas** (no hay stories huérfanas) — Unit 1: 7 + Unit 2: 1 + Unit 3: 8 = 16. ✓
- [x] **Las 10 MH features están cubiertas** — verificado en §3.
- [x] **Las 7 personas tienen entregables** — verificado en §4.
- [x] **Cada unidad es viable independientemente en su orden** — Unit 1 demo-able con seed bootstrap; Unit 2 mejora la fundación sin romperla; Unit 3 cierra el loop.
- [x] **No hay dependencias circulares** entre units (Unit 1 → Unit 2 → Unit 3 lineal).

---

## 6. Security Compliance Summary

| Rule | Status | Notas |
|---|---|---|
| SECURITY-11 (secure design) | Aplicado | Mapping mantiene M6 (compliance) ownership en Unit 1; M5 (handoff) en Unit 3; sin coupling entre security-critical logic y handoff logic |
| Otros SECURITY rules | N/A en este stage | Evaluados en stages siguientes |

*No hay findings bloqueantes en este stage.*
