# Frontend Components — Unit 1: Core Agente (Widget)

> **Decisión Q5=A**: Vanilla JS bundle compilado (~30kb), distribuido como `widget.js`. Sin React. Embebido en SFCC via `<script src>`.
> **Scope Unit 1**: widget mínimo funcional para Caso 1 (consultar estado de pedido). Stories E1-S1 (consent UI) + E1-S2 (identificación) + flujo de chat. **Botón "Hablar con persona"** (E3-S4) y handoff visual quedan para Unit 3.

---

## 1. Bundle layout

```text
hermes/widget/
├── src/
│   ├── index.ts                # Entry — exporta initHermesWidget(config)
│   ├── core/
│   │   ├── widget-state.ts     # State manager (vanilla JS, plain object + emitter)
│   │   ├── api-client.ts       # Wrapper sobre fetch para /chat, /ab/decide, /widget/config
│   │   └── event-bus.ts        # Pub/sub mínimo (~30 LOC)
│   ├── components/
│   │   ├── widget-root.ts      # Componente raíz; orquesta los demás
│   │   ├── widget-header.ts    # Marca + "IA" indicator + close button
│   │   ├── message-list.ts     # Renderer de los mensajes (user + assistant + system)
│   │   ├── message-bubble.ts   # Una sola burbuja
│   │   ├── input-area.ts       # Textarea + send button + character counter
│   │   ├── consent-prompt.ts   # Mensaje inicial con CTA Aceptar/Rechazar
│   │   ├── handoff-button.ts   # Placeholder en Unit 1; activo en Unit 3
│   │   └── error-banner.ts     # Banner de errores de red/rate-limit
│   ├── styles/
│   │   └── widget.css          # Mobile-first CSS scoped (BEM)
│   └── i18n/
│       └── es-CO.ts            # Strings localizados Patprimo
├── public/
│   ├── widget.js               # Bundle compilado (~30kb gzipped target)
│   └── widget.css              # Stylesheet
├── package.json
├── tsconfig.json
└── README.md                   # Instrucciones de integración para SFCC team
```

> Convención: `widget/` vive como folder hermano de `src/` dentro de `hermes/`, **NO** dentro de `hermes/src/` (que es backend-only).

---

## 2. Component hierarchy

```text
WidgetRoot
├── WidgetHeader      (marca · indicador "IA" permanente · botón cerrar)
├── MessageList
│   └── MessageBubble (N×)   (role-aware rendering: user/assistant/system)
├── ConsentPrompt      (visible solo en turn 1, oculto tras granted)
├── HandoffButton      (placeholder visible en Unit 1, sin acción)
├── ErrorBanner        (renderea cuando state.error !== null)
└── InputArea         (textarea + send + counter + estado disabled si waiting)
```

---

## 3. State management

**Pattern**: single plain object + tiny event bus. Sin frameworks ni libraries.

```ts
interface WidgetState {
  // Connection
  brand: BrandId;
  bot: "hermes" | "oct8ne";       // resultado de /ab/decide
  conversationId: string;         // UUID generado client-side al iniciar
  sessionToken?: string;          // si SFCC inyecta sesión

  // Conversation
  status: "idle" | "awaiting_consent" | "active" | "consent_denied" | "closed";
  messages: Message[];

  // UI
  isSending: boolean;
  isComposing: boolean;
  inputText: string;
  error: ErrorState | null;

  // Telemetry (cliente solo, opcional)
  startedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  isEarlyExit?: boolean;
  earlyExitReason?: string;
}
```

**Mutaciones**: una función `setState(patch)` aplica `Object.assign`, emite `state:changed` por el bus. Cada component se subscribe a los campos que le importan.

---

## 4. Props / config

El widget se inicializa con un objeto público:

```ts
interface WidgetConfig {
  brand: "patprimo";              // hard-coded en MVP
  apiBaseUrl: string;             // ej. https://hermes.patprimo.com.co
  sessionToken?: string;          // si SFCC ya tiene sesión, la pasa
  placement?: "bottom-right" | "bottom-left";  // default bottom-right
  theme?: "patprimo";             // default patprimo
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Error) => void;
  onHandoffRequested?: () => void;  // Unit 3 lo usará
}

// API pública:
function initHermesWidget(config: WidgetConfig): WidgetInstance;

interface WidgetInstance {
  open(): void;
  close(): void;
  destroy(): void;
  getState(): WidgetState;
}
```

Integración en SFCC:

```html
<script src="https://hermes-cdn.patprimo.com.co/widget.js"></script>
<link rel="stylesheet" href="https://hermes-cdn.patprimo.com.co/widget.css" />
<script>
  window.HermesWidget.init({
    brand: 'patprimo',
    apiBaseUrl: 'https://hermes.patprimo.com.co',
    sessionToken: window.PASH_SESSION?.token,
  });
</script>
```

---

## 5. User interaction flows

### Flow A — Apertura inicial

1. Cliente abre patprimo.com.
2. `widget.js` carga; SFCC llama `HermesWidget.init({...})`.
3. Widget hace `GET /ab/decide?brand=patprimo&sessionId=<X>` → response `{ target: "hermes" }`.
4. Widget renderea botón flotante de chat (cerrado).
5. Cliente click → `open()` → renderea WidgetRoot expandido.
6. Status pasa a `awaiting_consent` → ConsentPrompt visible.
7. ConsentPrompt muestra `brandConfig.consentRequestText` (cargado desde `GET /widget/config?brand=patprimo`).

### Flow B — Consent granted

1. Cliente click `Aceptar` en ConsentPrompt.
2. Widget hace `POST /chat` con `{ conversationId, brand, message: "sí, acepto", sessionToken }`.
3. Response = bot acknowledgement + invitación a hacer la consulta.
4. Status → `active`. ConsentPrompt oculto.
5. InputArea habilitado.

### Flow C — Caso 1 estado de pedido

1. Cliente escribe `"mi pedido lleva 3 días sin actualización"` y send.
2. `setState({ isSending: true })` → InputArea disabled + spinner.
3. `POST /chat { conversationId, brand, message }`.
4. Response del bot pidiendo `# pedido + correo`.
5. Cliente entrega los datos.
6. Tras varios round-trips, respuesta final con estado + ETA.
7. `setState({ isSending: false })`.

### Flow D — Consent denied

1. Cliente click `Rechazar` en ConsentPrompt.
2. Widget hace `POST /chat { message: "no" }`.
3. Bot responde con el `consentDeniedText` (ofrece canal alternativo).
4. Status → `consent_denied`. InputArea queda disabled. ConsentPrompt re-aparece como mensaje informativo.

### Flow E — Error / rate limit

1. `POST /chat` → 429 Too Many Requests.
2. Widget muestra ErrorBanner: `"Estás escribiendo muy rápido, espera un momento."`.
3. InputArea queda disabled por el `Retry-After` indicado en headers.
4. Tras `Retry-After`, banner se oculta, InputArea re-habilitado.

### Flow F — Cierre / inactividad

1. 30 min sin actividad o cliente click X → `close()`.
2. WidgetRoot se oculta. Estado persiste en memoria.
3. Próxima apertura: si pasaron <30 min, restaura. Si >30 min, nueva conversation (re-consent).

---

## 6. Form validation rules

**InputArea:**
- Max length: 4000 chars (truncar visualmente + counter rojo a partir de 3800).
- No envíos vacíos: button disabled si input.trim() === "".
- Enter envía; Shift+Enter inserta newline.
- No envío durante `isSending=true` (debounce visual).

**Sanitization client-side (defensa en profundidad — el server hace la real):**
- Strip de tags HTML simples antes de mostrar mensaje del usuario en MessageList (XSS defense — output escaping al renderear).
- No interpretación de markdown en mensajes del usuario; el bot puede usar markdown ligero (`**bold**`, `_italic_`, links) que se renderea con una función segura (no `innerHTML` con HTML raw).

---

## 7. API endpoints consumed (resumen)

| Endpoint | Method | Cuándo |
|---|---|---|
| `GET /ab/decide?brand=X&sessionId=Y` | GET | Al cargar el widget — decide bot |
| `GET /widget/config?brand=X` | GET | Al cargar el widget — pre-cache textos (consent, fallback) |
| `POST /chat` | POST | Cada mensaje del cliente |
| `GET /health` (opcional) | GET | Opcional, antes de mostrar widget — si /health falla, no se muestra |

**CORS**: `apiBaseUrl` debe permitir origin de patprimo.com.co (configurado server-side en SECURITY-08).

---

## 8. Accessibility (mínimo MVP)

- Botón flotante: `aria-label="Abrir chat con Hermes"`.
- Widget abierto: focus trap dentro del widget mientras esté open.
- Inputs y botones: tab order coherente; Enter/Space activan botones.
- Mensajes: `role="log"` y `aria-live="polite"` en MessageList (anuncia nuevos mensajes a screen readers).
- Contraste: WCAG AA mínimo en textos del bot y CTAs.

Más profundo (WCAG AAA, screen reader testing extensivo) → Fase 2.

---

## 9. Performance budget

- Bundle gzipped target: **≤30 KB** (widget.js) + **≤5 KB** (widget.css)
- TTI desde load: <500ms en mobile 4G
- Memoria: <5 MB para una conversation de 50 turnos

Cumplimiento de budget es check de Build/Test.

---

## 10. Out-of-scope para Unit 1 (a Unit 3)

- HandoffButton funcional (`onHandoffRequested` callback wired, UI activo).
- Visual del paquete de contexto al transferir (mensaje "te paso con una persona" + transición visual).
- Re-conexión post-handoff al widget Oct8ne (depende de la estrategia OD-7).
- Continuidad cross-canal (Fase 2).

---

## 11. Security Compliance Summary

| Rule | Status | Notas |
|---|---|---|
| SECURITY-04 (HTTP security headers) | Aplicado a la CDN host | El JS bundle se sirve desde un static host con CSP, HSTS, X-Content-Type-Options. La página SFCC ya tiene sus headers (validar con SFCC team que `script-src` permita la CDN). |
| SECURITY-05 (input validation client-side) | Aplicado parcial | Length + non-empty checks en cliente; el server enforza el ground truth (server-side Zod en backend). |
| SECURITY-09 (no internal info leak) | Aplicado | Frontend NO loguea PII a console; errores user-facing genéricos. |
| SECURITY-15 (error handling) | Aplicado | ErrorBanner para todos los failure modes; nunca `alert()` ni crash. |
| Otros SECURITY rules | N/A en frontend o backend-only | Backend stack covers el resto. |

*No hay findings bloqueantes en este stage.*
