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
- Comparativa WhatsApp Web
- Observabilidad
- Documentacion
- Scripts
- Pendientes

## Requisitos
- Bun v1.3.x
- Docker (Dragonfly y Postgres)
- psql opcional (si no usas el runner)

## Comparativa WhatsApp Web
Estado actual del backend frente a funcionalidades tipicas de WhatsApp Web.

Leyenda:
- Soportado: disponible y documentado.
- Parcial: disponible solo backend o con limitaciones.
- Pendiente: no implementado.

| Feature | Estado | Notas |
| --- | --- | --- |
| Login + refresh token | Soportado | `/auth/login`, `/auth/refresh` |
| QR de sesion | Soportado | `session.qr.updated` |
| Estado conectado/desconectado | Soportado | `session.status.connected/disconnected` |
| Sync historial inicial | Soportado | `session.history.sync` |
| Lista de chats | Soportado | `GET /chats` |
| Mensajes por chat | Soportado | `GET /chats/:jid/messages` |
| Envio de texto | Soportado | `POST /chats/:jid/messages` |
| Reply / Forward | Soportado | `replyToMessageId`, `forwardMessageId` |
| Estados de entrega/lectura | Soportado | `session.messages.update` |
| Lecturas reales | Soportado | `POST /chats/:jid/read` |
| Edicion de mensajes | Soportado | `PATCH /chats/:jid/messages/:messageId` + `session.messages.edit` |
| Borrado de mensajes | Soportado | `DELETE /chats/:jid/messages/:messageId` + `session.messages.delete` |
| Contactos / perfiles | Soportado | `GET /contacts`, `session.contacts.upsert` |
| Presencia / typing | Soportado | `session.presence.update` |
| Multi-sesion por tenant | Parcial | Backend soporta multiples sesiones; frontend aun no |
| Imagen / Video / Audio / Document / Sticker | Soportado | `media` en `GET /chats/:jid/messages` + `session.messages.media` |
| Notas de voz | Soportado | `ptt=true` en envio de audio |
| Reacciones | Soportado | `POST /chats/:jid/messages/:messageId/reactions` + `session.messages.reaction` |
| Estados (stories) | Pendiente | - |
| Llamadas | Pendiente | - |

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

Cloudflare R2 (S3 compatible, bucket publico):
- API endpoint: `https://<account-id>.r2.cloudflarestorage.com`
- Public base URL: `https://<bucket>.<account-id>.r2.dev` (o dominio custom)
- Bucket sugerido: `anna-media`
- Prefijo: `tenants/{tenantId}/sessions/{sessionId}/messages/{messageId}/...`

Opcional: MinIO local (solo si quieres S3 en localhost):
- API: `http://localhost:9000`
- Console: `http://localhost:9001` (minioadmin/minioadmin)

Crear bucket MinIO (opcional):
```bash
docker run --rm --network=host minio/mc \
  alias set local http://localhost:9000 minioadmin minioadmin
docker run --rm --network=host minio/mc mb local/anna-media
```

Defaults (sobrescribibles por env):
- `DATABASE_URL=postgres://anna:anna@localhost:5432/anna`
- `REDIS_URL=redis://localhost:6379`
- `LOG_LEVEL=info`
- `LOG_PRETTY=true` (solo dev)
- `OTEL_SERVICE_NAME=anna`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces`
- `APP_BASE_URL=http://localhost:3000`
- `CORS_ORIGINS=http://localhost:5173`
- `AUTH_JWT_SECRET=dev-secret-change-me`
- `AUTH_ACCESS_TOKEN_TTL_MS=900000`
- `AUTH_REFRESH_TOKEN_TTL_MS=2592000000`
- `AUTH_REFRESH_COOKIE_NAME=refresh_token`
- `AUTH_COOKIE_SAMESITE=Strict`
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
- `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`
- `S3_REGION=auto`
- `S3_ACCESS_KEY=<r2-access-key>`
- `S3_SECRET_KEY=<r2-secret-key>`
- `S3_BUCKET=anna-media`
- `S3_PUBLIC_BASE_URL=https://anna-media.<account-id>.r2.dev`
- `S3_FORCE_PATH_STYLE=false`

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
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0005__session_messages.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0006__session_chats.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0007__session_contacts.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0008__session_message_status.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0009__session_message_edits.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0010__session_message_reactions.sql
docker compose exec -T postgres psql -U anna -d anna -f - < database/migrations/0011__session_message_media.sql
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

4) Frontend (Vite + React):
```bash
cd src/apps/web
bun install
cd ../../..
bun run web:dev
```
Opcional: define `VITE_API_BASE_URL` si la API no corre en `http://localhost:3000`.
UI:
- `http://localhost:5173/login`
- `http://localhost:5173/console`

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

Eliminar sesion (borra auth state en Postgres):
```bash
curl -X DELETE http://localhost:3000/sessions/<sessionId> \
  -H 'Authorization: Bearer <accessToken>'
```

Enviar mensaje:
```bash
curl -X POST http://localhost:3000/sessions/<sessionId>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"to":"<jid>","content":"Hola!"}'
```
Opcional (reply/forward):
```bash
# reply
curl -X POST http://localhost:3000/sessions/<sessionId>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"to":"<jid>","content":"Respuesta","replyToMessageId":"<messageId>"}'

# forward
curl -X POST http://localhost:3000/sessions/<sessionId>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"to":"<jid>","forwardMessageId":"<messageId>"}'
```

Enviar media (2 pasos: upload + send):
```bash
# 1) subir archivo
curl -X POST http://localhost:3000/media \
  -H 'Authorization: Bearer <accessToken>' \
  -F "file=@./photo.jpg" \
  -F "kind=image"

# 2) enviar con media.url
curl -X POST http://localhost:3000/sessions/<sessionId>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"to":"<jid>","media":{"kind":"image","url":"https://.../photo.jpg","mime":"image/jpeg","fileName":"photo.jpg"},"caption":"hola"}'
```

## Chats (backend)
Listar chats (usa la sesion mas reciente del tenant):
```bash
curl http://localhost:3000/chats \
  -H 'Authorization: Bearer <accessToken>'
```

Paginado de mensajes por chat:
```bash
curl "http://localhost:3000/chats/<jid>/messages?limit=50" \
  -H 'Authorization: Bearer <accessToken>'
```
Respuesta incluye `status`, `statusAt`, `replyTo` y `forward` cuando aplica.
Tambien incluye `isEdited`, `editedAt`, `isDeleted`, `deletedAt`.
Incluye `media` si el mensaje tiene imagen/video/audio/documento/sticker y el upload ya termino.

Enviar mensaje por chat:
```bash
curl -X POST http://localhost:3000/chats/<jid>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"content":"Hola!"}'
```
Opcional (reply/forward):
```bash
# reply
curl -X POST http://localhost:3000/chats/<jid>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"content":"Respuesta","replyToMessageId":"<messageId>"}'

# forward
curl -X POST http://localhost:3000/chats/<jid>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"forwardMessageId":"<messageId>"}'
```

Enviar media por chat (2 pasos: upload + send):
```bash
# 1) subir archivo
curl -X POST http://localhost:3000/media \
  -H 'Authorization: Bearer <accessToken>' \
  -F "file=@./audio.ogg" \
  -F "kind=audio"

# 2) enviar con media.url
curl -X POST http://localhost:3000/chats/<jid>/messages \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"media":{"kind":"audio","url":"https://.../audio.ogg","mime":"audio/ogg"},"ptt":true}'
```

Marcar mensajes como leidos:
```bash
curl -X POST http://localhost:3000/chats/<jid>/read \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"messageIds":["<messageId>"]}'
```

Editar mensaje:
```bash
curl -X PATCH http://localhost:3000/chats/<jid>/messages/<messageId> \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"content":"Texto editado"}'
```

Borrar mensaje:
```bash
curl -X DELETE http://localhost:3000/chats/<jid>/messages/<messageId> \
  -H 'Authorization: Bearer <accessToken>'
```

Reaccionar:
```bash
curl -X POST http://localhost:3000/chats/<jid>/messages/<messageId>/reactions \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"emoji":"👍"}'
```

Quitar reaccion:
```bash
curl -X POST http://localhost:3000/chats/<jid>/messages/<messageId>/reactions \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"emoji":null}'
```

## Contactos (backend)
Listar contactos por tenant/sesion:
```bash
curl http://localhost:3000/contacts \
  -H 'Authorization: Bearer <accessToken>'
```

Notas:
- Requiere `worker:events` activo para que `session_chats` y `session_messages` se actualicen.
- Puedes forzar una sesion especifica con `?sessionId=<uuid>` en `GET /chats` y `GET /chats/:jid/messages`.
- Media requiere `S3_*` configurado (R2 o MinIO) y `S3_PUBLIC_BASE_URL` para exponer `media.url` publicas.

WebSocket de eventos (solo sesiones del tenant autenticado):
```
ws://localhost:3000/ws/sessions?accessToken=<accessToken>
```

Eventos esperados (WebSocket):

| Evento | Cuando se emite | Payload clave |
| --- | --- | --- |
| `session.snapshot` | al conectar WS | `session`, `tenantId` |
| `session.created` | sesion creada | `sessionId`, `tenantId` |
| `session.qr.updated` | QR nuevo | `qr`, `expiresAt` |
| `session.status.connected` | sesion conectada | `phone`, `connectedAt` |
| `session.status.disconnected` | sesion desconectada | `reason`, `disconnectedAt` |
| `session.history.sync` | sync inicial | `syncType`, `progress`, `messages[]` |
| `session.messages.upsert` | mensajes en tiempo real | `messages[]` |
| `session.messages.update` | receipts/estados | `updates[]` |
| `session.messages.edit` | edicion de mensajes | `edits[]` |
| `session.messages.delete` | borrado mensaje/chat | `scope`, `deletes[]` |
| `session.messages.reaction` | reacciones | `reactions[]` |
| `session.messages.media` | media subida | `media[]` |
| `session.contacts.upsert` | contactos/perfiles | `contacts[]` |
| `session.presence.update` | presencia/typing | `updates[]` |

Notas de historial/mensajes:
- `session.history.sync` incluye resumen de chats/contacts/mensajes (limitado en tamaño).
- `session.messages.upsert` incluye un resumen corto de mensajes en tiempo real.
- `session.messages.edit` actualiza contenido/estado de edicion.
- `session.messages.delete` indica borrado por mensaje o por chat.
- `session.messages.reaction` informa reacciones por mensaje.
- `session.messages.media` informa metadata y URL de media por mensaje.

Persistencia:
- El `event-consumer` persiste `session.history.sync` y `session.messages.upsert` en Postgres.
- Tablas: `session_messages` (historial), `session_chats` (resumen por chat), `session_message_reactions` (reacciones) y `session_message_media` (media).

Frontend (Vite + React):
- `src/apps/web`

Nota CORS:
- Si el frontend corre en otro dominio, configura `CORS_ORIGINS`, `AUTH_COOKIE_SAMESITE=None` y `AUTH_COOKIE_SECURE=true`.

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
- `bun run worker:sessions`
- `bun run db:outbox`
- `bun run db:migrate`
- `bun run db:purge-session`
- `bun run web:dev`
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
