# Arquitectura

## Visión general
La app sigue un enfoque DDD ligero con capas separadas y eventos de dominio. El flujo principal es:
- API Hono -> comandos/queries -> dominio -> eventos -> outbox -> Redis Streams -> workers (subscribers).

## Capas
- **Domain**: entidades, value objects, errores y eventos (`src/contexts/**/domain`).
- **Application**: casos de uso y servicios de orquestación (`src/contexts/**/application`).
- **Infrastructure**: repos, buses, outbox, email, logging, redis, postgres (`src/contexts/**/infrastructure`).

## Contextos
- **Core/User**: registro, verificación, reset de password, estados de usuario.
- **Core/Auth**: login, refresh, logout, emisión de tokens y rotación.
- **Shared**: buses, outbox, observabilidad, DI, utilidades comunes.

## Eventos y Outbox
- Los agregados publican eventos de dominio.
- `RedisStreamEventBus` escribe en Postgres (outbox) y publica a Redis Streams.
- `outbox-dispatcher` reintenta publicaciones pendientes.
- `event-consumer` procesa eventos y ejecuta subscribers.
- Fallos en consumidores -> reintentos con backoff -> DLQ (`domain-events-dlq`) -> fallback `dead_letters` en Postgres.

## Observabilidad
- Logs con `pino`.
- Métricas Prometheus en `/metrics`.
- Tracing con OpenTelemetry (OTLP HTTP).

## API
- Hono con controllers por endpoint.
- Middleware de auth con `c.set('auth')` tipado via `AppEnv`.

## DI / Bootstrap
- `buildAppContext` arma repos, buses, servicios y casos de uso.
- Tokens, hash y firma JWT se inyectan por infraestructura.
