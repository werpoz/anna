# Frontend Architecture Documentation - Anna WhatsApp Web

**Ubicación:** `src/apps/web/`  
**Framework:** Next.js 14 (App Router)  
**Arquitectura:** Screaming Architecture (Feature-based)  
**UI Library:** Tailwind CSS + shadcn/ui  
**Estado:** TypeScript + React Hooks

---

## 1. Arquitectura General

### Patrón: Screaming Architecture

La aplicación frontend sigue una arquitectura basada en features/módulos donde cada módulo contiene:

```
modules/
├── Session/           # Gestión de sesiones de WhatsApp
├── Chat/              # Mensajería y conversaciones
├── Auth/              # Autenticación (parcialmente implementado)
└── Shared/            # Componentes compartidos
```

### Capas por Módulo

Cada módulo implementa separación de capas:

```
ModuleName/
├── domain/            # Entidades y tipos de dominio
├── application/       # Lógica de aplicación (hooks)
├── infrastructure/    # Servicios externos (API calls)
└── ui/                # Componentes de presentación
```

---

## 2. Módulos Implementados

### 2.1 Session Module

**Responsabilidad:** Gestionar el ciclo de vida de sesiones de WhatsApp.

#### Domain Layer
```typescript
// Session.ts
export interface Session {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'waiting_qr';
  qr?: string;
  syncProgress?: number;
  lastSyncedAt?: number;
}
```

#### Application Layer
```typescript
// useSessions.ts
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/ws/sessions?token=${token}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle: session.snapshot, session.status, session.qr, session.history.sync
    };
    
    return () => ws.close();
  }, []);
  
  return { sessions, isConnected, createSession, deleteSession };
}
```

**Funcionalidades:**
- ✅ Lista de sesiones
- ✅ Crear sesión (POST /sessions)
- ✅ Eliminar sesión (DELETE /sessions/:id)
- ✅ WebSocket real-time updates
- ✅ Manejo de QR code
- ✅ Progreso de sincronización

#### UI Components
```
SessionSidebar.tsx      # Lista de sesiones en el sidebar izquierdo
SessionQRView.tsx       # Mostrar QR code para emparejar
SessionSyncView.tsx     # Barra de progreso durante sync
SessionWelcome.tsx      # Vista cuando session está conectada pero sin chat
```

---

### 2.2 Chat Module

**Responsabilidad:** Gestionar chats y mensajes.

#### Domain Layer
```typescript
// Chat.ts
export interface Chat {
  id: string;                    // chatJid
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGroup: boolean;
  avatar?: string;
}

// Message.ts
export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  type?: string;
  senderJid?: string;
}
```

#### Application Layer
```typescript
// useChats.ts
export function useChats(sessionId: string | null, lastSyncedAt?: number) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Fetch chats when session changes or sync completes
  useEffect(() => {
    if (!sessionId) return;
    
    fetch(`/api/chats?sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => setChats(mapChats(data.items)));
  }, [sessionId, lastSyncedAt]);
  
  // Fetch messages when active chat changes
  useEffect(() => {
    if (!activeChatId || !sessionId) return;
    
    fetch(`/api/chats/${activeChatId}/messages?sessionId=${sessionId}&limit=50`)
      .then(res => res.json())
      .then(data => setMessages(mapMessages(data.items)));
  }, [activeChatId, sessionId]);
  
  const sendMessage = async (text: string) => {
    // Optimistic UI update
    setMessages(prev => [...prev, tempMessage]);
    
    // API call
    await fetch(`/api/chats/${activeChatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, text })
    });
  };
  
  return { chats, activeChatId, setActiveChatId, messages, sendMessage };
}
```

**Funcionalidades:**
- ✅ Lista de chats
- ✅ Filtros (Chats/Unread/Groups)
- ✅ Búsqueda local
- ✅ Ver mensajes de un chat
- ✅ Enviar mensajes de texto
- ✅ Scroll automático
- ✅ Optimistic UI updates
- ❌ Enviar multimedia (UI presente, no conectada)
- ❌ Editar mensaje
- ❌ Eliminar mensaje
- ❌ Reaccionar a mensaje
- ❌ Responder mensaje (quote)
- ❌ Real-time message updates (solo HTTP polling)

#### UI Components
```
ChatList.tsx           # Panel izquierdo con lista de chats
ChatConversation.tsx   # Panel derecho con mensajes del chat activo
```

---

### 2.3 Auth Module

**Responsabilidad:** Autenticación y sesiones de usuario.

#### Current Implementation
```typescript
// contexts/AuthContext.tsx (NO en modules/)
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Verificar sesión actual
    fetch('/api/auth/ping', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);
  
  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    
    const data = await res.json();
    setUser(data.user);
  };
  
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };
  
  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}
```

**Estado:** Funcional pero no migrado a Screaming Architecture.

**Funcionalidades:**
- ✅ Login
- ✅ Logout
- ✅ Verificación de sesión
- ✅ HttpOnly cookies
- ❌ Register (existe endpoint pero sin UI completa)
- ❌ Forgot password
- ❌ Profile management

---

### 2.4 Shared Module

**Responsabilidad:** Componentes reutilizables entre módulos.

```
Shared/
└── ui/
    └── AppWelcome.tsx    # Vista inicial (sin sesión)
```

---

## 3. Páginas y Routing

### Next.js App Router

```
app/
├── page.tsx                  # Landing page
├── login/page.tsx            # Login page
├── console/page.tsx          # Main app (chat interface)
└── layout.tsx                # Root layout con AuthProvider
```

### Main App Layout (console/page.tsx)

```
┌─────────────────────────────────────────────────┐
│              ConsolePage                        │
├──────────┬───────────────┬──────────────────────┤
│  Session │   ChatList    │   ChatConversation   │
│  Sidebar │               │   (or other views)   │
│          │               │                      │
│ - User   │ - Search      │ - Header             │
│ - List   │ - Filters     │ - Messages           │
│   of     │ - Chats       │ - Input              │
│ Sessions │               │                      │
│          │               │                      │
│ [+ New]  │               │                      │
└──────────┴───────────────┴──────────────────────┘
```

### State Orchestration

```typescript
export default function ConsolePage() {
  // Auth
  const { user } = useAuth();
  
  // Sessions
  const { sessions, createSession, deleteSession } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = sessions.find(s => s.id === selectedSessionId) || null;
  
  // Chats
  const { chats, activeChatId, setActiveChatId, messages, sendMessage } 
    = useChats(selectedSessionId, selectedSession?.lastSyncedAt);
  
  // Auto-select first session
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions]);
  
  // Auto-select first chat when synced
  useEffect(() => {
    if (selectedSession?.status === 'connected' 
        && !selectedSession.syncProgress 
        && chats.length > 0 
        && !activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, [selectedSession, chats]);
  
  // Conditional rendering based on state
  if (!selectedSession) return <AppWelcome />;
  if (selectedSession.status === 'waiting_qr') return <SessionQRView />;
  if (selectedSession.syncProgress !== undefined) return <SessionSyncView />;
  if (!activeChatId) return <SessionWelcome />;
  
  return <ChatConversation chat={...} messages={messages} onSendMessage={sendMessage} />;
}
```

---

## 4. Comunicación con Backend

### HTTP Endpoints

```typescript
// Implemented
GET    /api/auth/ping
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/sessions
POST   /api/sessions
DELETE /api/sessions/:id

GET    /api/chats?sessionId=xxx
GET    /api/chats/:jid/messages?sessionId=xxx&limit=50
POST   /api/chats/:jid/messages      // ⚠️ Solo texto, no multimedia
```

### WebSocket

```typescript
// Sessions WebSocket
ws://localhost:3000/ws/sessions?token=JWT

// Events received:
{
  type: 'session.snapshot',
  payload: { sessions: [...] }
}

{
  type: 'session.status',
  sessionId: '...',
  payload: { status: 'connected' }
}

{
  type: 'session.qr',
  sessionId: '...',
  payload: { qr: 'data:image/png;base64,...' }
}

{
  type: 'session.history.sync',
  sessionId: '...',
  payload: { progress: 50, isLatest: false }
}
```

**Limitación:** NO hay WebSocket para mensajes en tiempo real. Solo HTTP polling via re-fetches.

---

## 5. Estilo y UI

### Design System: WhatsApp Web Clone

**Colores:**
```css
/* Light Mode */
--wa-bg-primary: #f0f2f5
--wa-bg-chat: #efeae2
--wa-bg-message-me: #d9fdd3
--wa-bg-message-them: #ffffff
--wa-green: #00a884
--wa-text: #111b21
--wa-text-secondary: #54656f

/* Dark Mode */
--wa-bg-primary-dark: #111b21
--wa-bg-chat-dark: #0b141a
--wa-bg-message-me-dark: #005c4b
--wa-bg-message-them-dark: #202c33
--wa-text-dark: #e9edef
--wa-text-secondary-dark: #8696a0
```

### Componentes shadcn/ui

```
@/components/ui/
├── avatar.tsx
├── button.tsx
├── dialog.tsx
├── input.tsx
├── label.tsx
├── scroll-area.tsx
└── tabs.tsx
```

### Iconos: Lucide React

```typescript
import { 
  Search, MoreVertical, Paperclip, Smile, 
  Mic, SendHorizontal, Trash2, MessageSquarePlus 
} from 'lucide-react';
```

---

## 6. Features Actuales vs WhatsApp Web

### ✅ Implementado (UI + Lógica)

| Feature | Estado |
|---------|--------|
| Lista de sesiones | ✅ Completo |
| Crear/eliminar sesión | ✅ Completo |
| QR code pairing | ✅ Completo |
| Sync progress | ✅ Completo |
| Lista de chats | ✅ Completo |
| Filtros (All/Unread/Groups) | ✅ Completo |
| Búsqueda de chats | ✅ Local only |
| Ver mensajes | ✅ Completo |
| Enviar mensaje texto | ✅ Completo |
| Auto-scroll | ✅ Completo |
| Dark mode support | ✅ CSS ready |
| Responsive layout | ✅ Desktop only |

### 🟡 Parcialmente Implementado (UI sin lógica / No conectado)

| Feature | Estado | Detalle |
|---------|--------|---------|
| Enviar multimedia | 🟡 | Botón existe, sin lógica |
| Emoji picker | 🟡 | Botón existe, sin picker |
| Voice note | 🟡 | Botón existe, sin grabación |
| Buscar en chat | 🟡 | Icono existe, sin funcionalidad |
| Chat context menu | 🟡 | Icono existe, sin menú |
| Real-time messages | 🟡 | Solo polling via re-fetch |

### ❌ No Implementado (Ni UI ni lógica)

| Feature | Prioridad |
|---------|-----------|
| Editar mensaje | Alta |
| Eliminar mensaje | Alta |
| Reaccionar a mensaje | Alta |
| Responder mensaje (quote) | Alta |
| Reenviar mensaje | Media |
| Seleccionar múltiples | Media |
| Exportar chat | Baja |
| Archivar chat | Media |
| Silenciar chat | Media |
| Fijar chat | Baja |
| Contactos view | Alta |
| Grupos management | Alta |
| Estados/Stories | Baja |
| Configuración de perfil | Media |
| Notificaciones desktop | Baja |
| Markdown en mensajes | Baja |

---

## 7. Problemas y Limitaciones Actuales

### 7.1 Real-time Messaging

**Problema:** Los mensajes entrantes NO se actualizan en tiempo real.

**Causa:** No hay WebSocket para mensajes, solo HTTP GET que se ejecuta en mount.

**Solución:**
1. **Opción A:** Añadir event listener a WebSocket de sesiones para `session.messages.upsert`
2. **Opción B:** Implementar polling cada X segundos
3. **Opción C:** Crear WebSocket dedicado `/ws/chats/:jid`

### 7.2 Multimedia

**Problema:** UI tiene botones para multimedia pero no funciona.

**Causa:** No hay lógica para:
- Seleccionar archivo
- Subir a backend
- Preview antes de enviar

**Solución:** Implementar `<input type="file">` oculto + handler para upload.

### 7.3 Scroll Performance

**Problema:** Con >100 mensajes, el scroll puede ser lento.

**Causa:** Todos los mensajes se renderizan a la vez.

**Solución:** Implementar virtualización (react-window o react-virtual).

### 7.4 No hay Persistencia de UI State

**Problema:** Al refrescar la página, pierdes:
- Sesión seleccionada
- Chat activo
- Scroll position

**Solución:** localStorage para guardar `selectedSessionId` y `activeChatId`.

### 7.5 Error Handling

**Problema:** Errores de red no se muestran al usuario.

**Causa:** No hay UI para mostrar errores (toasts, banners).

**Solución:** Implementar toast notifications (sonner o react-hot-toast).

---

## 8. Mejoras Recomendadas (Priorizadas)

### 🔴 Alta Prioridad

1. **Real-time Messages**
   - Conectar WebSocket para mensajes entrantes
   - Auto-refresh chat list cuando llega mensaje nuevo

2. **Enviar Multimedia**
   - Input file para imagen/video/audio/documento
   - Preview modal antes de enviar
   - Progress bar durante upload

3. **Funciones de Mensaje**
   - Editar mensaje (requiere backend implementado)
   - Eliminar mensaje (requiere backend implementado)
   - Reaccionar mensaje (requiere backend implementado)
   - Responder mensaje (quote)

4. **Error Handling**
   - Toast notifications para errores
   - Retry logic para requests fallidos
   - Offline indicator

### 🟡 Media Prioridad

5. **Búsqueda Global**
   - Buscar en todos los mensajes (no solo chat actual)
   - Endpoint `/api/search?q=xxx`

6. **Contactos View**
   - Mostrar lista de contactos
   - Click en contacto para abrir chat

7. **UI State Persistence**
   - localStorage para selected session/chat
   - Restore scroll position

8. **Loading States**
   - Skeletons durante carga
   - Better UX mientras sync

### 🟢 Baja Prioridad

9. **Grupos Management**
   - Crear grupo
   - Ver participantes
   - Añadir/remover miembros

10. **Configuración**
    - Cambiar nombre/foto de perfil
    - Dark mode toggle manual
    - Configuración de notificaciones

---

## 9. Performance Optimizations

### Current Issues

1. **Re-renders innecesarios:** `ConsolePage` re-renderiza todo cuando cambia cualquier estado.
2. **No memoization:** Los componentes no usan `memo()` o `useMemo()`.
3. **Fetch on every mount:** No hay caching de requests.

### Recommended Solutions

```typescript
// 1. React.memo para componentes pesados
export default React.memo(ChatConversation);

// 2. useMemo para cálculos costosos
const filteredChats = useMemo(
  () => chats.filter(chat => /*...*/),
  [chats, filterMode, searchQuery]
);

// 3. React Query para caching
import { useQuery } from '@tanstack/react-query';

const { data: chats } = useQuery({
  queryKey: ['chats', sessionId],
  queryFn: () => fetch(`/api/chats?sessionId=${sessionId}`).then(r => r.json()),
  staleTime: 30000, // 30s cache
});
```

---

## 10. Testing Strategy

### Unit Tests (No implementados)

```typescript
// useChats.test.ts
describe('useChats', () => {
  it('should fetch chats when sessionId changes', async () => {
    // Mock fetch
    // Render hook
    // Assert chats state
  });
  
  it('should send message optimistically', async () => {
    // Mock API
    // Call sendMessage
    // Assert message appears immediately
  });
});
```

### Integration Tests

```typescript
// ConsolePage.test.tsx
describe('ConsolePage', () => {
  it('should auto-select first session on mount', () => {
    // Render with mock sessions
    // Assert SessionSidebar shows session as selected
  });
  
  it('should display QR code when session is waiting_qr', () => {
    // Render with session status = 'waiting_qr'
    // Assert SessionQRView is visible
  });
});
```

### E2E Tests (Playwright/Cypress)

```typescript
test('User can send a message', async ({ page }) => {
  await page.goto('/console');
  await page.click('[data-testid="session-1"]');
  await page.click('[data-testid="chat-1"]');
  await page.fill('[data-testid="message-input"]', 'Hello!');
  await page.click('[data-testid="send-button"]');
  
  await expect(page.locator('text=Hello!')).toBeVisible();
});
```

---

## 11. Migración Pendiente: Auth Module

### Estado Actual

```
contexts/AuthContext.tsx      # ❌ No está en modules/
app/login/page.tsx            # ❌ Lógica mezclada con UI
```

### Propuesta de Estructura

```
modules/Auth/
├── domain/
│   └── User.ts              # interface User
├── application/
│   └── useAuth.ts           # Hook sin lógica de backend
├── infrastructure/
│   └── AuthApi.ts           # fetch calls a /api/auth/*
└── ui/
    ├── LoginForm.tsx
    ├── RegisterForm.tsx
    └── ProfileView.tsx
```

---

## 12. Directory Tree Completa

```
src/apps/web/
├── app/
│   ├── page.tsx                    # Landing
│   ├── login/page.tsx              # Login
│   ├── console/page.tsx            # Main App
│   └── layout.tsx                  # Root Layout
├── modules/
│   ├── Session/
│   │   ├── domain/
│   │   │   └── Session.ts
│   │   ├── application/
│   │   │   └── useSessions.ts
│   │   └── ui/
│   │       ├── SessionSidebar.tsx
│   │       ├── SessionQRView.tsx
│   │       ├── SessionSyncView.tsx
│   │       └── SessionWelcome.tsx
│   ├── Chat/
│   │   ├── domain/
│   │   │   ├── Chat.ts
│   │   │   └── Message.ts
│   │   ├── application/
│   │   │   └── useChats.ts
│   │   └── ui/
│   │       ├── ChatList.tsx
│   │       └── ChatConversation.tsx
│   ├── Auth/                       # ❌ Pendiente migración
│   └── Shared/
│       └── ui/
│           └── AppWelcome.tsx
├── contexts/
│   └── AuthContext.tsx             # ⚠️ Debería estar en modules/Auth
├── components/ui/                  # shadcn/ui
└── lib/
    ├── api.ts                      # ⚠️ API helper genérico
    └── utils.ts
```

---

## 13. Configuración de Desarrollo

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### Scripts

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "tailwindcss": "3.x",
    "@radix-ui/react-*": "...",   // shadcn/ui components
    "lucide-react": "...",
    "class-variance-authority": "...",
    "clsx": "..."
  }
}
```

---

## 14. Conclusión

### Fortalezas

- ✅ **Arquitectura limpia:** Screaming Architecture bien implementada
- ✅ **Separación de capas:** Domain, Application, UI
- ✅ **Real-time sesiones:** WebSocket funcional
- ✅ **UI moderna:** WhatsApp Web clone profesional
- ✅ **TypeScript:** Type-safe en todo el código

### Gaps Prioritarios

1. 🔴 Real-time messaging (WebSocket para mensajes)
2. 🔴 Multimedia upload
3. 🔴 Funciones de mensaje (edit/delete/react/quote)
4. 🟡 Error handling y feedback visual
5. 🟡 UI state persistence

### Roadmap Sugerido

**Semana 1:**
- Real-time messages via WebSocket
- Toast notifications para errores

**Semana 2:**
- Multimedia upload (imagen/video/doc)
- Preview antes de enviar

**Semana 3:**
- Editar/eliminar mensaje
- Reacciones

**Semana 4:**
- Responder mensaje (quote)
- Búsqueda global

El frontend tiene una base sólida. Las mejoras recomendadas lo elevarían a nivel producción comparable con WhatsApp Web oficial.
