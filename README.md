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

## API (elige una)

Elysia:
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
