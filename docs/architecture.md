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
- **Core/Session**: sesiones de WhatsApp (Baileys), QR, estado, persistencia de auth state, mensajes y chats.
- **Shared**: buses, outbox, observabilidad, DI, utilidades comunes.

## Estado actual (backend)
Objetivo: habilitar sesiones de WhatsApp para enviar/recibir mensajes desde una API con persistencia en Postgres y streaming de eventos.

Flujo mínimo:
1) Usuario se registra y verifica su cuenta.
2) Crea una sesión de WhatsApp.
3) Recibe QR y conecta el dispositivo.
4) Envía mensajes desde la API.
5) Recibe eventos de mensajes entrantes.

Entidades y persistencia clave:
- `Session`: estado (`pending_qr`, `connected`, `disconnected`), `phone`, `tenantId`.
- `session_messages`: historial por chat con `message_id`, `from_me`, `timestamp`, `raw`, `status`, `is_edited`, `is_deleted`.
- `session_message_reactions`: reacciones por mensaje (emoji, actor, removed).
- `session_message_media`: media por mensaje (url, mime, size, dimensiones).
- `session_chats`: resumen por chat (`lastMessageTs`, `lastMessageText`, `unreadCount`).
- `session_contacts`: contactos/perfiles por sesion (`name`, `notify`, `imgUrl`, `status`).

Eventos clave:
- `session.created`, `session.qr.updated`, `session.status.connected`, `session.status.disconnected`
- `session.history.sync`, `session.messages.upsert`
- `session.contacts.upsert`
- `session.messages.update`
- `session.messages.edit`
- `session.messages.delete`
- `session.messages.reaction`
- `session.messages.media`
- `session.presence.update`

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
   - `POST /chats/:jid/read` -> `session.readMessages`
   - `PATCH /chats/:jid/messages/:messageId` -> `session.editMessage`
   - `DELETE /chats/:jid/messages/:messageId` -> `session.deleteMessage`
   - `POST /chats/:jid/messages/:messageId/reactions` -> `session.reactMessage`

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
  - Tablas: `session_messages` (historial), `session_chats` (resumen por chat), `session_message_reactions` y `session_message_media`.

6) **Persistencia de contactos y status**:
   - `session.contacts.upsert` persiste en `session_contacts`.
   - `session.messages.update` actualiza `status` y `status_at` en `session_messages`.
   - `session.messages.edit` actualiza `text/type` y `edited_at`.
   - `session.messages.delete` marca `is_deleted` y `deleted_at`.
   - `session.messages.reaction` persiste en `session_message_reactions`.
   - `session.messages.media` persiste en `session_message_media`.

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

Endpoints actuales relevantes:
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`.
- `POST /sessions`, `POST /sessions/:id/stop`, `DELETE /sessions/:id`, `POST /sessions/:id/messages`.
- `GET /chats`, `GET /chats/:jid/messages`, `POST /chats/:jid/messages`.
- `POST /chats/:jid/read`, `PATCH /chats/:jid/messages/:messageId`, `DELETE /chats/:jid/messages/:messageId`.
- `POST /chats/:jid/messages/:messageId/reactions`.
- `GET /contacts`.
- WebSocket `ws://.../ws/sessions` con eventos del tenant autenticado.

## DI / Bootstrap
- `buildAppContext` arma repos, buses, servicios y casos de uso.
- Tokens, hash y firma JWT se inyectan por infraestructura.
