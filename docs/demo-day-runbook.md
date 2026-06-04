# Demo Day Runbook — Unit 1 (Core Agente)

Stack: Docker Desktop (WSL2) en laptop Windows 11 de Johan.

---

## 1. Pre-requisitos

| Item | Quién |
|---|---|
| Docker Desktop instalado con WSL2 backend | Johan |
| Cuenta AWS con Bedrock **sa-east-1** activo y **Claude Haiku 4.5** desplegado | Johan (ya verificado) |
| `.env` con secrets reales (ver abajo) | Johan |
| Cloudflare Tunnel (opcional, para exponer a SFCC sandbox) | Johan |

## 2. Archivo `.env`

```bash
cd hermes
cp .env.example .env
```

Editar `.env` y dejar estos valores (los `CHANGE_ME` se reemplazan):

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# DB — Docker compose crea la DB automáticamente
DATABASE_URL=postgresql://hermes_app:app_pass@postgres-pgvector:5432/hermes
POSTGRES_ROOT_PASSWORD=root_pass
PG_APP_PASSWORD=app_pass
PG_RETENTION_PASSWORD=retention_pass

# Bedrock
BEDROCK_REGION=sa-east-1
BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5:0
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# SFCC — mock para demo sin conexión real
SFCC_MODE=mock
SFCC_BASE_URL=
SFCC_CLIENT_ID=
SFCC_CLIENT_SECRET=

# PII salt — mínimo 32 caracteres
PII_SALT=cl4v3_d3m0_p4tpr1m0_2026_j0h4n_32ch4rs
ALLOWED_ORIGINS=*

# Mail — mailhog local (no necesita credenciales)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM=hermes@patprimo.local
```

## 3. Levantar todo

```bash
cd hermes

# Build image + start containers
docker compose up -d --build

# Ver logs hasta que esté listo
docker compose logs -f hermes
```

Esperar a que aparezca:

```
Hermes startup ==>
Running migrations...
Migrations applied successfully
Running seed...
Patprimo brand config seeded successfully
Starting Hermes server...
Hermes listening on port 3000
```

## 4. Verificar salud

```bash
# Alive check (sin DB)
curl http://localhost:3000/health
# → {"status":"ok"}

# Readiness check (con DB)
curl http://localhost:3000/health/ready
# → {"status":"ready"}

# Widget config
curl "http://localhost:3000/widget/config?brand=patprimo"
# → {"brand":"patprimo","customerFacingName":"Sofía de Patprimo","consentRequestText":"Soy Sofía, asistente virtual de Patprimo.¿Me autoriza procesar sus datos para esta consulta?",...}
```

## 5. Demo — consultar estado de pedido (Caso 1)

```bash
# 5a. Enviar mensaje sin consentimiento → recibe solicitud de consentimiento
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "brand": "patprimo",
    "message": "Hola, quiero saber el estado de mi pedido PP-2026-0001"
  }'

# 5b. Cliente acepta consentimiento
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "brand": "patprimo",
    "message": "Sí, acepto"
  }'

# 5c. Consulta el estado del pedido (ahora con consentimiento)
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "brand": "patprimo",
    "message": "¿Cuál es el estado de mi pedido PP-2026-0001?"
  }'
# → "Su pedido PP-2026-0001 está en tránsito con TCC. Número de guía: TCC-987654321. Llegada estimada: 2026-06-05."
```

## 6. Órdenes de prueba disponibles (modo mock)

| Order ID | Estado | ETA |
|---|---|---|
| PP-2026-0001 | En tránsito | 2026-06-05 |
| PP-2026-0002 | Entregado | — |
| PP-2026-0003 | Procesando | 2026-06-10 |
| PP-2026-0004 | Cancelado | — |

## 7. Parar todo

```bash
docker compose down -v
```

La flag `-v` elimina el volumen de Postgres. Si quieres preservar datos (para no tener que re-ejecutar seed en el próximo `up`), omite `-v`:

```bash
docker compose down
```

## 8. Integración SFCC real (si aplica)

**Solo si la sandbox SFCC está disponible.** Requiere:

1. `.env` con `SFCC_MODE=real`, `SFCC_BASE_URL`, `SFCC_CLIENT_ID`, `SFCC_CLIENT_SECRET` válidos.
2. Cloudflare Tunnel exponiendo `localhost:3000` (para que SFCC pueda llamar al webhook).
3. El cartridge `int_hermes` instalado en la sandbox SFCC.

Pasos:

```bash
# Tunnel
cloudflared tunnel --url http://localhost:3000

# Luego verificar que SFCC puede consultar el webhook
curl https://<tunnel-url>.trycloudflare.com/health
```

## 9. Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `health/ready` retorna 503 | DB no conecta | `docker compose logs postgres-pgvector` |
| `chat` retorna 500 con "INTERNAL_ERROR" | Error interno del pipeline | `docker compose logs hermes` para ver el stack trace |
| `Bedrock` timeout | Region incorrecta o modelo no desplegado | Verificar `aws bedrock list-foundation-models --region sa-east-1` |
| Migration falla | Roles de DB no existen | Verificar `docker-init/01-create-roles.sql` se ejecutó |
| No se encuentra `fixtures/demo-orders.json` | Path incorrecto | En SFCC_MODE=mock, el archivo debe estar en `hermes/fixtures/demo-orders.json` |

## 10. Widget en SFCC (cartridge demo)

```html
<script src="https://<tunnel-url>/widget/widget.js"></script>
<link rel="stylesheet" href="https://<tunnel-url>/widget/widget.css">
<script>
  HermesWidget.init({
    apiBaseUrl: 'https://<tunnel-url>',
    brand: 'patprimo',
    primaryColor: '#C41E3A',
    onPrimaryColor: '#FFFFFF',
  });
</script>
```
