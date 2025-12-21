# anna

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

Defaults (puedes sobrescribir con variables de entorno):
- `DATABASE_URL=postgres://anna:anna@localhost:5432/anna`
- `REDIS_URL=redis://localhost:6379`
- `LOG_LEVEL=info`
- `OTEL_SERVICE_NAME=anna`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces`
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

## API (Elysia)
```bash
bun run app:elysia
```

## Probar endpoints

Usa el archivo `api.http` en tu IDE o con `curl`:

```bash
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
```

Luego consulta:

```bash
curl http://localhost:3000/users/<id>
```

## Observabilidad
- Logs estructurados con `pino`.
- Métricas Prometheus en `/metrics` (API) y en workers si defines `METRICS_PORT`.
- Tracing con OpenTelemetry (OTLP HTTP) si defines `OTEL_EXPORTER_OTLP_ENDPOINT`.

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
- Idempotencia end‑to‑end: contratos claros y dedupe en comandos.
- Configuración por entorno: `.env`, validación y secrets management.
- CI/CD: lint, tests, build y despliegue automático.

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
