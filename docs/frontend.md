# Frontend (Anna Sessions Console)

## Objetivo
Construir un cliente web estilo WhatsApp Web (solo texto) conectado al backend actual: sesiones, chats, mensajes, contactos y estados de entrega/lectura via WebSocket.

## Flujo base
1) Autenticacion con `POST /auth/login` y refresh automatico (`POST /auth/refresh`).
2) Conectar WS `ws://<host>/ws/sessions?accessToken=<token>`.
3) Recibir `session.snapshot` y decidir estado inicial (connected / pending_qr / disconnected).
4) Si connected: cargar `GET /chats` + `GET /contacts`.
5) Actualizar UI en tiempo real con eventos WS.

## Modelo de datos (cliente)
ChatSummary:
- `chatJid`, `chatName`, `lastMessageText`, `lastMessageTs`, `unreadCount`

Contact:
- `contactJid`, `name`, `notify`, `imgUrl`, `status`

Message:
- `id`, `fromMe`, `text`, `timestamp`, `status`, `statusAt`, `senderJid`
- `replyTo`: `{ messageId, participant, type, text } | null`
- `forward`: `{ isForwarded, forwardingScore } | null`

## Eventos WS a consumir
- `session.snapshot` -> estado inicial.
- `session.qr.updated` -> mostrar QR.
- `session.status.connected` / `session.status.disconnected` -> estado de sesion.
- `session.history.sync` -> progreso de sync (mostrar %).
- `session.messages.upsert` -> actualizar chat list y mensajes.
- `session.messages.update` -> actualizar status (delivered/read/played).
- `session.contacts.upsert` -> actualizar contactos.
- `session.presence.update` -> estado de presencia/typing.

## Como aplicar features tipo WhatsApp Web (ideas practicas)

Notificaciones (desktop):
- Escucha `session.messages.upsert` por WS.
- Si el mensaje es entrante (`fromMe=false`) y el chat no esta abierto:
  - Incrementa badge `unreadCount`.
  - Dispara una notificacion del navegador (`Notification API`).
- Debes pedir permiso una sola vez (en login o primera visita a console).

Ejemplo logico:
```
onWs('session.messages.upsert', (payload) => {
  for (msg of payload.messages) {
    if (!msg.fromMe && msg.remoteJid !== activeChat) {
      incrementUnread(msg.remoteJid)
      notify(`${chatName(msg.remoteJid)}: ${msg.text}`)
    }
  }
})
```

Lista de chats en tiempo real:
- Usa `session.messages.upsert` para mover el chat al top.
- Usa `session.history.sync` al finalizar para rehacer el orden con datos persistidos.

Estados de mensaje:
- `session.messages.update` trae `status` y `statusAt`.
- Mapea a iconos: `delivered` (✓), `read` (✓✓ azul), `played` (✓✓ con icono audio).

Presencia y typing:
- `session.presence.update` trae `presence` por participante o chat.
- Mapear `composing` -> "escribiendo...", `recording` -> "grabando audio...", `available` -> "en linea", `unavailable` -> "offline".
- En grupos usar `jid` del update para mostrar quien esta escribiendo.
- Mantener un TTL (10-15s) para limpiar estados y evitar "escribiendo" pegado.

Ejemplo logico:
```
onWs('session.presence.update', (payload) => {
  const { chatJid, updates } = payload
  for (u of updates) {
    presenceStore[chatJid] ??= {}
    presenceStore[chatJid][u.jid] = {
      presence: u.presence, lastSeen: u.lastSeen, ts: Date.now()
    }
  }
})

const typing = Object.values(presenceStore[chatJid] || {})
  .filter(p => p.presence === 'composing' && Date.now() - p.ts < 12000)
```

Reply/Forward:
- `replyTo` y `forward` llegan en la respuesta de `GET /chats/:jid/messages`.
- Para enviar:
  - Reply: `POST /chats/:jid/messages` con `content` + `replyToMessageId`.
  - Forward: `POST /chats/:jid/messages` con `forwardMessageId` (sin content).

Contactos:
- `session.contacts.upsert` actualiza nombres, foto y status.
- Usa `contactJid` como join con `chatJid` al renderizar.

Resolver nombre por JID:
- Construye un map con `GET /contacts`.
- Al renderizar mensajes, prioriza:
  1) `contact.name`
  2) `contact.notify`
  3) `contact.phoneNumber`
  4) fallback al numero (sin `@s.whatsapp.net`)
- En grupos usa `senderJid` para el autor, no `remoteJid`.

Ejemplo logico:
```
const nameForJid = (jid) => {
  const contact = contactMap[jid]
  if (contact?.name) return contact.name
  if (contact?.notify) return contact.notify
  if (contact?.phoneNumber) return contact.phoneNumber
  return jid?.replace('@s.whatsapp.net', '') || 'Desconocido'
}
```

Modo offline:
- `session.snapshot` + `session.status.disconnected` deben mostrar “offline”.
- Mantener visible el historial de chats/mensajes desde DB.

## Endpoints necesarios
- Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- Sesiones: `POST /sessions` (iniciar QR), `POST /sessions/:id/stop`, `DELETE /sessions/:id`
- Chats: `GET /chats`, `GET /chats/:jid/messages`, `POST /chats/:jid/messages`
- Contactos: `GET /contacts`

## UI/UX (MVP texto)
- Login con refresh automatico y estado de cookie.
- Vista `/console` con layout tipo WhatsApp Web:
  - Sidebar: header + search + tabs (Chats/Contactos) + lista.
  - Panel principal: header del chat + timeline + input.
  - Overlay QR cuando `pending_qr`.
  - Estados vacios: sin sesion, sin chats, sin mensajes.
- Estados de mensajes:
  - `delivered`, `read`, `played` (iconos).
- Paginacion de mensajes:
  - Scroll hacia arriba, usa `cursor` en `GET /chats/:jid/messages`.

## Features por fases

Fase 1 (texto estable, actual):
- Login + refresh automatico.
- Iniciar sesion y QR.
- Lista de chats y mensajes.
- Contactos basicos.
- WS realtime con snapshot y sync.
- Estado de mensajes (delivered/read/played).

Fase 2 (texto avanzado):
- Reply (mostrar quoted message).
- Forward (flag + contador).
- Busqueda local en chats/mensajes.
- Marcado de leido (UI optimista).
- Mejoras de rendimiento (memo, virtualization).

Fase 3 (UX avanzada):
- Multi-sesion (switcher).
- Settings (perfil, notificaciones).
- Filtros por tipo de chat (grupos/privados).

## Pendientes backend para estas features
- Endpoint para marcar lectura (si se decide).

## Consideraciones tecnicas
- Mantener cache local (chats, mensajes, contactos) y merge por eventos WS.
- Evitar depender solo del WS: siempre rehidratar desde `/chats` y `/contacts`.
- Manejar reconexion WS con backoff.
