# ICP — Hermes (Chatbot PASH)

> **Propósito:** Definir QUIÉN es el cliente que Hermes atiende, para que cada decisión de producto (intents priorizados, tono, idioma, canales, escalamiento humano) se evalúe contra un perfil concreto y no contra "el shopper PASH" genérico.
>
> **Relación con el brief:** Complementa `internal-solution-brief.md`. El brief responde *qué problema*, *cuánto cuesta* y *cómo se resuelve*; este responde *para quién exactamente*. Los perfiles por marca de §2/§4 del brief (Patprimo familiar, Seven Seven joven adulto, Ostu fast-fashion, Atmos athleisure) se expanden aquí en términos accionables para producto.
>
> **Estado:** v0 — basado en datos públicos del grupo, el case study Oct8ne y benchmarks retail moda LATAM. Los marcadores `[POR VALIDAR]` deben cerrarse con Brand Managers y data interna **antes de E4 (PRD)**.

---

## 1. ICP Primario — Shopper Patprimo Colombia (MVP)

**Este es el único ICP que el MVP de 4 semanas se compromete a servir bien.** Todo lo demás es Fase 2.

### 1.1 Snapshot

| Dimensión | Perfil |
|---|---|
| Marca | Patprimo (familiar mainstream) |
| País | Colombia |
| Rango etario | 28–55 años `[POR VALIDAR — Brand Manager Patprimo + SFCC Analytics]` |
| Género | Mayoritariamente mujer (~65–75% estimado retail moda familiar Col) `[POR VALIDAR]` |
| Segmento socioeconómico | Medio / medio-alto |
| Geografía e-com | Bogotá, Medellín, Cali concentran la mayoría del tráfico online `[POR VALIDAR]` |
| Ticket promedio | ~COP $120k (benchmark industria moda Col, ya usado en §1 del brief) |
| Frecuencia de compra online | 2–4 órdenes/año `[POR VALIDAR]` |
| Mix de canal de compra | Online + tienda física; online creciendo post-2020 |

### 1.2 Comportamiento relevante para el bot

- **Ya usa chat para comprar.** El chat genera 50–60% de las ventas online de Patprimo (Oct8ne case study). El shopper Patprimo no necesita ser educado en el canal — necesita un canal que responda más rápido y con datos reales.
- **Top 2 consultas coinciden con el MVP:** disponibilidad de producto (pre-compra) y estado de pedido (post-compra) son las dos intenciones más frecuentes del e-commerce de moda LATAM y los dos escenarios del MVP (§9 brief).
- **Tolerancia a tiempo de respuesta:** acepta 30 seg–3 min en chat web (vs. inmediato en WhatsApp). El target del brief de **<30 seg p50** ya está holgado contra esta expectativa.
- **Sensibilidad cultural / lingüística:** español Colombia, predominio del "usted" formal-cercano en Bogotá; "tú" más común en costa y eje cafetero. El bot debe usar registro neutro tendiendo a "usted" como default en Patprimo.
- **Sensibilidad a promoción cruzada:** prefiere que el bot **resuelva primero** y sugiera después. Push agresivo de catálogo antes de resolver la consulta degrada CSAT.

### 1.3 Canales y dispositivos

- Dispositivo: ~70% mobile / ~30% desktop estimado retail Col `[POR VALIDAR con SFCC Analytics]`. **Implicación:** UI del chat debe estar diseñada mobile-first; respuestas cortas, botones grandes, imágenes pesando poco.
- Canal MVP: **chat web embebido en SFCC** (mismo placement que Oct8ne hoy).
- Canal Fase 2: **WhatsApp Business** (ya existe operación humana — migrar a Hermes amplía cobertura sin cambio de canal para el cliente).
- Fuera de scope canal MVP: email, teléfono.

### 1.4 Pain points actuales del shopper Patprimo Col que Hermes resuelve

Reformulados como "voice of customer" para que el equipo los tenga presentes:

1. *"Pregunté por la talla M en el chat y me dijeron que verificaban y me avisaban. Mientras tanto cerré la pestaña."* → Oct8ne no consulta inventario en vivo. **Hermes Escenario 2** (§4 brief).
2. *"Compré ayer en la noche y no sé si despacharon. Tengo que esperar a las 8 a.m. para que alguien me diga."* → No hay self-service de estado de pedido fuera de horario. **Hermes Escenario 1**.
3. *"El chat solo me da opciones, no me deja escribir lo que necesito."* → Árbol de decisión vs. lenguaje natural. **Resuelto por arquitectura LLM** (§7 brief).
4. *"Me cambiaron de canal y tuve que contar todo otra vez."* → Sin contexto cross-canal. **Hermes Escenario 5** (Fase 2).

### 1.5 Implicaciones de producto para el MVP

Decisiones concretas que se derivan de este ICP — usar como checklist al diseñar el bot:

| Área | Decisión derivada |
|---|---|
| **Tono del bot** | Cercano-formal, español Colombia, registro tendiendo a "usted". Sin jerga juvenil. Sin emojis excesivos. |
| **Identidad** | Nombre customer-facing tipo *"Sofía de Patprimo"* (a confirmar con Brand Manager Patprimo en Semana 2 de stakeholder engagement, §2 brief). |
| **Intents priorizados Fase 1** | (1) Disponibilidad de producto + add-to-cart; (2) Estado de pedido + tracking. **FAQ de políticas excluida del MVP** (proyecto paralelo PASH — ver memoria). |
| **Idioma** | Solo español Colombia en MVP. Multi-país (Ec, Gt) y localización (CR, Pa) → Fase 2. |
| **Horario** | 24/7 desde día 1. El delta vs. status quo (~40% del calendario sin cobertura hoy) es el diferencial más visible. |
| **Fallback humano** | Devoluciones, quejas, casos con sentimiento negativo detectado → handoff con contexto completo (Escenario 4 brief). |
| **UI** | Mobile-first. Respuestas <3 líneas por bubble. Botones de acción ("Ver tracking", "Otra talla") sobre texto libre cuando aplica. |
| **Promoción** | Prohibido push de catálogo antes de resolver la consulta del usuario. Cross-sell solo post-resolución y solo si el contexto lo justifica. |

---

## 2. ICPs Secundarios — Fase 2 (no comprometidos en MVP)

Estos perfiles existen, son atendidos hoy por equipos humanos dedicados por marca (§3 brief), y serán servidos por Hermes en Fase 2 con la misma plataforma técnica + personalidad propia. **No se diseñan flujos específicos para ellos en el MVP** — el riesgo de homogeneizar voz cross-marca (§8 Riesgo 5 brief) se mitiga manteniéndolos fuera de Fase 1.

### 2.1 Shopper Seven Seven Colombia
- **Perfil corto (§2 brief):** joven adulto masculino. Hipótesis a validar: 18–35, segmento medio, foco denim/casual masculino, lenguaje más coloquial. `[POR VALIDAR — Brand Manager Seven Seven]`
- **Diferenciador para el bot:** tono más juvenil, mayor tolerancia a "tú", probable intent diferencial de **fit/talla** en denim. Conversión del chat en marca virgen (sin Oct8ne hoy) → línea base a establecer mes 3 post-lanzamiento (§5 brief).

### 2.2 Shopper Ostu
- **Perfil corto (§2 brief):** fast-fashion masivo. `[POR VALIDAR — Brand Manager Ostu]` (perfil demográfico, género dominante, ticket promedio).
- **Diferenciador para el bot:** sensibilidad a precio y rotación rápida de colección; probables intents diferenciales de **promociones vigentes** y **disponibilidad de últimas tallas**.

### 2.3 Shopper Atmos
- **Perfil corto (§2 brief):** athleisure 18–35. Hipótesis: público urbano sensible a marca, drops y tendencia. `[POR VALIDAR — Brand Manager Atmos]`
- **Diferenciador para el bot:** lenguaje culture-aware, posibles intents de **drops/lanzamientos limitados** y **autenticidad de producto**. Tono corporativo plano sería un anti-patrón en esta marca.

### 2.4 Shoppers internacionales (Ec, Gt hoy; CR, Pa 2026)
- **Diferenciadores cross-país:** regionalismos del español, moneda local, métodos de pago locales, políticas de envío y devolución por país, transportadores distintos.
- **No incluido en MVP** — el piloto es Patprimo Col. La arquitectura debe dejar la localización como **configuración**, no como rebuild (§4 brief — *"abrir Costa Rica = configurar país, no construir desde cero"*).

---

## 3. NO-ICP — Quién Hermes NO atiende en MVP

Definir exclusiones es tan importante como definir inclusiones:

- **Cliente B2B / wholesale.** Las marcas tienen líneas mayoristas; canal y stack distintos. Fuera de e-com.
- **Cliente con queja formal / PQR.** Sale directo a humano + canal de habeas data (`tiendashabeasdata@pash.com.co`); no pasa por Hermes.
- **Cliente buscando devolución compleja o reembolso.** Handoff humano por defecto en MVP (alta carga emocional, baja frecuencia → Escenario 3 brief, Fase 2).
- **Cliente fuera de Colombia (Ec, Gt) en MVP.** Se atiende con el modelo actual hasta Fase 2.
- **Cliente buscando personal shopper / recomendación de estilo.** Out of scope MVP. Potencial Fase 3.
- **Cliente con consulta de FAQ de políticas (envío, cambios, horarios genéricos).** Cubierto por el proyecto interno paralelo de PASH (ver memoria del proyecto); Hermes detecta la intención y deriva.

---

## 4. Pendientes de validación antes de E4 (PRD)

Lista accionable para cerrar el ICP a versión 1.0:

- [ ] **Demografía real de Patprimo Col** (edad, género, geografía) — vía SFCC Analytics + Brand Manager Patprimo (Semana 2 stakeholder engagement, §2 brief).
- [ ] **% mobile vs. desktop real** del shopper Patprimo — SFCC Analytics.
- [ ] **Top 10 consultas más frecuentes en Oct8ne actual** — cross-check de la hipótesis "stock + estado de pedido = top 2". Si el cross-check falla, replantear scope MVP.
- [ ] **Perfiles validados de Seven Seven, Ostu y Atmos** con sus Brand Managers (no urgente para MVP, sí para Fase 2 planning).
- [ ] **Tono y nombre customer-facing por marca** con Marketing/Brand.
- [ ] **Confirmación de exclusiones del NO-ICP** con Servicio al Cliente (B2B, PQR, devoluciones complejas).
- [ ] **Línea base CSAT del shopper Patprimo hoy** (encuestas post-chat Oct8ne o equivalente) — input para §5 brief.
