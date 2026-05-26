---
name: slides-from-storyboard
description: Convierte un storyboard Markdown en una presentación HTML autosuficiente y la renderiza a PDF, aplicando PRODUCT.md y DESIGN.md de Hermes. Úsala cuando el usuario pida generar slides para una estación de Hardcore AI 30X, un deck interno de Hermes, un brief visual del producto, o cualquier presentación que deba reflejar la voz Patprimo y el sistema de diseño técnico del proyecto. Replica el patrón de live demo de Leonardo González en Estación 6.
---

# Skill: slides-from-storyboard

## 1. Cuándo usar esta skill

Activá esta skill cuando el usuario pida cualquiera de estas cosas:

- Crear slides HTML o PDF a partir de un storyboard Markdown.
- Generar un deck para una estación del programa Hardcore AI 30X Cohorte 2.
- Convertir docs internos del proyecto (ISB, PRD, ICP, brief de Unit) en material visual presentable.
- Replicar el live demo de Leonardo González (Estación 6) sobre nuevos contenidos.
- Producir material gráfico para stakeholders (sponsor, brand managers, compliance).

**NO actives esta skill cuando:**

- El usuario pide un mockup de UI del producto (eso es Unit 1 FD `frontend-components.md`).
- El usuario pide un diagrama Mermaid aislado (eso se hace inline en docs).
- El usuario pide ilustraciones o assets gráficos custom (out of scope de la skill).

## 2. Inputs requeridos

Antes de empezar, asegurate de tener acceso a:

1. **Storyboard Markdown fuente.** Estructura esperada:
   - Frontmatter o título con nombre del deck.
   - Slides separados por `---`.
   - Cada slide con: `**Tipo:**` (cover / section / content / diagram / task), `**Eyebrow:**`, `**Título:**`, bullets o contenido.
   - Marcas opcionales `SIGUE DEMO:` para slides de live coding.
2. **PRODUCT.md** del repo Hermes (raíz) — para validar tono, audiencia y promesa.
3. **DESIGN.md** del repo Hermes (raíz) — para aplicar tokens, tipografía, color, anti-patrones visuales.
4. **Ruta de output** definida (default sugerido: `slides/<deck-name>.html` + `slides/<deck-name>.pdf`).

Si falta alguno de los inputs, **detente y pregunta al usuario** antes de proceder.

## 3. Contexto que debes leer antes de generar

Lee en orden y en paralelo cuando sea posible:

1. `PRODUCT.md` §5 Voice — para tono general y reglas de copy.
2. `DESIGN.md` §5 Tokens — paleta, tipografía, spacing, radius, shadows, motion.
3. `DESIGN.md` §6.4 Slides — sistema específico de slides (5 tipos, layout, color).
4. `DESIGN.md` §9 Anti-patterns — qué evitar visualmente.
5. El storyboard Markdown fuente — para extraer concepto principal por slide.

Si el deck es para una estación del programa, también lee el `README.md` de la estación correspondiente en `~/source/repos/30x-ai-docs/_repo_30x/c2/Estación N/`.

## 4. Proceso paso a paso

### Paso 1 — Validar inputs

- ¿Existe el storyboard Markdown? Si no, pregunta al usuario dónde está.
- ¿Existe `PRODUCT.md` y `DESIGN.md` en la raíz? Si no, pregunta si los creamos primero (esta skill asume que existen).
- ¿El storyboard tiene al menos: cover + content × 3 + cierre? Si es más corto, confirmá si es intencional.

### Paso 2 — Parsear el storyboard

- Separá slides por delimitadores `---`.
- Por cada slide, extraé: tipo, eyebrow, título, subtítulo si lo tiene, body (bullets, párrafos, código, diagramas Mermaid), nota o `SIGUE DEMO:` markers.
- Verificá que cada slide tenga **un solo concepto principal**. Si un slide tiene >1 concepto, marca en tu plan que hay que partirlo.

### Paso 3 — Aplicar el sistema de diseño

Para cada slide construí HTML siguiendo DESIGN.md §6.4:

- **Layout 16:9**, max-width 1920 px, margen externo `--space-8`.
- **Grid 12 columnas**, gutter `--space-4`.
- **Footer fijo** con nombre del programa (`Hardcore AI 30X · Cohorte 2`) + número de slide / total + barra de progreso.
- **Tipografía:**
  - Cover title: `--font-size-display × 2` (64 px) bold.
  - Section title: 48 px.
  - Content title: 36 px.
  - Body: 18 px (más grande que body normal para legibilidad).
  - Eyebrow uppercase con `letter-spacing: 0.1em`, 14 px.
- **Color:**
  - Fondo: `--color-background` (#ffffff).
  - Texto: `--color-primary-text` (#1a1a1a).
  - Acento: `--color-brand-patprimo` (#d32f2f) solo para eyebrow y máximo un punto clave subrayado por slide.
  - Diagramas Mermaid: paleta neutra (líneas `--color-neutral-700`, cajas `--color-background`).
- **Marcas de demo:** si el storyboard tiene `SIGUE DEMO:`, prefija el contenido del slide con un strip en `--color-warning` con texto `"SIGUE DEMO: <descripción>"` en `--font-size-small`.

### Paso 4 — Construir el HTML autosuficiente

Genera **un solo archivo HTML** con:

- `<head>` con `<title>`, `<meta charset>`, `<meta viewport>`, CSS embebido (sin externos).
- CSS variables con los tokens de DESIGN.md §5.
- Reset CSS mínimo.
- Una `<section class="slide">` por slide, con clase de tipo (`cover`, `section`, `content`, `diagram`, `task`).
- Navegación por teclado: ← / → para cambiar slide, números 1-9 para saltar.
- Footer con número de slide actual + total + barra de progreso.
- Soporte `prefers-reduced-motion` (sin animaciones si está activo).

**No incluyas:**

- JavaScript de tracking ni analíticas.
- Fonts externas (usar `--font-family-base` con stack del sistema).
- Imágenes pesadas que no estén explícitamente pedidas en el storyboard.
- Gradientes, glass panels, sombras decorativas, partículas animadas (anti-patrones §9 DESIGN.md).

### Paso 5 — Renderizar a PDF

Opciones en orden de preferencia:

1. **Headless Chromium** (preferido): `npx puppeteer-cli print` o `npx playwright` si están disponibles.
2. **wkhtmltopdf** si está instalado en el sistema.
3. **Manual:** instrucción al usuario para abrir el HTML en Chrome → File > Print > Save as PDF.

Si ninguna opción automatizada está disponible, **detente y pregunta al usuario** si tiene preferencia o si querés que generemos solo el HTML para que él haga el print manual.

### Paso 6 — Validar el resultado

Antes de devolver, verificá:

- [ ] Cada slide tiene **un solo concepto principal**.
- [ ] El concepto principal es legible en menos de 5 segundos.
- [ ] El footer aparece en todos los slides excepto cover (opcional ahí).
- [ ] Los slides marcados `SIGUE DEMO:` están claramente diferenciados.
- [ ] El contraste cumple WCAG AA (mínimo 4.5:1 body, 3:1 large) — esto lo verifica DESIGN.md tokens.
- [ ] No hay anti-patterns (gradientes coloridos, glass panels, hero vacío, métricas ornamentales).
- [ ] El idioma es consistente con el storyboard (español por default).
- [ ] El PDF tiene la misma estructura que el HTML.

### Paso 7 — Devolver evidencia

Reporta al usuario:

1. **Archivos creados:** lista con paths relativos.
2. **Decisiones de diseño tomadas:** ej. *"Apliqué color de acento Patprimo en eyebrow del slide 3 (Section divider) — verificá si querés un acento distinto."*
3. **Cosas pendientes:** slides marcados `[TBD]` o decisiones que requieren input del usuario.
4. **Riesgos de legibilidad o contraste:** si aparecieron durante la validación, listarlos explícitamente.
5. **Comando para abrir el deck:** `start slides/<deck-name>.html` (Windows) o `open slides/<deck-name>.html` (macOS / Linux).

## 5. Output esperado

Estructura de archivos esperada (ejemplo para deck de Estación 6):

```
slides/
└── estacion6-deck/
    ├── estacion6-deck.html       # HTML autosuficiente, sin externos
    ├── estacion6-deck.pdf        # Render PDF
    └── assets/                   # Opcional, solo si hay imágenes custom
```

## 6. Errores comunes y cómo evitarlos

| Error | Cómo evitarlo |
|---|---|
| Slides con >1 concepto principal | Partir en varios slides en Paso 2 |
| Anti-patrón de gradiente morado / glass panels | Aplicar paleta plana de DESIGN.md §5.1; sin `linear-gradient` ni `backdrop-filter` |
| Footer con texto demasiado pequeño | Usar `--font-size-small` (14 px) mínimo |
| Contraste insuficiente | Validar con DESIGN.md §5.1 tokens; rojo brand sobre blanco es 5.9:1 ✅ |
| Slides muy largos (texto exceso) | Body máx 6 bullets; si necesita más, partir |
| Emojis decorativos en body | Eliminarlos (anti-patrón DESIGN.md §9.3) |
| Fonts externas que rompen offline | Usar solo system stack (`--font-family-base`) |
| PDF con paginación rota | Asegurar `page-break-after: always` en `.slide` |

## 7. Anti-patterns explícitos

NO hacer:

- ❌ Gradientes morados, rainbow, neón.
- ❌ Glass panels (`backdrop-filter: blur`) decorativos.
- ❌ Hero sections vacías sin contenido funcional.
- ❌ Cards decorativas sin contenido.
- ❌ Métricas ornamentales (números que no significan nada).
- ❌ Iconos genéricos de stock (rocket, lightbulb, target sin contexto).
- ❌ Stock photos de personas sonriendo.
- ❌ Fondos con partículas o constelaciones animadas.
- ❌ Animaciones de entrada por cada elemento al cargar.
- ❌ Footer con info irrelevante o decorativa.

## 8. Ejemplo de invocación

**Usuario:** *"Generá el deck de Estación 6 a partir del storyboard que está en `~/source/repos/30x-ai-docs/_repo_30x/c2/Estación 6/slides/estacion6-slides.md`."*

**Skill ejecuta:**

1. Lee `PRODUCT.md` y `DESIGN.md` del repo Hermes.
2. Lee el storyboard.
3. Parsea 20 slides.
4. Genera `slides/estacion6-deck.html` con CSS embebido + tokens Patprimo.
5. Renderiza `slides/estacion6-deck.pdf` con headless Chromium.
6. Reporta:
   - Archivos creados (HTML + PDF).
   - Decisiones: *"Apliqué color de acento Patprimo en eyebrow de los 3 section dividers (slides 3, 9, 17)."*
   - Riesgos: ninguno detectado.
   - Comando para abrir.

## 9. Limitaciones conocidas

- No genera ilustraciones custom; usa los assets ya provistos o ninguno.
- No genera animaciones complejas (solo transiciones simples entre slides).
- No traduce el storyboard a otro idioma; mantiene el idioma original.
- Requiere PRODUCT.md y DESIGN.md ya en el repo (esta skill no los crea).
- Si `DESIGN.md` no tiene tokens definidos para una marca específica (ej. Seven Seven Fase 2), usa Patprimo como fallback con advertencia explícita.

## 10. Referencias

- [PRODUCT.md](../../../PRODUCT.md) — Memoria de producto Hermes.
- [DESIGN.md](../../../DESIGN.md) — Memoria visual Hermes (especialmente §6.4 Slides + §9 Anti-patterns).
- [docs/harness-card.md](../../../docs/harness-card.md) — Capacidades del arnés Claude Code.
- Live demo Estación 6 de Leonardo: `~/source/repos/30x-ai-docs/_repo_30x/c2/Estación 6/design-standards-live-demo.md`.
- Artículo *"Fixing Visual AI Slop"* (Trilogy AI) — anti-patterns universales.

---

*Skill slides-from-storyboard — v0 — Hardcore AI 30X Cohorte 2 — Estación 6*
