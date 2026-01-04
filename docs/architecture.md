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
- **Core/Session**: sesiones de WhatsApp (Baileys), QR, estado y reconnect.
- **Shared**: buses, outbox, observabilidad, DI, utilidades comunes.

## MVP de negocio (propuesta)
Objetivo: habilitar sesiones de WhatsApp para enviar/recibir mensajes desde una API, con base segura de usuarios.

Flujo mínimo:
1) Usuario se registra y verifica su cuenta.
2) Crea una sesión de WhatsApp.
3) Recibe QR y conecta el dispositivo.
4) Envía mensajes desde la API.
5) Recibe eventos de mensajes entrantes.

Bounded contexts sugeridos:
- **Core/User**: identidad, estados, verificación, seguridad.
- **Core/Auth**: autenticación, tokens, sesiones de acceso.
- **Core/Session** (nuevo): sesiones de WhatsApp, QR, estado, reconexión.
- **Core/Messaging** (nuevo): envío/recepción, idempotencia y tracking.

Entidades clave (MVP):
- `Session`: estado (`pending_qr`, `connected`, `disconnected`), `phone`, `tenantId`.
- `Message`: `messageId`, `direction` (in/out), `status`, `content`.
- `Chat`: `chatJid`, `lastMessageId`, `lastMessageTs`, `unreadCount`.

Eventos clave (MVP):
- `session.created`, `session.qr.updated`, `session.status.connected`, `session.status.disconnected`
- `session.history.sync`, `session.messages.upsert`
- `message.sent`, `message.received`, `message.failed`

## Eventos y Outbox
- Los agregados publican eventos de dominio.
- `RedisStreamEventBus` escribe en Postgres (outbox) y publica a Redis Streams.
- `outbox-dispatcher` reintenta publicaciones pendientes.
- `event-consumer` procesa eventos y ejecuta subscribers.
- Fallos en consumidores -> reintentos con backoff -> DLQ (`domain-events-dlq`) -> fallback `dead_letters` en Postgres.

Notas MVP:
- Los comandos de sesión pueden ir a un stream dedicado (ej. `session-commands`).
- El worker de sesiones consume comandos y emite eventos al stream principal (`domain-events`).

## Flujo de sesiones (comandos + eventos)
1) **API (Hono)** publica comandos en `session-commands`:
   - `POST /sessions` -> `session.start`
   - `POST /sessions/:id/stop` -> `session.stop`
   - `POST /sessions/:id/messages` -> `session.sendMessage`

2) **Worker de sesiones** consume comandos:
   - `RedisSessionCommandConsumer` ejecuta `SessionService`.
   - `StartSession` crea el agregado y abre Baileys.

3) **Persistencia de auth state**:
   - Baileys guarda `creds` y `keys` en Postgres (`session_auth_creds`, `session_auth_keys`).

4) **Eventos de dominio**:
   - El agregado emite `session.created`, `session.qr.updated`, `session.status.connected`, `session.status.disconnected`.
   - El worker de sesiones tambien emite `session.history.sync` y `session.messages.upsert` a partir de eventos de Baileys.
   - Se guardan en outbox y se publican a `domain-events`.

5) **Persistencia de chats/mensajes (event-consumer)**:
   - `session.history.sync` y `session.messages.upsert` se persisten en Postgres.
   - Tablas: `session_messages` (historial) y `session_chats` (resumen por chat).

6) **Realtime WebSocket**:
   - La API consume `domain-events` y emite a `ws://.../ws/sessions`.
   - Filtra por `tenantId` y solo envía eventos del usuario autenticado.

## Observabilidad
- Logs con `pino`.
- Métricas Prometheus en `/metrics`.
- Tracing con OpenTelemetry (OTLP HTTP).

## API
- Hono con controllers por endpoint.
- Middleware de auth con `c.set('auth')` tipado via `AppEnv`.

Endpoints esperados para el MVP (propuestos):
- `POST /sessions` crea sesión y devuelve `sessionId`.
- `POST /sessions/:id/messages` envía mensaje.
- `POST /webhooks/messages` recepción de mensajes entrantes.
- `GET /chats` lista chats persistidos por tenant/sesión.
- `GET /chats/:jid/messages` historial paginado por chat.
- `POST /chats/:jid/messages` envía mensaje por chat.

## DI / Bootstrap
- `buildAppContext` arma repos, buses, servicios y casos de uso.
- Tokens, hash y firma JWT se inyectan por infraestructura.
