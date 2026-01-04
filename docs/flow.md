# Flujos y diagrama de la app

La app es un backend para gestionar sesiones de WhatsApp (via Baileys), con autenticacion propia, persistencia en Postgres y eventos por Redis Streams. Expone API HTTP para usuarios/sesiones/chats y un WebSocket para eventos en tiempo real del tenant autenticado.

## WebSocket (real-time)
URL:
```
ws://<host>/ws/sessions?accessToken=<token>
```

Eventos emitidos por tenant:
- `session.snapshot` (al conectar WS)
- `session.created`
- `session.qr.updated`
- `session.status.connected`
- `session.status.disconnected`
- `session.history.sync`
- `session.messages.upsert`
- `session.messages.update`
- `session.contacts.upsert`

## Endpoints principales

Auth:
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/resend-verification`
- `POST /auth/password-reset`
- `POST /auth/password-reset/confirm`

Users:
- `POST /users`
- `POST /users/:id/verify`
- `GET /users/me`

Sessions (WhatsApp):
- `POST /sessions`
- `POST /sessions/:id/stop`
- `DELETE /sessions/:id`
- `POST /sessions/:id/messages`

Chats:
- `GET /chats`
- `GET /chats/:jid/messages`
- `POST /chats/:jid/messages`

Contacts:
- `GET /contacts`

Metrics:
- `GET /metrics` (si esta habilitado)

## Diagrama de arquitectura (alto nivel)
```mermaid
flowchart LR
  client[Cliente / Frontend] -->|HTTP| api[API Hono]
  client -->|WS /ws/sessions| wsHub[WS Hub]

  api -->|CommandBus| outbox[Outbox + Postgres]
  outbox -->|Redis Streams| events[domain-events]

  api -->|session.start| commands[session-commands]
  commands --> sessionWorker[Worker de Sesiones]

  sessionWorker -->|Baileys| wa[WhatsApp]
  sessionWorker -->|session.* events| events

  events --> eventConsumer[Event Consumer]
  eventConsumer --> db[(Postgres)]

  events --> wsHub
  wsHub --> client
```

## Flujo de login y autenticacion
```mermaid
sequenceDiagram
  autonumber
  actor User as Usuario
  participant Client as Cliente
  participant API as API
  participant DB as Postgres

  User->>Client: Login
  Client->>API: POST /auth/login
  API->>DB: valida credenciales
  API-->>Client: accessToken + refresh cookie
  Client->>API: POST /auth/refresh (periodico)
  API-->>Client: accessToken nuevo + refresh rotado
```

## Flujo de WS snapshot inicial
```mermaid
sequenceDiagram
  autonumber
  participant Client as Cliente
  participant WS as WebSocket
  participant API as API
  participant DB as Postgres

  Client->>WS: conecta /ws/sessions?accessToken=...
  WS->>API: valida token
  API->>DB: busca session por tenant
  WS-->>Client: session.snapshot (estado actual)
```

## Flujo de sesion WhatsApp y sync
```mermaid
sequenceDiagram
  autonumber
  actor User as Usuario
  participant Client as Cliente
  participant API as API
  participant Worker as Session Worker
  participant Redis as Redis Streams
  participant WS as WebSocket
  participant DB as Postgres
  participant WA as WhatsApp

  User->>Client: Start session
  Client->>API: POST /sessions
  API->>Redis: session.start (command)
  Worker->>Redis: consume command
  Worker->>WA: init session (Baileys)
  Worker-->>Redis: session.qr.updated
  Redis-->>WS: session.qr.updated
  WS-->>Client: QR update
  User->>WA: scan QR
  Worker-->>Redis: session.status.connected
  Redis-->>WS: session.status.connected
  WS-->>Client: connected
  Worker-->>Redis: session.history.sync (batch)
  Redis-->>WS: history sync
  Redis-->>DB: event-consumer persiste session_messages / session_chats
  Worker-->>Redis: session.contacts.upsert
  Redis-->>WS: contacts upsert
  Redis-->>DB: event-consumer persiste session_contacts
  Worker-->>Redis: session.messages.update (receipts)
  Redis-->>WS: messages update
  Redis-->>DB: event-consumer actualiza status de session_messages
```

## Flujo de chats, contactos y mensajes (API)
```mermaid
sequenceDiagram
  autonumber
  participant Client as Cliente
  participant API as API
  participant DB as Postgres
  participant Redis as Redis Streams
  participant Worker as Session Worker
  participant WA as WhatsApp

  Client->>API: GET /chats
  API->>DB: read session_chats
  API-->>Client: chats

  Client->>API: GET /chats/:jid/messages
  API->>DB: read session_messages
  API-->>Client: messages

  Client->>API: GET /contacts
  API->>DB: read session_contacts
  API-->>Client: contacts

  Client->>API: POST /chats/:jid/messages
  API->>Redis: session.sendMessage (command)
  Worker->>WA: send message
  Worker-->>Redis: session.messages.upsert
  Redis-->>DB: persist messages/chats
```
