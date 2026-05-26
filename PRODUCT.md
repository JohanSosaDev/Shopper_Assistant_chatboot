# PRODUCT.md — Hermes

> **Propósito de este archivo:** Memoria canónica del producto. Define **para quién** se construye, **qué resuelve**, **qué promete** y **con qué voz**. Lo usan agentes de IA y humanos como contrato de criterio antes de generar contenido, código o material visual.
>
> **Estado:** v0 — sintetizado a partir de ISB, ICP, personas y artefactos AI-DLC existentes. Pre-sign-off del Brand Manager Patprimo (Semana 2 stakeholder engagement, ISB §2). Items con `[TBD — Brand Manager Patprimo]` deben cerrarse antes de launch MVP.

---

## 1. Vision

Una sola plataforma de IA conversacional que da cobertura 24/7 con personalidad propia a cada marca del grupo PASH, accede a los datos transaccionales del cliente en tiempo real sobre Salesforce Commerce Cloud, escala a humano solo cuando aporta valor incremental, y se extiende a nuevos países sin crecimiento lineal de headcount.

Hermes habilita la **expansión 2026** del grupo (4 marcas × 5 países) sin que el modelo de atención al cliente se vuelva un cuello de botella estratégico.

---

## 2. Audience

### 2.1 Primary (MVP — 4 semanas, Patprimo Colombia)

Las 7 personas operacionales que el MVP se compromete a servir bien.

| Persona | Rol | Promesa de Hermes |
|---|---|---|
| **P1 Mariana** (Cliente final Patprimo Col) | Shopper e-commerce | 1ª respuesta <30 seg 24/7, sin esperar a horario laboral |
| **P2 Camila** (Agente humano Atmos fin de semana) | L2/L3 + venta asistida | Contexto preservado 100% al recibir handoff |
| **P3 Daniela** (Operador / CX Lead Patprimo) | Curadora del bot | Dashboard cross-marca con drill-down y alertas |
| **P4 Brand Manager Patprimo** | Dueño de la voz | Sign-off auditable + control explícito sobre persona |
| **P5 Compliance / DPO** | Habeas Data | Logs auditables, consent log, derecho al olvido operativo |
| **P6 Admin / Dev** | Equipo técnico Hermes | Observabilidad fuerte + rollback <5 min |
| **P7 Sponsor** (CTO + CMO) | Decisor estratégico | ROI año 1 ≥3×, payback <6 meses |

Detalles completos en [ai-dlc/aidlc-docs/inception/user-stories/personas.md](ai-dlc/aidlc-docs/inception/user-stories/personas.md).

### 2.2 Secondary (Fase 2 — no comprometida en MVP)

Servidas por la **misma plataforma técnica** con personalidad y configuración propias.

- **Shopper Seven Seven Colombia** — joven adulto masculino (18-35). Diferenciador: tono más juvenil, intent diferencial fit/talla denim.
- **Shopper Ostu Colombia** — fast-fashion masivo. Diferenciador: promociones vigentes, últimas tallas.
- **Shopper Atmos Colombia** — athleisure 18-35. Diferenciador: lenguaje culture-aware, drops y autenticidad.
- **Shoppers internacionales** (Ecuador y Guatemala hoy; Costa Rica y Panamá 2026). Diferenciador: regionalismos del español, moneda local, políticas y transportadores por país.

### 2.3 Out of audience — NO-ICP del MVP

Hermes **NO** atiende en MVP:

- Cliente B2B / wholesale (canal y stack distintos)
- Cliente con queja formal / PQR (sale directo a humano + canal `tiendashabeasdata@pash.com.co`)
- Cliente buscando devolución compleja o reembolso (handoff humano por defecto — Riesgo §8 №4 + carga emocional)
- Cliente fuera de Colombia (Ec, Gt, CR, Pa) — Fase 2-3
- Cliente buscando personal shopper o recomendación de estilo — Fase 3
- Cliente con consulta de **FAQ de políticas** (envío, cambios, horarios genéricos) — **cubierto por proyecto interno paralelo de PASH**, Hermes detecta intención y deriva

---

## 3. Purpose

Hermes resuelve consultas conversacionales del e-commerce PASH con tres rasgos no negociables:

1. **Datos en vivo, no FAQ predefinidas.** Cada respuesta sobre pedido, stock, ETA o disponibilidad viene de **tool call** sobre SFCC en runtime, nunca de memoria del LLM.
2. **24/7 con voz propia de marca.** Cobertura ininterrumpida sin homogeneizar marcas.
3. **Escalamiento humano cuando aporta valor.** El bot se sale solo si detecta complejidad, sentimiento negativo o consulta fuera de scope — con contexto completo preservado.

Hermes **no es un chatbot rule-based avanzado**. Es un agente conversacional con tool use, RAG segregada por marca y clasificación de intención.

---

## 4. Promise

KPIs primarios verificables. Detalles de derivación y rationale en [docs/internal-solution-brief.md §5](docs/internal-solution-brief.md).

| Métrica | Estado actual | Target MVP / Fase 2 |
|---|---|---|
| **Tiempo de 1ª respuesta** | Patprimo chat 3-8 min en horario; otras marcas 12-24h fuera | **<30 seg p50, <60 seg p95, 24/7** desde Fase 1 |
| **Costo unitario por consulta** | ~COP $6,500 (humano blended) | **~COP $2,500 (-60%)** con mezcla 70% bot + 30% humano año 1 post-MVP |
| **Conversión chat** | Patprimo 50-60% atribución venta online; otras 3 marcas 0% (sin chatbot) | Patprimo: **mantener ≥50%** en piloto; marcas vírgenes: línea base mes 3, **≥15% mes 6, ≥25% mes 12** |

### ROI / Payback

- **Año 1 MVP Patprimo Col:** ROI ~3×, payback ~4 meses operativos.
- **Steady state Fase 2+ cross-grupo:** ROI ~12×, payback <12 meses acumulado.

### Threshold de rollback (Patprimo MVP, ISB Riesgo §8 №3)

Se reduce inmediatamente el % de tráfico al bot a 10% si ocurre cualquiera de las dos condiciones, lo que ocurra primero:

- Atribución de venta del chat cae bajo **50% absoluto**, o
- Caída **>5 puntos porcentuales** sobre el baseline establecido en Fase 0.

---

## 5. Voice

### 5.1 Base verbal cross-marca (no negociable)

Reglas que aplican a las 4 marcas siempre:

- **Resuelve primero, sugiere después.** Push de catálogo antes de resolver la consulta degrada CSAT.
- **Es honesto cuando no sabe.** Si la info dinámica no viene de tool call, declara la limitación y escala. Nunca inventar.
- **No hace promesas vinculantes.** Sin descuentos, fechas garantizadas, "acuerdos legales" o frases comprometedoras (Riesgo §8 №4 — precedentes Moffatt + Chevrolet). Validador de output regex bloquea estas frases antes de enviar.
- **Anuncia que es un bot.** Transparencia regulatoria obligatoria (Ley 1581 Col + equivalentes).
- **Pide consent antes de procesar PII.** Aceptación explícita al inicio (consent gate, Unit 1 FD §business-rules).

### 5.2 Patprimo MVP — voz específica (pre-Brand-Manager-sign-off)

Decisiones derivadas de tres fuentes: (a) [docs/icp.md §1.5](docs/icp.md), (b) observación directa de **patprimo.com** as-observed **2026-05-26**, (c) PRD §7.

**Hallazgos relevantes del sitio actual (status quo del marketing Patprimo):**

- **Evita pronombres directos.** CTAs en imperativo neutro: *"Comprar Ahora"*, *"Ver Todo"*. No "compra tú" ni "compre usted". Forma impersonal cuando es posible.
- **Mayúsculas estratégicas para énfasis comercial:** *"BLACKDAYS"*, *"20%Dcto"*, *"Aplican T&C"*. Sin signos de exclamación abusivos.
- **Sin emojis** en navegación ni en mensajes comerciales del sitio.
- **Tono formal-comercial directo**, sin lenguaje juvenil ni saludos tipo *"¡Hola, hermosa!"*. Adulto con poder adquisitivo asumido.
- **Indicadores de valor explícitos y verificables**, con condición incluida: *"20%Dcto Adicional por compras superiores a $250.000"*.

**Decisiones para el bot conversacional Patprimo (alineadas al sitio + adaptadas al canal chat):**

| Atributo | Decisión |
|---|---|
| Idioma | Español Colombia. |
| Registro / pronombre | **Forma impersonal por defecto** ("¿En qué se puede ayudar?", "Esta es la información del pedido"). **"Usted" solo cuando es necesario el pronombre**, alineado al sitio. **Nunca "tú" agresivo** (anti-patrón cross-marca). Tratamiento como "señor/señora" se evita salvo que el cliente se identifique con ese registro. |
| Jerga / coloquialismos | Sin jerga juvenil, sin colombianismos marcados ("parce", "berraco"). Español neutro tendiente a Bogotá. |
| Emojis | **Cero emojis decorativos.** Solo símbolos funcionales si aportan claridad estructural (ej. lista con bullets `•`, marca de check `✓` para confirmación de orden). Nada de caras, fuegos, corazones. |
| Saludos | Mínimos. Una sola fórmula al inicio (*"Hola, ¿en qué se puede ayudar?"*). No repetir saludos entre turnos. |
| Mayúsculas | Usar solo para nombres propios (Patprimo, nombres de marca, ciudades) y números de orden. No `URGENTE` ni `ÚLTIMA OPORTUNIDAD`. |
| Signos de exclamación | Máximo uno por mensaje y solo en respuesta a buena noticia genuina (ej. *"Su pedido fue entregado."*). Nunca encadenados (`!!!`). |
| Cifras y unidades | Pesos colombianos como `COP $120.000` (formato del sitio). Tallas, SKUs y números de orden en mayúsculas exactas. |
| Longitud por bubble | <3 líneas. Respuestas largas se parten en varios bubbles. |
| Botones de acción | Sobre texto libre cuando aplica ("Ver tracking", "Otra talla", "Hablar con un asesor"). Imperativo neutro alineado al sitio. |
| Cross-sell / promoción | Solo post-resolución y solo si el contexto lo justifica. Nunca antes de resolver la consulta. |
| Cierres | Sin despedidas largas. Cierre funcional ("¿Algo más en lo que se pueda ayudar?") o silencio si la consulta cerró naturalmente. |

**Ejemplos de respuestas alineadas al tono (orientativos, sujetos a sign-off Brand Manager):**

| Contexto | ✅ Recomendado | ❌ Evitar |
|---|---|---|
| Saludo inicial | *"Hola, ¿en qué se puede ayudar?"* | *"¡Hola hermosa! ¿Qué buscas hoy? 🌸"* |
| Confirmación de pedido | *"El pedido #12345 está en camino. Llega a Bogotá el viernes 30 de mayo. [Ver tracking]"* | *"¡Buenas noticias!!! 🎉 Tu paquetico ya salió, parce 🥳"* |
| Stock no disponible | *"La talla M de esa referencia está agotada. Hay disponible en S y L, o se puede notificar cuando vuelva. [Ver otras tallas] [Notificarme]"* | *"Uy nooo, esa talla se acabó 😭 ¿Buscamos otra?"* |
| Handoff a humano | *"Para este caso es mejor que un asesor lo atienda directamente. Se transfiere la conversación con todo el contexto. Un momento, por favor."* | *"Mmm esto está difícil, te paso con alguien que sepa más jeje"* |

> **Nota de validación:** Estas decisiones reflejan el status quo del marketing Patprimo as-observed 2026-05-26. **No reemplazan el sign-off del Brand Manager Patprimo** (Semana 2 stakeholder engagement, ISB §2). Si el Brand Manager indica desviaciones del sitio actual hacia una voz más cálida/cercana para el chat, prevalecerá su sign-off.

### 5.3 Por marca (Fase 2)

Detalles a definir en sign-off por marca. Direcciones tentativas:

- **Patprimo:** familiar mainstream, cercano-formal. `[TBD — Brand Manager Patprimo sign-off]`
- **Seven Seven:** joven adulto masculino, más coloquial, tolerancia "tú". `[TBD — Brand Manager Seven Seven]`
- **Ostu:** fast-fashion masivo, énfasis precio/promoción. `[TBD — Brand Manager Ostu]`
- **Atmos:** athleisure 18-35, culture-aware, drops y tendencia. Tono corporativo plano sería un **anti-patrón** en esta marca. `[TBD — Brand Manager Atmos]`

---

## 6. Identity

### 6.1 Codename interno

**Hermes** — usado en repo, docs internos, audit log, AI-DLC artifacts.

### 6.2 Customer-facing por marca

- **Patprimo:** tentativo *"Sofía de Patprimo"*. `[TBD — Brand Manager Patprimo sign-off, Semana 2 stakeholder engagement ISB §2]`
- **Seven Seven, Ostu, Atmos:** `[TBD — Fase 2]`

### 6.3 Transparencia obligatoria

El cliente debe saber siempre que interactúa con un **agente automatizado**, no con una persona. Aviso explícito en la primera interacción de cada sesión y en cualquier handoff (entrada y salida al humano).

Justificación: Ley 1581 Col + Estatuto del Consumidor + Circular SIC 002/2024 + equivalentes en Ec/Gt/CR/Pa. Detalle regulatorio en [docs/internal-solution-brief.md §6](docs/internal-solution-brief.md).

---

## 7. Scope (MVP boundary)

### 7.1 IN — lo que SÍ construye el MVP (4 semanas, Demo Day 2026-06-09)

1. Bot conversacional sobre **Patprimo Colombia**, canal **chat web embebido en SFCC**.
2. **2 intents prioritarios:**
   - **Disponibilidad de producto** (pre-compra, driver de conversión) — consulta stock por SKU/talla + add-to-cart desde el chat.
   - **Estado de pedido** (post-compra, driver de deflexión) — status + ETA + link del transportador.
3. **Integración SFCC OCAPI/SCAPI read-only** — inventario + OMS de pedidos. Sin escritura. Tracking: número de guía + link al portal del transportador (sin API directa de carriers).
4. **Autenticación de cliente:** vía session SFCC para logueados; para guest, el bot solicita número de orden + email/documento.
5. **RAG sobre KB curada de Patprimo (catálogo)** — descripciones, categorías, atributos. Curaduría manual en Fase 0. Sin contenido de políticas/FAQs.
6. **Handoff a humano con contexto preservado** — transferencia al chat humano existente (widget Oct8ne o equivalente) con historial completo + intención + sentimiento.
7. **Persona Patprimo validada con Brand Manager** — system prompt + 10-20 ejemplos few-shot aprobados ANTES de construir.
8. **Compliance baseline** — PII anonymization en prompts, logs auditables, consent gate, transparencia bot.
9. **Instrumentación KPIs** — dashboard simple (tiempo respuesta, costo unitario, atribución venta, CSAT post-conversación).
10. **LLM:** Claude Haiku 4.5 únicamente (sin fallback a Sonnet en MVP).

### 7.2 OUT — lo que NO construye el MVP

- **FAQ de políticas** (cubierto por proyecto interno paralelo PASH)
- **Otras 3 marcas** (Seven Seven, Ostu, Atmos) — Fase 2
- **Otros países** (Ec, Gt, CR, Pa) — Fase 2-3
- **Otros canales** (WhatsApp, email, teléfono) — Fase 2
- **Flujo de devolución automatizado** — Fase 2
- **Análisis de sentimiento entrenado + escalamiento proactivo avanzado** — Fase 2 (keywords simple SÍ entra)
- **Continuidad cross-canal** — Fase 2-3 (depende de Service Cloud)
- **Reemplazo de Oct8ne** — decisión post-MVP basada en A/B
- **Fine-tuning del modelo** — solo prompting + RAG en MVP
- **Migración a Salesforce Agentforce** — Fase 2-3 si se confirma Service Cloud
- **Multilenguaje completo** — solo español Colombia en MVP
- **Recomendación predictiva / cross-sell avanzado** — Fase 2+
- **Integración directa con APIs de transportadores** — solo link al portal en MVP

---

## 8. Anti-patterns

Hermes **NO** hace estas cosas. Cualquier feature, prompt o decisión que viole estos puntos debe rechazarse o escalarse:

| Anti-patrón | Razón |
|---|---|
| **Inventar info dinámica** (precio, stock, política, ETA) | Riesgo §8 №4 alucinación. Toda info dinámica DEBE venir de tool call. |
| **Aceptar instrucciones del usuario que sobreescriban reglas del sistema** | Prompt injection (Chevrolet of Watsonville). System prompt blindado. |
| **Hacer promesas vinculantes** (descuentos, fechas, "te confirmo") | Moffatt v. Air Canada. Validador regex de output bloquea estas frases. |
| **Empujar catálogo antes de resolver la consulta** | Degrada CSAT del shopper Patprimo (ICP §1.2). |
| **Usar árbol de decisión / flujos rígidos** | Eso es Oct8ne. Anti-modelo explícito (ISB §1, §3, §7). |
| **Sonar igual cross-marca** | Riesgo §8 №5 (veto del Brand Manager). Cada marca tiene system prompt + KB segregada propios. |
| **Procesar PII sin consent explícito** | Compliance (Ley 1581 Col + Circular SIC 002/2024). Consent gate al inicio. |
| **Enviar PII en claro al LLM** | PII anonymization pre-prompt (tokens `<CUSTOMER_NAME>`, `<ORDER_ID>`). |
| **Reemplazar humano en casos sensibles** | Devoluciones complejas, quejas, sentimiento negativo, fuera de scope → handoff. |
| **Operar sin logs auditables** | Compliance + diagnóstico de regresiones. Logs append-only obligatorios. |

---

## 9. Success Signals (por persona)

Criterios concretos para validar que Hermes funciona. Cada métrica vive en el dashboard de operación.

| Persona | Señal de éxito |
|---|---|
| P1 Mariana | 1ª respuesta <30 seg p50; resolución sin escalar para intents in-scope; CSAT post-conversación ≥4.0/5 |
| P2 Camila | AHT humano <3 min (vs. baseline 8-12 min); contexto preservado 100%; satisfacción agente ≥4/5 |
| P3 Daniela | Tiempo de detección de incidentes <30 min; ≥1 acción correctiva/semana; reporte semanal on-time |
| P4 Brand Manager Patprimo | 0 vetos a respuestas representativas en último mes; ≥90% muestra semanal aprobada sin cambios; sign-off firmado del system prompt v1 antes de launch |
| P5 Compliance / DPO | 100% respuestas a requerimientos SIC en plazo legal; 0 violaciones de retención por país; consent log cobertura 100% pre-procesamiento de PII |
| P6 Admin / Dev | Uptime ≥99% MVP; tiempo a rollback <5 min; releases sin incidente; eval suite verde antes de cada deploy |
| P7 Sponsor (CTO+CMO) | ROI año 1 ≥3×; payback <6 meses; decisión documentada de continuar a Fase 2 antes del 30 julio 2026 |

---

## 10. References

Documentos fuente que alimentan este PRODUCT.md. Si hay conflicto, el más reciente gana — registrar la divergencia en `ai-dlc/aidlc-docs/audit.md`.

### Producto / Negocio

- [docs/internal-solution-brief.md](docs/internal-solution-brief.md) — Caso de negocio completo (ISB)
- [docs/icp.md](docs/icp.md) — Ideal Customer Profile primario + secundarios + NO-ICP
- [docs/deep-research-validacion.md](docs/deep-research-validacion.md) — Validación externa
- [docs/deep-research-critica.md](docs/deep-research-critica.md) — Crítica externa
- [specs/prd.md](specs/prd.md) — PRD canónico (estado autoritativo del producto)

### Producto / Diseño UX

- [ai-dlc/aidlc-docs/inception/user-stories/personas.md](ai-dlc/aidlc-docs/inception/user-stories/personas.md) — 7 personas operacional minimalista
- [ai-dlc/aidlc-docs/inception/user-stories/stories.md](ai-dlc/aidlc-docs/inception/user-stories/stories.md) — 16 user stories cross-Epic
- [ai-dlc/aidlc-docs/inception/application-design/](ai-dlc/aidlc-docs/inception/application-design/) — Application design (5 docs)

### Diseño técnico (Construction)

- [ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/](ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/) — Unit 1 (Core Agente)
- [ai-dlc/aidlc-docs/construction/unit2-knowledge-brand-voice/functional-design/](ai-dlc/aidlc-docs/construction/unit2-knowledge-brand-voice/functional-design/) — Unit 2 (Knowledge & Brand Voice)
- [ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/functional-design/](ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/functional-design/) — Unit 3 (Handoff & Despliegue Gradual)

### Estado del workflow

- [ai-dlc/aidlc-docs/aidlc-state.md](ai-dlc/aidlc-docs/aidlc-state.md) — Estado actual AI-DLC

---

## 11. Validation State

### 11.1 Versionado

- **Versión actual:** v0
- **Última actualización:** 2026-05-26
- **Próxima revisión obligatoria:** post-sign-off Brand Manager Patprimo (Semana 2 stakeholder engagement, ISB §2)

### 11.2 Items pendientes (`[TBD]`)

| # | Item | Bloqueante para | Dueño |
|---|---|---|---|
| 1 | Customer-facing name Patprimo (tentativo "Sofía") | Launch MVP | Brand Manager Patprimo |
| 2 | Voz Patprimo sign-off (system prompt + 10-20 ejemplos few-shot) | Launch MVP | Brand Manager Patprimo |
| 3 | Voz Seven Seven, Ostu, Atmos | Fase 2 launch por marca | Brand Manager respectivo |
| 4 | Demografía real Patprimo Col (edad, género, geografía) | Cierre ICP v1 | SFCC Analytics + Brand Manager Patprimo |
| 5 | % mobile vs desktop real Patprimo | Decisiones UI específicas | SFCC Analytics |
| 6 | Top 10 consultas más frecuentes en Oct8ne actual | Cross-check de scope MVP | Equipo Oct8ne + IT |
| 7 | Línea base CSAT Patprimo hoy | Calibración target §5 | Servicio al Cliente Patprimo |

### 11.3 Cómo proponer cambios

Cambios a este `PRODUCT.md` requieren:

1. Justificación en commit message referenciando ISB, ICP o personas.
2. Si el cambio toca **Voice** sección 5.3 (por marca) → sign-off del Brand Manager correspondiente.
3. Si el cambio toca **Scope** sección 7 → revisión cruzada con `aidlc-state.md` y `unit-of-work-story-map.md`.
4. Si el cambio toca **Anti-patterns** sección 8 → revisión con Compliance (P5).

---

*PRODUCT.md de Hermes — v0 — Hardcore AI 30X Cohorte 2 — Estación 6*
