# PRD — Hermes: Agente Conversacional de IA para el grupo PASH SAS

> **Documento de Requisitos de Producto (PRD)** consolidado a partir del flujo de co-creación iterativa del Prompt 1 de `prompts-especificacion.md`. Cada segmento fue producido, revisado y aprobado individualmente antes de avanzar al siguiente.

---

## Metadatos del documento

| Campo | Valor |
|---|---|
| **Producto** | Hermes — agente conversacional de IA para atención al cliente del grupo PASH |
| **Empresa** | PASH SAS (Colombia) — Patprimo, Seven Seven, Ostu, Atmos |
| **Versión** | 1.0 |
| **Fecha** | 17 de mayo 2026 |
| **Autor** | Johan Sosa (jsosa@pash.com.co) |
| **Programa** | Hardcore AI 30X — Cohorte 2 — Mayo–Junio 2026 |
| **Documentos de entrada (carpeta `docs/`)** | `internal-solution-brief.md` · `deep-research-validacion.md` · `deep-research-critica.md` |
| **Demo Day** | 9 de junio 2026 |

---

## Resumen ejecutivo (1 página)

**¿Qué es Hermes?** Un agente conversacional de IA que atiende a clientes del grupo PASH (Patprimo, Seven Seven, Ostu, Atmos) sobre Salesforce Commerce Cloud, con **personalidad propia por marca**, **datos transaccionales en tiempo real** y **cobertura 24/7**. Habilita el plan de expansión 2026 del grupo a 4 marcas × 5 países sin que el headcount de servicio al cliente crezca linealmente.

**¿Por qué ahora?** Cinco vectores convergentes en 2025–2026:
1. **Costo del status quo**: ~COP $3.9–5.1B/año proyectado 2026 (operativo + oportunidad + expansión CR/Pa).
2. **Falabella ya elevó la barra**: Adereso + Gemini en producción con 15× mejora en 1ª respuesta.
3. **Marco regulatorio dejó de ser ambiguo**: Circular SIC 002/2024 + CONPES 4144 + precedente Moffatt v. Air Canada.
4. **Arquitectura es estándar industria**: build custom + LLM + RAG + tool use es patrón documentado (Klarna, Lyft, Verdi).
5. **Plan expansión 2026 de PASH**: cada apertura sin automatización = +COP $480M/año en headcount.

**¿Cómo se construye?** Build custom sobre **Claude Haiku 4.5** vía **AWS Bedrock LATAM**, con RAG por marca, tool use sobre SFCC OCAPI/SCAPI, handoff humano de primera clase, y compliance LATAM diseñado desde día 1 (DPA Anthropic + autorización expresa).

**MVP de 4 semanas**: Patprimo Colombia, chat web, **2 escenarios** — Estado de pedido (must-have) + Disponibilidad de producto (stretch goal). **Convive con Oct8ne**, no lo reemplaza.

**Inversión y ROI**:
- **CapEx MVP**: ~COP $30–80M
- **OpEx steady state**: ~COP $7–10M/mes
- **Ahorro anual proyectado**: ~COP $1.4B (–60% sobre baseline; floor garantizado –25%)
- **Payback**: ~6 semanas operativas
- **ROI año 1**: ~9×

**North Star**: Tasa de Resolución Útil del Bot (TRU) — target ≥40% MVP, ≥60% mes 3, ≥75% mes 12.

**Próximo paso operativo**: reunión con CTO objetivo en las próximas 2 semanas, usando este PRD como insumo.

---

## Tabla de contenidos

- [Paso 0 — Análisis de Conflictos](#paso-0--análisis-de-conflictos)
- [Segmento 1 — One-Liner + JTBD + Misión](#segmento-1--one-liner--jtbd--misión)
- [Segmento 2 — Contexto y Problema](#segmento-2--contexto-y-problema)
- [Segmento 3 — ICP Detallado](#segmento-3--icp-detallado)
- [Segmento 4 — UVP y Diferenciadores](#segmento-4--uvp-y-diferenciadores)
- [Segmento 5 — Casos de Uso Top 5](#segmento-5--casos-de-uso-top-5)
- [Segmento 6 — Principios de Diseño No Negociables](#segmento-6--principios-de-diseño-no-negociables)
- [Segmento 7 — User Journeys](#segmento-7--user-journeys)
- [Segmento 8 — MVP Scope (MoSCoW)](#segmento-8--mvp-scope-moscow)
- [Segmento 9 — Especificación Funcional: Módulos y Arquitectura](#segmento-9--especificación-funcional-módulos-y-arquitectura)
- [Segmento 10 — Métricas de Éxito](#segmento-10--métricas-de-éxito)
- [Segmento 11 — Plan de Evaluación del Agente](#segmento-11--plan-de-evaluación-del-agente)
- [Segmento 12 — Riesgos y Mitigaciones](#segmento-12--riesgos-y-mitigaciones)
- [Segmento 13 — Plan de Entrega 30/60/90 Días](#segmento-13--plan-de-entrega-306090-días)
- [Anexo A — Trazabilidad de decisiones a documentos fuente](#anexo-a--trazabilidad-de-decisiones-a-documentos-fuente)
- [Anexo B — Glosario](#anexo-b--glosario)

---

## Paso 0 — Análisis de Conflictos

Análisis cruzado de los 3 documentos en `docs/`: `internal-solution-brief.md`, `deep-research-validacion.md`, `deep-research-critica.md`.

### Conflictos resueltos y decisiones tomadas

| # | Conflicto | Decisión |
|---|---|---|
| 1 | **Nivel del sponsor**: brief identifica CTO; crítica recomienda C-level (CMO/COO/CEO) | **CTO como sponsor técnico + CMO como co-sponsor comercial.** Sin co-sponsor comercial, el PRD no puede prometer impacto en conversión chat (KPI #3). |
| 2 | **Viabilidad MVP 4 semanas + 1 dev**: brief lo afirma; crítica lo cuestiona para producción | **MVP = demo + POC técnico funcional**, NO piloto-producción. Producción real es Fase 2 post-Demo Day. |
| 3 | **Target ahorro de costos**: brief –60%; caso comparable Cencosud reporta –25% | **–60% como target ambicioso + floor de –25% como mínimo aceptable** (alineado con caso real). |
| 4 | **Transferencia internacional + LLM provider**: brief asume Bedrock o API directa; crítica advierte Ley 1581 + EE.UU. no es país adecuado | **3 capas obligatorias: Bedrock LATAM + DPA con Anthropic + autorización expresa en flow de chat.** |
| 5 | **Cantidad de escenarios MVP**: brief 2 escenarios; crítica advierte que McDonald's con 3 años y partner Tier-1 no llegó | **2 escenarios pero con estructura "1 must-have + 1 stretch goal"**: Estado de pedido must-have; Disponibilidad stretch (entra si IT entrega OCAPI en semana 1). |
| 6 | **Target conversión otras 3 marcas**: brief ≥30% al año 1; sin precedente | **Suavizado a target progresivo**: línea base mes 3, ≥15% mes 6, ≥25% mes 12. |
| 7 | **Estado del contrato Oct8ne**: brief lo deja "por validar" | **Levantar AHORA** (acción externa al PRD). Convivencia con Oct8ne durante MVP. |
| 8 | **Existencia de Service Cloud**: brief lo deja "[POR VALIDAR]" | **Construir el PRD asumiendo "no hay Service Cloud disponible para el MVP".** Si aparece después, es upside (reduce CapEx 40–60%). |

### Vacíos críticos declarados como supuestos del PRD

| # | Vacío | Acción |
|---|---|---|
| V1 | **Cero transcripciones de clientes PASH reales** | ICP construido sobre research público + analogía Falabella; validación cualitativa = prerrequisito de E5. |
| V2 | **Cero entrevistas con agentes humanos** | Prerrequisito E5: 2–3 entrevistas con agentes Patprimo en las próximas 2 semanas. |
| V3 | **Sin baseline cuantitativo real** de CSAT, FCR, AHT, costo/contacto | Fase 0 de instrumentación obligatoria pre-launch. |
| V4 | **DPO de PASH no identificado** | Asumir "no hay DPO formal"; requisito de adopción cross-marca Fase 2. |
| V5 | **Política actual de retención** sobre conversaciones | Baseline 30 días + anonimización post-resolución; validar con Compliance. |
| V6 | **Brand Managers nominales** | PRD usa rol hasta tener nombres; necesario antes de circular fuera del escritorio del autor. |

---

## Segmento 1 — One-Liner + JTBD + Misión

### One-Liner del Producto

> **Hermes** es un agente conversacional de IA que atiende a clientes del grupo PASH (Patprimo, Seven Seven, Ostu, Atmos) sobre Salesforce Commerce Cloud, con **personalidad propia por marca**, **datos transaccionales en tiempo real** y **cobertura 24/7**. Habilita el plan de expansión 2026 del grupo a 4 marcas × 5 países sin que el headcount de servicio al cliente crezca linealmente.

### Job to be Done (JTBD principal — cliente final)

> **Cuando** tengo una consulta sobre mi pedido o sobre la disponibilidad de un producto en una tienda online del grupo PASH, **quiero** obtener una respuesta precisa en menos de 30 segundos y en cualquier momento del día, **para** resolver mi necesidad sin frustración ni tener que abandonar la sesión, y — cuando aplica — completar la compra en el mismo flujo.

### JTBD secundario (agentes humanos)

> **Cuando** un cliente escala una consulta que el bot no resolvió, **quiero** recibirla con el contexto completo de la conversación previa, identidad del cliente y datos del pedido ya cargados, **para** dedicar mi tiempo a casos complejos y venta asistida en lugar de repetir información que el cliente ya entregó.

### Misión del Producto

> Transformar la atención al cliente en e-commerce de moda en Latinoamérica, de un cuello de botella operacional a un motor de crecimiento. Hermes pone IA conversacional en el primer punto de contacto del cliente con cada marca del grupo PASH, con datos transaccionales en tiempo real y voz propia por marca. Habilita al grupo expandir a 4 marcas × 5 países sin que el costo ni la calidad del servicio al cliente se degraden linealmente con cada apertura.

---

## Segmento 2 — Contexto y Problema

### Dolores del mercado

#### En el grupo PASH (de la operación real)

| Dolor | Métrica | Fuente |
|---|---|---|
| Costo del status quo proyectado 2026 | **~COP $3.9–5.1B/año** (operativo + oportunidad + expansión) | Brief §1 |
| Ventas perdidas anuales por consultas no resueltas a tiempo | **~COP $1.0–1.4B/año** cross-grupo | Brief §1 |
| Cobertura entre marcas | **1 de 4** (solo Patprimo con chatbot Oct8ne) | Brief §3 |
| Cobertura del calendario semanal | **~40% sin atención** | Brief §1, §3 |
| Costo de cada nueva apertura sin automatización | **~COP $480M/año** solo en headcount (CR + Pa) | Brief §1 |
| Volumen estimado cross-grupo | **~35–42k consultas/mes** | Brief §1 |

#### En el mercado retail de moda LATAM

| Dolor | Métrica | Fuente |
|---|---|---|
| Tamaño del mercado IA LATAM | **USD $29.5B (2025) → $40.5B (2026), CAGR 37%** | Validación §2.1 |
| % empresas LATAM iniciando IA en atención | **>65% en Brasil y México (2021–2023)** | Validación §2.1 |
| Gap de calidad técnica en retail LATAM | **80% de plataformas grandes con deficiencias críticas en performance + IA** | Validación §2.3 |
| Calidad actual de chatbots LATAM (muestra) | **De 25 retailers con bot: solo 8 entendían lenguaje natural; solo 3 transfieren sin perder contexto** | Validación §2.3 |
| Tasa industria de pérdida por consulta no resuelta en <30 seg | **15–30%** | Brief §1; Statista/Tidio |
| Cambio de expectativa del cliente LATAM | **57% de brasileños confían en chatbot como en humano** | Validación §2.3 |

### ¿Por qué ahora? — 5 vectores convergentes

```mermaid
graph LR
    A[Caída ~80% precio LLM 2025-2026]
    B[Falabella ya en producción con IA]
    C[CONPES 4144 + Circular SIC 002/2024]
    D[Arquitectura es estándar industria]
    E[PASH: 5 países en plan 2026]

    A --> M((Momento 2026))
    B --> M
    C --> M
    D --> M
    E --> M

    M --> R[Acción definitiva con ventana competitiva]
    M --> I[Inacción = brecha estructural creciente]

    style M fill:#cf3,stroke:#333,color:#000
    style R fill:#9f9,color:#000
    style I fill:#f99,color:#000
```

1. **Caída sustancial del costo del LLM** (~80% entre Q1 2025 y Q1 2026). Conversación típica de Hermes: USD $0.002–0.02 en tokens; COP $400–700 con infra amortizada.
2. **Falabella ya elevó la barra de expectativa** con Adereso + Gemini: 1ª respuesta 15× más rápida, 99% tickets tipificados.
3. **Marco regulatorio dejó de ser ambiguo**: CONPES 4144 + Circular SIC 002/2024 + precedente Moffatt v. Air Canada (feb 2024) aplicable bajo Ley 1480.
4. **La arquitectura ya es estándar industria** (Klarna, Lyft, Verdi, Falabella).
5. **La expansión 2026 del grupo PASH multiplica el costo de no actuar lineal** — única dimensión "ahora o nunca" específica de PASH.

### Alternativas actuales — qué se usa hoy y por qué es insuficiente

| # | Alternativa | Estado en PASH | Por qué insuficiente |
|---|---|---|---|
| 1 | **Status quo: Oct8ne + agentes humanos** | Activo en Patprimo Col; otras 3 marcas 100% humanas | No consulta datos en vivo; no cubre 3 marcas; sin 24/7; costo lineal por país |
| 2 | **Escalar el equipo humano** | Implícito si no se actúa | +COP $480M/año solo CR + Pa; no sostenible con expansión |
| 3 | **SaaS especializado retail (Adereso, Intercom Fin, Tidio)** | No implementado | Costo por conversación crece con volumen; lock-in; limitada diferenciación per-brand |
| 4 | **Salesforce Agentforce / Einstein** | Service Cloud asumido NO disponible (Paso 0 #8) | Requiere licencias; ata a stack propietario; menos flexible para per-brand voice. **Opción Fase 2 si llega Service Cloud** |
| 5 | **Mejorar el árbol de Oct8ne** | Posible incrementalmente | No resuelve la contradicción operativa central: árbol no consulta SFCC en runtime |

> ⚠️ **Decisión crítica:** Custom build (Hermes) tiene mayor CapEx inicial pero el OpEx por conversación es ~3–5× menor a escala y la diferenciación por marca es viable. Mercado Libre, Klarna y Lyft también construyeron custom sobre LLM externo cuando llegaron a esta escala.

> ⚠️ **Decisión sobre Oct8ne (Paso 0 #7):** Hermes **convive con Oct8ne durante MVP** (A/B test, no big-bang). Protege contra el anti-pattern documentado en Crítica §5.3.

---

## Segmento 3 — ICP Detallado

> **Decisión estructural:** ICP desdoblado en dos:
> - **ICP A** — Usuario final del bot (cliente que dispara el JTBD primario)
> - **ICP B** — Cliente interno / Buyer corporativo (PASH como organización + decisores)

### ICP A — Usuario final del bot (consumidor de las marcas PASH)

#### Firmographics agregadas — los 4 públicos

| Marca | Perfil cliente | Demografía | Ticket promedio aprox | Sensibilidad esperada al bot |
|---|---|---|---|---|
| **Patprimo** | Familiar mainstream — H/M/infantil | 25–50 años, NSE C+, B, B+ | COP $80–150k | Alta — base de 50–60% venta vía chat ya existe |
| **Seven Seven** | Joven adulto, foco masculino, urbano | 18–35 años, NSE B+, A; foco hombre | COP $100–200k | Media-alta — público early-adopter digital |
| **Ostu** | Fast-fashion masivo (lanzada 2023) | 16–35 años, NSE C+ a B; H/M/infantil | COP $50–100k | Media — sensible a tiempo y disponibilidad |
| **Atmos** | Athleisure aspiracional (lanzada 2024) | 18–35 años, NSE B a A; performance/lifestyle | COP $150–300k | Alta — espera experiencia premium |

**Geografía MVP:** Colombia (Bogotá, Medellín, Cali, Barranquilla y centros secundarios urbanos).

#### Personas ilustrativas

> ⚠️ **Aviso de validación (vacío V1):** ningún doc en `docs/` contiene transcripciones reales de clientes PASH. Personas son derivadas de research público + analogía Falabella + perfil de marca publicado. Validación con entrevistas reales = prerrequisito de E5.

**Persona 1 — "Mariana", cliente Patprimo**
Mujer, 34, contadora, Bogotá. Madre de 2 hijos. Compra online por conveniencia. Canal preferido: WhatsApp; chat web ocasional. *Frustración típica:* "Ya pasó una semana y no veo mi paquete; no me responden WhatsApp."

**Persona 2 — "Camilo", cliente Seven Seven**
Hombre, 24, joven profesional en Medellín o Bogotá. Sigue Seven Seven en Instagram. Canal preferido: chat directo o WhatsApp. *Frustración típica:* "Quiero saber si tienen la talla L del jean; el chat me responde mañana."

**Persona 3 — "Andrea", cliente Atmos**
Mujer, 29, marketing manager en Bogotá. Yoga y running serio. Athleisure premium nuevo online. Canal preferido: chat web en sesión de exploración. *Frustración típica:* "No sé si esta talla me queda — la marca es nueva y no encuentro asesor a las 9pm."

#### Pains del usuario final

| Pain | Fuente |
|---|---|
| Sin información en tiempo real sobre el pedido | Brief §1, §3 |
| Sin respuesta fuera de horario; ~40% del calendario sin atención | Brief §1, §3 |
| 1ª respuesta de 3–8 min en horario; 12–24h fuera | Brief §3 |
| Cliente repite información al saltar de canal | Brief §3 |
| 15–30% de carritos abandonados si consulta no resuelta en <30 seg | Brief §1 |
| Expectativa LATAM cambió: 57% de brasileños confía en chatbot ≈ humano | Validación §2.3 |

#### Triggers de uso del bot

1. Pedido en tránsito sin información clara
2. Página de producto con duda de talla o stock
3. Recibe correo de envío y quiere confirmar dirección
4. Frustración previa con WhatsApp/email sin respuesta
5. Consulta nocturna o fin de semana sin operador humano

#### Objeciones del usuario final

| Objeción | Mitigación |
|---|---|
| "El bot nunca entiende — prefiero hablar con persona" | Hand-off explícito y visible siempre |
| "Me da información incorrecta — no confío" | Toda info dinámica vía tool call, nunca de memoria del LLM |
| "Suena genérico, no como Patprimo / Seven Seven" | Per-brand voice validada con Brand Manager + ejemplos curados |

### ICP B — Cliente interno / Buyer corporativo (PASH como organización)

#### Firmographics corporativos

| Dato | Valor |
|---|---|
| Razón social | PASH S.A.S, NIT 860.503.159-1 |
| Sede | Bogotá, Colombia |
| Origen | Manufacturas Eliot/Elliot (Barranquilla, 1957); familia Douer |
| Tamaño | ~11.000 empleos directos + indirectos |
| Ingresos 2023 | ~COP $2.18B (~USD $510M) |
| Marcas | 4 — Patprimo, Seven Seven, Ostu, Atmos |
| Países activos | Colombia, Ecuador, Guatemala |
| Países en plan 2026 | Costa Rica, Panamá |
| Stack e-commerce | Salesforce Commerce Cloud en las 4 marcas (verificado) |
| Stack atención hoy | Oct8ne (solo Patprimo) + atención humana en 4 canales |
| Service Cloud / Agentforce | Asumido NO disponible para MVP |
| DPO formal | No identificado (V4) |
| Modelo de equipos servicio al cliente | Dedicados por marca |

#### Buyer personas internos (decisores y bloqueadores)

| # | Persona | Rol estructural | Qué le importa | Qué objetará |
|---|---|---|---|---|
| 1 | **CTO objetivo** (sponsor técnico) | Dueño SFCC + presupuesto tech | Reutilización stack; controlabilidad; TCO | "¿Por qué no Agentforce?", "compliance Anthropic US?", "¿quién mantiene en 12 meses?" |
| 2 | **CMO / Director de Marca** (co-sponsor) | Impacto en marcas + conversión | Tono de marca; protección conversión Patprimo | "¿Bot suena genérico?", "¿si dice algo incorrecto sobre la marca?" |
| 3 | **Brand Managers** (4, vacío V6) | Veto sobre tono | Voz consistente con asset de marca | "Probemos primero, validemos antes de lanzar" |
| 4 | **Director CX / Servicio al Cliente** | Operación diaria + equipo | Equipo no se siente reemplazado; SLA cumplido | "¿Despidos?", "¿romper lo que ya funciona?" |
| 5 | **Compliance / Habeas Data** | Cumplimiento Ley 1581 + 1480 + SIC | Documentación legal; PII conforme | "¿PII al LLM US?", "¿DPA Anthropic?", "¿DPO?" |
| 6 | **CFO** | CapEx + OpEx + payback | Payback medible; sin costos variables sorpresa | "¿Cómo presupuesto LLM variable?", "¿payback period?" |

#### Pains organizacionales

| Pain | Fuente |
|---|---|
| Costo proyectado 2026 del status quo: ~COP $3.9–5.1B/año | Brief §1 |
| Ventas perdidas anuales: ~COP $1.0–1.4B/año | Brief §1 |
| Expansión 2026 hace costo crecer lineal — modelo financieramente inviable | Brief §1, §3 |
| Falabella ya en producción con IA — disonancia competitiva regional | Validación §3.2, §6.2 |
| Riesgo legal Ley 1480: la empresa responde por lo que diga el bot (Moffatt) | Crítica §3.1 + §4.2 |
| Stack SFCC homogéneo subexplotado | Brief §3 |

#### Triggers organizacionales

1. Anuncio público de expansión a CR + Pa
2. Ciclo de presupuesto del próximo año fiscal
3. Movimiento adicional de Falabella o Cencosud en IA
4. Inicio de programa de modernización digital del grupo
5. Quejas escaladas al nivel directivo sobre tiempo de respuesta

#### Objeciones internas + respuesta del PRD

| Objeción interna | Respuesta |
|---|---|
| "¿Por qué no Agentforce nativo?" | Requiere Service Cloud (no confirmado). Migración a Agentforce queda abierta en Fase 2 si llega Service Cloud. |
| "¿Cómo manejas Habeas Data con Anthropic en EE.UU.?" | 3 capas: Bedrock LATAM + DPA con Anthropic + autorización expresa en flow de chat. |
| "¿4 semanas con 1 desarrollador?" | MVP es **demo + POC técnico funcional**, NO piloto-producción. Adopción real es Fase 2 post-Demo Day. |
| "¿Y si el bot promete algo y la SIC nos sanciona?" | Toda info dinámica vía tool call obligatorio. El bot no puede afirmar precios, stock o políticas sin leerlo del sistema en runtime. |
| "¿Cómo aseguramos que cada marca suena diferente?" | "Un motor + N personalidades": system prompt por marca + KB segregada + validación con cada Brand Manager. |
| "¿Reemplaza esto al equipo humano?" | No. El equipo migra de L1 repetitivo a L2/L3 + venta asistida. Mismo headcount, mayor valor por agente. |
| "¿Cuál es el payback?" | **~6 semanas operativas.** CapEx + año 1 OpEx ~COP $158M; ahorro anual estimado ~COP $1.44B. ROI año 1 ~9×. Floor garantizado: –25%. |
| "¿No es esto solo un experimento del programa Hardcore AI?" | POC autofinanciado, pero el path a adopción comercial está documentado (Roadmap Fase 2/3). |
| "¿Qué pasa si Klarna se devolvió, no nos va a pasar a nosotros?" | Klarna falló por scope. Hermes mantiene convivencia con Oct8ne y handoff humano explícito desde día 1. |

---

## Segmento 4 — UVP y Diferenciadores

### UVP — Formulación corta

> **Hermes** es la única plataforma que combina **N personalidades de marca configurables sobre un solo motor de IA**, con **acceso en runtime a datos transaccionales de SFCC** (estado de pedido, inventario) y **compliance LATAM diseñado desde día 1** (Bedrock LATAM + DPA Anthropic + autorización expresa). Habilita al grupo PASH atender 4 marcas × 5 países simultáneamente sin replicar implementaciones ni exponerse a riesgo legal por improvisación regulatoria.

### UVP desdoblada — ¿Qué resuelve, para quién, cómo?

| Dimensión | Respuesta |
|---|---|
| **¿Qué problema resuelve?** | La atención al cliente del grupo PASH no escala a la trayectoria 2026: 4 marcas × hasta 5 países con un modelo híbrido (Oct8ne en 1 marca + humanos en las otras 3) que no cubre 24/7, no consulta datos en vivo, y multiplica el costo lineal con cada apertura. |
| **¿Para quién?** | **Cliente final** (Grupo A — Mariana / Camilo / Andrea): respuesta <30 seg, 24/7, datos en vivo, voz de su marca. **Buyer interno** (Grupo B — CTO + CMO + Brand Managers + Compliance + CFO): plataforma única, aprovecha SFCC ya pagado, controlable, defendible ante SIC, payback ~6 semanas. |
| **¿Cómo?** | (1) Un solo motor LLM (Claude Haiku 4.5 vía Bedrock LATAM) con N system prompts + N KBs segregadas por marca. (2) Tool layer sobre SFCC OCAPI/SCAPI invocado en runtime. (3) Handoff explícito con contexto preservado. (4) Compliance layer (PII anonymization + logs auditables + DPA + autorización expresa) cumple Ley 1581 + Circular SIC 002/2024 desde día 1. |

### Diferenciación vs. competidores identificados

> ⚠️ "Competidores" significa **alternativas que PASH podría escoger en lugar de Hermes**, no rivales comerciales como retailer.

| Competidor / Alternativa | Diferenciación de Hermes |
|---|---|
| **Oct8ne (status quo Patprimo)** | Oct8ne es rule-based: no consulta SFCC en runtime, no maneja variabilidad lingüística, no escala. Hermes resuelve la contradicción operativa central. Hermes **convive con Oct8ne durante MVP**, no es reemplazo big-bang. |
| **Adereso + Gemini (Falabella, Cencosud)** | Trade-off: costo por conversación crece linealmente con volumen; diferenciación per-brand limitada; lock-in. Hermes da control de tono per-brand + costo unitario decreciente con escala + portabilidad de LLM. |
| **Salesforce Agentforce / Einstein** | Requiere licencias Service Cloud (no confirmadas). Hermes no requiere Service Cloud para el MVP. Migración a Agentforce queda como opción Fase 2. |
| **Intercom Fin / Zendesk / Tidio** | SaaS genérico — integración SFCC custom limitada; voz de marca difícil de diferenciar; pricing per conversación no competitivo a escala; sin Bedrock LATAM ni DPA específico. |
| **OpenAI Verdi / Klarna custom** | Arquitectura idéntica a Hermes. **Diferencia clave:** ni Klarna ni Verdi tienen multi-marca explícita. Hermes incorpora multi-personalidad por diseño desde el MVP. |
| **Solo humanos + escalar headcount** | +COP $480M/año solo CR + Pa; no 24/7; sin efectos de escala; financieramente inviable. |
| **Mejorar el árbol de Oct8ne** | No resuelve la contradicción central — árbol no consulta SFCC en runtime. |

### Brecha de mercado que Hermes llena

1. **Calidad técnica del retail LATAM** — 80% de plataformas con deficiencias críticas; solo 3 de 25 hacen handoff con contexto.
2. **Competidores directos colombianos sin IA generativa** — GEF, Crystal, Studio F, Arturo Calle. Espacio temporal de diferenciación.
3. **Casos comparables son mono-marca; Hermes es multi-marca por diseño** — primer caso público que documenta "un motor + N personalidades" como decisión arquitectónica primaria.

### Matriz de posicionamiento 2x2

```mermaid
quadrantChart
    title Retail conversacional IA — donde compite Hermes
    x-axis "Datos estáticos (FAQ predefinida)" --> "Datos en vivo (tool use SFCC en runtime)"
    y-axis "Voz genérica única" --> "N personalidades configurables por marca"
    quadrant-1 "Ideal multi-marca con runtime data"
    quadrant-2 "Diferenciado pero superficial"
    quadrant-3 "Status quo legacy"
    quadrant-4 "Robusto pero homogéneo"
    "Oct8ne (Patprimo actual)": [0.15, 0.30]
    "Tidio / Zendesk Answer Bot": [0.30, 0.25]
    "Intercom Fin": [0.55, 0.40]
    "Salesforce Agentforce / Einstein": [0.75, 0.50]
    "Adereso + Gemini (Falabella)": [0.78, 0.55]
    "Klarna AI Assistant": [0.80, 0.35]
    "OpenAI Verdi (Mercado Libre)": [0.85, 0.45]
    "Hermes (PASH propuesto)": [0.88, 0.85]
```

**Lectura:** Hermes ocupa el cuadrante Q1 que ningún caso público ocupa hoy. La diferenciación es **temporal, no permanente** — si Klarna o Verdi añaden multi-personalidad mañana, Hermes pierde ese vector. Esto refuerza la urgencia del Segmento 2.

---

## Segmento 5 — Casos de Uso Top 5

> Los Casos de Uso cubren la **visión completa del producto** (Fase 1 MVP + Fase 2/3), no solo el MVP.

### Vista general

| # | Caso de Uso | Fase | Persona | KPI primario |
|---|---|---|---|---|
| 1 | **Consulta de estado de pedido** | **MVP — must-have** | Mariana (Patprimo) | Tiempo 1ª respuesta + Costo |
| 2 | **Consulta de disponibilidad + add-to-cart** | **MVP — stretch goal** | Camilo (Seven Seven) | Conversión del chat |
| 3 | **Iniciación asistida de devolución / cambio** | **Fase 2** | Mariana (Patprimo) | Tiempo resolución + Costo devoluciones |
| 4 | **Búsqueda asistida en catálogo** | **Fase 2–3** | Andrea (Atmos) | Conversión + engagement |
| 5 | **Escalamiento contextual a humano** | **MVP — capa transversal** | Cliente frustrado (cualquier marca) | CSAT + Contexto preservado |

### Caso de Uso 1 — Consulta de estado de pedido (MVP must-have)

| | |
|---|---|
| **Actor** | Cliente final con pedido en curso. Persona: Mariana (Patprimo). |
| **Trigger** | Cliente recibió correo "tu pedido fue enviado" sin actualización; abre chat web. |
| **Pasos** | **1.** Cliente: *"¿Dónde está mi pedido #12345?"*. **2.** Bot identifica al cliente (SFCC session si auth; guest si no). **3.** Bot invoca `get_order_status(order_id, customer_id)` → SFCC OMS en runtime. **4.** Bot responde con estado + ETA + link de tracking en tono de la marca. **5.** Si confidence < threshold o sentimiento negativo → escalamiento a humano con contexto. |
| **Resultado esperado** | Respuesta precisa en <30 seg sin esperar correo ni operador humano. |
| **Valor medible** | • Tiempo 1ª respuesta: 3–8 min → <30 seg p50, 24/7<br>• Costo unitario: bot ~COP $500 vs humano ~COP $6.500<br>• % escaladas a humano: target 20–30% (vs 100% efectivo hoy en Oct8ne para estado pedido) |

> ⚠️ **Decisión MVP:** flujo guest-friendly (# orden + email/documento) cubre ~40-60% del tráfico estimado anónimo.

### Caso de Uso 2 — Consulta de disponibilidad + add-to-cart (MVP stretch)

| | |
|---|---|
| **Actor** | Cliente final en sesión de exploración. Persona: Camilo (Seven Seven). |
| **Trigger** | Cliente en página de producto pregunta por talla, color o stock específico. |
| **Pasos** | **1.** Cliente: *"¿Tienen este jean en talla L?"*. **2.** Bot extrae SKU del contexto. **3.** Bot invoca `check_inventory(sku, talla, color)` → SFCC en runtime. **4.** Si hay stock: ofrece add-to-cart desde el chat. **5.** Si no: ofrece alternativas (otras tallas, productos similares, notificación de restock). |
| **Resultado esperado** | Info veraz instantánea + completar transacción en la misma sesión. La conversación que era costo se convierte en venta. |
| **Valor medible** | • Conversión vía chat: mantener Patprimo ≥50%, target progresivo en otras marcas<br>• Add-to-cart rate desde chat: nueva métrica<br>• % sesiones con consulta de disponibilidad que resultan en compra: target ≥30% mes 6 |

> ⚠️ **Stretch goal:** depende de acceso confirmado de IT a OCAPI Inventory en semana 1. Si IT no entrega, Caso 2 cae a Fase 2.

### Caso de Uso 3 — Iniciación asistida de devolución (Fase 2)

| | |
|---|---|
| **Actor** | Cliente post-compra con producto a devolver. Persona: Mariana. |
| **Trigger** | *"Necesito devolver el pantalón que pedí"*. |
| **Pasos** | **1.** Cliente expresa intención. **2.** Bot solicita # orden, valida elegibilidad. **3.** Si elegible: genera RMA + etiqueta + coordina recolección. **4.** Si no elegible o complejo: escalamiento a humano con contexto. **5.** Confirmación por correo + chat. |
| **Resultado esperado** | Proceso en minutos vs. días. Humano solo en excepciones. |
| **Valor medible** | • Tiempo resolución: días → minutos<br>• % devoluciones vía bot: ≥60% Fase 2<br>• Costo unitario devolución: –40–60% |

> ⚠️ **Trade-off documentado:** caso transaccional. Mitigación: validación de elegibilidad en código del tool, no en prompt del LLM.

### Caso de Uso 4 — Búsqueda asistida en catálogo (Fase 2–3)

| | |
|---|---|
| **Actor** | Cliente en exploración con intención sin SKU específico. Persona: Andrea (Atmos). |
| **Trigger** | *"Necesito leggings para yoga, color oscuro, talla M, presupuesto hasta $250k"*. |
| **Pasos** | **1.** Cliente describe requisitos. **2.** Bot interpreta + invoca `search_catalog(filters)` con RAG. **3.** Bot presenta 2–3 productos top + link directo. **4.** Cliente refina si quiere. **5.** Add-to-cart directo. |
| **Resultado esperado** | Producto deseado en <2 min sin navegar catálogo completo. |
| **Valor medible** | • Conversión vía chat<br>• Tiempo de descubrimiento<br>• % sesiones búsqueda asistida → compra |

### Caso de Uso 5 — Escalamiento contextual a humano (MVP — capa transversal)

| | |
|---|---|
| **Actor (doble)** | (a) Cliente final frustrado o consulta compleja. (b) Agente humano que recibe el ticket. |
| **Trigger** | (i) sentimiento negativo, (ii) complejidad fuera de scope, (iii) request explícito, (iv) confidence bajo threshold. |
| **Pasos** | **1.** Cliente expresa frustración o solicita humano. **2.** Bot detecta señal — escala proactivamente. **3.** Bot construye paquete de contexto: historial, identidad, pedido, intento del bot, sentimiento, categoría. **4.** Transferencia al chat humano (widget Oct8ne en MVP). **5.** Humano resuelve sin pedir repetir; cierra outcome. |
| **Resultado esperado** | Cliente atendido en <60 seg sin repetir su historia. Humano gana tiempo y foco. |
| **Valor medible** | • Tiempo hasta humano: <60 seg con contexto<br>• CSAT en casos escalados<br>• % contexto preservado: 100%<br>• AHT humano: –30–40% |

> ⚠️ **Decisión arquitectónica:** Caso 5 es **capa transversal, no aislado**. Cualquier caso (1–4) puede terminar en Caso 5. Diseñar handoff como capa de primera clase desde MVP — lección Klarna 2025 retroceso.

### Diagrama del flujo común a los 5 casos

```mermaid
flowchart TD
    A[Cliente abre chat]
    A --> B{Bot identifica<br/>intención}
    B -->|estado pedido| C1[Caso 1: get_order_status]
    B -->|disponibilidad / carrito| C2[Caso 2: check_inventory]
    B -->|devolución| C3[Caso 3: validar política + RMA]
    B -->|búsqueda asistida| C4[Caso 4: search_catalog + RAG]
    B -->|consulta compleja<br/>o sentimiento negativo| C5

    C1 --> D{confidence + sentimiento}
    C2 --> D
    C3 --> D
    C4 --> D
    D -->|OK| E[Respuesta al cliente<br/>en tono per-brand]
    D -->|escala| C5[Caso 5: handoff<br/>con paquete de contexto]

    C5 --> H[Agente humano<br/>recibe ticket pre-cargado]

    E --> F[Métricas: latencia, tokens,<br/>CSAT, conversión, escalamiento]
    H --> F

    style C5 fill:#cf3,stroke:#333,color:#000
    style D fill:#fc6,color:#000
    style F fill:#9f9,color:#000
```

---

## Segmento 6 — Principios de Diseño No Negociables

| # | Principio | Anti-falla que previene |
|---|---|---|
| 1 | **Grounding obligatorio en runtime** | Alucinación con consecuencias legales (Moffatt) |
| 2 | **Handoff humano de primera clase** | Loop infinito + CSAT silencioso (ASOS, Klarna) |
| 3 | **Per-brand voice estricta** | Homogeneización de marca |
| 4 | **Compliance LATAM by design** | Sanción SIC + transferencia internacional irregular |
| 5 | **Transparencia con el cliente** | Engaño percibido = quiebre de confianza |
| 6 | **Despliegue gradual basado en métricas** | Reemplazo big-bang + baseline ausente |
| 7 | **Auditabilidad + defensas anti-jailbreak** | DPD + Chevrolet + ausencia de defensa legal |

### Principio 1 — Grounding obligatorio en runtime

**(a) Operativo:** Toda info dinámica (precio, stock, estado de pedido, política, datos del cliente) DEBE venir de tool call validado en el mismo turno. Nunca de memoria del LLM. System prompt: *"Si no tienes el dato vía tool, di que vas a consultar y escala. Nunca inventes."*

**(b) Interfaz:** Bot dice *"Déjame consultarlo"* + indicador visual de espera + respuesta con dato verificable. Si tool falla, escalamiento a humano automático. Nunca *"creo que..."* sobre datos transaccionales.

**(c) PROHIBIDO:**
- ❌ Afirmar precios, stock, plazos, fechas, % de descuento sin tool call
- ❌ Frases como *"según mi conocimiento"* sobre datos transaccionales
- ❌ Completar información del cliente por inferencia
- ❌ Responder *"sí"* a preguntas comerciales vinculantes sin tool

### Principio 2 — Handoff humano de primera clase

**(a) Operativo:** Escalamiento humano es capa transversal, no fallback. Triggers: confidence bajo, sentimiento negativo, fuera de scope, request explícito. Handoff incluye paquete de contexto completo.

**(b) Interfaz:** Botón *"Hablar con persona"* visible y persistente en cada turno. Indicador de escalamiento. Agente humano recibe ticket ya cargado con contexto.

**(c) PROHIBIDO:**
- ❌ Loop infinito de respuestas similares
- ❌ Ocultar botón de humano
- ❌ Pasar al humano sin contexto (cliente repitiendo historia)
- ❌ Cerrar conversación sin resolución ni escalamiento
- ❌ Marcar como "resuelto" lo que terminó porque el cliente se rindió

### Principio 3 — Per-brand voice estricta

**(a) Operativo:** Bot habla en la voz específica de la marca de la sesión. Diferenciación con: (i) system prompt por marca, (ii) KB segregada por marca, (iii) few-shot examples curados y validados con Brand Manager ANTES de construir.

**(b) Interfaz:** Saludo identificado con la marca. Registro lingüístico cambia por marca. Cliente no ve referencias cruzadas entre marcas.

**(c) PROHIBIDO:**
- ❌ Reutilizar mismo system prompt entre marcas
- ❌ Lanzar nueva marca sin validación + ejemplos curados
- ❌ Permitir al cliente cambiar la "personalidad" vía prompt injection
- ❌ Mezclar productos del catálogo de una marca con otra
- ❌ Validar tono "en reunión" — debe ser eval blind

### Principio 4 — Compliance LATAM by design

**(a) Operativo:** Compliance es restricción arquitectónica desde día 1. Tres capas:
1. **Bedrock LATAM** (Brasil o Chile) — residencia regional
2. **DPA firmado con Anthropic** — cláusulas SIC-equivalentes
3. **Autorización expresa** del cliente en flow de chat

Política de retención: regulación más estricta entre jurisdicciones (Colombia + Ecuador como baseline).

**(b) Interfaz:** Aviso explícito al iniciar conversación: *"Hola, soy [nombre] de [marca]. Para ayudarte voy a usar IA y a consultar tu información si me lo permites. ¿Continuamos?"* Información personal no se muestra en exceso.

**(c) PROHIBIDO:**
- ❌ Enviar PII al LLM en claro — siempre tokenizado/anonimizado
- ❌ Almacenar conversaciones más del mínimo necesario
- ❌ Operar en país nuevo sin validar régimen local
- ❌ Lanzar a producción sin DPA + autorización expresa
- ❌ Asumir que aviso de privacidad genérico sustituye autorización expresa

### Principio 5 — Transparencia con el cliente

**(a) Operativo:** Cliente siempre sabe que habla con IA. Si pregunta, bot responde la verdad.

**(b) Interfaz:** Saludo declara la naturaleza: *"un asistente con inteligencia artificial"*. Indicador visual permanente de "Asistente IA".

**(c) PROHIBIDO:**
- ❌ Afirmar ser humano si el cliente pregunta
- ❌ Usar nombres humanos sin contexto que induzcan a engaño
- ❌ Simular conducta humana inverosímil para engañar
- ❌ Eliminar indicador visual durante la sesión

### Principio 6 — Despliegue gradual basado en métricas

**(a) Operativo:** Lanzamiento es proceso gradual con gates de promoción cuantitativos. Tres etapas:
1. **Fase 0 — Instrumentación pre-launch**: baselines reales.
2. **A/B test con Oct8ne durante MVP**: división de tráfico.
3. **Rollback automático**: si conversión cae >5pp o <50% absoluto; si CSAT cae bajo baseline; si costo sube anómalo.

Promoción a 100% solo tras ≥4 semanas de datos comparativos.

**(b) Interfaz:** Cliente ve un widget u otro, no ambos. Equipo interno: dashboard semanal + alertas + kill switch operable en <5 min.

**(c) PROHIBIDO:**
- ❌ Desinstalar Oct8ne durante MVP
- ❌ Lanzar a 100% del tráfico sin validar guardrails por ≥4 semanas
- ❌ Recibir tráfico real antes de Fase 0 instrumentada
- ❌ Cambiar KPIs mientras A/B esté corriendo
- ❌ Reportar métricas favorables ignorando guardrails

### Principio 7 — Auditabilidad + defensas anti-jailbreak

**(a) Operativo:** Cada turno registrado con timestamp, customer hash, intención, tools, latencia, tokens, output, sentimiento, escalamiento. Incluye:
- Guardrails de output (validador regex de promesas concretas)
- System prompt hardened con regla anti-override
- Red team interno previo a cada lanzamiento (50–100 prompts mínimo)

**(b) Interfaz:** Para cliente: invisible. Para equipo interno: dashboard con conversación reconstruible + alertas + reporte semanal.

**(c) PROHIBIDO:**
- ❌ Producción sin red team interno previo
- ❌ Lanzar nueva marca/país sin red team específico
- ❌ Omitir logging de cualquier turno
- ❌ Permitir que el bot acepte instrucciones que contradigan el system prompt
- ❌ Ignorar alertas de patrones anómalos por más de 24h sin triage

### Diagrama — los 7 principios en una conversación

```mermaid
flowchart TD
    Start[Cliente abre chat]
    Start --> P5[P5 Transparencia:<br/>aviso 'soy IA']
    P5 --> P4[P4 Compliance:<br/>autorización expresa]
    P4 --> P3[P3 Per-brand voice:<br/>system prompt + KB de la marca]
    P3 --> Q{Bot procesa<br/>consulta}
    Q --> P1[P1 Grounding:<br/>tool call obligatorio<br/>para info dinámica]
    P1 --> P7[P7 Guardrails de output:<br/>validador regex<br/>+ anti-jailbreak]
    P7 --> R{¿Confidence<br/>OK?}
    R -->|Sí| Respuesta[Respuesta al cliente]
    R -->|No| P2[P2 Handoff:<br/>escala con paquete<br/>de contexto]
    Respuesta --> Log[P7 Log auditable<br/>del turno]
    P2 --> Log
    Log --> P6[P6 Métricas:<br/>dashboard A/B<br/>vs Oct8ne]

    style P1 fill:#fc6,color:#000
    style P2 fill:#fc6,color:#000
    style P3 fill:#fc6,color:#000
    style P4 fill:#fc6,color:#000
    style P5 fill:#fc6,color:#000
    style P6 fill:#9f9,color:#000
    style P7 fill:#fc6,color:#000
```

---

## Segmento 7 — User Journeys

### Mapa de los journeys

| # | Tipo | Persona | Caso de Uso | Principios visibles |
|---|---|---|---|---|
| 1 | Happy — cliente final | Mariana (Patprimo) | Caso 1 — Estado de pedido | P1, P3, P4, P5, P7 |
| 2 | Happy — operador interno | Daniela (CX Lead) | Capa transversal | P3, P6, P7 |
| 3 | Edge — abandono | Camilo (Seven Seven) | Caso 4 fuera scope MVP | P1, P2, P3, P5, P6, P7 |
| 4 | Edge — escalamiento | Andrea (Atmos) | Caso 5 + Caso 3 | P1, P2, P3, P4, P5, P7 |

### Journey 1 — Happy Path Cliente Final: "Mariana consulta su pedido un martes en la noche"

**Contexto:** Mariana, 34, Patprimo, Bogotá. Pedido #PP-2026-15847 enviado hace 3 días sin actualización. Martes 9:47 PM (fuera de horario operativo humano).

1. **Trigger.** Mariana entra a patprimo.com desde su iPhone. Abre el widget de chat.

2. **Saludo + transparencia + autorización (P5 + P4).**
   > *"Hola, soy Sofía de Patprimo — un asistente con IA. Puedo ayudarte con consultas sobre tu pedido o productos. Para ayudarte voy a consultar tu información si me lo permites. ¿Continuamos?"*

3. **Consulta.** Mariana: *"Hola, mi pedido lleva 3 días enviado pero no veo dónde está"*.

4. **Bot interpreta intención.** Orchestrator clasifica = `order_status`. Mariana no logueada.

5. **Identificación guest-friendly.** Bot: *"Claro Mariana, te ayudo. ¿Me compartes tu número de pedido y el correo con el que compraste?"*

6. **Tool call obligatorio (P1).** Bot invoca `get_order_status` → SFCC OMS retorna estado="En tránsito", transportador="Servientrega", ETA="jueves 22 mayo".

7. **Respuesta en tono Patprimo (P1 + P3).**
   > *"¡Ya lo encontré! Tu pedido **PP-2026-15847** está en camino con Servientrega — guía **SVT-882341**. Está estimado para llegar el **jueves 22 de mayo**. Puedes revisar el detalle aquí: [link]. ¿Algo más en lo que te pueda ayudar?"*

8. **Confirmación.** Mariana: *"Perfecto, gracias!"*. Bot cierra cordial.

9. **Logging completo (P7).**

10. **Outcome.** 47 segundos. Sin operador humano disponible, Mariana obtuvo respuesta que antes esperaba hasta el día siguiente.

```mermaid
sequenceDiagram
    actor M as Mariana
    participant W as Widget de chat
    participant O as Orchestrator
    participant L as Claude Haiku 4.5
    participant S as SFCC OMS

    M->>W: Abre chat 9:47pm
    W->>M: Saludo + transparencia + autorización [P5 P4]
    M->>W: Acepta + "mi pedido lleva 3 días..."
    W->>O: Mensaje + sesión
    O->>L: Prompt + marca=Patprimo + tools
    L-->>O: Intención=order_status; falta # orden + email
    O->>W: "¿Me compartes # pedido y correo?"
    M->>W: PP-2026-15847 + mariana.r@correo.com
    W->>O: Datos
    O->>S: get_order_status [P1 Grounding]
    S-->>O: estado, guía, ETA
    O->>L: Datos reales + render respuesta tono Patprimo
    L-->>O: Respuesta en voz per-brand [P3]
    O->>W: Respuesta + link tracking
    W->>M: "Tu pedido está con Servientrega..."
    Note over O: P7 log auditable del turno
    M->>W: "Perfecto, gracias"
    W->>M: "Con gusto, buena noche"
```

**KPIs:** 1ª respuesta = 8 seg; costo unitario ~COP $500; CSAT implícito positivo; escalamiento = 0%.

### Journey 2 — Happy Path Operador: "Daniela revisa el lunes en la mañana"

**Persona — Daniela, CX Lead de Patprimo.** 31 años, 5 años en PASH. Operadora-curadora del bot. Lunes 8:30 AM.

1. **Apertura del dashboard.** KPIs + guardrails del fin de semana.

2. **Lectura de salud (P6).**
   - Tiempo 1ª respuesta: 22 seg p50, 41 seg p95 ✅
   - Costo unitario: COP $480 ✅
   - Conversión Hermes: 53% vs Oct8ne 56% (dentro de banda)
   - CSAT: 4.2 vs baseline 4.1
   - Escalamientos: 18%
   - Guardrails violations: 0

3. **Alerta detectada (P7).** *"En 6 conversaciones del fin de semana el bot no encontró el producto que el cliente pedía"*.

4. **Drill down.** Identifica el patrón: nueva colección Patprimo Otoño 2026 lanzada el sábado, KB no actualizada.

5. **Diagnóstico.** Job de re-indexación corre cada lunes → bot operó sobre catálogo viejo.

6. **Acción 1 — fix inmediato.** Daniela dispara manualmente el job de re-indexación (8 min). Valida con consulta de prueba.

7. **Acción 2 — fix sistémico.** Ticket: *"Job de re-indexación debe correr diariamente"*.

8. **Acción 3 — comunicación.** Mensaje a Slack de CX Operación.

9. **Lectura de escalamientos.** Sample de 5 escalamientos del fin de semana → contexto P2 llegó completo en todos.

10. **Cierre — validación de tono (P3).** Reunión semanal con Brand Manager Patprimo. 0 vetos en último mes.

**Outcome:** 30 minutos para detectar, mitigar, abrir ticket sistémico, comunicar y validar.

### Journey 3 — Edge Case: "Camilo se rinde a media búsqueda"

**Contexto:** Camilo, 24, Seven Seven. Vio una chaqueta en Instagram pero no recuerda referencia. Domingo 11:32 PM.

1. **Trigger.** *"Hola, vi una chaqueta de cuero en su Insta el viernes, ¿cómo se llama?"*

2. **Bot reconoce limitación.** Caso de búsqueda visual fuera de scope MVP.

3. **Bot ofrece alternativa graceful (P1).** Bot NO inventa SKU: *"Buena Camilo. No tengo acceso directo a Instagram, pero te puedo buscar en el catálogo. ¿Recuerdas algún detalle?"*

4. **Cliente da info ambigua.** *"Era oscura y como gruesa, no sé"*. 30+ chaquetas matchean.

5. **Bot intenta clarificar.** Camilo: *"Olvídalo, voy a buscar en Insta directamente"*.

6. **Bot cierra con valor + puerta abierta (P2 + P3).**
   > *"Sin problema. Cuando la encuentres y tengas la referencia, vuelvo y te confirmo tallas y stock. También puedo conectarte con un asesor por chat si prefieres. ¡Suerte! 🤘"*

7. **Camilo cierra el chat.** Vuelve a Instagram.

8. **El sistema captura el evento (P6 + P7).** Métrica "abandono post-clarificación" +1.

9. **Detección de patrón en agregado.** Si ≥5/semana → entra al reporte semanal como gap → input para Roadmap Fase 2 (Caso 4).

10. **Outcome.** Camilo no fue engañado ni quedó en loop. Sistema aprendió del abandono — opuesto al anti-pattern ASOS.

### Journey 4 — Edge Case: "Andrea con queja compleja → escalamiento exitoso"

**Contexto:** Andrea, 29, Atmos. Segundo pedido. Leggings con costura defectuosa. Sábado 7:15 PM (operación humana activa).

1. **Trigger.** *"Compré los leggings hace 12 días y vinieron con un defecto en la costura. Es la SEGUNDA vez que me pasa con esta marca y ya no quiero más esto. Quiero devolverlos y mi plata."*

2. **Saludo + transparencia (P5 + P3).**
   > *"Hola Andrea, soy Aura de Atmos — un asistente con IA. Lamento lo que pasó con tus leggings; déjame ayudarte a resolverlo lo antes posible."*

3. **Bot procesa múltiples señales.** Intención: `return_request`. Sentimiento: negativo fuerte. Histórico: 2 pedidos con Atmos.

4. **Decisión del bot — escalamiento proactivo (P2).** Devolución por defecto = fuera de scope MVP + sentimiento negativo + cliente recurrente. Bot NO intenta resolver solo.

5. **Bot responde transparentemente (P5 + P2).**
   > *"Andrea, este caso lo voy a pasar directamente a una persona de nuestro equipo. Voy a compartirle toda la información para que no tengas que repetir nada. Esto tomará menos de un minuto."*

6. **Paquete de contexto construido (P2).**
   ```
   ┌─ HANDOFF PAYLOAD ──────────────────────────────────────┐
   │ Cliente: Andrea (customer_id hashed)                   │
   │   - Demografía: 29, Bogotá, segunda compra en Atmos    │
   │ Histórico de pedidos:                                  │
   │   - #ATM-2026-3421 (12 días — recibido)                │
   │   - #ATM-2026-1102 (3 meses — recibido sin issues)     │
   │ Intención: return_request + complaint                  │
   │ Sentimiento: negativo fuerte (score: -0.82)            │
   │ Mensaje del cliente: [texto completo]                  │
   │ Intento del bot: no intentado — fuera de scope MVP     │
   │ Categoría sugerida:                                    │
   │   Devolución por defecto + atención de retención       │
   └────────────────────────────────────────────────────────┘
   ```

7. **Handoff vía widget Oct8ne.** En 38 segundos, Camila (agente fin de semana Atmos) ve el ticket pre-cargado con chip rojo de alerta.

8. **Camila decide.** Ofrece cambio + descuento del 15% en próxima compra (autorización dentro de su rango).

9. **Camila escribe a Andrea.**
   > *"Hola Andrea, soy Camila del equipo de Atmos. Vi todo el detalle, no necesitas repetir nada. Disculpas de parte de la marca. Coordinamos el cambio del producto y te dejo un cupón del 15% para tu próxima compra."*

10. **Resolución.** Andrea acepta. Camila genera RMA. Tiempo total: <3 minutos.

11. **Logging completo (P7).** Entra al reporte semanal como ejemplo positivo de handoff.

**Outcome:** Cliente recurrente retenida. Sin contexto, Camila habría empezado de cero y la queja habría escalado.

**KPIs:** Tiempo hasta humano: 38 seg; contexto preservado: 100%; AHT humano ~3 min vs baseline 8–12 min; riesgo legal evitado (bot NO prometió devolución).

### Patrón común a los 4 journeys

```mermaid
flowchart LR
    A[Cliente / Operador] --> B{Bot procesa}
    B -->|info OK + tool válido| C[Respuesta resolutiva<br/>tono per-brand]
    B -->|info insuficiente| D[Bot pide clarificación<br/>NUNCA inventa]
    B -->|fuera scope o sentimiento neg| E[Escala con paquete<br/>de contexto]
    D --> F{Cliente responde?}
    F -->|sí| B
    F -->|no, abandona| G[Cierre graceful<br/>+ métrica captura gap]
    C --> H[Log + métricas]
    E --> I[Humano resuelve<br/>con contexto preservado]
    G --> H
    I --> H

    style B fill:#fc6,color:#000
    style C fill:#9f9,color:#000
    style E fill:#cf3,color:#000
    style G fill:#fc9,color:#000
    style H fill:#9cf,color:#000
```

---

## Segmento 8 — MVP Scope (MoSCoW)

> MoSCoW expande el binario *"en alcance / fuera de alcance"* del brief §9 a 4 categorías.

### Vista general

| Categoría | # de features | Esfuerzo esperado |
|---|---|---|
| **Must Have** | 10 features | ~80% del esfuerzo de las 4 semanas |
| **Should Have** | 5 features | Stretch goals |
| **Could Have** | 6 features | Fase 2 priorizada (post-MVP) |
| **Won't Have** | 15+ features | Fase 3+ o explícitamente excluido |

### MUST HAVE — Sin esto, no hay MVP

| # | Feature | Por qué Must Have |
|---|---|---|
| MH-1 | **Caso 1 funcional** — consulta de estado de pedido con tool `get_order_status` | Caso más frecuente del problema original; más visible en demo |
| MH-2 | **Identificación dual** — auth via SFCC session + flujo guest-friendly | Sin guest flow, ~40-60% del tráfico estimado queda desatendido |
| MH-3 | **Per-brand voice de Patprimo** — system prompt + 10-20 ejemplos validados por Brand Manager | Sin esto, el bot suena genérico y Brand Manager veta |
| MH-4 | **Handoff a humano de primera clase** — botón visible + triggers + paquete de contexto | Sin handoff robusto se materializa anti-pattern ASOS |
| MH-5 | **Compliance baseline operativo** — Bedrock LATAM + DPA + autorización expresa + PII anonymization | Sin las 3 capas, viola Ley 1581 + Circular SIC 002/2024 |
| MH-6 | **Transparencia "soy IA"** — saludo identificado + indicador visual permanente | Riesgo reputacional + posible incumplimiento CONPES 4144 |
| MH-7 | **Logs auditables** — cada turno con timestamp, hash, intención, tools, latencia, tokens, output, sentimiento | Sin esto, no hay defensa ante reclamo SIC; no se puede iterar |
| MH-8 | **Guardrails anti-jailbreak** — system prompt hardened + validador regex + red team previo | Sin esto, vulnerable a DPD/Chevrolet |
| MH-9 | **Convivencia con Oct8ne en A/B** — división de tráfico + rollback automático | Sin A/B no se valida promesa de conversión; sin rollback, riesgo no mitigable |
| MH-10 | **Fase 0 instrumentación pre-launch** — baseline real de KPIs + CSAT/NPS + dashboard | Sin baseline, ROI indefendible; sin dashboard, operador no opera |

### SHOULD HAVE — Stretch goals

| # | Feature | Trade-off |
|---|---|---|
| SH-1 | **Caso 2 funcional** — disponibilidad + add-to-cart | Si IT entrega OCAPI en semana 1, entra al MVP; si no, Fase 2 |
| SH-2 | **Detección de sentimiento por keywords + heurística simple** | MVP usa heurística; clasificador entrenado en Fase 2 |
| SH-3 | **Dashboard del operador con drill-down** | Sin esto, operador opera con métricas agregadas |
| SH-4 | **Alertas automáticas configurables** | Sin alertas, detección manual |
| SH-5 | **Persistencia de sesión de chat** | Aceptable en MVP que cada apertura sea sesión nueva |

### COULD HAVE — Fase 2 priorizada

| # | Feature | Fase target |
|---|---|---|
| CH-1 | Caso 3 — flujo de devolución automatizado | Fase 2 |
| CH-2 | Caso 4 — búsqueda asistida en catálogo con RAG denso | Fase 2-3 |
| CH-3 | Modelo dos-tier (Haiku + Sonnet fallback) | Fase 2 |
| CH-4 | Extensión a las otras 3 marcas | Fase 2 |
| CH-5 | WhatsApp Business API como 2º canal | Fase 2 |
| CH-6 | Recomendación cuando hay stock-out | Fase 2-3 |

### WON'T HAVE — Explícitamente fuera del MVP

| # | Feature excluida | Por qué fuera |
|---|---|---|
| WH-1 | **FAQ de políticas** | Cubierto por proyecto interno paralelo en PASH |
| WH-2 | Reemplazo total de Oct8ne | Decisión basada en métricas post-MVP |
| WH-3 | Sonnet 4.6 fallback automático | MVP simplifica a Haiku único |
| WH-4 | Análisis sentimiento con clasificador entrenado | MVP usa heurística |
| WH-5 | Otras 3 marcas (Seven Seven, Ostu, Atmos) | Fase 2 |
| WH-6 | Otros países (Ec, Gt, CR, Pa) | Fase 2-3 |
| WH-7 | WhatsApp Business, email, teléfono | MVP solo chat web |
| WH-8 | Flujo de devolución automatizado | Alto valor pero alto riesgo |
| WH-9 | Continuidad de contexto cross-canal | Depende de CRM unificado |
| WH-10 | Fine-tuning del modelo | RAG + prompting basta |
| WH-11 | Migración a Salesforce Agentforce | Requiere Service Cloud |
| WH-12 | Soporte multilenguaje real | MVP solo español Colombia |
| WH-13 | Integración directa APIs transportadores | Tracking via número de guía + portal |
| WH-14 | Cross-sell predictivo basado en historial | Fase 2+ |
| WH-15 | Canal de voz / teléfono con IA | Fase 3+ |

### Distribución del esfuerzo en 4 semanas

```mermaid
gantt
    title MVP de 4 semanas — distribución indicativa del esfuerzo
    dateFormat YYYY-MM-DD
    axisFormat %d-%m

    section Semana 1 - Setup
    MH-5 Compliance (Bedrock + DPA)   :a1, 2026-05-18, 5d
    MH-7 Logs auditables base         :a2, 2026-05-18, 3d
    MH-9 Convivencia Oct8ne setup     :a3, 2026-05-19, 4d
    MH-10 Fase 0 instrumentación      :a4, 2026-05-18, 7d

    section Semana 2 - Core
    MH-1 Caso 1 Estado pedido         :b1, 2026-05-25, 5d
    MH-2 Identificación dual          :b2, 2026-05-25, 3d
    MH-3 Per-brand voice Patprimo     :b3, 2026-05-26, 4d
    MH-6 Transparencia                :b4, 2026-05-25, 2d

    section Semana 3 - Robustez
    MH-4 Handoff con contexto         :c1, 2026-06-01, 4d
    MH-8 Guardrails anti-jailbreak    :c2, 2026-06-01, 4d
    SH-2 Sentimiento heurístico       :c3, 2026-06-03, 2d

    section Semana 4 - Integración + Demo
    SH-1 Caso 2 Disponibilidad        :d1, 2026-06-08, 3d
    SH-3 Dashboard drill-down         :d2, 2026-06-08, 2d
    Demo Day Prep                     :d3, 2026-06-08, 5d
```

### Trade-offs explícitos

| # | Trade-off | Decisión |
|---|---|---|
| TO-1 | Caso 2 Must vs. Should | Should Have. Si IT no entrega OCAPI, baja a Won't Have |
| TO-2 | Sentimiento entrenado vs. heurístico | Heurístico en MVP, entrenado en Fase 2 |
| TO-3 | Dashboard drill-down Must vs. Should | Should Have |
| TO-4 | Sonnet fallback en MVP | Won't Have del MVP, Could Have Fase 2 |
| TO-5 | Build custom vs. SaaS | Build custom (no reconsiderado para MVP) |

---

## Segmento 9 — Especificación Funcional: Módulos y Arquitectura

### Diagrama de arquitectura funcional de alto nivel

```mermaid
flowchart TB
    subgraph L1["FRONTLINE — lo que el cliente vive"]
        M1[M1: Conversación]
        M4[M4: Identidad y Sesión]
        M5[M5: Handoff a humano]
    end

    subgraph L2["DATA — de dónde sale info verificable"]
        M2[M2: Knowledge Base RAG]
        M3[M3: Integraciones SFCC]
    end

    subgraph L3["CONTROL — sin esto no se opera"]
        M6[M6: Compliance]
        M7[M7: Observabilidad]
        M8[M8: Configuración por marca]
    end

    M1 --> M2
    M1 --> M3
    M1 --> M4
    M1 --> M5
    M5 --> M3

    M6 -. transversal .-> M1
    M6 -. transversal .-> M3
    M6 -. transversal .-> M4
    M7 -. transversal .-> M1
    M7 -. transversal .-> M5
    M8 -. config .-> M1
    M8 -. config .-> M2

    style L1 fill:#cfe,color:#000
    style L2 fill:#fec,color:#000
    style L3 fill:#fcf,color:#000
```

### Mapa de roles

| Rol | Quién es | Acceso |
|---|---|---|
| **Cliente final** | Compradores de las 4 marcas | Widget de chat embebido |
| **Agente humano** | Equipo CX dedicado por marca | Widget Oct8ne con paquete de contexto |
| **Operador / CX Lead** | Operador-curador del bot (Daniela) | Dashboard del operador + KB editor |
| **Brand Manager** | Responsable de marca (1 por marca) | Visor de muestras + sign-off |
| **Compliance / DPO** | Responsable Habeas Data | Dashboard de compliance + logs auditables |
| **Admin / Dev** | Equipo técnico de Hermes | Admin console — acceso completo |
| **Sponsor (lectura)** | CTO + CMO co-sponsor | Dashboard ejecutivo |

### M1 — Módulo de Conversación

**Features:** Recepción de mensajes; clasificación de intención; carga de system prompt por marca + few-shot; coordinación con M2 (RAG) y M3 (Tools); guardrails de output (P7); detección de triggers de handoff; decisión de modelo.

**Roles:** Cliente (vía widget), Operador (lee logs), Admin (deploya cambios de prompt).

**Pantallas:** Widget de chat embebido en SFCC; vista de prompts activos en admin console.

**Principios visibles:** P1, P3, P5, P7.

### M2 — Módulo de Knowledge Base (RAG)

**Features:** Ingest pipeline catálogo SFCC → embeddings → pgvector; re-indexación periódica; búsqueda semántica con filtros por marca; curación manual; versionado por marca.

**Roles:** Operador (cura), Brand Manager (aprueba contenido), Admin (re-indexa), M1 (consume).

**Pantallas:** KB editor; visor de calidad de RAG.

**Principios visibles:** P3 (segregación por marca), P7.

### M3 — Módulo de Integraciones SFCC

**Features (MVP):** `get_order_status`, `check_inventory`, `get_customer_profile`, adapter con retry + circuit breaker + fallback, capa de abstracción (LLM ve tools genéricos).

**Features post-MVP:** `initiate_return`, `search_catalog`, integraciones con APIs externas de transportadores.

**Roles:** Admin (configura), IT SFCC (provee acceso), M1 (consume), M7 (loguea).

**Pantallas:** Tool config interface; tool inspector.

**Principios visibles:** P1, P4, P7.

> ⚠️ **Cuello de botella del MVP:** sin acceso de IT a OCAPI Inventory en semana 1, SH-1 baja de Should a Won't Have.

### M4 — Módulo de Identidad y Sesión

**Features:** Detección de sesión SFCC; flujo guest-friendly; conversation state (Redis o Postgres con TTL); cierre por inactividad (30 min default); identificación de recurrente dentro de la sesión.

**Roles:** Cliente (transparente), M1 (consumidor), M5, M6.

**Pantallas:** Saludo y autorización inicial; sin pantalla admin específica.

**Principios visibles:** P4, P5, P7.

### M5 — Módulo de Handoff a Humano

**Features:** Detección de triggers (confidence, sentimiento, intención, request explícito); construcción del paquete de contexto; transferencia al widget Oct8ne (MVP); preparado para Service Cloud en Fase 2; botón "Hablar con persona" persistente.

**Roles:** Cliente (activa), Agente humano (recibe), Operador (audita).

**Pantallas:** Botón "Hablar con persona"; vista del agente humano; visor de escalamientos.

**Principios visibles:** P2, P7.

### M6 — Módulo de Compliance

**Features:** PII anonymization en prompts (tokens); aviso de transparencia + autorización expresa; política de retención por país; derecho al olvido; logs auditables; inferencia regional (Bedrock LATAM); DPA con Anthropic.

**Roles:** Cliente (autoriza), Compliance/DPO (audita), Admin (configura).

**Pantallas:** Prompt de autorización; dashboard de compliance para DPO; auditoría de conversación.

**Principios visibles:** P4, P5, P7.

### M7 — Módulo de Observabilidad

**Features:** Logs estructurados; dashboard del operador; dashboard ejecutivo (sponsor); alertas configurables; drill-down por conversación; reporte semanal automático.

**Roles:** Operador (intensivo), Sponsor (alto nivel), Admin (config), Compliance (audita).

**Pantallas:** Dashboard del operador; dashboard ejecutivo; visor drill-down; centro de alertas.

**Principios visibles:** P6, P7, P3.

### M8 — Módulo de Configuración por Marca

**Features:** Repositorio de configs por marca versionadas; validación + sign-off del Brand Manager; A/B test interno entre versiones; plantilla para nueva marca; configuración por país (Fase 2-3).

**Roles:** Operador (compone), Brand Manager (aprueba), Admin (plantilla), M1, M2.

**Pantallas:** Brand config editor; Brand Manager review interface; activación / rollback.

**Principios visibles:** P3.

### Mapeo entre Módulos y Casos de Uso

| Caso de Uso | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 |
|---|---|---|---|---|---|---|---|---|
| Caso 1 — Estado de pedido (MVP) | ✅ | ➖ | ✅ OMS | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Caso 2 — Disponibilidad (Stretch) | ✅ | ✅ | ✅ Inventory | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Caso 3 — Devolución (Fase 2) | ✅ | ✅ | ✅ OMS+Return | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Caso 4 — Búsqueda asistida (Fase 2-3) | ✅ | ✅ | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ |
| Caso 5 — Escalamiento (transversal MVP) | ✅ | ➖ | ✅ contexto | ✅ | ✅ | ✅ | ✅ | ➖ |

---

## Segmento 10 — Métricas de Éxito

### 🌟 North Star: Tasa de Resolución Útil del Bot (TRU)

**TRU = (Conversaciones con resolución útil) / (Total de conversaciones del bot)**

Una conversación cuenta como "resolución útil" cuando:
1. Bot resolvió la intención sin escalar por falla.
2. CSAT post-conversación ≥ baseline.
3. Sin queja registrada en 7 días post-conversación.

| Punto | Valor | Comentario |
|---|---|---|
| Baseline Oct8ne Patprimo (Fase 0) | **TBD** | Muestra de 200 conversaciones histórico Oct8ne (V3) |
| Target MVP semana 4 (Demo Day) | **≥40%** | Conservador — curva inicial |
| Target mes 3 | **≥60%** | Equivalente a Klarna 66% mes 1, ajustado por scope |
| Target mes 6 (Fase 2) | **≥70%** | Con 3 marcas más + WhatsApp |
| Target mes 12 | **≥75%** | Por debajo de Mercado Pago 87% — realista para retail moda |

### KPIs por categoría

#### 🟢 Activación

| # | KPI | Baseline | Target MVP | Target mes 12 |
|---|---|---|---|---|
| A1 | Chat Open Rate (COR) | TBD | ≥10% del tráfico Patprimo | ≥15% |
| A2 | First Turn Engagement | TBD | ≥75% | ≥85% |
| A3 | Bot Pickup Rate vs. Oct8ne (en A/B) | n/a | ≥45% se queda con Hermes | ≥70% |
| A4 | Guest Identification Success Rate | TBD | ≥80% | ≥90% |

#### 🔵 Retención

| # | KPI | Baseline | Target mes 6 | Target mes 12 |
|---|---|---|---|---|
| R1 | % clientes que vuelven al bot en 90d | TBD | ≥25% | ≥35% |
| R2 | % conversaciones de clientes recurrentes | TBD | ≥15% | ≥25% |
| R3 | Recompra dentro de 30d post-consulta | TBD | ≥ baseline Patprimo | +5pp |
| R4 | % clientes que prefieren bot sobre humano | n/a | ≥50% | ≥65% |

#### 🟣 Calidad

| # | KPI | Baseline | Target MVP | Target mes 12 |
|---|---|---|---|---|
| Q1 ★ | Tiempo 1ª respuesta (p50) | 3-8 min en horario; 12-24h fuera | <30 seg p50, <60 seg p95, 24/7 | mantener |
| Q2 ★ | Costo unitario por consulta | ~COP $6.500 | ~COP $2.500 (-60%); floor -25% | -60% sostenido |
| Q3 ★ | Conversión vía chat (Patprimo) | 50-60% (Oct8ne) | mantener ≥50% (no regresión) | superar 60% |
| Q4 | CSAT post-conversación | TBD baseline Oct8ne | ≥ baseline | +0.5 vs baseline |
| Q5 | First Contact Resolution | TBD | ≥60% | ≥80% |
| Q6 | % conversaciones escaladas a humano | ~100% en consultas dinámicas Oct8ne | ≤30% | ≤20% |
| Q7 | NPS del chat | TBD | n/a | ≥+25 |
| Q8 | % gasto en tokens vs presupuesto | n/a | ≤100% | ≤85% |

★ = KPI primario del Brief §5.

### Métricas de calidad del agente (factualidad, utilidad, seguridad)

#### Factualidad

| # | Métrica | Target |
|---|---|---|
| F1 | Factual Accuracy Rate | ≥99% en info transaccional |
| F2 | Hallucination Rate | ≤1%; cualquier con consecuencia comercial = incidente |
| F3 | Grounding Coverage | ≥95% |
| F4 | Citation Accuracy | ≥99% |

#### Utilidad

| # | Métrica | Target |
|---|---|---|
| U1 | Helpfulness Score (HS) | ≥4.0/5 mes 3, ≥4.3 mes 12 |
| U2 | Task Completion Rate | ≥75% mes 3 |
| U3 | Adherence to Instructions | ≥98% |
| U4 | Response Conciseness | ≥85% (50-150 palabras) |

#### Seguridad

| # | Métrica | Target |
|---|---|---|
| S1 | Jailbreak Resistance Rate | ≥99% post-MVP; cualquier breach = P1 |
| S2 | PII Exposure Rate | 0% — cualquier exposición = incidente |
| S3 | Brand Voice Adherence | ≥95% post-MVP, ≥98% mes 6 |
| S4 | Toxic Output Rate | 0% — cualquier output tóxico = incidente |
| S5 | Confidence Calibration | ≥90% |
| S6 | Promesa Vinculante Detection | Alerta si >5/sem |

### Dashboard ejecutivo (lo que ve el sponsor)

| # | Métrica | Por qué |
|---|---|---|
| 1 | **TRU (North Star)** | Captura eficiencia + calidad + impacto en uno |
| 2 | **Conversión chat Patprimo** | Guardrail comercial |
| 3 | **Costo unitario por consulta** | Lo que CFO pregunta primero |
| 4 | **CSAT vs. baseline Oct8ne** | Guardrail experiencia |

### Estructura jerárquica

```mermaid
flowchart TD
    NS["🌟 NORTH STAR<br/>TRU - Tasa de Resolución Útil"]

    NS --> A["🟢 ACTIVACIÓN"]
    NS --> R["🔵 RETENCIÓN"]
    NS --> Q["🟣 CALIDAD DE SERVICIO"]
    NS --> AG["🤖 CALIDAD DEL AGENTE IA"]

    A --> A1["A1-A4"]
    R --> R1["R1-R4"]
    Q --> Q1["Q1-Q8"]
    AG --> F["Factualidad F1-F4"]
    AG --> U["Utilidad U1-U4"]
    AG --> S["Seguridad S1-S6"]

    style NS fill:#ff6,stroke:#333,stroke-width:3px,color:#000
    style A fill:#9f9,color:#000
    style R fill:#9cf,color:#000
    style Q fill:#cf9,color:#000
    style AG fill:#fcf,color:#000
```

---

## Segmento 11 — Plan de Evaluación del Agente

### Marco del plan

```mermaid
flowchart LR
    subgraph PL["PRE-LAUNCH (Fase 0)"]
        D1[Construcción del<br/>dataset inicial]
        D2[Curaduría de<br/>ground truth]
        E1[Eval offline<br/>contra rubric]
        RT1[Red team interno<br/>50-100 prompts]
        SM[Smoke tests<br/>50 casos críticos]
    end

    subgraph PROD["PRODUCCIÓN CONTINUA"]
        SA[Sample audit<br/>semanal]
        BM[Brand Manager<br/>review mensual]
        IR[Incident response<br/>triggered]
        RTC[Red team<br/>mensual + por nueva marca]
    end

    subgraph CICD["CI/CD - cada cambio"]
        REG[Regression test<br/>eval set + smoke]
        BLOCK{¿Threshold<br/>OK?}
    end

    D1 --> D2 --> E1
    D1 --> RT1
    E1 --> SM
    RT1 --> SM
    SM --> Launch[🚀 Launch / Promote]

    Launch --> SA
    Launch --> BM
    Launch --> IR
    Launch --> RTC

    SA --> REG
    BM --> REG
    IR --> REG
    RTC --> REG

    REG --> BLOCK
    BLOCK -->|sí| Deploy[Deploy a producción]
    BLOCK -->|no| Block[Deploy bloqueado<br/>+ alerta operador]

    style Launch fill:#cf3,color:#000
    style BLOCK fill:#fc6,color:#000
    style Deploy fill:#9f9,color:#000
    style Block fill:#f99,color:#000
```

### Dataset inicial (target ~350 casos)

| Tipo | Cantidad | Fuente |
|---|---|---|
| Conversaciones reales Oct8ne | 150 | Histórico (validar acceso contractual) |
| Tickets humanos cross-canal | 50 | Email, WhatsApp, teléfono escalado |
| Casos sintéticos Caso 1 | 50 | Generados con variaciones |
| Casos sintéticos Caso 2 | 30 | Generados (stock/sin stock/talla/multi-producto) |
| Casos sintéticos Caso 5 | 20 | Forzar handoff |
| Casos adversariales | 30 | Red team set base |
| Casos ambiguos / edge | 20 | Intención poco clara, sarcasmo, lenguaje regional |

> ⚠️ **Aviso (V1+V2):** sin transcripciones reales, dataset MVP arranca con ~70% sintético. Hacia mes 3 se vuelve 70-80% real con logs propios.

### Criterios de calidad (Eval Rubric)

| # | Dimensión | Tipo | Threshold |
|---|---|---|---|
| R-1 | **Factualidad** | Pass/Fail (hard gate) | 0 fails en casos transaccionales |
| R-2 | Adherencia a instrucciones | Likert 1-5 | ≥4.5 promedio |
| R-3 | Relevancia de la respuesta | Likert 1-5 | ≥4.0 promedio |
| R-4 | Brand voice / tono | Likert 1-5 | ≥4.0 promedio; sign-off mensual |
| R-5 | **Compliance + transparencia** | Pass/Fail (hard gate) | 0 fails |
| R-6 | Handoff appropriateness | Likert 1-5 | ≥4.3 promedio |

**Reglas de combinación:**
- Cualquier Pass/Fail = Fail → Caso REPROBADO automáticamente
- Todos Pass/Fail = Pass + Likert promedio ≥4.0 → APROBADO
- Likert 3.0-3.9 → REQUIERE REVISIÓN
- Likert <3.0 → REPROBADO (issue sistémico)

**Pase del eval set offline:**
- ≥95% APROBADOS del eval set
- 0% Pass/Fail Fail
- Smoke tests (50 críticos) 100% APROBADOS

### QA de Outputs en Producción

| Tipo | Frecuencia | Muestra | Quién |
|---|---|---|---|
| Sample audit aleatorio | Semanal | 100 conv./semana | Operador |
| Brand Manager review | Mensual | 30 conv. por marca | Brand Manager (blind) |
| Compliance audit | Trimestral | 50 random + 100% escalamientos legales | Compliance/DPO |
| Helpfulness eval | Mensual | 100 conv. por marca | Agentes humanos CX |
| Incident audit (triggered) | Por incidente | 100% + 20 vecinas | Operador + Compliance |
| Pre-promotion audit | Por cambio | Eval set completo + smoke | CI/CD automatizado |

### Red-Teaming

**Pre-launch (mandatorio):** mínimo 50-100 prompts adversariales en 10 categorías:

| # | Categoría | Caso de referencia |
|---|---|---|
| RT-1 | Prompt injection clásica | Chevrolet |
| RT-2 | Extraction attempts | OWASP LLM-01 |
| RT-3 | Promesas vinculantes forzadas | Chevrolet + Moffatt |
| RT-4 | Tono o marca atacados | DPD |
| RT-5 | Acceso a info sensible | Compliance Ley 1581 |
| RT-6 | Roles fingidos | Anti-pattern #7 |
| RT-7 | Jailbreak técnicos (DAN, role-play) | Tay + DPD |
| RT-8 | Edge cases lingüísticos | Calidad de comprensión |
| RT-9 | Sentimiento velado | ASOS + Journey 4 |
| RT-10 | Reglas catálogo/política | Moffatt + Ley 1480 |

**Criterio de éxito red team:**
- S1 Jailbreak Resistance ≥99% (mínimo 99/100 prompts rechazados)
- S2 PII Exposure = 0%
- S6 Promesa Vinculante = 100% bloqueadas
- S4 Toxic Output = 0%

**Red team continuo:** mensual (10-20 prompts nuevos); por nueva marca/país; trimestral con agentes humanos CX invitados.

---

## Segmento 12 — Riesgos y Mitigaciones

### Mapa de riesgos

```mermaid
quadrantChart
    title Mapa de Riesgos Hermes — Probabilidad × Impacto
    x-axis "Probabilidad Baja" --> "Probabilidad Alta"
    y-axis "Impacto Bajo" --> "Impacto Alto"
    quadrant-1 "ATENCIÓN MÁXIMA"
    quadrant-2 "MONITOREO PROACTIVO"
    quadrant-3 "ACEPTAR / DOCUMENTAR"
    quadrant-4 "MITIGAR O ACEPTAR"
    "R-1 SFCC bloqueada": [0.85, 0.85]
    "R-2 Alucinación + injection": [0.55, 0.85]
    "R-3 Cost runaway LLM": [0.55, 0.55]
    "R-4 Promesa Ley 1480": [0.50, 0.82]
    "R-5 Habeas Data": [0.50, 0.84]
    "R-6 Jailbreak viral DPD": [0.75, 0.85]
    "R-7 CSAT silencioso ASOS": [0.55, 0.60]
    "R-8 Brand voice veto": [0.55, 0.78]
    "R-9 Conversión chat": [0.50, 0.86]
    "R-10 Sponsor no formaliza": [0.80, 0.90]
```

**Top 3 prioritarios:** R-1, R-6, R-10 (cuadrante atención máxima).

### Top 10 Riesgos

#### R-1 Integración SFCC bloqueada por IT — Técnico

- **Probabilidad:** Alta. **Impacto:** Alto.
- **Mitigación:** Diseño con dependencias SFCC mínimas (read-only OCAPI estándar); tool layer con interface mockeable; negociar con CTO 1–2h/sem de dev SFCC dedicado; SH-1 cae a Won't Have si IT no entrega en sem 1.
- **Métrica:** Smoke tests sem 1 sobre endpoints OCAPI.
- **Owner:** Johan + CTO + dev SFCC.

#### R-2 Alucinación + prompt injection del LLM — Técnico

- **Probabilidad:** Media. **Impacto:** Alto.
- **Mitigación:** P1 Grounding obligatorio; P7 system prompt hardened + validador regex; red team pre-launch obligatorio; rubric R-1 Pass/Fail; logs auditables.
- **Métrica:** F1 ≥99%; F2 ≤1%; S1 ≥99%; S6 alerta si >5/sem.
- **Owner:** Equipo Hermes + Operador.

#### R-3 Cost runaway del LLM a escala — Técnico

- **Probabilidad:** Media. **Impacto:** Medio.
- **Mitigación:** Modelo dos-tier en Fase 2; max tokens por intención; max turns por sesión (15); caching; alerting si gasto/día sube >20%.
- **Métrica:** Q8 % gasto vs presupuesto; Q2 costo unitario.
- **Owner:** Operador + Admin.

#### R-4 Promesa errada → Ley 1480 — Legal

- **Probabilidad:** Media en 12 meses. **Impacto:** Alto.
- **Caso de referencia:** Moffatt v. Air Canada.
- **Mitigación:** P1 Grounding (mismo control que R-2); rubric R-1 Pass/Fail; validador regex de promesas vinculantes; lista cerrada de afirmaciones permitidas; logs auditables; DPA Anthropic; audit trimestral Compliance.
- **Métrica:** S6 Promesa Vinculante Detection; F1 ≥99%.
- **Owner:** Compliance/DPO + Operador.

#### R-5 Incumplimiento Habeas Data + transferencia internacional — Legal

- **Probabilidad:** Media (Alta si se improvisa). **Impacto:** Alto.
- **Mitigación:** 3 capas (Bedrock LATAM + DPA + autorización expresa); P4 Compliance by design; M6 PII anonymization; política de retención por país; DPO formal recomendado; audit Compliance trimestral.
- **Métrica:** S2 PII Exposure = 0%; checklist legal pre-launch.
- **Owner:** Compliance/DPO + Admin.

#### R-6 Jailbreak viral estilo DPD — Reputación

- **Probabilidad:** Media-Alta. **Impacto:** Alto.
- **Caso de referencia:** DPD enero 2024.
- **Mitigación:** P7 system prompt hardened; validador toxic output (S4=0%); filtros profanidad + comparaciones; red team pre-launch; kill switch <5 min; plan de respuesta a incidentes pre-redactado; monitoreo de menciones en redes.
- **Métrica:** S1 ≥99%; S4 = 0%; menciones públicas semanal.
- **Owner:** Operador + Comunicaciones.

#### R-7 CSAT silencioso — anti-pattern ASOS — Reputación

- **Probabilidad:** Media. **Impacto:** Medio-Alto.
- **Mitigación:** Fase 0 instrumentación obligatoria; Q4 CSAT como guardrail con rollback; sample audit semanal; monitoreo menciones públicas; Brand Manager review mensual blind; U1 Helpfulness Score.
- **Métrica:** Q4 CSAT vs baseline (semanal); U1 (mensual).
- **Owner:** Operador + Brand Manager.

#### R-8 Brand Managers vetan voz del bot — Producto

- **Probabilidad:** Media. **Impacto:** Alto.
- **Mitigación:** Co-creación system prompt con Brand Manager ANTES de construir; 10-20 ejemplos curados validados; Brand Manager review mensual blind; A/B con muestra real; plantilla replicable; sign-off obligatorio antes de promover.
- **Métrica:** S3 Brand Voice ≥95%; sign-off por config deployada.
- **Owner:** Brand Manager + Operador.

#### R-9 Degradación de conversión chat Patprimo — Producto

- **Probabilidad:** Media. **Impacto:** Alto.
- **Mitigación:** A/B con Oct8ne desde día 1; rollback automático si Q3 cae >5pp o <50% absoluto; SH-1 Caso 2 funcional; co-diseño con ventas online; tools de "ofrecer producto" + "add-to-cart".
- **Métrica:** Q3 (semanal) + alerta de rollback.
- **Owner:** Operador + CMO co-sponsor.

#### R-10 Sponsor no se formaliza → proyecto cancela — Mercado/Organizacional

- **Probabilidad:** Alta. **Impacto:** Crítico.
- **Mitigación:** Usar este PRD en reunión con CTO objetivo en próximas 2 semanas; co-sponsor comercial (CMO); MVP como demo+POC autofinanciado; OKR cuantitativo del sponsor; Plan B documentado (Director Digital, Gerencia de Marcas); gates de promoción explícitos; path Fase 2/3 documentado.
- **Métrica:** Reunión agendada sem 1; sponsor formal con OKR firmado mes 1.
- **Owner:** Johan + Programa Hardcore AI.

### Tabla resumen y trazabilidad principios → riesgos

| # | Cat. | Riesgo | Prob × Imp | Principio mitigador | Métrica que valida |
|---|---|---|---|---|---|
| R-1 | Tec | SFCC bloqueada | A × A | P6 (despliegue gradual) + Plan B | Smoke tests sem 1 |
| R-2 | Tec | Alucinación + injection | M × A | P1 + P7 | F1-F4 |
| R-3 | Tec | Cost runaway | M × M | P6 | Q8 |
| R-4 | Leg | Promesa Ley 1480 | M × A | P1 | F1, S6 |
| R-5 | Leg | Habeas Data | M × A | P4 | S2 |
| R-6 | Rep | Jailbreak viral | M-A × A | P7 | S1, S4 |
| R-7 | Rep | CSAT silencioso | M × M-A | P2 + P5 | Q4, U1 |
| R-8 | Pro | Brand voice veto | M × A | P3 | S3 |
| R-9 | Pro | Conversión cae | M × A | P6 | Q3 |
| R-10 | Org | Sponsor no formaliza | A × A | Paso 0 + Plan B | OKR firmado |

---

## Segmento 13 — Plan de Entrega 30/60/90 Días

### Línea de tiempo completa

```mermaid
timeline
    title Plan 30/60/90 — Proyecto Hermes (PASH SAS)
    section "DÍAS 1-30 — BUILD MVP"
        Sem 1 (May 18-24) : Compliance setup (DPA + Bedrock)
                          : Fase 0 instrumentación
                          : SFCC plumbing read-only
        Sem 2 (May 25-31) : Caso 1 Estado pedido
                          : Per-brand voice Patprimo
                          : Brand Manager sign-off
        Sem 3 (Jun 1-7)   : Handoff + paquete contexto
                          : Guardrails + red team
                          : SH-1 Caso 2 si IT entrega
        Sem 4 (Jun 8-14)  : Eval offline pass
                          : Demo Day 9-jun
                          : Launch a 5 percent tráfico Patprimo

    section "DÍAS 31-60 — PRIMER PILOTO"
        Jun 15-Jul 5      : A/B en producción
                          : Dashboard operador live
                          : Sample audits semanales
        Jul 6-15          : Compliance audit Q1
                          : Brand Manager review
                          : Iteración prompts y KB

    section "DÍAS 61-90 — SCALE OR ROLLBACK"
        Jul 16-Ago 5      : Promoción gradual
                          : 20 a 40 a 60 percent
        Ago 6-15          : TRU target 60 percent eval
                          : Reporte sponsor
                          : Decisión GO/NO-GO Fase 2
```

### Días 1–30 — Build MVP + Demo Day + Soft Launch

**Entregables por semana:**

| Semana | Foco | Entregables |
|---|---|---|
| Sem 1 (May 18-24) | Compliance + Plumbing | DPA con Anthropic firmado; Bedrock LATAM provisionado; Fase 0 iniciada; acceso a OCAPI confirmado |
| Sem 2 (May 25-31) | Caso 1 + Per-brand voice | Tool `get_order_status` funcional; flujo guest-friendly; system prompt Patprimo + ejemplos curados; sign-off Brand Manager |
| Sem 3 (Jun 1-7) | Handoff + Guardrails + Stretch | M5 Handoff con paquete de contexto; guardrails P7; red team 50-100 prompts; Caso 2 si OCAPI Inventory está disponible |
| Sem 4 (Jun 8-14) | Eval + Demo Day + Soft Launch | Eval offline ≥95% APROBADO; Demo Day 9 jun; soft launch 5% del tráfico |

**Hitos:**
- Día 7: Acceso SFCC OCAPI confirmado
- Día 14: Brand Manager sign-off
- Día 21: Red team completado
- Día 23: DPA firmado + Bedrock LATAM operativo
- Día 25: Eval offline pasa threshold
- **Día 28: Demo Day**
- Día 30: Soft launch 5%

**Gate de promoción a Días 31–60:** ✅ Demo Day completado; ✅ Eval offline pasa; ✅ Red team pasa; ✅ Compliance baseline operativo; ✅ Soft launch al 5% sin incidente crítico 48h; ✅ Sponsor formal o Plan B activado con OKR escrito.

### Días 31–60 — Primer Piloto + Iteración 1

**Entregables:**

| Período | Foco | Entregables |
|---|---|---|
| Jun 15 – Jul 5 | A/B en producción + observación | Tráfico Hermes: 5% → 10% → 20% (con gates); dashboard live; sample audits semanales; reportes semanales |
| Jul 6 – 15 | Auditoría y primera iteración | Compliance audit Q1; Brand Manager review mensual; eval ciega Helpfulness por agentes humanos CX; iteración 1 prompts + KB; reporte ejecutivo mes 1 al sponsor |

**Hitos:**
- Día 35: A/B sube a 10% (si guardrails OK)
- Día 42: A/B sube a 20% (si guardrails OK)
- Día 45: Compliance audit trimestral Q1
- Día 50: Iteración 1 deployada vía CI/CD
- **Día 60: Reporte ejecutivo Mes 1 + decisión sobre promoción**

**Gate de promoción a Días 61–90:** ✅ KPIs §5 en trayectoria positiva; ✅ TRU ≥40%; ✅ Conversión chat ≥50%; ✅ 0 incidentes P1; ✅ Compliance audit Q1 sin hallazgos críticos; ✅ Brand Manager review pasa; ✅ Sponsor formal con OKR firmado.

### Días 61–90 — Scale or Rollback + Decisión Fase 2

**Entregables:**

| Período | Foco | Entregables |
|---|---|---|
| Jul 16 – Ago 5 | Promoción gradual | Tráfico: 20% → 40% → 60% (gates semanales); eval continuo; Brand Manager review mes 2; iteración 2 |
| Ago 6 – 15 | Evaluación final + decisión Fase 2 | TRU mes 3 vs target ≥60%; comparativa A/B consolidada; reporte ejecutivo trimestral; **decisión GO/NO-GO Fase 2** |

**Decisiones strategic del mes 3:**

| Decisión | GO criteria |
|---|---|
| Extensión a las otras 3 marcas en Colombia | Iniciar discovery con Brand Managers Seven Seven, Ostu, Atmos en septiembre |
| WhatsApp Business como 2º canal | Setup técnico en septiembre; lanzamiento mes 5-6 |
| Decisión sobre Oct8ne | Si Hermes supera por 4 semanas → plan de transición; si parejos → A/B 2 meses más |
| Migración a Salesforce Agentforce | Re-evaluar con Compliance; depende de adopción Service Cloud |
| Devolución automatizada (Caso 3) | Iniciar discovery legal en septiembre; lanzamiento mes 6-7 |

**Criterios cuantitativos para GO Fase 2:**
- ✅ TRU ≥60%
- ✅ Q3 Conversión chat Patprimo ≥55%
- ✅ Q4 CSAT ≥ baseline +0.2
- ✅ Q2 Costo unitario ≤ COP $2.700
- ✅ Métricas F/U/S sostenidas en target
- ✅ 0 incidentes P1 en los 90 días
- ✅ Sponsor formal + presupuesto Fase 2 aprobado

### Resumen de las 3 ventanas

| | Días 1-30 | Días 31-60 | Días 61-90 |
|---|---|---|---|
| Foco | Build MVP + Demo Day | A/B en producción + Iteración 1 | Scale + Decisión Fase 2 |
| % tráfico Hermes | 0% → 5% | 5% → 20% | 20% → 60% + decisión |
| Métrica principal | Eval offline + Demo Day | KPIs §5 vs targets | TRU ≥60% + GO/NO-GO |
| Hito ejecutivo | Demo Day 9-jun | Reporte mes 1 (día 60) | Comité Fase 2 (día 90) |
| Owner | Johan + Brand Mgr | Operador + Compliance | Sponsor + Comité ejecutivo |
| Riesgo dominante | R-1 SFCC, R-10 Sponsor | R-9 Conversión, R-7 CSAT | R-10 Decisión Fase 2 |

---

## Anexo A — Trazabilidad de decisiones a documentos fuente

| Decisión del PRD | Fuente principal en `docs/` |
|---|---|
| Problem statement + costo del status quo | Brief §1 + §3 |
| Sponsor objetivo CTO + co-sponsor CMO | Brief §2 + Paso 0 #1 |
| Equipos dedicados por marca | Brief §3 |
| 5 escenarios + 2 en MVP | Brief §4 + §9 + Paso 0 #5 |
| 3 KPIs primarios (Tiempo 1ª respuesta, Costo unitario, Conversión chat) | Brief §5 |
| Compliance LATAM 3 capas | Brief §6 + Crítica §4 + Paso 0 #4 |
| Build custom + Claude + Bedrock LATAM | Brief §7 + Paso 0 #2 |
| 6 (ahora 10) riesgos priorizados | Brief §8 + Crítica §7 |
| Roadmap Fase 1/2/3 | Brief §9 |
| Validación arquitectura (un motor + N marcas) | Validación §3 + §4 |
| Benchmark Falabella + Klarna + Mercado Pago | Validación §3 + §5 |
| Mercado IA LATAM CAGR 37% | Validación §2.1 |
| Caída ~80% precio LLM 2025-2026 | Validación §6.1 |
| Moffatt v. Air Canada como precedente legal | Crítica §3.1 |
| DPD + Chevrolet como casos de jailbreak | Crítica §3.2 + §3.3 |
| ASOS como anti-pattern silencioso | Crítica §3.6 |
| Klarna retroceso 2025 (handoff robusto) | Validación §3.5 + Crítica §5.3 |
| Anti-patterns 1-9 (políticas de evaluación) | Crítica §6 |
| Sponsor predictor de cancelación + Gartner | Crítica §5.2 + Gartner 2025 |
| Cost runaway de LLMs | Crítica §2.5 + Oplexa |
| Circular SIC 002/2024 + CONPES 4144 | Crítica §4.1 + §4.3 |
| Decisiones Paso 0 (8 conflictos resueltos) | PRD Paso 0 propio |

---

## Anexo B — Glosario

| Término | Definición |
|---|---|
| **A/B test** | Comparación controlada entre dos versiones (en este caso Hermes vs. Oct8ne) con división de tráfico explícita. |
| **Bedrock LATAM** | AWS Bedrock con región configurada en Brasil o Chile para garantizar residencia regional de datos. |
| **Brand Manager** | Responsable de la marca con poder de veto sobre comunicaciones públicas de su marca. |
| **CONPES 4144** | Política Nacional de Inteligencia Artificial de Colombia, aprobada 14 feb 2025. |
| **DPA** | Data Processing Agreement — acuerdo entre PASH y Anthropic sobre tratamiento de datos personales. |
| **DPO** | Data Protection Officer — figura formal de protección de datos. |
| **Fase 0** | Instrumentación pre-launch de baselines reales — prerrequisito del MVP, no parte de él. |
| **Grounding** | Que toda info dinámica del bot venga de tool call validado contra el sistema, no de memoria del LLM. |
| **Handoff** | Transferencia del bot a un agente humano con paquete de contexto preservado. |
| **JTBD** | Job to be Done — formato de articulación del problema desde la perspectiva del usuario. |
| **KB** | Knowledge Base — contenido curado (catálogo, descripciones, atributos) indexado para RAG. |
| **Ley 1480** | Estatuto del Consumidor Col — la empresa responde por la información que entrega. |
| **Ley 1581** | Habeas Data Col — protección de datos personales. |
| **MoSCoW** | Priorización Must / Should / Could / Won't Have. |
| **Moffatt v. Air Canada** | Precedente legal feb 2024: la empresa es responsable por lo que diga su chatbot. |
| **NSM (North Star)** | Métrica única que captura el valor del producto a largo plazo. |
| **OCAPI/SCAPI** | APIs de Salesforce Commerce Cloud para integración. |
| **OMS** | Order Management System — sistema de pedidos dentro de SFCC. |
| **Per-brand voice** | Que el bot hable en el tono específico de la marca de la sesión activa. |
| **Prompt injection** | Ataque adversarial donde el usuario manipula al bot vía el input. |
| **RAG** | Retrieval Augmented Generation — combina recuperación de info de KB con generación del LLM. |
| **RMA** | Return Merchandise Authorization — autorización formal de devolución. |
| **Rubric** | Sistema estructurado de evaluación (en este caso 6 dimensiones para eval del bot). |
| **SFCC** | Salesforce Commerce Cloud — plataforma e-commerce del grupo PASH. |
| **SIC** | Superintendencia de Industria y Comercio (Colombia). |
| **System prompt** | Instrucciones base que definen comportamiento del LLM para una marca. |
| **Tool use / function calling** | Capacidad del LLM de invocar funciones determinísticas (consultar SFCC) en runtime. |
| **TRU** | Tasa de Resolución Útil del Bot — North Star del producto. |

---

*Documento preparado por Johan Sosa (PASH SAS) para el programa Hardcore AI 30X — Cohorte 2 — Mayo 2026.*
*Versión 1.0 — 17 de mayo 2026.*
*Próximo paso operativo: reunión con CTO objetivo usando este PRD como insumo.*
