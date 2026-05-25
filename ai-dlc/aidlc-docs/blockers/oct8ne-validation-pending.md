# ✅ RESUELTO — Validación del estado de Oct8ne en Patprimo

**Fecha registrada**: 2026-05-22 (viernes)
**Fecha resuelta**: 2026-05-25 (lunes)
**Resolución**: **Escenario 2 confirmado — Oct8ne OUT como chat activo**

## Resolución (palabras del usuario, 2026-05-25)
> "No esta activo solo se uso para envio de mensajes por batch, como avisarle a los clientes que habia un retraso, creo que no lo han quitado solo lo usan para enviar mensaje por medio de plantillas exceles, no hay integracion directa, se usa a punta de excel"

**Interpretación operativa**:
- Oct8ne NO está activo como chat customer-facing (sin widget en vivo, sin árbol rule-based atendiendo).
- Sigue contratado/instalado pero su uso actual es exclusivamente **envío batch outbound** (avisos a clientes) mediante **plantillas Excel manuales** — no hay integración programática.
- Para fines de Hermes: Oct8ne **no existe como sistema con el que integrarse, hacer A/B o handoff**.

## Aplicación de la resolución
- **Unit 3 FD plan**: Q2 reformulada (target handoff) + Q5 reformulada (despliegue gradual). Ver `aidlc-docs/construction/plans/unit3-handoff-convivencia-functional-design-plan.md` § "Cambios derivados".
- **Pendientes diferidos (no bloquean Unit 3 FD)**: refactor de `stories.md` (E3-S3, E4-S2, MH-4, MH-9), `prd.md` (§3, §10, §12, §11, §13, §4.5), `unit-of-work.md` y `component-methods.md`. Se ejecutan en sesión separada antes de presentar al CTO.

---

## Histórico (antes de resolver)

**Bloqueaba**: Unit 3 — Functional Design (último Unit del per-unit loop)
**Para resolver**: Lunes 2026-05-25
**Responsable**: Johan Sosa (verificar con equipo PASH)

---

## El contexto

Durante el planning de Unit 3 FD (Q2 sobre integración con Oct8ne), Johan recordó que **le comentaron que Oct8ne ya no está activo en Patprimo**. Esta info contradice las suposiciones del Inception y del PRD original, que asumían Oct8ne activo como sistema legado para:

1. **MH-9 Convivencia A/B** — Hermes vs Oct8ne con rollback automático (story E4-S2)
2. **MH-4 Handoff a humano** — target del handoff era el widget Oct8ne (stories E3-S1..S4)
3. **Baseline de conversión 50–60%** del case study Oct8ne 2022–2023 (PRD §10 KPIs)
4. **Rollback strategy** del MVP (si Hermes degrada, A/B → 100% Oct8ne)

---

## Preguntas a confirmar (el lunes)

1. **¿Oct8ne está completamente fuera de Patprimo, o solo desactivado en algunas marcas/regiones?**
2. **¿Hace cuánto se quitó? ¿Está documentado en algún lado (contrato, ticket, comm interna)?**
3. **¿Qué reemplazó la función de chat de Patprimo?** (¿solo agente humano? ¿WhatsApp? ¿widget propio? ¿Service Cloud?)
4. **¿Qué pasó con las métricas 50–60% conversion vía chat reportadas por Oct8ne 2022–2023?** ¿Cayeron? ¿Hay nuevo baseline?

---

## Escenarios y plan de mitigación

### Escenario 1: Oct8ne SIGUE activo (rumor erróneo)
- **Impacto**: cero. Plan actual de Unit 3 FD es válido. Mi recomendación previa (Q2=D stub MVP) sigue siendo la mejor opción para acelerar.
- **Acción**: continuar con Unit 3 FD como estaba.

### Escenario 2: Oct8ne está OUT de Patprimo (rumor confirmado)
- **Impacto medio-alto, focalizado en Unit 3**: ~5 stories afectadas; el resto del diseño (Inception + Units 1 y 2) NO cambia.
- **Ajustes requeridos:**

| Artefacto | Cambio |
|---|---|
| PRD §3 (Estado actual) | Corregir mención de Oct8ne activo; documentar el reemplazo actual |
| PRD §10 (KPIs) | Recalibrar baseline de conversión (sin el 50–60% Oct8ne como referencia) |
| PRD §12 (Riesgos) | Quitar Riesgo "degradación de Oct8ne" |
| `stories.md` E4-S2 | **Eliminar o reformular** — sin Oct8ne no hay A/B contra Oct8ne |
| `stories.md` E3-S1..S4 | Cambiar el target del handoff — ya NO es Oct8ne widget |
| Unit 3 FD plan | Reformular Q2 con las opciones alternativas (ver §3 abajo) |

### Escenario 3: Oct8ne parcialmente OUT (raro, ej. solo Patprimo OUT pero las otras 3 marcas SÍ tienen)
- **Impacto bajo**: solo afecta el MVP scope (Patprimo Col). Las otras 3 marcas son Fase 2 anyway.
- **Ajustes**: similares a Escenario 2 pero acotados al MVP.

---

## §3 — Opciones alternativas para handoff target (si Oct8ne está OUT)

Para reemplazar el target de handoff de las stories E3-S1..S4:

| Opción | Esfuerzo MVP | Pros | Cons |
|---|---|---|---|
| **A) WhatsApp Business** (estaba en Fase 2; adelantar) | +3-5 días setup API + onboarding | Canal alto engagement; ya familiar a clientes Col | Requiere Meta Business approval; el cliente cambia de canal |
| **B) Email/teléfono** (modelo actual atención humana) | +0 día (ya existe) | Cero scope adicional | UX degradada; cliente abandona el chat |
| **C) Widget propio Hermes con vista de agente humano** | +3-5 días dev | UX cohesiva (mismo widget) | Requiere construir mini-chat de agente; scope grande |
| **D) Salesforce Service Cloud** (si PASH lo tiene) | +5-10 días integración | Stack consistente con SFCC | OD validación: PASH no ha confirmado si tiene Service Cloud |

**Recomendación tentativa** (asumiendo Oct8ne OUT): combinación **A + B** — handoff lo más urgente abre WhatsApp Business; fallback a email si WhatsApp no disponible. Eso da un mejor target que sin nada.

---

## §4 — Opciones alternativas para rollback (E4-S2 MH-9, si Oct8ne está OUT)

Si no hay Oct8ne, el "rollback A/B" cambia radicalmente:

| Opción | Esfuerzo MVP | Comportamiento |
|---|---|---|
| **A) Eliminar MH-9** del MUST HAVE | -1 día (menos código) | Sin rollback automático; el operador decide manualmente. Riesgo: si Hermes degrada, no hay safety net. |
| **B) Dark launch incremental** | +1 día | Hermes recibe N% del tráfico desde el inicio; el rollback es bajar N% a 0 (no a otro bot). |
| **C) Reformular como "kill switch" simple** | +0.5 día | Solo un flag `HERMES_ENABLED`; si false → mensaje "atención humana en horario X" |

**Recomendación tentativa**: **C (kill switch)** — más simple y suficiente para MVP.

---

## §5 — Implicaciones para business case (escenarios)

| Escenario | Cambio en business case |
|---|---|
| Oct8ne SIGUE | Sin cambio |
| Oct8ne OUT | **Caso de negocio MEJORA**: ya no hay sistema bueno que Hermes pueda degradar; cualquier mejora es upside; baseline = "atención humana en horario" (mucho más bajo); risk profile reducido |

---

## §6 — Resumen ejecutivo del blocker

- **Severidad**: media (afecta Unit 3, no Units 1 y 2)
- **Trabajo perdido si rumor se confirma**: ninguno completo, solo refactors menores en Unit 3 design + 3-5 ajustes en PRD
- **Sin verificar antes del lunes**: continuar diseñando con la suposición vieja arriesga rework
- **Decisión correcta hoy (2026-05-22)**: pausar Unit 3 FD; commit progreso actual; retomar lunes con info confirmada
