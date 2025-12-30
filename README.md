# anna

Proyecto base para un SaaS orientado a sesiones de WhatsApp. Provee una API simple con Hono, workers para outbox y consumo de eventos, y una arquitectura con eventos de dominio sobre Redis Streams + Postgres. El objetivo es ofrecer una base confiable para manejo de sesiones, mensajería y observabilidad, dejando listo el camino para crecer hacia planes/suscripciones, métricas y backoffice.

## Requisitos
- Bun v1.3.x
- Docker (para Dragonfly y Postgres)
- psql (para ejecutar el schema del outbox)

## Instalación

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

Defaults (puedes sobrescribir con variables de entorno):
- `DATABASE_URL=postgres://anna:anna@localhost:5432/anna`
- `REDIS_URL=redis://localhost:6379`
- `LOG_LEVEL=info`
- `OTEL_SERVICE_NAME=anna`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces`
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

## Schema del Outbox

```bash
psql "$DATABASE_URL" -f database/outbox.sql
```

DLQ fallback (Postgres):
- Se guarda en la tabla `dead_letters` si falla el stream de DLQ.

## Workers

Terminal 1:
```bash
bun run worker:outbox
```

Terminal 2:
```bash
bun run worker:events
```

Para métricas de workers:
- `METRICS_PORT=9102 bun run worker:outbox`
- `METRICS_PORT=9101 bun run worker:events`

## API (Hono)
```bash
bun run app:hono
```

## Documentacion
- `docs/architecture.md` (capas, contexto y outbox)
- `docs/auth.md` (flujos de login/verificacion/refresh)

## Probar endpoints

Usa el archivo `api.http` en tu IDE o con `curl`:

```bash
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"SuperSecure123!"}'
```

Luego consulta:

```bash
curl http://localhost:3000/users/me \
  -H 'Authorization: Bearer <accessToken>'
```

Login (devuelve access token y setea refresh token en cookie):
```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecure123!"}'
```

Refresh (usa la cookie refresh token):
```bash
curl -X POST http://localhost:3000/auth/refresh
```

Logout (revoca refresh token):
```bash
curl -X POST http://localhost:3000/auth/logout
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

## Flujo de login (registro -> verificacion -> acceso)
1) Registrar usuario:
```bash
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"SuperSecure123!"}'
```

2) Verificar cuenta (codigo o token):
- El codigo se imprime en consola del worker: `[UserVerificationCode]`.
- El token viene en el link que se arma en el email.
```bash
curl -X POST http://localhost:3000/users/<user_id>/verify \
  -H 'Content-Type: application/json' \
  -d '{"code":"<verification_code>"}'
```

3) Login (devuelve access token y setea refresh cookie):
```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"SuperSecure123!"}'
```

4) Consumir API con access token:
```bash
curl http://localhost:3000/users/me \
  -H 'Authorization: Bearer <accessToken>'
```

## Observabilidad
- Logs estructurados con `pino`.
- Métricas Prometheus en `/metrics` (API) y en workers si defines `METRICS_PORT`.
- Tracing con OpenTelemetry (OTLP HTTP) si defines `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Validaciones de dominio
- `UserEmail` valida formato de email.
- `UserName` valida que no sea vacio (trim).
- `UserId` valida UUID (via `Uuid`).

## Session Worker (propuesta)
- Proceso separado que consume comandos de sesiones y mantiene sockets de Baileys.
- Entradas: stream de comandos (ej. `session-commands`).
- Salidas: eventos al stream (ej. `session-events` o `domain-events`) via outbox.
- Storage: credenciales/estado en Redis o Postgres (idealmente cifrado).
- Idempotencia: cada comando con `commandId` y dedupe en Redis/DB.

## Esquema de comandos (propuesto)
- `session.create`: `{ commandId, sessionId, tenantId, phone?, metadata? }`
- `session.close`: `{ commandId, sessionId, tenantId, reason? }`
- `session.sendMessage`: `{ commandId, sessionId, tenantId, to, messageId, content }`
- `session.reconnect`: `{ commandId, sessionId, tenantId }`

## Esquema de eventos (propuesto)
- `session.created`: `{ eventId, sessionId, tenantId }`
- `session.qr.updated`: `{ eventId, sessionId, tenantId, qr, expiresAt }`
- `session.status.connected`: `{ eventId, sessionId, tenantId, phone, connectedAt }`
- `session.status.disconnected`: `{ eventId, sessionId, tenantId, reason, disconnectedAt }`
- `session.message.received`: `{ eventId, sessionId, tenantId, messageId, from, content, timestamp }`
- `session.message.sent`: `{ eventId, sessionId, tenantId, messageId, to, status }`
- `session.error`: `{ eventId, sessionId, tenantId, code, message }`

## Pendientes para nivel profesional
- Observabilidad: logs estructurados, métricas (latencia, fallos), tracing.
- Healthchecks: endpoints o señales de vida para API y workers.
- Testing: unitarios para dominio + integración para outbox/streams.
- Migraciones: herramienta formal (Prisma/Knex/Flyway) y versionado.
- Seguridad: autenticación, autorización, rate limiting, secrets.
- Persistencia real de usuarios: hoy es `InMemoryUserRepository`.
- Manejo de errores de dominio en la API (respuestas 4xx claras).
- Idempotencia end‑to‑end: contratos claros y dedupe en comandos.
- Configuración por entorno: `.env`, validación y secrets management.
- CI/CD: lint, tests, build y despliegue automático.

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
