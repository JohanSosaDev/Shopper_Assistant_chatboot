# NFR Design Patterns — Unit 2: Knowledge & Brand Voice

> **Filosofía MVP**: hereda Unit 1 (retry, breaker, error hierarchy, branded types, pino, fail-closed). Solo agrega lo nuevo de Unit 2.

---

## 1. Authentication Patterns (nuevos en Unit 2)

### 1.1 Bcrypt wrapper

**Pattern**: helper único en `hermes/src/lib/auth/password.ts`. Expone `hashPassword(plaintext)` y `verifyPassword(plaintext, hash)`. Encapsula `saltRounds=12`.

```ts
// hermes/src/lib/auth/password.ts
const SALT_ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length < 12 || plaintext.length > 128) {
    throw new ValidationError('password length out of bounds');
  }
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

**Justificación**: encapsulación previene leak del cost factor o uso accidental sin bcrypt. Las únicas dos funciones expuestas son round-trip.

### 1.2 JWT lifecycle + secret management (Q1=A)

**Pattern**: `JWT_SECRET` es env var (≥32 chars) validado al startup (R-AUTH-3). El service `JwtService` expone `sign(payload)` y `verify(token)`.

```ts
// hermes/src/services/auth/jwt.service.ts
class JwtService {
  constructor(private readonly secret: string, private readonly expSeconds: number = 28800 /* 8h */) {}

  sign(payload: { userId: string; role: string; brand_scopes: string[] }): string {
    const jti = crypto.randomUUID();
    return jwt.sign({ ...payload, jti }, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.expSeconds,
    });
  }

  async verify(token: string): Promise<DecodedJwt> {
    const decoded = jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as DecodedJwt;
    // Check revoked
    const isRevoked = await this.revokedTokenRepo.exists(decoded.jti);
    if (isRevoked) throw new UnauthorizedError('token revoked');
    return decoded;
  }
}
```

**Secret rotation procedure (manual, MVP)**:
1. Generate new secret: `openssl rand -hex 32`
2. Set new `JWT_SECRET` env var
3. Restart container — todas las sesiones existentes invalidan (los users re-loguean)
4. Documentar en runbook

**Trade-off**: invalida TODAS las sesiones existentes. Aceptable con 3-5 users.

### 1.3 Auth middleware (Fastify hook)

**Pattern**: `@fastify/jwt` plugin con preHandler hook que valida token + popula `req.user`.

```ts
// hermes/src/plugins/auth.plugin.ts
fastify.register(import('@fastify/jwt'), {
  secret: env.JWT_SECRET,
});

fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
    // Check revoked
    const isRevoked = await this.revokedTokenRepo.exists(req.user.jti);
    if (isRevoked) throw new UnauthorizedError('token revoked');
  } catch (err) {
    reply.code(401).send({ error: 'unauthorized' });
  }
});
```

**Usage en routes admin**:
```ts
fastify.get('/admin/brands/:brand/configs', { preHandler: fastify.authenticate }, handler);
```

### 1.4 Brand scope guard (middleware adicional)

**Pattern**: middleware que se aplica después de `authenticate`. Verifica que el JWT user tiene scope sobre `req.params.brand`.

```ts
// hermes/src/plugins/brand-scope.plugin.ts
fastify.decorate('requireBrandScope', async (req: FastifyRequest, reply: FastifyReply) => {
  const brand = req.params.brand;
  if (req.user.role === 'operator' || req.user.role === 'admin') return; // cross-brand
  if (!req.user.brand_scopes?.includes(brand)) {
    reply.code(403).send({ error: 'forbidden' });
  }
});
```

**Usage**:
```ts
fastify.post('/admin/brands/:brand/configs/:versionId/sign-off', {
  preHandler: [fastify.authenticate, fastify.requireBrandScope],
}, handler);
```

### 1.5 Brute-force protection (R-AUTH-5)

**Pattern**: counter en `brand_manager_users.failed_attempts` + `locked_until`. Implementación en `AuthService.login`:

```ts
async login(email: string, password: string, ip: string, userAgent: string): Promise<AuthResult> {
  const user = await this.userRepo.findByEmail(email);
  if (!user || !user.is_active) {
    await this.auditLog.write({ email, ip, userAgent, result: 'user_not_found' });
    throw new UnauthorizedError(); // mensaje genérico
  }

  if (user.locked_until && user.locked_until > new Date()) {
    await this.auditLog.write({ email, ip, userAgent, result: 'locked', user_id: user.user_id });
    throw new UnauthorizedError();
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    user.failed_attempts++;
    if (user.failed_attempts >= 5) {
      user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
      user.failed_attempts = 0;
    }
    await this.userRepo.update(user);
    await this.auditLog.write({ email, ip, userAgent, result: 'invalid_password', user_id: user.user_id });
    throw new UnauthorizedError();
  }

  // success
  user.failed_attempts = 0;
  user.locked_until = null;
  user.last_login_at = new Date();
  await this.userRepo.update(user);
  await this.auditLog.write({ email, ip, userAgent, result: 'success', user_id: user.user_id });
  return { token: this.jwt.sign({ userId: user.user_id, role: user.role, brand_scopes: user.brand_scopes }) };
}
```

### 1.6 Logout token invalidation (R-AUTH-6)

**Pattern**: endpoint `POST /admin/auth/logout` decodifica el JWT (sin verify), extrae `jti` + `exp`, inserta en `revoked_tokens` con `expires_at = exp`. Cleanup job purga rows expirados daily.

```ts
async logout(token: string, userId: string): Promise<void> {
  const decoded = jwt.decode(token) as DecodedJwt;
  await this.revokedTokenRepo.insert({
    token_jti: decoded.jti,
    revoked_by: userId,
    reason: 'logout',
    expires_at: new Date(decoded.exp * 1000),
  });
}
```

---

## 2. Atomicity Patterns

### 2.1 Activation race condition (Q3=A — DB constraint + retry)

**Pattern**: el unique partial index `WHERE status='active'` previene 2 versiones activas. La transacción de activación:

```sql
BEGIN;
UPDATE brand_config_versions SET status='archived', archived_at=NOW()
  WHERE brand=$1 AND status='active';
UPDATE brand_config_versions SET status='active', activated_at=NOW()
  WHERE version_id=$2 AND status IN ('approved', 'archived');
COMMIT;
```

**Race scenario**:
- T1: BEGIN; UPDATE archive; INSERT/UPDATE active version A; COMMIT.
- T2 (paralelo): BEGIN; UPDATE archive (no-op); UPDATE active version B → unique violation 23505 → ROLLBACK.
- T2 receives 23505 → catch en application layer → retorna `409 Conflict` al cliente: "Otra activación está en progreso, reintenta".

**Implementación en service**:
```ts
async activate(versionId: string): Promise<void> {
  try {
    await this.repo.activateInTx(versionId);
  } catch (err) {
    if (err.code === '23505') { // unique violation
      throw new ConflictError('concurrent activation; retry');
    }
    throw err;
  }
}
```

**Justificación**: cero overhead de locks; conflict es raro (3-5 operators).

### 2.2 Sign-off + state transition atomicidad

**Pattern**: la transición de `draft → approved` requiere INSERT en `sign_offs` Y UPDATE en `brand_config_versions`. Ambos en una TX.

```ts
async approve(versionId: string, approver: ApproverIdentity, comment: string): Promise<void> {
  await this.pool.tx(async (client) => {
    const result = await client.query(
      `UPDATE brand_config_versions SET status='approved'
       WHERE version_id=$1 AND status='draft' RETURNING version_id`,
      [versionId]
    );
    if (result.rowCount === 0) throw new ConflictError('version not in draft state');
    await client.query(
      `INSERT INTO sign_offs (version_id, approver_id, decision, comment, signed_at, approved_on_behalf_of)
       VALUES ($1, $2, 'approved', $3, NOW(), $4)`,
      [versionId, approver.userId, comment, approver.onBehalfOf]
    );
  });
}
```

**Si la TX falla**: state queda en `draft`, no hay sign-off huérfano.

---

## 3. Server-rendered UI integration patterns (Q2=A)

### 3.1 `@fastify/view` con EJS

**Pattern**: registrar plugin `@fastify/view` apuntando a `hermes/src/views/`. Cada controller que renderea HTML llama `reply.view('template.ejs', data)`.

```ts
// hermes/src/plugins/view.plugin.ts
import view from '@fastify/view';
import ejs from 'ejs';

fastify.register(view, {
  engine: { ejs },
  root: path.join(__dirname, '../views'),
  layout: 'layouts/main.ejs',
  options: { async: true },
});
```

**Estructura de views**:
```
hermes/src/views/
├── layouts/main.ejs           # layout base con header/nav/footer
├── admin/login.ejs
├── admin/dashboard.ejs
├── admin/version-detail.ejs
├── admin/version-editor.ejs
└── _partials/                  # componentes reutilizables
    ├── status-badge.ejs
    ├── diff-viewer.ejs
    └── toast.ejs
```

### 3.2 Static assets

**Pattern**: `@fastify/static` sirve `hermes/src/public/admin/` para CSS + assets del BM UI.

```ts
fastify.register(staticPlugin, {
  root: path.join(__dirname, '../public/admin'),
  prefix: '/admin/assets/',
});
```

**Sin bundler** para el BM UI — vanilla CSS + vanilla JS si requerido (R-UI-1 polling, R-UI-2 confirmations).

### 3.3 Form posting + redirect pattern

**Pattern** clásico server-rendered:
- GET muestra form
- POST procesa + redirect a GET de detalle (Post/Redirect/Get pattern)
- Errors muestran el form con mensajes inline (re-render same template con `errors` data)

```ts
fastify.post('/admin/brands/:brand/configs', {
  preHandler: [fastify.authenticate, fastify.requireBrandScope],
  schema: { body: createDraftSchema /* Zod */ }
}, async (req, reply) => {
  try {
    const version = await brandConfigService.submit(req.body);
    return reply.redirect(`/admin/brands/${req.params.brand}/configs/${version.versionId}`);
  } catch (err) {
    if (err instanceof ValidationError) {
      return reply.view('admin/version-editor.ejs', { errors: err.details, draft: req.body });
    }
    throw err;
  }
});
```

---

## 4. Diff Visualization (Q4=A — server-side render)

**Pattern**: backend usa `diff` (jsdiff) para calcular diff entre dos versiones. Renderea HTML con clases CSS para add/remove.

```ts
// hermes/src/services/diff.service.ts
import { diffLines } from 'diff';

interface DiffPart { type: 'add' | 'remove' | 'unchanged'; value: string; }

class DiffService {
  computeTextDiff(oldText: string, newText: string): DiffPart[] {
    return diffLines(oldText, newText).map((part) => ({
      type: part.added ? 'add' : part.removed ? 'remove' : 'unchanged',
      value: part.value,
    }));
  }

  computeJsonDiff(oldObj: unknown, newObj: unknown): DiffPart[] {
    // serialize stable + compute textual diff
    return this.computeTextDiff(
      JSON.stringify(oldObj, null, 2),
      JSON.stringify(newObj, null, 2)
    );
  }
}
```

**EJS partial**:
```ejs
<!-- _partials/diff-viewer.ejs -->
<div class="diff">
  <% diff.forEach(part => { %>
    <span class="diff-<%= part.type %>"><%= part.value %></span>
  <% }) %>
</div>
```

**CSS** (en `public/admin/css/admin.css`):
```css
.diff-add { background-color: #e6ffed; color: #22863a; }
.diff-remove { background-color: #ffeef0; color: #b31d28; text-decoration: line-through; }
.diff-unchanged { color: #586069; }
```

---

## 5. Logging + Audit Patterns

### 5.1 Auth audit logging (R-AUTH-7)

**Pattern**: cada login attempt (success o fail), logout, expired token use → INSERT en `auth_audit_log`. Servicio dedicado `AuthAuditService`.

```ts
class AuthAuditService {
  async write(entry: {
    email: string;
    ip: string;
    user_agent: string;
    result: 'success' | 'invalid_password' | 'user_not_found' | 'locked' | 'expired_token';
    user_id?: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_audit_log (email, ip, user_agent, result, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [entry.email, entry.ip, entry.user_agent.substring(0, 500), entry.result, entry.user_id ?? null]
    );
  }
}
```

**No PII de cliente final** — solo identidad del BM user. SECURITY-03 cumple porque el email del BM es identidad del usuario, no PII del cliente.

### 5.2 Brand config change logging

**Pattern**: cada transición de estado en `brand_config_versions` también se loguea como evento pino (no nueva tabla; ya tenemos audit trail vía `sign_offs` + timestamps en la tabla principal).

```ts
fastify.log.info({
  event: 'brand_config_state_change',
  version_id: versionId,
  brand,
  from: oldStatus,
  to: newStatus,
  actor_id: req.user.userId,
}, 'brand config state changed');
```

---

## 6. Reliability Patterns adicionales

### 6.1 Cleanup jobs (in-process node-cron como Unit 1)

**Pattern**: nuevos jobs registrados en `hermes/src/jobs/job-runner.ts`:

| Job | Schedule | Acción |
|---|---|---|
| `revoked-tokens-cleanup.job` | daily 00:00 UTC | DELETE FROM revoked_tokens WHERE expires_at < NOW() |
| `auth-audit-retention.job` | weekly (lunes 00:00 UTC) | DELETE FROM auth_audit_log WHERE timestamp < NOW() - 90 days |
| `bm-user-unlock.job` | cada 15 min | UPDATE brand_manager_users SET locked_until=NULL WHERE locked_until < NOW() |

**Justificación**: jobs in-process consistentes con Unit 1. Sin queue externa.

### 6.2 Defensive read del dashboard (R-UI-1)

**Pattern**: el BM UI hace polling cada 30s para refresh la lista de versiones. Cliente JS mínimo:

```html
<!-- en dashboard.ejs -->
<script>
  setInterval(async () => {
    const res = await fetch('/admin/brands/<%= brand %>/configs.json', {
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      // Update DOM if changed (simple diff)
    }
  }, 30000);
</script>
```

**Server endpoint dual**: misma ruta sirve HTML (default) o JSON (cuando `Accept: application/json`). `@fastify/accepts` o detección manual en handler.

---

## 7. Security Patterns adicionales

### 7.1 CSRF protection

**Pattern**: aunque BM UI usa JWT (no cookies), POST forms tradicionales podrían ser víctimas de CSRF si el JWT estuviera en cookie. **MVP**: JWT en sessionStorage + Authorization header → CSRF mitigated by design. NO se requiere CSRF token.

### 7.2 Session storage scope

**Pattern** (de FD frontend-components.md): JWT en `sessionStorage` (no localStorage). Scope al tab. Cierre del tab = logout implícito (el server-side blacklist NO se actualiza, pero el token expira naturalmente en 8h).

### 7.3 Login endpoint anti-enumeration

**Pattern**: mensaje genérico "credenciales inválidas" en TODOS los failure modes:
- user not found
- invalid password
- locked account
- inactive account

**Justificación**: previene enumeration de emails válidos. La diferencia se loguea internamente en `auth_audit_log.result` para análisis posterior.

---

## 8. Out of scope MVP (patterns que NO aplican)

- ❌ Refresh tokens (single 8h token MVP)
- ❌ MFA flows (TOTP, WebAuthn) → Fase 2
- ❌ SSO federation (SAML, OIDC) → Fase 2
- ❌ Session keepalive on activity → Fase 2
- ❌ JWT rotating keys con `kid` → Fase 2
- ❌ CSRF tokens (no aplica con JWT en header) → not needed
- ❌ Password reset flow → MVP usa admin script para reset

---

## 9. Security Compliance Summary

| Rule | Pattern aplicado |
|---|---|
| SECURITY-04 | §3.2 helmet headers via `@fastify/helmet` (heredado Unit 1) + X-Frame-Options DENY en admin |
| SECURITY-05 | §3.3 Zod validation en cada admin handler |
| SECURITY-06 | §1.4 brand scope middleware enforza least-priv runtime |
| SECURITY-08 | §1.3 + §1.4 auth + scope; §7.3 anti-enumeration en login |
| SECURITY-09 | §7.3 mensaje genérico; sin info leak en errors (heredado de Unit 1 CC-2) |
| SECURITY-10 | bcrypt 5.x + jsonwebtoken 9.x + ejs 3.x pinneados en lockfile |
| SECURITY-11 | §1, §2, §4 separation of concerns: auth, atomicity, UI rendering distintos |
| SECURITY-12 | §1.1 bcrypt + §1.2 JWT + §1.5 brute-force + §1.6 logout invalidation |
| SECURITY-13 | §2 TX atomicity + §5.1 audit append-only |
| SECURITY-14 | §5.1 audit log con retention enforced via cleanup job §6.1 |
| SECURITY-15 | Heredado Unit 1 CC-2 global error handler; nuevas error classes (UnauthorizedError, ForbiddenError, ConflictError) en hierarchy |

*No hay findings bloqueantes en este stage.*
