# Frontend Components — Unit 2: Brand Manager UI

> **Decisión Q1=A**: UI dedicada in-app para Brand Manager. Login + dashboard + editor + review + activación. Separada del widget del cliente final (que es Unit 1).

---

## 1. Application scope

**Aplicación standalone** servida por Hermes Fastify en path `/admin/`. Acceso solo a roles `brand_manager` u `operator` (autenticación obligatoria).

**Tech stack para esta UI** (a confirmar en NFR Design Unit 2, pero recomendación):
- **Vanilla JS + HTML server-rendered** con plantillas simples (ej. EJS) — alineado con la filosofía MVP de minimal moving parts. Cero bundler, cero framework para esta UI.
- Alternativas: React standalone (~150kb bundle), HTMX (server-driven), Alpine.js (light reactivity).
- **Recomendación por defecto**: server-rendered con plantillas + JavaScript progresivo. Próximo NFR Design lo confirma.

> **NO** confundir con el widget de chat del cliente (Unit 1) — aquel es vanilla JS bundle ~30kb embebido en SFCC; este es web app interno con login.

---

## 2. Page hierarchy

```text
/admin/
├── /admin/login                 (público)
├── /admin/logout                (action; POST)
└── (auth required)
    ├── /admin/brands/:brand/configs              (dashboard: lista de versiones)
    ├── /admin/brands/:brand/configs/new          (editor: crear draft)
    ├── /admin/brands/:brand/configs/:versionId   (detail + review: read-only + actions)
    └── /admin/brands/:brand/configs/:versionId/edit  (editor: modificar draft)
```

---

## 3. Pages — descripción funcional

### 3.1 `/admin/login`

**Inputs:**
- Email (text)
- Password (password)
- Submit button

**Behavior:**
- POST a `/admin/auth/login`
- On success: redirect a dashboard (de la primera marca en `brand_scopes`)
- On failure: muestra mensaje genérico `"Credenciales inválidas"` (R-AUTH-1 — no revelar si el email existe)
- On lockout: muestra `"Cuenta bloqueada temporalmente. Intenta más tarde."` con tiempo restante si lo retorna el server.

**a11y:**
- Form labels apropiados
- Tab order coherente
- Enter en password = submit

---

### 3.2 `/admin/brands/:brand/configs` — Versions dashboard

**Layout:**
```
+-------------------------------------+
|  Hermes Admin  ·  Patprimo  · BM ▾  |   ← header con switch de marca + perfil
+-------------------------------------+
|  Versiones Brand Config — Patprimo  |
|                                     |
|  [ + Nuevo borrador ]               |   ← CTA principal
|                                     |
|  Filtros: [Todas] [Drafts] [Aprobad.|
|           [Activa] [Archivadas]    |
|                                     |
|  Tabla:                             |
|  ┌────────────────────────────────┐ |
|  │ Versión │ Estado │ Autor │ Fecha│ |
|  ├────────────────────────────────┤ |
|  │ v3      │ active │ BM   │ ...  │ |
|  │ v2      │ archi. │ BM   │ ...  │ |
|  │ v1      │ archi. │ Seed │ ...  │ |
|  └────────────────────────────────┘ |
|                                     |
|  Cada fila clickable → detail page  |
+-------------------------------------+
```

**Behavior:**
- Polling cada 30s para refresh de la lista (R-UI-1)
- Filtros aplicados client-side sobre los datos cached
- Click en fila → navigate a `/admin/brands/:brand/configs/:versionId`
- Click "Nuevo borrador" → navigate a `/admin/brands/:brand/configs/new`

**Permisos:**
- Si el usuario no tiene scope sobre `:brand`, redirect a su dashboard de marca primaria O 403 si es BM sin scopes válidos.

---

### 3.3 `/admin/brands/:brand/configs/new` — Editor (create draft)

**Layout:**
```
+-------------------------------------+
|  Crear nuevo borrador — Patprimo   |
+-------------------------------------+
|  Nombre customer-facing             |
|  [Sofía de Patprimo            ]   |
|                                     |
|  Tono                               |
|  ( ) formal_close                   |
|  ( ) casual                         |
|  ( ) formal                         |
|                                     |
|  System prompt                      |
|  ┌─────────────────────────────────┐|
|  │ <large textarea>                ││  ← 100-10000 chars; counter visible
|  └─────────────────────────────────┘|
|                                     |
|  Few-shot examples (5-30)           |
|  ┌─────────────────────────────────┐|
|  │ Example 1                       ││
|  │   User: [____________________]  ││
|  │   Assistant: [_______________]  ││
|  │ [ × Eliminar ejemplo ]          ││
|  └─────────────────────────────────┘|
|  [ + Agregar ejemplo ]              |
|                                     |
|  Consent text                       |
|  [textarea]                         |
|  Consent denied text                |
|  [textarea]                         |
|  Neutral fallback text              |
|  [textarea]                         |
|                                     |
|  [ Guardar borrador ]  [ Cancelar ] |
+-------------------------------------+
```

**Behavior:**
- Validación client-side de longitudes (R-ERR-BC-2); errors inline con mensaje claro
- Submit → POST `/admin/brands/:brand/configs` con body completo
- On success: redirect a `/admin/brands/:brand/configs/:newVersionId/edit`
- Sin save automático MVP (el BM hace save explícito; protección contra cierres accidentales: confirmación "tienes cambios sin guardar" en navigate-away)

---

### 3.4 `/admin/brands/:brand/configs/:versionId` — Detail + review

**Behavior:**
- Carga la versión completa + sign-offs históricos
- Muestra **diff visual** vs versión `active` actual (R-UI-3): texto diff línea-por-línea para system_prompt; diff item-por-item para few_shot_examples
- Actions disponibles dependen del status:

| Status | Actions disponibles |
|---|---|
| `draft` | `Editar` (→ /edit), `Aprobar`, `Rechazar`, `Descartar` |
| `approved` | `Activar`, `Archivar`, ver sign-offs (read-only) |
| `active` | `Archivar` (con warning: deja la marca sin versión activa, confirmar), ver sign-offs |
| `archived` | `Re-activar` (= activate; transición arch→active), ver sign-offs (read-only) |

**Modals de confirmación (R-UI-2):**
- `Aprobar` → modal con textarea de comment (puede vacío) + botón confirma + cancela.
- `Activar` → modal con texto explícito: "Vas a activar versión X y archivar Y. Esto entra en efecto inmediatamente." Confirm/Cancel.
- `Descartar` → modal: "Esta acción es irreversible. Escribe el ID de versión para confirmar." Input + Confirm/Cancel.

---

### 3.5 `/admin/brands/:brand/configs/:versionId/edit` — Editor de draft

Idéntica al editor de create (3.3) pero pre-llena los campos con la versión actual. PUT `/admin/brands/:brand/configs/:versionId` en submit. Solo accesible si `status='draft'`.

---

## 4. Cross-page components

### 4.1 Header / nav
- Logo Hermes Admin (sin branding Patprimo — esto es Admin interno)
- Switch de marca (dropdown con `brand_scopes` del user) — clicking redirect al dashboard de esa marca
- Profile dropdown: nombre user · `Cerrar sesión` (POST `/admin/auth/logout`)

### 4.2 Status badges
Color-coded chips por status:
- `draft` — gris
- `approved` — amarillo
- `active` — verde
- `archived` — gris claro

### 4.3 Diff viewer (componente reutilizable)
Recibe `(textOld, textNew)` o `(jsonOld, jsonNew)`; renderea diff con + (add) / - (remove). Lib mínima vanilla JS (~3kb) o server-render con backticks coloreados.

### 4.4 Toast notifications
- Success (verde) — al guardar, aprobar, activar.
- Error (rojo) — en 4xx/5xx con mensaje claro.
- Warning (amarillo) — para 409 stale conflicts (R-ERR-BC-1).

---

## 5. Form validation rules (client-side)

Reflejan R-ERR-BC-2 server-side; el cliente da feedback inmediato:

| Campo | Validación |
|---|---|
| `system_prompt` | 100-10000 chars; counter visible; warn a partir de 9500 |
| `few_shot_examples[].user_message` | 1-1000 chars |
| `few_shot_examples[].assistant_response` | 1-2000 chars |
| `few_shot_examples` count | 5 mínimo, 30 máximo |
| `customer_facing_name` | 3-50 chars |
| `consent_request_text` | 50-1000 chars |
| `consent_denied_text` | 50-500 chars |
| `neutral_fallback_text` | 20-500 chars |

Validation falla → submit disabled + mensaje inline en el campo offending.

---

## 6. API endpoints consumed

| Endpoint | Method | Consumido por |
|---|---|---|
| `/admin/auth/login` | POST | login page |
| `/admin/auth/logout` | POST | header logout |
| `/admin/brands/:brand/configs` | GET | dashboard |
| `/admin/brands/:brand/configs/:versionId` | GET | detail page |
| `/admin/brands/:brand/configs` | POST | create draft |
| `/admin/brands/:brand/configs/:versionId` | PUT | update draft |
| `/admin/brands/:brand/configs/:versionId` | DELETE | discard draft |
| `/admin/brands/:brand/configs/:versionId/sign-off` | POST | approve / reject |
| `/admin/brands/:brand/configs/:versionId/activate` | POST | activate / re-activate |
| `/admin/brands/:brand/configs/:versionId/archive` | POST | archive |

Todos requieren header `Authorization: Bearer <JWT>`.

---

## 7. Auth flow integration

- Login almacena JWT en `sessionStorage` (NO localStorage — sesión scoped al tab).
- Cada fetch tiene un wrapper `authFetch(url, opts)` que agrega el header `Authorization` automáticamente.
- Si server retorna 401, `authFetch` redirect a `/admin/login` con mensaje "Sesión expirada".
- Logout limpia sessionStorage + POST /admin/auth/logout (server invalida JWT en `revoked_tokens`).

---

## 8. Accessibility

- WCAG AA mínimo:
  - Contraste textos ≥4.5:1
  - Focus rings visibles en todos los CTAs
  - Form labels asociados a inputs
  - aria-live para toasts (announce a screen reader)
  - Modals con focus trap
- Keyboard navigation completa (tab order)

---

## 9. Out of scope (Brand Manager UI)

- ❌ Multi-language (UI solo español-CO)
- ❌ Notificaciones push (slack/email para sign-off requests) → Fase 2
- ❌ Auto-save de drafts → MVP requiere save explícito
- ❌ Real-time collaboration (varios BMs editando el mismo draft) → MVP serial
- ❌ Export/import de configs entre marcas → Fase 2
- ❌ Mobile responsive (BMs operan desde laptop/desktop)
- ❌ Visualización de muestra semanal de conversaciones (Q5=C, Fase 2)

---

## 10. Performance budget

- Initial page load (login): <1.5s en 4G
- Dashboard load (10 versiones): <800ms
- Editor load: <500ms
- API roundtrips: <300ms p95 para CRUD operations

Estos budgets son guidelines; no se mide formalmente en MVP (sin tests Playwright per OD-6).

---

## 11. Security Compliance Summary

| Rule | Aplicación |
|---|---|
| SECURITY-04 | Helmet en Fastify aplica CSP/HSTS/etc. también a `/admin/*` routes |
| SECURITY-05 | Validation client-side + server-side enforcement |
| SECURITY-08 | JWT obligatorio en cada API call; CORS restrictivo al host del admin UI |
| SECURITY-09 | sessionStorage vs localStorage; no internal info leak en errors |
| SECURITY-12 | bcrypt + JWT exp 8h + brute-force lock (R-AUTH-5) |
| SECURITY-13 | sign_offs append-only via API (no UPDATE/DELETE endpoint expuesto) |

*No hay findings bloqueantes en este stage.*
