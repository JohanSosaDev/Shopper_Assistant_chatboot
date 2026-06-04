# PRODUCT.md — Hermes

Agente conversacional de IA para atención al cliente sobre Salesforce Commerce Cloud (SFCC) de PASH SAS.

## Lector y acción esperada

Este archivo es para diseñadores, ingenieros, agentes de IA y miembros del equipo PASH que crean, revisan o extienden las superficies visuales y conversacionales del chatbot Hermes.

Después de leerlo, una persona o agente debe poder crear, revisar o actualizar una pieza de UI o un mensaje del bot sin romper la promesa de marca, la jerarquía conversacional ni las restricciones operativas del MVP.

## Usuarios

### Cliente final

Es una persona que llega a la tienda online de Patprimo (MVP), Seven Seven, Ostu o Atmos (Fase 2) para resolver una duda concreta. El caso estrella del MVP es consultar el estado de un pedido reciente. Llega con prisa, con un # de orden a la mano o sin él, desde móvil o desktop. Necesita una respuesta directa, breve y verificable. No necesita un chatbot que "conversa por conversar".

### Brand Manager

Es responsable de la voz de marca de su tienda. Aprueba versiones de configuración del bot (system prompt, few-shot, tono, identidad customer-facing) a través de la UI admin. No necesita conocer el modelo de IA, necesita confiar en que lo que aprueba es lo que el cliente verá, con sign-off auditable y rollback granular en menos de una hora.

### Operador / Admin

Vigila el comportamiento del bot en producción a través del dashboard. Necesita ver KPIs en menos de 3 segundos, hacer drill-down a conversaciones específicas, configurar alertas y, sobre todo, tener un kill switch confiable cuando algo sale mal. Su superficie es densa, técnica y orientada a acción.

### Equipo CX

Recibe los handoffs por email/teléfono cuando el bot decide escalar. No interactúa con la UI de Hermes. Recibe un paquete de contexto estructurado en su bandeja de entrada. La calidad de ese paquete (cleartext relevante, anonimizado donde aplica) determina si el handoff es útil o ruido.

### Agentes de IA

Los agentes (Claude Code, Cursor, etc.) leen este archivo junto con `DESIGN.md` para generar componentes, ISML templates, mensajes del bot, mockups del widget y revisiones de UI manteniendo la consistencia visual y de voz entre superficies y entre marcas.

## Propósito del producto

Hermes es un chatbot que responde consultas reales de clientes de las tiendas SFCC de PASH SAS, integrado con los datos del pedido y catálogo vía SFCC OCAPI, con escalamiento humano cuando el bot no puede o no debe responder.

El producto real no es el modelo de IA. Es **la conversación verificable**:

- Cada turno se persiste con esquema auditable (entrada, intención, tool result, salida, latencia, tokens).
- Cada decisión de consent, handoff o guardrail queda registrada con su razón.
- Cada respuesta del bot está grounded contra datos reales del pedido (SFCC).
- Cada marca tiene su voz versionada con sign-off de Brand Manager.

El MVP entrega el Caso 1 (estado de pedido) end-to-end para Patprimo, con compliance baseline y dashboards operacionales. Las otras 3 marcas y el resto de casos de uso (devoluciones, catálogo, RAG) son Fase 2.

## Modelo de funcionamiento

Hermes es un **agente con tools** sobre Claude (Anthropic via AWS Bedrock LATAM):

1. Cliente envía mensaje al widget en SFCC storefront.
2. Backend recibe, carga BrandConfig activo de la marca y clasifica intención.
3. Si la intención requiere datos de SFCC (`get_order_status`), el LLM invoca el tool. Si falla, responde con fallback neutral.
4. Si la conversación dispara un trigger de handoff (sentimiento negativo, request explícito, low confidence, out-of-scope), el bot construye paquete de contexto y notifica al equipo CX por email.
5. Cada turno se persiste con PII anonimizada para audit; con PII cleartext solo en el paquete de handoff.

El RolloutGate decide si servir Hermes o un fallback humano por cliente, controlable por kill switch + traffic %.

## Personalidad de marca

Tres palabras: **claro, sobrio, verificable**.

Hermes debe sentirse como un asistente que sabe lo que sabe y lo que no sabe. No como un chatbot que improvisa. La voz es:

- **Directa**, sin saludos largos ni floritura conversacional.
- **Honesta con sus límites**: cuando no puede resolver, lo dice y ofrece escalamiento.
- **Formal con "usted"** en las 4 marcas PASH (Patprimo, Seven Seven, Ostu, Atmos). Sin emojis, sin coloquialismos forzados.
- **Compliance-aware**: el primer turno siempre identifica al bot ("Soy Sofía, asistente virtual de Patprimo. ¿Me autoriza procesar sus datos para esta consulta?") y pide consent. Sin excepción.
- **Sin promesas que no puede cumplir**: nunca ofrece descuentos, nunca menciona competidores, nunca cita datos sin grounding.

### Divergencia deliberada vs sitio público

Los 4 sitios PASH ([patprimo.com](https://www.patprimo.com/), [sevenseven.com](https://www.sevenseven.com/), [ostu.com](https://www.ostu.com/), [atmosmovement.com](https://www.atmosmovement.com/)) usan **"tú" informal** en su copy de marketing ("Descarga la APP", "ATMOS te mueve", "Compra Online Recoge en tienda"). Hermes **diverge intencionalmente** y usa **"usted" formal**.

Razones documentadas:

1. **Compliance y confianza con datos sensibles**: Hermes maneja PII (número de pedido, email, datos de cliente). Voz formal con "usted" sienta más confiable y reduce fricción para que el cliente comparta información.
2. **Identidad de asistente vs. comunicación de marca**: el sitio es promocional, el bot es operativo. Voces distintas son legítimas; el cliente lo entiende cuando escucha la diferencia.
3. **Consistencia cross-marca**: las 4 marcas tienen voces de marketing distintas (Seven Seven juvenil, Atmos deportivo, Ostu inclusivo, Patprimo familiar). Un asistente formal con "usted" funciona transversalmente y simplifica el system prompt por marca.

Si el Brand Manager de alguna marca solicita cambiar a "tú" en su BrandConfig versionado, el sistema lo permite (es solo un cambio de `system_prompt` + `few_shot_examples`). Pero la **decisión default por las 4 marcas es "usted"**.

## Anti-referencias

Evitar estos patrones en cualquier superficie de Hermes (widget cliente, BM UI, dashboard operador):

- Chatbots de gradiente morado con burbuja gigante y emoji estrella.
- Tarjetas de producto dentro del chat con imágenes grandes y carruseles (el caso de uso del MVP no las necesita y el bundle target es ≤30kb).
- Quick replies con 8 botones que reemplazan la conversación natural.
- Animaciones gratuitas (typing indicators con 3 segundos artificiales, transiciones de página llamativas).
- "Te ayudo en lo que necesites 😊" como saludo de apertura. El saludo del MVP es compliance-driven, no marketing.
- "Hola! 👋 Soy tu asistente personal" con tuteo, emoji y tono casual va contra la decisión formal documentada arriba.
- Dashboards de operador con donuts decorativos sin acción asociada.
- BM UI con dark mode + glassmorphism. Esto es admin interno, no SaaS público.
- Promesas vagas en el copy ("transforma tu experiencia de compra"). La promesa del producto es operacional, no aspiracional.
- Replicar la "urgencia comercial" del sitio (cupones "REGISTROPP", banners de descuentos parpadeando, badges "WORLD CUP" / "BLACKDAYS") dentro del widget de chat. El widget atiende al cliente que ya ENTRÓ con una pregunta, no está vendiendo más.

## Multi-marca

PASH SAS opera 4 marcas sobre SFCC. Hermes está diseñado para servirlas a todas, aunque el MVP solo cubre **Patprimo**.

### Marcas

| Marca | Sitio | Audiencia | Tono sitio | Vibe |
|---|---|---|---|---|
| **Patprimo** | [patprimo.com](https://www.patprimo.com/) | Familias, casual diario | Tú informal | Catálogo casual, ofertas |
| **Seven Seven** | [sevenseven.com](https://www.sevenseven.com/) | Jóvenes 16-30, lifestyle | Tú informal | Juvenil, mundial/seasonal |
| **Ostu** | [ostu.com](https://www.ostu.com/) | Inclusiva, 5-25+, esenciales | Tú informal | "Solo para muchas veces" |
| **Atmos** | [atmosmovement.com](https://www.atmosmovement.com/) | Athleisure, deportistas | Tú informal | "ATMOS te mueve" |

### Cómo Hermes maneja la diferencia

1. **Identidad customer-facing por marca**: `brandConfig.customer_facing_name` es distinto por marca (Patprimo MVP usa "Sofía de Patprimo"; las otras 3 lo definen sus Brand Managers en Fase 2 vía CRUD del BM UI). Hasta que el Brand Manager de Seven Seven, Ostu o Atmos confirme un CFN, el RolloutGate de esa marca queda en `traffic_percentage = 0` y los clientes ven el fallback humano. Sin excepción.
2. **System prompt + few-shot por marca**: cada marca aprueba su voz vía Unit 2 sign-off. Patprimo en MVP usa la versión seed del equipo Hermes.
3. **Primary color por marca**: el widget cambia `primary` y `on-primary` según `brandConfig.brand` (ver [DESIGN.md](DESIGN.md) front-matter `brands.<brand>`).
4. **Voz formal compartida**: las 4 marcas usan "usted" en el bot por default, divergente del "tú" de sus sitios (justificado arriba en Personalidad de marca).
5. **Anti-enumeration cross-marca**: un cliente con orden de Patprimo NO puede consultar órdenes de Atmos por el mismo widget. Cada marca tiene su scope SFCC aislado (per business-rules R-ID-2).

### Fuera de scope MVP

- Multi-país (todas las marcas operan solo Colombia hoy).
- Switch de marca dentro de la misma conversación.
- BrandConfig compartido entre marcas (cada una tiene su versionado independiente).

## Principios de diseño del producto

### 1. El chat es texto + 2 CTAs, no una experiencia

Resistir agregar componentes visuales ricos. El cliente no viene a interactuar con el chatbot, viene a resolver una duda concreta en el menor tiempo posible. Texto plano + Aceptar/Rechazar + "Hablar con persona" es suficiente para el 80% de los casos del MVP.

### 2. La marca habla, no decora

El system prompt y few-shot definen 95% de la personalidad de Hermes para el cliente. El widget en sí es neutro casi-blanco. El color de marca aparece solo en el header y el botón flotante cerrado.

### 3. Compliance es UI, no un footer

El indicador "IA" permanece visible mientras el chat está abierto. El consent es turn #1 obligatorio, no un modal saltable. La negación de consent cierra el flujo, no lo degrada.

### 4. Densidad para internos, claridad para externos

El widget cliente prioriza claridad y velocidad de lectura. El dashboard operador prioriza densidad y acción. El BM UI está en el medio: formularios largos pero con diff visual y confirmaciones de 2 pasos para acciones irreversibles.

### 5. Sin fallos silenciosos

Cualquier error (SFCC unavailable, Bedrock unreachable, guardrail block) muestra un mensaje neutral configurable al cliente. Nunca un crash, nunca un stack trace, nunca "algo salió mal" sin ofrecer un siguiente paso.

## Accesibilidad e inclusión

El idioma principal del MVP es **español de Colombia** (`es-CO`). El widget tiene `role="log"` y `aria-live="polite"` en MessageList. Focus trap dentro del widget abierto. Contraste WCAG AA mínimo en textos y CTAs.

Para sesiones largas en BM UI: jerarquía tipográfica clara, formularios con labels explícitos, modals con focus trap y aria-live para toasts.

Out-of-scope MVP (a Fase 2): screen reader testing extensivo, multi-lingüe (otros países PASH), WCAG AAA, RTL.

## Fuentes de contexto

Este documento se basa en:

- `ai-dlc/prd.md`: PRD consolidado (13 segmentos, 88kb).
- `ai-dlc/aidlc-docs/inception/`: Inception artifacts (requirements, user-stories, application-design, plans).
- `ai-dlc/aidlc-docs/construction/unit{1,2,3}/`: Construction artifacts (FD, NFR-R, NFR-D, ID) de las 3 unidades.
- Sitios oficiales PASH (análisis 2026-06-02): [Patprimo](https://www.patprimo.com/), [Seven Seven](https://www.sevenseven.com/), [Ostu](https://www.ostu.com/), [Atmos](https://www.atmosmovement.com/). Extracción de paleta visual y tono observado.
- `~/.claude/skills/impeccable/SKILL.md`: Design language reference.
- `~/.claude/skills/userinterface-wiki/SKILL.md`: 152 reglas de UI/UX.

Cuando alguna decisión visual o conversacional no esté cubierta acá, consultar primero los AI-DLC docs específicos por unidad antes de improvisar.
