# anna

Base para un SaaS de sesiones de WhatsApp. Incluye API (Hono), workers para outbox y consumo de eventos, y arquitectura con eventos de dominio sobre Redis Streams + Postgres. Pensado para crecer hacia planes/suscripciones, métricas y backoffice.

## Indice
- Requisitos
- Instalacion
- Infra
- Migraciones
- Levantar en desarrollo
- Levantar en produccion
- Endpoints rapidos
- Flujo de login
- Observabilidad
- Documentacion
- Scripts
- Pendientes

## Requisitos
- Bun v1.3.x
- Docker (Dragonfly y Postgres)
- psql opcional (si no usas el runner)

## Instalacion

```bash
bun install
```

## Infra (Dragonfly + Postgres)

```bash
docker compose up -d
```

Dashboard (Prometheus + Grafana):
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3005` (admin/admin)
  - Importa `grafana/dashboard.json` para un panel listo.

Defaults (sobrescribibles por env):
- `DATABASE_URL=postgres://anna:anna@localhost:5432/anna`
- `REDIS_URL=redis://localhost:6379`
- `LOG_LEVEL=info`
- `LOG_PRETTY=true` (solo dev)
- `OTEL_SERVICE_NAME=anna`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces`
- `APP_BASE_URL=http://localhost:3000`
- `AUTH_JWT_SECRET=dev-secret-change-me`
- `AUTH_ACCESS_TOKEN_TTL_MS=900000`
- `AUTH_REFRESH_TOKEN_TTL_MS=2592000000`
- `AUTH_REFRESH_COOKIE_NAME=refresh_token`
- `AUTH_COOKIE_SECURE=false`
- `AUTH_PASSWORD_RESET_TTL_MS=3600000`
- `METRICS_PORT=9100`
- `EVENTS_STREAM=domain-events`
- `EVENTS_DLQ_STREAM=domain-events-dlq`
- `EVENTS_GROUP=domain-events-group`
- `EVENTS_CONSUMER=consumer-<pid>`
- `EVENTS_MAX_ATTEMPTS=5`
- `EVENTS_BACKOFF_MS=1000`
- `EVENTS_BACKOFF_MAX_MS=30000`
- `EVENTS_CLAIM_IDLE_MS=5000`
- `EVENTS_CLAIM_INTERVAL_MS=2000`
- `SESSIONS_QR_TTL_MS=60000`
- `SESSIONS_PRINT_QR=false`
- `SESSIONS_MARK_ONLINE=false`
- `SESSIONS_BROWSER_NAME=Anna`
- `SESSIONS_COMMAND_STREAM=session-commands`
- `SESSIONS_COMMAND_GROUP=session-commands-group`
- `SESSIONS_COMMAND_CONSUMER=session-consumer-<pid>`
- `SESSIONS_COMMAND_BLOCK_MS=5000`
- `SESSIONS_COMMAND_BATCH_SIZE=25`
- `SESSIONS_COMMAND_DLQ_STREAM=session-commands-dlq`

## Migraciones

Outbox (opcional si usas `db:outbox`):
```bash
docker compose exec -T postgres psql -U anna -d anna -f - < database/outbox.sql
```

Runner outbox (usa `DATABASE_URL`):
```bash
bun run db:outbox
```

Migraciones de dominio:
```bash
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0001__users.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0002__refresh_tokens.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0003__session_auth.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0004__sessions.sql
```

Runner de migraciones (usa `DATABASE_URL`):
```bash
bun run db:migrate
```

## Levantar en desarrollo
1) Infra:
```bash
docker compose up -d
```

2) Base de datos:
```bash
bun run db:outbox
bun run db:migrate
```

3) Workers y API:
```bash
bun run worker:outbox
bun run worker:events
bun run worker:sessions
bun run app:hono
```

## Levantar en produccion
1) Provisiona Postgres y Redis, y define variables reales:
- `DATABASE_URL` (con SSL si aplica)
- `REDIS_URL`
- `AUTH_JWT_SECRET` (secreto fuerte)
- `AUTH_COOKIE_SECURE=true`
- `RESEND_API_KEY` y `RESEND_FROM`
- `APP_BASE_URL` (dominio real)

2) Aplica esquema y migraciones:
```bash
bun run db:outbox
bun run db:migrate
```

3) Ejecuta procesos (API + workers) con un process manager (systemd/pm2/Docker):
- `bun run app:hono`
- `bun run worker:outbox`
- `bun run worker:events`
- `bun run worker:sessions`

## Endpoints rapidos

Crear usuario:
```bash
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"SuperSecure123!"}'
```

Consultar usuario:
```bash
curl http://localhost:3000/users/me \
  -H 'Authorization: Bearer <accessToken>'
```

Login (setea refresh token en cookie):
```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecure123!"}'
```

Refresh (usa cookie refresh token):
```bash
curl -X POST http://localhost:3000/auth/refresh
```

Logout (revoca refresh token):
```bash
curl -X POST http://localhost:3000/auth/logout
```

Logout all (revoca todas las sesiones del usuario actual):
```bash
curl -X POST http://localhost:3000/auth/logout-all \
  -H 'Authorization: Bearer <accessToken>'
```

Reenviar verificacion:
```bash
curl -X POST http://localhost:3000/auth/resend-verification \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com"}'
```

Solicitar reset de password:
```bash
curl -X POST http://localhost:3000/auth/password-reset \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com"}'
```

Confirmar reset de password:
```bash
curl -X POST http://localhost:3000/auth/password-reset/confirm \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","token":"<token>","newPassword":"NewPassword123!"}'
```

## Sesiones (WhatsApp)
Los endpoints de sesiones publican comandos en Redis y el worker de sesiones los procesa. La respuesta es `202` porque el flujo es asincrono.

Crear sesion:
```bash
curl -X POST http://localhost:3000/sessions \
  -H 'Authorization: Bearer <accessToken>'
```

Detener sesion:
```bash
curl -X POST http://localhost:3000/sessions/<sessionId>/stop \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"reason":"logout"}'
```

Enviar mensaje:
```bash
curl -X POST http://localhost:3000/sessions/<sessionId>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"to":"<jid>","content":"Hola!"}'
```

WebSocket de eventos (solo sesiones del tenant autenticado):
```
ws://localhost:3000/ws/sessions?accessToken=<accessToken>
```

Eventos esperados:
- `session.created`
- `session.qr.updated`
- `session.status.connected`
- `session.status.disconnected`

Demo UI:
- `http://localhost:3000/demo/sessions`

## Flujo de login (registro -> verificacion -> acceso)
1) Registrar usuario (crea token de verificacion).
2) Verificar cuenta (codigo o token):
   - El codigo se imprime en consola del worker: `[UserVerificationCode]`.
   - El token viene en el link del email.
3) Login (access token + refresh cookie).
4) Consumir API con access token.

## Observabilidad
- Logs estructurados con `pino`.
- Logs legibles en dev con `LOG_PRETTY=true`.
- Metricas Prometheus en `/metrics` (API) y workers si defines `METRICS_PORT`.
- Tracing OpenTelemetry (OTLP HTTP) con `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Documentacion
- `docs/architecture.md` (capas, contexto, outbox)
- `docs/auth.md` (flujos de login/verificacion/refresh)

## Scripts
- `bun run app:hono`
- `bun run worker:outbox`
- `bun run worker:events`
- `bun run db:outbox`
- `bun run db:migrate`
- `bun test`
- `bun test --coverage`
- `bun x tsc --noEmit`

## Pendientes para nivel profesional
- Healthchecks para API y workers.
- Rate limiting en auth.
- Runner unico `db:setup` (outbox + migraciones).
- Idempotencia end-to-end para comandos.
- CI/CD y despliegue automatizado.

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
