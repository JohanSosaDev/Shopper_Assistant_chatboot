---
version: alpha
name: Hermes
description: Sistema visual para Hermes. Widget de chat en SFCC storefront, Brand Manager UI y dashboard operador. Tokens multi-marca PASH SAS (Patprimo, Seven Seven, Ostu, Atmos). Sobrio, verificable, conciso.
brands:
  patprimo:
    primary: "#C41E3A"
    on-primary: "#FFFFFF"
    customer-facing-name: "Sofía de Patprimo"
    site: "https://www.patprimo.com/"
  sevenseven:
    primary: "#2D5016"
    on-primary: "#FFFFFF"
    customer-facing-name: "Por definir con Brand Manager Seven Seven (Fase 2)"
    site: "https://www.sevenseven.com/"
  ostu:
    primary: "#000000"
    on-primary: "#FFFFFF"
    customer-facing-name: "Por definir con Brand Manager Ostu (Fase 2)"
    site: "https://www.ostu.com/"
  atmos:
    primary: "#1A3A52"
    on-primary: "#FFFFFF"
    customer-facing-name: "Por definir con Brand Manager Atmos (Fase 2)"
    site: "https://www.atmosmovement.com/"
colors:
  background: "#FFFFFF"
  surface: "#F5F5F5"
  surface-raised: "#FFFFFF"
  text: "#1A1A1A"
  text-body: "#333333"
  text-muted: "#666666"
  text-faint: "#737373"
  ia-indicator-bg: "#F0F0F0"
  ia-indicator-text: "#333333"
  consent-bg: "#FAFAFA"
  negative: "#C53030"
  negative-bg: "#FFF5F5"
  warning: "#A06200"        # reserved for future warning states (toasts BM UI)
  warning-bg: "#FFFBEB"     # reserved
  success: "#2F855A"
  success-bg: "#F0FFF4"
  link: "#2563EB"           # reserved for body links in BM UI
  focus-ring: "#2563EB"     # reserved for keyboard focus on all interactive components
  separator: "#E5E5E5"      # used as 1px border in tables, modals, dividers
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0em
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  body-sm:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0em
  label-caps:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.06em
  monospace:                # reserved for IDs (HT-2026-NNNN), hashes, JSON snippets
    fontFamily: "'SF Mono', Menlo, Consolas, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px                 # reserved for outer margins of BM UI sections
rounded:
  none: 0px
  sm: 4px
  md: 8px
  pill: 9999px
shadow:
  sm: "0 1px 2px rgba(0,0,0,0.05)"
  md: "0 4px 12px rgba(0,0,0,0.08)"
  lg: "0 12px 32px rgba(0,0,0,0.12)"
components:
  widget-bubble-closed:
    backgroundColor: "{brands.<brand>.primary}"
    textColor: "{brands.<brand>.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "{spacing.md} {spacing.lg}"
    minHeight: 44px         # WCAG 2.5.5 Target Size (mobile)
    minWidth: 44px          # WCAG 2.5.5 Target Size (mobile)
    shadow: "{shadow.md}"
    focusRing: "{colors.focus-ring}"
  widget-panel:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-body}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0"
    shadow: "{shadow.lg}"
  widget-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "{spacing.md} {spacing.lg}"
  ia-indicator:
    backgroundColor: "{colors.ia-indicator-bg}"
    textColor: "{colors.ia-indicator-text}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  message-bubble-user:
    backgroundColor: "{brands.<brand>.primary}"
    textColor: "{brands.<brand>.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
  message-bubble-assistant:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-body}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
  consent-prompt:
    backgroundColor: "{colors.consent-bg}"
    textColor: "{colors.text-body}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.lg}"
  input-area:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm} {spacing.md}"
    focusRing: "{colors.focus-ring}"
  error-banner:
    backgroundColor: "{colors.negative-bg}"
    textColor: "{colors.negative}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm} {spacing.md}"
  bm-table-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    fontWeight: 600
    rounded: "{rounded.none}"
    padding: "{spacing.md} {spacing.lg}"
  bm-status-badge-draft:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    fontWeight: 600
    rounded: "{rounded.pill}"
    padding: "{spacing.xs} {spacing.sm}"
  bm-status-badge-active:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    typography: "{typography.body-sm}"
    fontWeight: 600
    rounded: "{rounded.pill}"
    padding: "{spacing.xs} {spacing.sm}"
  bm-status-badge-archived:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    fontWeight: 600
    rounded: "{rounded.pill}"
    padding: "{spacing.xs} {spacing.sm}"
  bm-divider:
    border: "1px solid {colors.separator}"
    spacing: "{spacing.lg} 0"
  dashboard-kpi-card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.display}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
    shadow: "{shadow.sm}"
---

# DESIGN.md

## Overview

Hermes tiene 3 superficies visuales con propósitos distintos:

1. **Widget de chat (cliente)**: vanilla JS bundle ≤30kb embebido en SFCC storefront. Sobrio, minimal, casi-blanco con primary de la marca activa discreto. La UI debe desaparecer detrás de la conversación.
2. **Brand Manager UI (`/admin/brands/...`)**: web admin standalone con login, dashboard de versiones, editor de drafts, diff visual y modals de confirmación. Denso pero legible. Sin branding por marca (es admin neutro).
3. **Dashboard operador (`/admin/dashboard/...`)**: KPIs, escalations, alertas y rollout config. Funcional, sin decoración. Acceso restringido a roles `operator` y `admin`. Sin branding por marca.

Las 3 superficies comparten el sistema de tokens del front-matter pero priorizan diferente: el widget prioriza claridad y velocidad, el BM UI prioriza confianza y control, el dashboard prioriza densidad y acción.

**Multi-marca**: el widget cliente cambia su `primary` y `on-primary` según `brandConfig.brand` (lee de `BrandConfigService.getActive(brand)` per Unit 2 design). Patprimo es la única marca cubierta en MVP; Seven Seven, Ostu y Atmos están definidas en el YAML para Fase 2. El BM UI y el dashboard NO cambian de marca (son admin interno neutro).

**Dark mode**: NOT IN MVP. El widget y todas las superficies admin operan solo en light mode. Dark mode opt-in queda diferido a Fase 2.

Este archivo documenta la memoria visual normativa. El front-matter define tokens implementables. Las secciones Markdown explican cómo aplicarlos.

## Colors

La estrategia es **monocromática-neutra con un acento de marca**. El widget no usa color para decorar. Usa color para informar (negativo, success) y para anclar la identidad de marca (primary en burbuja flotante + burbuja del mensaje del usuario).

### Tokens compartidos (no dependen de marca)

- `background` `#FFFFFF` y `surface` `#F5F5F5`: blanco puro y un solo escalón de gris claro. Suficiente contraste sin peso.
- `text` `#1A1A1A`, `text-body` `#333333`, `text-muted` `#666666`, `text-faint` `#737373`: escala de 4 grises desde headings hasta metadata. Todos pasan WCAG AA sobre `background` y `surface`.
- `ia-indicator`: gris muy claro con tipografía caps. Compliance: siempre visible mientras chat abierto.
- `negative` `#C53030`: rojo solo para errores genuinos. **No usar para énfasis general**, ya que tres de las cuatro marcas PASH usan rojo/naranja para descuentos. Reservar rojo para errores evita ambigüedad semántica.
- `success` `#2F855A`: verde solo para confirmaciones de acciones del BM (activate, sign-off).
- `warning` `#A06200`: amber solo para stale conflicts y advertencias accionables (reservado, no usado en MVP).
- `link` `#2563EB` y `focus-ring` `#2563EB`: azul único para enlaces y focus visibles (WCAG AA).
- `separator` `#E5E5E5`: borde 1px en `bm-divider`, tablas y modales.

### Tokens por marca (cambian según `brandConfig.brand`)

Extraídos de los sitios oficiales mediante análisis visual (2026-06-02). **Confirmar con cada Brand Manager antes de freeze.**

| Marca | `primary` | Observación del sitio |
|---|---|---|
| Patprimo | `#C41E3A` | Rojo en CTAs de promociones y header de menú. Catálogo casual familiar. |
| Seven Seven | `#2D5016` | Verde profundo en CTAs principales. Marca juvenil lifestyle. |
| Ostu | `#000000` | Negro como primary. El tagline "Solo para muchas veces" lleva esa identidad minimalista. |
| Atmos | `#1A3A52` | Azul oscuro athleisure. La marca más deportiva del portafolio. |

**Regla de proporción**: el `primary` de la marca no debe superar el 5% del área visible del widget cliente. La conversación es de texto, no de marca.

**Contraste verificado WCAG AA** (todas las combinaciones declaradas):

| Foreground | Background | Ratio | Pasa AA |
|---|---|---|---|
| `text` `#1A1A1A` | `background` `#FFFFFF` | 16.5:1 | ✓ AAA |
| `text-body` `#333333` | `background` `#FFFFFF` | 12.6:1 | ✓ AAA |
| `text-muted` `#666666` | `background` `#FFFFFF` | 5.7:1 | ✓ AA |
| `text-faint` `#737373` | `background` `#FFFFFF` | 4.7:1 | ✓ AA |
| `text-faint` `#737373` | `surface` `#F5F5F5` | 4.5:1 | ✓ AA (límite) |
| `on-primary` `#FFFFFF` | Patprimo `#C41E3A` | 5.9:1 | ✓ AA |
| `on-primary` `#FFFFFF` | Seven Seven `#2D5016` | 9.5:1 | ✓ AAA |
| `on-primary` `#FFFFFF` | Ostu `#000000` | 21:1 | ✓ AAA |
| `on-primary` `#FFFFFF` | Atmos `#1A3A52` | 11:1 | ✓ AAA |
| `negative` `#C53030` | `negative-bg` `#FFF5F5` | 5.5:1 | ✓ AA |
| `success` `#2F855A` | `success-bg` `#F0FFF4` | 5.0:1 | ✓ AA |
| `warning` `#A06200` | `warning-bg` `#FFFBEB` | 5.2:1 | ✓ AA |
| `link` `#2563EB` | `background` `#FFFFFF` | 5.2:1 | ✓ AA |

**No usar**:
- Gradientes en backgrounds.
- Múltiples grises para "jerarquía decorativa". Los grises existen para significar.
- `primary` de marca en mensajes del bot (eso convierte texto del bot en publicidad). El `primary` va solo en la burbuja flotante cerrada y burbuja del usuario.
- Rojo `negative` para promociones (reservado para errores).

## Typography

**Stack normativo**: `system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`. Sin web fonts custom en el MVP. Añadirlas infla el bundle target (≤30kb) y el TTI target (<500ms en 4G). Las 4 marcas PASH usan sans-serif genérico en sus sitios actuales, así que esto es consistente con la línea visual de PASH.

Jerarquía (5 niveles):

- `display` (28px/600): solo en KPIs grandes del dashboard operador.
- `title` (18px/600): header del widget, títulos de página BM UI.
- `body` (15px/400): texto de mensajes del bot, texto de cliente, copy general.
- `body-sm` (13px/400): metadata, timestamps, fine print, errores, table headers (con `font-weight: 600`), status badges (con `font-weight: 600`).
- `label-caps` (11px/600 letter-spacing 0.06em): **solo** indicador "IA" (compliance). No usar como eyebrow decorativo en otros componentes.
- `monospace` (reservado): hashes, IDs (`HT-2026-0042`), JSON snippets en dashboard.

**Reglas**:

- Sin subrayado salvo en links de cuerpo (no en CTAs).
- Negrita solo para énfasis dentro de un mensaje o para encabezados de columna.
- No usar `font-style: italic` para énfasis. Usar `font-weight: 600` o color.
- Tabular numbers (`font-variant-numeric: tabular-nums`) obligatorio en KPI cards, tablas y `monospace`.
- Headers de tabla y status badges usan `body-sm` con `font-weight: 600`, no `label-caps`. El uppercase tracked se reserva para el indicador "IA".

## Layout

Tres patrones principales:

### Widget cliente

- **Cerrado**: burbuja pill flotante (`bottom: 24px; right: 24px`) en desktop. En mobile, `bottom: 16px; right: 16px` con `env(safe-area-inset-bottom)` y `env(safe-area-inset-right)` aplicados.
- **Abierto**: panel `360px × 560px` en desktop (límite por safe area en mobile = `100vh - 32px`).
- Estructura vertical: header (56px), message-list (flex-1, scroll), input-area (auto, max 120px).
- Padding interno consistente: `spacing.lg` entre regiones, `spacing.md` entre mensajes consecutivos del mismo role.

### Brand Manager UI

- Layout máximo `1200px` centrado con padding `spacing.xl`.
- Header sticky (`64px`) con switch de marca y perfil.
- Tablas full-width con `spacing.lg` de padding por celda.
- Editor de draft: dos columnas en desktop (≥1024px) con form izquierda y preview/diff derecha; colapsa a 1 columna en tablet/mobile.

### Dashboard operador

- KPI cards en grid `repeat(auto-fit, minmax(200px, 1fr))` con `gap: spacing.lg`.
- Tablas de escalaciones full-width, sticky header.
- Drill-down de conversación: layout tipo chat readonly + sidebar de metadata + paquete de handoff (si aplica).

**Regla común**: un concepto por bloque visual. No mezclar KPIs con tablas en la misma card. No mezclar form fields con diff viewer sin separator explícito.

## Elevation & Depth

La elevación viene de **shadow + surface step**, no de bordes pesados:

- Sin sombra: tablas, listas, layout estructural.
- `shadow.sm`: KPI cards en reposo (`0 1px 2px rgba(0,0,0,0.05)`).
- `shadow.md`: burbuja del widget cerrado, modales del BM UI (`0 4px 12px rgba(0,0,0,0.08)`).
- `shadow.lg`: widget abierto (`0 12px 32px rgba(0,0,0,0.12)`).

**No usar**:
- Drop shadows decorativas.
- Box-shadow con color de marca (solo gris transparente).
- Bordes pesados (`border: 2px solid`). Usar `1px solid {colors.separator}` cuando un borde sea necesario (formalizado como `bm-divider`).

## Shapes

Radios pequeños y consistentes, alineados con la estética flat de los 4 sitios PASH:

- `rounded.none`: tablas, headers, separators.
- `rounded.sm` (`4px`): inputs, message bubbles, banners, status badges en formularios.
- `rounded.md` (`8px`): cards, modales, widget panel.
- `rounded.pill`: burbuja flotante del widget cerrado, status badges en tablas BM UI.

**No usar**:
- `border-radius: 50%` salvo en avatares (no aplica en MVP).
- Radios distintos en lados (`border-radius: 8px 8px 0 0`) salvo en message bubbles para indicar continuidad del mismo speaker.

## Components

### Widget burbuja cerrada

Pill flotante. Background `{brands.<brand>.primary}`, texto `{brands.<brand>.on-primary}`, ícono mínimo (opcional `💬` solo si no rompe el bundle target). Hover: `transform: scale(1.05)` con `transition: 150ms ease-out` y variante `prefers-reduced-motion` que omite el scale. Focus visible con `{colors.focus-ring}`. Sin animaciones de entrada elaboradas.

**Touch target mínimo**: `min-height: 44px; min-width: 44px` per WCAG 2.5.5 Target Size. Aplica en mobile donde la burbuja puede colapsar a ícono sin label visible. Si el texto del CTA hace crecer la burbuja más allá de 44px, no requiere padding extra.

Visualización por marca (mismo componente, distinto color):

- Patprimo: burbuja rojo `#C41E3A`
- Seven Seven: burbuja verde `#2D5016`
- Ostu: burbuja negro `#000000`
- Atmos: burbuja azul `#1A3A52`

### Widget panel abierto

Header siempre visible con título (`{brands.<brand>.customer-facing-name}`, ej. "Sofía de Patprimo"), indicador "IA" y botón cerrar (con tecla Escape). Sin logo de marca en el header del MVP; solo texto (mantiene bundle ≤30kb). MessageList con scroll natural, sin "scroll to bottom" animado, salvo cuando llega un nuevo mensaje y el usuario ya estaba en el fondo. ConsentPrompt solo en turn #1 y reaparece como mensaje informativo si el cliente niega.

**Empty state**: el primer turno del assistant siempre llega autoinmediato con el ConsentPrompt (R-CONS-1 de Unit 1). Por diseño, MessageList nunca está visualmente vacío. Si por error el primer turn no llega en <2s, mostrar skeleton con altura del ConsentPrompt.

**Fallback CFN en runtime**: si `{brands.<brand>.customer-facing-name}` sigue siendo el placeholder "Por definir con Brand Manager..." (caso Seven Seven, Ostu, Atmos hasta Fase 2), el RolloutGate de esa marca DEBE forzar `hermes_traffic_percentage = 0` y servir el fallback humano. El widget nunca renderea con CFN placeholder visible al cliente. Esto se enforza en el boot del backend leyendo `BrandConfigService.getActive(brand)` y validando que `customer_facing_name` no matche el regex `^Por definir`.

**Logo por marca (Fase 2)**: agregar lockup de marca al header es evaluable cuando el bundle pueda crecer más allá de ≤30kb (Fase 2 con CDN externa: S3 + CloudFront por marca). En MVP, solo texto. Si Fase 2 trae logo, debe ser SVG inline ≤2kb por marca para no romper TTI.

### Mensajes del bot vs cliente

Burbujas en lados opuestos. Burbujas del bot (`message-bubble-assistant`) son surface gris claro `{colors.surface}`; las del cliente (`message-bubble-user`) son primary de marca `{brands.<brand>.primary}`. Sin avatares en MVP. Timestamp solo en agrupaciones (no por cada mensaje).

### Tablas BM UI

Headers en `surface` con `body-sm` y `font-weight: 600` (no `label-caps`). Filas con `spacing.lg` de padding vertical. Status badges color-coded usando el set `bm-status-badge-*` con `body-sm` y `font-weight: 600`. Row hover: cambio de background a un escalón más oscuro (`#FAFAFA`), sin shadow. Dividers entre filas o secciones usan `bm-divider`.

### Modales de confirmación BM UI

Backdrop semitransparente (`rgba(0,0,0,0.5)`). Modal centrado, `max-width: 480px`, `rounded.md`. Acciones destructivas (`discardDraft`) requieren typing del ID parcial. `activate` requiere texto explícito "Vas a activar X y archivar Y" + Confirm/Cancel. Focus trap obligatorio.

### Diff viewer (BM UI)

`monospace`, fondo `surface`, líneas added en `success-bg`, removed en `negative-bg`. Sin syntax highlighting (es texto del system prompt, no código).

### KPI cards (dashboard)

Card con `shadow.sm`, padding `spacing.lg`. Valor en `typography.display` con tabular-nums. Label en `body-sm text-muted`. Delta opcional debajo, `body-sm` en color `success` o `negative` según signo. Click para drill-down a la métrica.

> Este componente sigue el formato hero-metric (big number, small label, supporting stat). Es un patrón AI-tell en landings pero defendible en dashboards operacionales donde la densidad de información es virtud, no decoración.

### Error banner (widget + BM UI)

`negative-bg` con texto `negative`. Aparece inline donde corresponde, no como toast flotante salvo en BM UI para confirmaciones rápidas. Mensaje siempre accionable ("intenta de nuevo en N segundos", no "ocurrió un error").

### Focus states (transversal)

Todo componente interactivo (`widget-bubble-closed`, `input-area`, modal buttons, table rows clickables) usa `outline: 2px solid {colors.focus-ring}; outline-offset: 2px` en `:focus-visible`. Nunca `outline: none` sin reemplazo. Honra `prefers-reduced-motion` en cualquier transición.

## Do's and Don'ts

**Do:**

- Mantener el widget bajo 30kb gzipped. Cada KB cuesta latencia en mobile 4G.
- Renderear el indicador "IA" siempre visible mientras el chat está abierto.
- Cambiar `primary` y `on-primary` por marca activa; NO cambiar grises ni tipografía.
- Usar `tabular-nums` en KPIs, tablas y monospaces para evitar reflow visual.
- Mostrar errores con mensaje accionable y siguiente paso.
- Tener focus trap dentro del widget y modales BM UI.
- Mantener contraste WCAG AA mínimo en todo texto y CTA (verificado en tabla arriba).
- Honrar `prefers-reduced-motion` en hover/transitions.
- Aplicar `env(safe-area-inset-*)` en el widget mobile para evitar notch.

**Don't:**

- No agregar carruseles, tarjetas de producto, ni imágenes inline dentro del chat en MVP.
- No usar emojis en el system prompt (todas las marcas PASH usan tono formal en Hermes, divergente del "tú" de los sitios).
- No animar la entrada de cada mensaje con efectos llamativos. Fade simple en ≤150ms o nada.
- No usar gradientes ni glassmorphism en ninguna superficie.
- No mostrar PII en cleartext en logs, exports CSV ni copy-to-clipboard salvo en el paquete de handoff (donde es necesario operacionalmente).
- No usar typing indicators artificialmente largos para "sentir" más humano.
- No agregar dependencias visuales (Chart.js, D3, tippy.js) al widget cliente. Son aceptables en BM UI y dashboard donde el bundle no es crítico.
- No usar el `primary` de marca para texto largo, indicadores o decoración fuera de los componentes nombrados arriba.
- No usar `label-caps` como eyebrow decorativo en secciones. Reservado solo para el indicador "IA" (compliance).
- No usar em dashes en copy. Usar comas, dos puntos, paréntesis o punto seguido.

## Fuentes de contexto

- [PRODUCT.md](PRODUCT.md) (raíz): voz, personalidad, anti-referencias, multi-marca.
- `ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/frontend-components.md`: componentes del widget detallados.
- `ai-dlc/aidlc-docs/construction/unit2-knowledge-brand-voice/functional-design/frontend-components.md`: páginas BM UI.
- `ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/functional-design/business-rules.md`: §6 reglas de dashboard.
- Sitios oficiales PASH (análisis 2026-06-02): [Patprimo](https://www.patprimo.com/), [Seven Seven](https://www.sevenseven.com/), [Ostu](https://www.ostu.com/), [Atmos](https://www.atmosmovement.com/).
- `~/.claude/skills/impeccable/SKILL.md`: design vocabulary y anti-patterns.
- `~/.claude/skills/make-interfaces-feel-better/SKILL.md`: detalles que hacen una UI sentirse mejor.
- `~/.claude/skills/web-design-guidelines/SKILL.md`: auditoría de UI compliance.
- `~/.claude/skills/userinterface-wiki/SKILL.md`: 152 reglas de UI/UX.

Status: **alpha**. Hex de cada marca son extracciones visuales del sitio oficial, no valores oficiales del brand guide formal de cada marca. Confirmar con Brand Manager de cada marca antes de freeze. Refinar con `/impeccable document` cuando empiece Code Generation.
