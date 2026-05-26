# DESIGN.md — Hermes

> **Propósito de este archivo:** Memoria visual canónica del producto. Define **qué se ve y cómo se comporta** la interfaz de Hermes a través de sus 4 superficies. Lo usan agentes de IA y devs como contrato de diseño antes de generar UI, slides, mockups o código de presentación.
>
> **Relación con PRODUCT.md:** [PRODUCT.md](PRODUCT.md) responde "qué construir y para quién"; este responde "cómo debe verse y comportarse". Si hay conflicto sobre tono verbal, gana PRODUCT.md §5; sobre tono visual, gana este archivo.
>
> **Estado:** v0 — sistema de diseño técnico de Hermes (motor multi-marca) usando **Patprimo as-observed** como baseline visual del MVP. Las otras 3 marcas (Seven Seven, Ostu, Atmos) son `[TBD — Fase 2]`. Sigue requiriendo sign-off del Brand Manager Patprimo (Semana 2 stakeholder engagement, ISB §2).
>
> **Lint:** `npx @google/design.md lint DESIGN.md` debe pasar sin errores.

---

## 1. Vision

Un solo sistema de diseño que cubre las 4 superficies de Hermes, con **capa brand configurable** que permite alinear visual a cada marca PASH sin tocar el motor técnico.

La promesa arquitectónica del ISB §7 — *"un motor técnico, N personalidades"* — se traduce a diseño así:

- **Tokens funcionales** (espaciado, breakpoints, estados, accesibilidad) son **constantes cross-marca**.
- **Tokens brand-specific** (color primary, font display, logo) son **configurables vía `brand_config`** (Unit 2 Knowledge & Brand Voice).
- **Agregar una marca = nuevo `brand_config` row + sign-off Brand Manager**. No requiere rebuild ni redeploy.

---

## 2. Audience del documento

Quién consulta este DESIGN.md y para qué:

| Audiencia | Usa este archivo para... |
|---|---|
| **Agentes de IA** (Claude Code, Codex, OpenHands) | Generar slides, componentes UI, mockups, copy visual coherente con marca |
| **Devs frontend** | Implementar chat widget (Unit 1) + admin UI (Unit 3) con tokens consistentes |
| **Brand Manager** (P4) | Validar que la implementación refleja su voz visual antes de sign-off |
| **Operador / CX Lead** (P3) | Entender estructura del dashboard y solicitar drill-downs adicionales |
| **Compliance / DPO** (P5) | Validar que el consent gate y los warnings de transparencia bot son visualmente claros |

---

## 3. Surfaces

Hermes tiene 4 superficies. Cada una tiene audiencia distinta, persona dueña y restricciones propias.

### 3.1 Chat widget cliente

- **Audiencia:** P1 Mariana (cliente final).
- **Dispositivo principal:** Mobile (~70% del tráfico Patprimo per ICP §1.3).
- **Restricciones:** Bundle ≤30 KB gzip (Unit 1 FD Q5), vanilla JS sin frameworks, WCAG AA, sin tracking de terceros.
- **Embed:** widget integrado en SFCC storefront Patprimo.

### 3.2 Dashboards operacionales

- **Audiencia:** P3 Daniela (operador CX Lead), P7 Sponsor (CTO + CMO).
- **Dispositivo:** Desktop primario, mobile secundario (read-only).
- **Restricciones:** Auth obligatorio (JWT), RBAC por rol, no exporta PII en claro.
- **Vistas:** KPIs cross-marca, drill-down por conversación, alertas activas.

### 3.3 Admin UI

- **Audiencia:** P4 Brand Manager (read-write su marca), P5 Compliance (consent + audit), P6 Admin/Dev (deploy + secrets).
- **Dispositivo:** Desktop.
- **Restricciones:** Auth obligatorio, RBAC estricto, audit trail append-only de cada cambio.
- **Vistas:** BM workflow (draft → approved → active), Compliance dashboard, Admin console.

### 3.4 Slides / material docs internos

- **Audiencia:** Equipo Hermes + stakeholders Hardcore AI 30X.
- **Formato:** HTML autosuficiente + render a PDF.
- **Restricciones:** Concepto único por slide, marcas explícitas de `SIGUE DEMO:` cuando aplica.
- **Storyboard fuente:** Markdown (igual que `slides/estacion6-slides.md` del repo 30x-ai-docs).

---

## 4. Brand layers

Separación crítica entre lo que cambia por marca y lo que no.

### 4.1 Capa funcional (constante cross-marca)

Estos tokens nunca cambian entre Patprimo, Seven Seven, Ostu, Atmos:

- Spacing scale (4-8-16-24-32-48-64-96)
- Breakpoints (mobile 480, tablet 768, desktop 1024+)
- Border radius funcional (0 para inputs/botones; 8px para cards)
- Estados (default / hover / focus / active / disabled / error)
- Accessibility (focus ring, contraste mínimo, target-size 44x44 mobile)
- Animation timing (150-200ms ease-out estándar)
- Z-index scale (base / dropdown / modal / toast / widget)

### 4.2 Capa brand-specific (configurable vía `brand_config`)

Estos tokens viven en la tabla `brand_config` (Unit 2). Cambiar marca = cambiar row.

```typescript
// Estructura tentativa — referencia a Unit 2 Knowledge & Brand Voice
interface BrandConfig {
  brand_id: string;              // "patprimo" | "seven_seven" | "ostu" | "atmos"
  display_name: string;          // "Patprimo" | "Seven Seven" | ...
  customer_facing_name: string;  // "Sofía de Patprimo" (TBD Brand Manager)
  color_primary: string;         // #d32f2f para Patprimo
  color_accent: string;          // [TBD por marca]
  font_display: string;          // family + fallbacks
  logo_url: string;
  system_prompt: string;         // voz verbal — referencia a PRODUCT.md §5
}
```

### 4.3 Validación de una nueva marca

Antes de habilitar una marca nueva en producción:

1. `brand_config` row creada con paleta + font + logo.
2. **Contraste WCAG AA verificado** con el nuevo `color_primary` contra blanco y negro.
3. Sign-off Brand Manager respectivo del system prompt + 10-20 ejemplos few-shot (per ISB §8 Riesgo 5).
4. Smoke test del widget en sandbox antes de live.
5. Rollout gradual per Unit 3 Despliegue Gradual (kill switch + dark launch).

---

## 5. Tokens — Patprimo as-observed (baseline MVP)

Fuente: observación directa de **patprimo.com** as-observed **2026-05-26** + inferencias razonables marcadas como `[TBD verificar visualmente]`.

### 5.1 Color

#### Primarios

| Token | Valor | Uso |
|---|---|---|
| `--color-primary-text` | `#1a1a1a` | Textos principales, bordes definitorios, fondos de contraste |
| `--color-background` | `#ffffff` | Fondos principales, espacios en blanco |
| `--color-brand-patprimo` | `#d32f2f` | Acento promocional Patprimo (CTAs destacados, badges). **Brand-specific** — cambia por marca. |

#### Neutros

| Token | Valor | Uso |
|---|---|---|
| `--color-neutral-900` | `#1a1a1a` | Mismo que `--color-primary-text` |
| `--color-neutral-700` | `#404040` | Textos secundarios |
| `--color-neutral-500` | `#737373` | Placeholders, hints |
| `--color-neutral-300` | `#d4d4d4` | Bordes separadores |
| `--color-neutral-100` | `#f5f5f5` | Fondos sutiles, hover states |

#### Estados (sistema, no observados en sitio público)

| Token | Valor | Uso |
|---|---|---|
| `--color-error` | `#b91c1c` | Errores de formulario, validación fallida. **Tono más oscuro que el rojo brand** para diferenciar. |
| `--color-success` | `#15803d` | Confirmaciones, estados completados |
| `--color-warning` | `#a16207` | Advertencias no bloqueantes |
| `--color-info` | `#1e40af` | Información neutra, links |

#### Reglas de uso

- **Nunca** mezclar `--color-error` con `--color-brand-patprimo` en la misma vista — son visualmente similares y confunden semánticamente.
- **Contraste mínimo WCAG AA:** body 4.5:1, large text 3:1. Verificación: `--color-primary-text` sobre `--color-background` = ~16:1 ✅. `--color-brand-patprimo` sobre `--color-background` = ~5.9:1 ✅.
- **Modo oscuro:** fuera de scope MVP. Si se agrega Fase 2, requiere re-validación WCAG de cada par.

### 5.2 Typography

#### Familia

`[TBD verificar visualmente]` — el sitio Patprimo as-observed usa sans-serif sistema (Arial/Helvetica probable). Para Hermes MVP:

```css
--font-family-base: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
--font-family-display: var(--font-family-base);  /* brand-specific via brand_config */
```

Cuando el Brand Manager Patprimo confirme la fuente oficial, se actualiza `--font-family-display` en `brand_config`.

#### Jerarquía

| Token | Tamaño | Weight | Uso |
|---|---|---|---|
| `--font-size-display` | 32 px | 700 | Titulares de slides, hero sections (uppercase para promoción al estilo "BLACKDAYS") |
| `--font-size-h1` | 24 px | 700 | Títulos de sección |
| `--font-size-h2` | 20 px | 600 | Subtítulos |
| `--font-size-h3` | 18 px | 600 | Headers de bloque |
| `--font-size-body` | 16 px | 400 | Body principal, mensajes del chat |
| `--font-size-small` | 14 px | 400 | Captions, footnotes, timestamps |
| `--font-size-tiny` | 12 px | 500 | Labels uppercase tipo eyebrow |

#### Mayúsculas estratégicas

- Eyebrow / categoría / etiqueta promocional → uppercase + `letter-spacing: 0.05em`
- Títulos normales → case natural
- Nunca uppercase para body text completo

#### Line-height

- Headings: `1.2`
- Body: `1.5`
- Chat bubbles: `1.4` (más compacto para mobile)

### 5.3 Spacing

Escala basada en múltiplos de 4 (estándar industria, no observable directamente en el sitio Patprimo pero coherente con su densidad visual):

```css
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-8: 48px;
--space-10: 64px;
--space-12: 96px;
```

Reglas:
- **Touch target mínimo mobile:** 44x44 px (`--space-11` aprox). Aplica a botones, links, controles del chat.
- **Padding mínimo de chat bubble:** `--space-3` vertical, `--space-4` horizontal.
- **Gap entre componentes hermanos:** `--space-4` default; `--space-6` cuando hay separación lógica de sección.

### 5.4 Border radius

Patprimo as-observed tiene estética rectangular (sin esquinas redondeadas decorativas). Decisión:

```css
--radius-none: 0;        /* inputs, botones primarios alineados al sitio */
--radius-sm: 4px;        /* badges, tags */
--radius-md: 8px;        /* cards, modales, chat bubbles */
--radius-lg: 12px;       /* contenedores grandes */
--radius-full: 9999px;   /* avatares, dots, indicadores circulares */
```

`[TBD verificar visualmente]` — si el sitio Patprimo usa radius distinto en botones, ajustar `--radius-none` a lo observado.

### 5.5 Elevation / shadows

Patprimo as-observed es **plano** — sin sombras decorativas. Para Hermes:

```css
--shadow-none: none;                                          /* default */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);                      /* cards sutiles */
--shadow-md: 0 4px 8px rgba(0,0,0,0.08);                      /* dropdowns, popovers */
--shadow-widget: 0 8px 24px rgba(0,0,0,0.12);                 /* chat widget (separación del storefront) */
--shadow-modal: 0 16px 48px rgba(0,0,0,0.16);                 /* modales bloqueantes */
```

**Anti-patrón:** No usar sombras coloridas (purple glow, neon), no usar shadows >24 px de blur. Mantener Patprimo flat-feeling.

### 5.6 Motion

Mínimo necesario. Hermes no es una app entretenimiento.

```css
--motion-duration-fast: 100ms;     /* hover de botones, transiciones triviales */
--motion-duration-base: 150ms;     /* default — entrada/salida de chat bubbles, dropdowns */
--motion-duration-slow: 300ms;     /* modales, drawer del widget al abrir */
--motion-easing-default: cubic-bezier(0.4, 0, 0.2, 1);  /* ease-out estándar */
```

**Anti-patrones de motion:**
- Animaciones >300 ms para interacciones rutinarias.
- Bouncing, springy effects.
- Parallax scroll.
- Animated gradients de fondo.
- Pulsing botones para forzar atención.

`prefers-reduced-motion`: **respetar siempre**. Si el usuario lo activa, todas las transiciones se vuelven instantáneas.

---

## 6. Components

Definiciones canónicas por superficie. Cuando una superficie tiene un componente ya diseñado en Construction, este archivo aporta **la capa visual**; la lógica y el contrato API quedan en el doc fuente.

### 6.1 Chat widget cliente (Surface 3.1)

Componentes ya especificados en [Unit 1 FD frontend-components.md](ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/). Aquí se documenta la capa visual:

#### 6.1.1 Launcher (botón flotante de apertura)

- Posición: bottom-right, `--space-5` de margen.
- Tamaño: 56x56 px (sobre target mínimo 44x44).
- Fondo: `--color-brand-patprimo` (brand-specific).
- Ícono: chat outline blanco, 24x24.
- `box-shadow`: `--shadow-widget`.
- Estados: default / hover (scale 1.05, 150 ms) / disabled (opacity 0.5).
- **A11y:** `aria-label="Abrir chat con asesor virtual"`, focus ring visible.

#### 6.1.2 Panel del chat (abierto)

- Tamaño mobile: 100% width, height: 100vh (full screen, mejor UX táctil).
- Tamaño desktop: 400 px width, 600 px height, posición bottom-right.
- Background: `--color-background`.
- Border: top-strip de `--color-brand-patprimo` (4 px) como marca visual sutil.
- Border-radius: `--radius-md` (desktop), `0` (mobile fullscreen).

#### 6.1.3 Header del panel

Contenido:
- Logo + nombre customer-facing ("Sofía de Patprimo" — `[TBD]`).
- **Aviso de transparencia bot obligatorio**: *"Asesor virtual de Patprimo"* en `--font-size-small`, justo bajo el nombre.
- Botón cerrar (X, 24x24, top-right).
- Opcional: dropdown de "Hablar con asesor humano" para forzar handoff.

#### 6.1.4 Mensaje del bot (bubble)

- Background: `--color-neutral-100`.
- Color texto: `--color-primary-text`.
- Padding: `--space-3` vertical, `--space-4` horizontal.
- Border-radius: `--radius-md`.
- Max-width: 80% del panel.
- Align: left.
- Line-height: `1.4`.
- Tipografía: `--font-size-body`.
- **Longitud:** <3 líneas. Respuestas largas → varios bubbles secuenciales.
- Botones de acción (cuando aplican): debajo del bubble, horizontal scroll si son >2 ("Ver tracking", "Otra talla", "Hablar con asesor").

#### 6.1.5 Mensaje del usuario (bubble)

- Background: `--color-primary-text`.
- Color texto: `--color-background`.
- Resto igual al bot pero `align: right` y `max-width: 80%`.

#### 6.1.6 Consent gate (primera interacción)

Modal bloqueante al abrir el chat por primera vez. Estructura:

- Header: *"Asesor virtual de Patprimo"*.
- Body: *"Para ayudar mejor, se procesan los datos de la conversación según la [Política de Privacidad](#) y la Ley 1581. Los datos solo se usan para esta consulta."*
- Botones: *"Aceptar y continuar"* (primario, fondo `--color-brand-patprimo`) + *"No acepto"* (secundario, ghost, cierra el widget).
- **No proceder a procesamiento de PII hasta consent explícito.**

#### 6.1.7 Indicador "escribiendo..."

3 puntos animados, `--color-neutral-500`, alineado izquierda. Aparece cuando el bot está procesando >800 ms.

#### 6.1.8 Input field

- Bottom-fixed.
- Border-top: 1 px `--color-neutral-300`.
- Padding: `--space-3`.
- Placeholder: *"Escriba su consulta..."* en `--color-neutral-500`.
- Botón "Enviar" a la derecha, ícono flecha, fondo `--color-brand-patprimo`.
- Tamaño touch target: 44x44 mínimo.
- Sin auto-complete del navegador para evitar leakage de PII al storage local.

#### 6.1.9 Handoff banner

Cuando el bot transfiere a un humano:

- Strip horizontal sobre el input.
- Background: `--color-neutral-100`.
- Icono + texto: *"Transferida a asesor humano. Un momento, por favor."*.
- Tipografía: `--font-size-small`.

### 6.2 Dashboards (Surface 3.2)

Componentes para P3 Daniela (operador) y P7 Sponsor (read-only).

#### 6.2.1 KPI card

- Background: `--color-background`.
- Border: 1 px `--color-neutral-300`.
- Border-radius: `--radius-md`.
- Padding: `--space-5`.
- Contenido:
  - Eyebrow uppercase con `--font-size-tiny` y `letter-spacing: 0.05em` (ej. *"TIEMPO 1ª RESPUESTA"*).
  - Valor principal con `--font-size-display`.
  - Delta vs período previo (verde si mejora, gris si igual, ámbar si retrocede pero dentro de umbral, `--color-error` si bajo threshold de rollback).
  - Sparkline opcional, 60 px height, sin grid lines decorativas.

**Anti-patrón:** No usar `--shadow-md` ni `--color-brand-patprimo` como fondo de KPI cards — son "informativas", no promocionales.

#### 6.2.2 Drill-down table

- Header sticky con eyebrow + sort indicator.
- Filas: padding `--space-3` vertical, hover `--color-neutral-100`.
- Columna ID/timestamp en `--font-size-small` color `--color-neutral-500`.
- Click en fila → detalle expandido inline o navegación a vista de conversación.
- Paginación al pie, no infinite scroll.

#### 6.2.3 Alert badge

- Background: `--color-error` (cuando crítica) o `--color-warning` (cuando warning).
- Color: `--color-background`.
- Padding: `--space-1` vertical, `--space-2` horizontal.
- Border-radius: `--radius-sm`.
- Tipografía uppercase `--font-size-tiny`.

### 6.3 Admin UI (Surface 3.3)

Componentes para BM workflow, Compliance y Admin/Dev. Referencia a [Unit 3 NFR-D logical-components.md](ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/nfr-design/) (8 EJS views).

#### 6.3.1 Formulario BM (validar prompt)

- Layout: 2 columnas desktop (editor a izquierda, preview a derecha); single column mobile.
- Editor: textarea con `font-family: monospace`, `--font-size-body`, line-height `1.6`.
- Preview: caja de chat simulada con el system prompt aplicado a 3-5 mensajes de muestra.
- Botones: *"Guardar borrador"* (ghost), *"Solicitar aprobación"* (primary).

#### 6.3.2 Workflow state badge

Estados del workflow BM (Unit 2):

| Estado | Color background | Color text |
|---|---|---|
| `draft` | `--color-neutral-100` | `--color-neutral-700` |
| `pending_approval` | `--color-warning` (light) | `--color-warning` (dark) |
| `approved` | `--color-success` (light) | `--color-success` (dark) |
| `active` | `--color-success` | `--color-background` |
| `archived` | `--color-neutral-300` | `--color-neutral-700` |

#### 6.3.3 Consent log viewer (Compliance)

- Tabla append-only con filas immutable visualmente (sin botones de edit).
- Columnas: timestamp (ISO), customer_id (hash), consent_type, granted/revoked, source.
- Export: solo CSV con PII enmascarada en runtime.

### 6.4 Slides / material docs internos (Surface 3.4)

Sistema de slides estilo Hardcore AI 30X. Replica el patrón usado en `c2/Estación 6/slides/estacion6-slides.md`.

#### 6.4.1 Tipos de slide

- **cover** — título grande, eyebrow, subtítulo.
- **section** — divider de sección con número de capítulo.
- **content** — concepto único + bullets ≤6.
- **diagram** — Mermaid o ASCII art al centro, descripción al pie.
- **task** — entregable con checklist.

#### 6.4.2 Layout de slide

- 16:9 aspect ratio.
- Margen externo: `--space-8`.
- Grid de 12 columnas, gutter `--space-4`.
- Footer fijo: nombre del programa + número de slide + progreso.

#### 6.4.3 Tipografía de slides

- Cover title: `--font-size-display` × 2 (64 px) con `font-weight: 700`.
- Section title: `--font-size-display` × 1.5 (48 px).
- Content title: `--font-size-h1` × 1.5 (36 px).
- Body: `--font-size-h3` (18 px) — más grande que body normal para legibilidad a distancia.
- Eyebrow uppercase: `--font-size-small` con `letter-spacing: 0.1em`.

#### 6.4.4 Color en slides

- Fondo: `--color-background`.
- Texto principal: `--color-primary-text`.
- Acento: `--color-brand-patprimo` solo para eyebrow y para subrayar puntos clave (máx 1 por slide).
- Diagramas Mermaid: paleta neutra (`--color-neutral-700` líneas, `--color-background` cajas).

#### 6.4.5 Marcas de demo

Cuando un slide es referencia para live coding, agregar prefijo: *"SIGUE DEMO:"* en `--color-warning`, `--font-size-small`, antes del contenido principal.

---

## 7. Layout & Responsiveness

### 7.1 Estrategia

**Mobile-first.** ~70% del tráfico Patprimo es mobile (ICP §1.3). Desktop como enhancement.

### 7.2 Breakpoints

```css
--bp-mobile: 480px;    /* default — no media query */
--bp-tablet: 768px;    /* @media (min-width: 768px) */
--bp-desktop: 1024px;  /* @media (min-width: 1024px) */
--bp-wide: 1440px;     /* @media (min-width: 1440px) — opcional */
```

### 7.3 Max-widths por superficie

| Superficie | Max-width contenedor |
|---|---|
| Chat widget panel (desktop) | 400 px |
| Dashboard contenido | 1280 px |
| Admin UI contenido | 1024 px |
| Slides | 1920 px (16:9 a 1080p) |

### 7.4 Grid

- Mobile: single column.
- Tablet+: hasta 2 columnas en formularios.
- Desktop+: hasta 12 columnas en dashboards.

Gap default `--space-4`; secciones lógicas separadas por `--space-6`.

---

## 8. Accessibility

WCAG **2.1 AA** mínimo en todas las superficies. Las cuatro reglas no negociables:

### 8.1 Contraste

- Body text: ratio ≥ 4.5:1.
- Large text (≥18 px regular o ≥14 px bold): ratio ≥ 3:1.
- UI components (íconos, controles): ratio ≥ 3:1.

Verificación con paleta Patprimo as-observed:
- `--color-primary-text` (#1a1a1a) sobre `--color-background` (#ffffff) = ~16:1 ✅
- `--color-brand-patprimo` (#d32f2f) sobre `--color-background` = ~5.9:1 ✅ (AA body OK)
- `--color-neutral-500` (#737373) sobre `--color-background` = ~4.6:1 ✅ (límite AA, usar solo para texto secundario)

### 8.2 Focus visible

Todo elemento interactivo debe tener focus ring visible:

```css
:focus-visible {
  outline: 2px solid var(--color-primary-text);
  outline-offset: 2px;
}
```

No remover focus ring sin reemplazo equivalente.

### 8.3 Navegación por teclado

- Tab order lógico.
- Trap focus dentro de modales (incluyendo consent gate).
- Escape cierra modales y dropdowns.
- Enter envía mensaje en chat input.

### 8.4 Compatibilidad con screen readers

- `aria-label` en botones sin texto visible.
- `aria-live="polite"` en bubbles del bot (anuncia nuevos mensajes sin interrumpir).
- `role="dialog"` + `aria-modal="true"` en consent gate.
- Idioma declarado: `<html lang="es-CO">`.

### 8.5 Touch targets

Mobile: mínimo 44x44 px. No depender de hover (no existe en touch).

### 8.6 Reduced motion

Respetar `prefers-reduced-motion: reduce`. Todas las transiciones se vuelven instantáneas o se reemplazan por cross-fade simple.

---

## 9. Anti-patterns

Qué **NO** hacer. Cualquier UI que viole estos puntos debe revisarse antes de merge.

### 9.1 AI slop visual (genérico, según artículo "Fixing Visual AI Slop")

- ❌ Gradientes morados, neón, rainbow.
- ❌ Glass panels (`backdrop-filter: blur`) decorativos.
- ❌ Hero sections vacías sin contenido funcional.
- ❌ Cards decorativas sin contenido sustantivo.
- ❌ Métricas ornamentales (numbers que no significan nada).
- ❌ Iconos genéricos de stock (rocket, lightbulb, target sin contexto).
- ❌ Stock photos de personas sonriendo en oficinas.
- ❌ Fondos con partículas o constelaciones animadas.

### 9.2 Anti-patrones que Patprimo as-observed evita (y Hermes hereda)

- ❌ Urgencia falsa (*"¡Solo 2 disponibles!"*).
- ❌ Emojis en navegación o CTAs comerciales.
- ❌ Pop-ups intrusivos de newsletter inmediatos.
- ❌ Notificaciones invasivas tipo "X persona acaba de comprar".
- ❌ Testimonios destacados en navegación principal.

### 9.3 Anti-patrones de chat conversacional

- ❌ Bubbles >3 líneas (forzar split).
- ❌ Emojis decorativos en respuestas del bot (✅ check funcional para confirmación está OK; ❤️🎉🌸 no).
- ❌ Signos de exclamación encadenados (`¡¡¡` o `!!!`).
- ❌ Saludos en cada turno (saludo solo en el primero).
- ❌ Cierres efusivos (*"¡Que tengas un día maravilloso!"*).
- ❌ "Typing..." durante >5 segundos sin update (timeout y mostrar estado real).

### 9.4 Anti-patrones de dashboard

- ❌ Charts 3D, donas con efecto profundidad.
- ❌ Leyendas redundantes (si solo hay 2 series con color distinto, no necesita leyenda).
- ❌ Colores arbitrarios (rojo/verde/azul/amarillo) cuando el valor semántico es uniforme.
- ❌ Animaciones de entrada para cada elemento al cargar la página.

### 9.5 Anti-patrones de admin / configuración

- ❌ Edit en línea sin confirmación.
- ❌ Botones destructivos junto a botones primarios (separar visualmente).
- ❌ Modales con scroll interno + scroll de página.
- ❌ Estados de éxito que desaparecen <2 segundos.

---

## 10. Configuration model

Cómo agregar una marca en Fase 2 (Seven Seven, Ostu, Atmos).

### 10.1 Pasos operativos

1. **Definir `brand_config` row** vía admin BM UI:
   - `brand_id`, `display_name`, `customer_facing_name` (sign-off del Brand Manager).
   - `color_primary`, `color_accent`, `font_display`, `logo_url`.
   - `system_prompt` (referencia a PRODUCT.md §5.3).
2. **Validar contraste WCAG AA** con el nuevo `color_primary` contra `--color-background` (≥4.5:1 body, ≥3:1 large).
3. **Validar font fallbacks** — si la marca usa una font no web-safe, asegurar fallback que mantenga jerarquía visual.
4. **Sign-off del Brand Manager** del system prompt + 10-20 ejemplos few-shot.
5. **Smoke test del widget** en sandbox con `brand_id` activado.
6. **Rollout gradual** per Unit 3:
   - Día -3: traffic_percentage = 0% (canary off, validación interna)
   - Día -1: traffic_percentage = 5% (canary live)
   - Día 0: traffic_percentage = 25% (post-validación KPIs)
   - Días +1 a +7: ramp según KPIs.

### 10.2 Lo que NO cambia entre marcas

- Spacing scale, breakpoints, motion timing, accessibility rules.
- Estructura de los componentes (chat widget, dashboards, admin UI).
- Anti-patrones (§9).
- Validaciones WCAG.

### 10.3 Lo que SÍ cambia entre marcas

- Paleta brand-specific (`color_primary`, `color_accent`).
- Font display (con fallback al system stack).
- Logo y assets de marca.
- Customer-facing name.
- System prompt verbal (PRODUCT.md §5.3).

---

## 11. References

### Producto y voz

- [PRODUCT.md](PRODUCT.md) — Memoria de producto (audiencia, propósito, voz)
- [docs/internal-solution-brief.md](docs/internal-solution-brief.md) — Caso de negocio (ISB)
- [docs/icp.md](docs/icp.md) — Ideal Customer Profile

### Diseño técnico (fuente de componentes)

- [ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/](ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/) — Chat widget vanilla JS (8 componentes, API contract, flows)
- [ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/nfr-design/](ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/nfr-design/) — Admin UI views (8 EJS templates)
- [ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/infrastructure-design/](ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/infrastructure-design/) — Deployment + rollout
- [ai-dlc/aidlc-docs/construction/unit2-knowledge-brand-voice/functional-design/](ai-dlc/aidlc-docs/construction/unit2-knowledge-brand-voice/functional-design/) — Brand config schema

### Fuentes externas

- **patprimo.com** as-observed 2026-05-26 — baseline visual MVP
- Artículo *"Fixing Visual AI Slop"* (Trilogy AI) — anti-patrones §9.1
- [design.trilogyai.co](https://design.trilogyai.co/) — referencia de demo site del estándar
- [Google DESIGN.md standard](https://github.com/google-labs-code/design.md) — formato base
- [Repo del demo Trilogy](https://github.com/trilogy-group/design) — implementación de referencia

---

## 12. Validation State

### 12.1 Versionado

- **Versión actual:** v0
- **Última actualización:** 2026-05-26
- **Próxima revisión obligatoria:** post-sign-off Brand Manager Patprimo

### 12.2 Items pendientes (`[TBD]`)

| # | Item | Bloqueante para | Dueño |
|---|---|---|---|
| 1 | Familia tipográfica oficial Patprimo (validar contra brand guide formal o sitio en producción con DevTools) | Cierre v1 DESIGN.md | Brand Manager Patprimo + dev frontend |
| 2 | Border radius exacto de botones del sitio Patprimo (verificar visualmente) | Cierre v1 | Dev frontend |
| 3 | Color exacto del rojo escarlata Patprimo (HEX preciso del brand guide vs inferencia #d32f2f) | Cierre v1 | Brand Manager Patprimo |
| 4 | Paletas Seven Seven, Ostu, Atmos | Fase 2 launch por marca | Brand Manager respectivo |
| 5 | Verificación de contraste WCAG AA con herramienta automatizada (no inferida) | Pre-launch MVP | Dev frontend + axe-core |
| 6 | Fonts brand-specific por marca | Fase 2 launch por marca | Brand Manager respectivo |
| 7 | Sign-off del system prompt visual + 10-20 ejemplos few-shot | Launch MVP | Brand Manager Patprimo |

### 12.3 Lint

```bash
# Antes de commit
npx @google/design.md lint DESIGN.md
```

El linter valida estructura, referencias rotas y problemas de contraste declarado.

### 12.4 Cómo proponer cambios

Cambios a este `DESIGN.md` requieren:

1. Justificación en commit message referenciando PRODUCT.md, ISB o evidencia de UX (research, accessibility audit, sign-off Brand Manager).
2. Si el cambio toca **Tokens §5** (especialmente color o tipografía) → revisar contraste WCAG AA antes de merge.
3. Si el cambio toca **Componentes §6** → coordinar con Unit 1 FD frontend-components y Unit 3 logical-components para evitar drift.
4. Si el cambio toca **Anti-patterns §9** → revisión cruzada con PRODUCT.md §8 (anti-patrones verbales).
5. Correr el linter Google DESIGN.md antes de PR.

---

*DESIGN.md de Hermes — v0 — Hardcore AI 30X Cohorte 2 — Estación 6*
