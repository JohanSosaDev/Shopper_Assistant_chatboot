# Personas — Hermes

**Format**: Operacional minimalista (Q5 = B) — rol, acceso, responsabilidades, dolor que Hermes resuelve, métrica de éxito.
**Fuente**: PRD §9 (Mapa de roles) + PRD §7 (arquetipos Mariana, Daniela, Camila).
**Total**: 7 personas, todas en alcance para esta iteración MUST HAVE.

---

## P1 — Cliente final (Mariana, arquetipo Patprimo Col)

- **Rol**: Shopper del e-commerce de las 4 marcas PASH. Arquetipo MVP = Mariana, 34, Bogotá, Patprimo.
- **Acceso**: Widget de chat embebido en SFCC. Puede estar logueada (sesión SFCC) o ser guest.
- **Responsabilidades**: Iniciar la consulta; aceptar/rechazar la autorización de procesamiento de datos; aportar información mínima (# pedido, correo).
- **Dolor que Hermes resuelve**: Hoy no hay respuesta entre las 8 PM–8 AM ni fines de semana. Para consultas de estado de pedido o disponibilidad, debe esperar al día siguiente o llamar.
- **Métrica de éxito**: 1ª respuesta <30 seg; resolución sin escalar para consultas en scope; CSAT post-conversación ≥4.0/5.

---

## P2 — Agente humano (Camila, arquetipo Atmos fin de semana)

- **Rol**: Agente de servicio al cliente de marca; equipo dedicado por marca (PRD §3). Arquetipo = Camila, Atmos, sábado.
- **Acceso**: Notificación email/teléfono con paquete de contexto Hermes pre-cargado (MVP stub). Widget operador integrado (WhatsApp Business o Salesforce Service Cloud) planificado para Fase 2.
- **Responsabilidades**: Recibir escalamientos del bot; resolver casos L2/L3 (devolución, queja, retención); validar autorizaciones discrecionales (cupones, cambios).
- **Dolor que Hermes resuelve**: Hoy recibe escalamientos sin contexto y el cliente debe repetir todo, generando frustración y AHT alto. Con Hermes, recibe ticket pre-cargado con conversación previa, identidad, histórico de pedidos, sentimiento y categorización sugerida.
- **Métrica de éxito**: AHT humano <3 min (vs. baseline 8–12 min); contexto preservado 100%; satisfacción del propio agente ≥4/5 en encuesta interna mensual.

---

## P3 — Operador / CX Lead (Daniela, Patprimo)

- **Rol**: Operadora-curadora del bot. Arquetipo = Daniela, 31 años, 5 años en PASH.
- **Acceso**: Dashboard del operador (KPIs, drill-down, alertas) + KB editor + admin sobre prompts y configuraciones operativas (no infra).
- **Responsabilidades**: Monitorear salud del bot (KPIs, guardrails violations, conversión, CSAT); diagnosticar incidentes (ej. KB desactualizada); abrir tickets sistémicos; coordinar re-indexación; auditar muestras de conversaciones; preparar reportes semanales para sponsor y Brand Manager.
- **Dolor que Hermes resuelve**: Hoy no hay chat activo en Patprimo (Oct8ne solo se usa para batch outbound manual vía Excel — no atiende conversaciones en vivo); sin instrumentación de canal conversacional; sin instrumentación cross-marca; sin contexto agregado para detectar patrones (ej. nueva colección no indexada). Con Hermes obtiene visión consolidada y actionable.
- **Métrica de éxito**: Tiempo de detección de incidentes <30 min (lunes mañana); ≥1 acción correctiva por semana; reporte semanal entregado on-time.

---

## P4 — Brand Manager (Patprimo en MVP, las otras 3 marcas en Fase 2)

- **Rol**: Responsable de la marca; dueño de la voz, identidad y estándares de comunicación.
- **Acceso**: Visor de muestras de conversaciones + sign-off interface + Brand config editor (read-write para su marca).
- **Responsabilidades**: Validar el system prompt y los 10–20 ejemplos few-shot iniciales; aprobar cambios mayores a la voz; revisar muestra semanal de conversaciones; vetar si el bot suena off-brand.
- **Dolor que Hermes resuelve**: Hoy Patprimo no tiene chat activo (Oct8ne fue rule-based 2022-2023 pero hoy solo se usa para batch outbound manual). Las pocas interacciones tipo chat ocurren por atención humana directa con voz natural. La preocupación del Brand Manager con cualquier bot es que "suene genérico" — riesgo cubierto en PRD §12 Riesgo 5. Hermes le da control explícito sobre la voz y un sign-off auditable.
- **Métrica de éxito**: 0 vetos a respuestas representativas en el último mes; ≥90% de muestra semanal aprobada sin cambios; aprobación firmada del system prompt v1 antes de launch.

---

## P5 — Compliance / DPO (Habeas Data)

- **Rol**: Responsable de cumplimiento Ley 1581 + Estatuto del Consumidor + Circular SIC 002/2024 + DPA Anthropic. Hoy ya existe en PASH bajo `tiendashabeasdata@pash.com.co`.
- **Acceso**: Dashboard de compliance (consent log, retention status, derecho al olvido); logs auditables append-only; admin sobre policies de retención por país.
- **Responsabilidades**: Auditar conversaciones bajo solicitud; responder requerimientos SIC; gestionar solicitudes de eliminación de datos; validar que el flujo de autorización expresa esté operativo; firmar DPA con Anthropic y revisar anualmente.
- **Dolor que Hermes resuelve**: Hoy no hay logs unificados auditables para chat humano (formato inconsistente entre canales); riesgo de no poder responder a un requerimiento SIC en tiempo. Con Hermes tiene logs estructurados con timestamp, hash, intención, tools, output y consent — defendibles ante SIC.
- **Métrica de éxito**: 100% de respuestas a requerimientos SIC en plazo legal; 0 violaciones de retención por país; consent log con cobertura 100% pre-procesamiento de PII.

---

## P6 — Admin / Dev (equipo técnico Hermes)

- **Rol**: Equipo técnico que construye, opera y evoluciona Hermes.
- **Acceso**: Admin console (acceso completo: prompts, tools, infra, secrets via secrets manager, deploy pipelines, logs raw, eval suite).
- **Responsabilidades**: Implementar features; mantener uptime; iterar prompts y guardrails; correr eval suite del agente (PRD §11); coordinar releases; responder a incidentes operativos; ejecutar runbooks de kill switch (`HERMES_ENABLED=false` → fallback humano en horario) y rollback del despliegue gradual.
- **Dolor que Hermes resuelve**: Greenfield — no hay legacy del lado del bot que mantener, pero sí responsabilidad de no degradar el SLA actual de atención humana en Patprimo (>95% en horario) ni interferir con el canal batch outbound de Oct8ne (canales independientes). Necesita observabilidad fuerte para diagnosticar rápido.
- **Métrica de éxito**: Uptime ≥99% MVP; tiempo a rollback <5 min; releases sin incidente; eval suite verde antes de cada deploy.

---

## P7 — Sponsor (CTO + CMO co-sponsor)

- **Rol**: Decisor estratégico. CTO = sponsor técnico (dueño del stack SFCC y del presupuesto cloud). CMO = co-sponsor comercial (decisión Brand Managers cross-marca).
- **Acceso**: Dashboard ejecutivo (read-only, KPIs agregados, ROI, costo unitario, conversión, CSAT, cobertura).
- **Responsabilidades**: Decidir continuidad MVP → Fase 2; aprobar expansión a otras marcas y países; aprobar reasignación de presupuesto entre atención humana, Hermes y, eventualmente, WhatsApp Business / Service Cloud Fase 2 según métricas de conversión y costo unitario.
- **Dolor que Hermes resuelve**: Hoy no hay business case cuantificado para escalar atención multi-marca/multi-país. Con Hermes obtiene métricas que defienden expansión 2026 sin crecimiento lineal de headcount.
- **Métrica de éxito**: ROI año 1 ≥3×; payback <6 meses; decisión documentada de continuar a Fase 2 antes del 30 julio 2026.

---

## Mapa Persona → Epic

| Persona | E1 Order Tracking | E2 Operations | E3 Handoff | E4 Cross-cutting |
|---|---|---|---|---|
| P1 Cliente final | ✅ Primary | — | ✅ Primary (initiator) | — |
| P2 Agente humano | — | — | ✅ Primary (receiver) | — |
| P3 Operador | ✅ Secondary (logs) | ✅ Primary | ✅ Secondary (audit) | ✅ Secondary |
| P4 Brand Manager | ✅ Secondary (voz) | — | — | ✅ Primary (sign-off) |
| P5 Compliance | ✅ Secondary (consent) | ✅ Secondary (audit) | ✅ Secondary (handoff log) | — |
| P6 Admin/Dev | ✅ Secondary (deploy) | ✅ Secondary (alerts) | ✅ Secondary (rollback) | ✅ Primary (despliegue gradual + kill switch) |
| P7 Sponsor | — | ✅ Secondary (KPIs read) | — | — |
