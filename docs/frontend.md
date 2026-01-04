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
- `isEdited`, `editedAt`, `isDeleted`, `deletedAt`
- `replyTo`: `{ messageId, participant, type, text } | null`
- `forward`: `{ isForwarded, forwardingScore } | null`

## Eventos WS a consumir
- `session.snapshot` -> estado inicial.
- `session.qr.updated` -> mostrar QR.
- `session.status.connected` / `session.status.disconnected` -> estado de sesion.
- `session.history.sync` -> progreso de sync (mostrar %).
- `session.messages.upsert` -> actualizar chat list y mensajes.
- `session.messages.update` -> actualizar status (delivered/read/played).
- `session.messages.edit` -> actualizar texto/tipo y flag editado.
- `session.messages.delete` -> marcar mensajes como borrados.
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

Lecturas reales:
- Para marcar mensajes como leidos, usa `POST /chats/:jid/read` con `messageIds`.
- Los receipts entran por `session.messages.update`.

Edicion y borrado:
- `session.messages.edit` trae `messageId`, `text`, `type`, `editedAt`.
- `session.messages.delete` trae `scope` + `deletes[]` o `chatJid` (si se limpia el chat).
- UI: mostrar etiqueta "editado" si `isEdited=true` y reemplazar contenido si `isDeleted=true`.

## Implementacion frontend (lecturas, edicion, borrado)

Store recomendado (normalizado):
- `messagesByChat: Map<chatJid, Map<messageId, Message>>`
- `Message` debe incluir `status/statusAt/isEdited/editedAt/isDeleted/deletedAt`.

Lecturas reales (read receipts):
- Al entrar al chat o al hacer scroll hasta el final:
  1) filtra mensajes entrantes `fromMe=false` cuyo `status !== 'read'`.
  2) llama `POST /chats/:jid/read` con `messageIds`.
- No marques como leidos mensajes propios (`fromMe=true`).

Ejemplo logico:
```
const markChatRead = async (chatJid, messages) => {
  const unread = messages
    .filter(m => !m.fromMe && m.status !== 'read')
    .map(m => m.id)
  if (!unread.length) return
  await api.post(`/chats/${chatJid}/read`, { messageIds: unread })
}
```

Edicion:
- Solo habilita editar si `fromMe=true`.
- Accion: `PATCH /chats/:jid/messages/:messageId` con `{ content }`.
- Optimista: actualiza `text`, `isEdited=true`, `editedAt=Date.now()`.
- Reconciliar luego con WS `session.messages.edit`.

Borrado:
- Accion: `DELETE /chats/:jid/messages/:messageId`.
- Optimista: `isDeleted=true` y reemplaza contenido por "Mensaje eliminado".
- Reconciliar con WS `session.messages.delete` (scope `message` o `chat`).

Aplicar eventos WS (pseudo-codigo):
```
onWs('session.messages.update', ({ payload }) => {
  for (u of payload.updates) {
    const msg = findMessage(u.messageId)
    if (!msg) continue
    if (u.status) msg.status = u.status
    if (u.statusAt) msg.statusAt = new Date(u.statusAt * 1000)
  }
})

onWs('session.messages.edit', ({ payload }) => {
  for (e of payload.edits) {
    const msg = findMessage(e.messageId)
    if (!msg) continue
    if (e.text !== null && e.text !== undefined) msg.text = e.text
    if (e.type) msg.type = e.type
    msg.isEdited = true
    if (e.editedAt) msg.editedAt = new Date(e.editedAt * 1000)
  }
})

onWs('session.messages.delete', ({ payload }) => {
  if (payload.scope === 'chat' && payload.chatJid) {
    markAllDeleted(payload.chatJid)
    return
  }
  for (d of payload.deletes) {
    const msg = findMessage(d.messageId)
    if (!msg) continue
    msg.isDeleted = true
    msg.text = 'Mensaje eliminado'
    if (d.deletedAt) msg.deletedAt = new Date(d.deletedAt * 1000)
  }
})
```

## Ejemplos frontend (React + fetch)

Fetch helpers (simplificado):
```jsx
const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

Login + refresh automatico:
```jsx
const login = async (email, password) => {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data.accessToken
}

const refresh = async () => {
  const data = await apiFetch('/auth/refresh', { method: 'POST' })
  return data.accessToken
}
```

WS con access token:
```jsx
const connectWs = (token) => {
  const ws = new WebSocket(`${apiBase.replace('http', 'ws')}/ws/sessions?accessToken=${token}`)
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    handleWsEvent(msg)
  }
  return ws
}
```

Listar chats y mensajes:
```jsx
const loadChats = async () => apiFetch('/chats')

const loadChatMessages = async (jid, cursor) => {
  const params = new URLSearchParams({ limit: '50' })
  if (cursor) params.set('cursor', cursor)
  return apiFetch(`/chats/${encodeURIComponent(jid)}/messages?${params}`)
}
```

Enviar / reply / forward:
```jsx
const sendMessage = async (jid, content) =>
  apiFetch(`/chats/${encodeURIComponent(jid)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })

const sendReply = async (jid, content, replyToMessageId) =>
  apiFetch(`/chats/${encodeURIComponent(jid)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, replyToMessageId }),
  })

const sendForward = async (jid, forwardMessageId) =>
  apiFetch(`/chats/${encodeURIComponent(jid)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ forwardMessageId }),
  })
```

Marcar como leido / editar / borrar:
```jsx
const markRead = async (jid, messageIds) =>
  apiFetch(`/chats/${encodeURIComponent(jid)}/read`, {
    method: 'POST',
    body: JSON.stringify({ messageIds }),
  })

const editMessage = async (jid, messageId, content) =>
  apiFetch(`/chats/${encodeURIComponent(jid)}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })

const deleteMessage = async (jid, messageId) =>
  apiFetch(`/chats/${encodeURIComponent(jid)}/messages/${messageId}`, {
    method: 'DELETE',
  })
```

Merge de WS en store (ejemplo directo):
```jsx
const handleWsEvent = (event) => {
  switch (event.type) {
    case 'session.messages.update':
      applyStatusUpdates(event.payload.updates)
      break
    case 'session.messages.edit':
      applyEdits(event.payload.edits)
      break
    case 'session.messages.delete':
      applyDeletes(event.payload)
      break
    default:
      break
  }
}
```

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
- Chats (acciones): `POST /chats/:jid/read`, `PATCH /chats/:jid/messages/:messageId`, `DELETE /chats/:jid/messages/:messageId`
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
- Marcado de leido (UI optimista + POST /chats/:jid/read).
- Edicion/borrado (actualizar por WS).
- Mejoras de rendimiento (memo, virtualization).

Fase 3 (UX avanzada):
- Multi-sesion (switcher).
- Settings (perfil, notificaciones).
- Filtros por tipo de chat (grupos/privados).

## Consideraciones tecnicas
- Mantener cache local (chats, mensajes, contactos) y merge por eventos WS.
- Evitar depender solo del WS: siempre rehidratar desde `/chats` y `/contacts`.
- Manejar reconexion WS con backoff.
