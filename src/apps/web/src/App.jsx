import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AuthContext = React.createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const RefreshStatusPill = () => {
  const { refreshStatus, refreshLive } = useAuth();
  return <span className={`pill ${refreshLive ? 'live' : ''}`}>{refreshStatus}</span>;
};

const toWsUrl = (baseUrl, token) => {
  const url = new URL(baseUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/ws/sessions?accessToken=${encodeURIComponent(token)}`;
};

const useLocalStorageState = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ?? initialValue;
  });

  useEffect(() => {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }, [key, value]);

  return [value, setValue];
};

const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useLocalStorageState('anna.accessToken', '');
  const [status, setStatus] = useState('loading');
  const [refreshStatus, setRefreshStatus] = useState('refresh: idle');
  const [refreshLive, setRefreshLive] = useState(false);

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || 'Login failed');
    }

    if (payload.accessToken) {
      setAccessToken(payload.accessToken);
    }
    return payload;
  };

  const refresh = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAccessToken('');
        setRefreshStatus('refresh: failed');
        setRefreshLive(false);
        return { ok: false, payload };
      }

      if (payload.accessToken) {
        setAccessToken(payload.accessToken);
        setRefreshStatus('refresh: ok');
        setRefreshLive(true);
      }

      return { ok: true, payload };
    } catch (error) {
      setAccessToken('');
      setRefreshStatus('refresh: failed');
      setRefreshLive(false);
      return { ok: false, payload: { message: String(error) } };
    }
  };

  const logout = async () => {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null);
    setAccessToken('');
  };

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        await refresh();
      } finally {
        if (active) {
          setStatus('ready');
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    const interval = setInterval(() => {
      void refresh();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken]);

  const value = useMemo(() => ({
    accessToken,
    setAccessToken,
    status,
    login,
    refresh,
    logout,
    refreshStatus,
    refreshLive,
  }), [accessToken, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const LoginPage = () => {
  const [email, setEmail] = useLocalStorageState('anna.email', '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, accessToken, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'ready' && accessToken) {
      navigate('/console', { replace: true });
    }
  }, [status, accessToken, navigate]);

  const handleLogin = async () => {
    const emailValue = email.trim();
    if (!emailValue || !password) {
      setError('Email and password are required');
      return;
    }

    try {
      await login(emailValue, password);
      setPassword('');
      setError('');
      navigate('/console', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div>
      <header>
        <h1>Anna Sessions Console</h1>
        <p>
          Login separado para obtener access token. Si ya tienes cookie refresh,
          usa el boton de refresh para entrar sin password.
        </p>
      </header>
      <section className="grid">
        <div className="card">
          <div className="stack">
            <div>
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label>Password</label>
              <input
                value={password}
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error ? <div className="note" style={{ color: 'var(--danger)' }}>{error}</div> : null}
            <div className="buttons">
              <button onClick={handleLogin}>Login</button>
            </div>
            <div className="status">
              <RefreshStatusPill />
            </div>
            <div className="note">Backend: {API_BASE_URL}</div>
          </div>
        </div>
      </section>
    </div>
  );
};

const ConsolePage = () => {
  const [sessionId, setSessionId] = useLocalStorageState('anna.sessionId', '');
  const [wsStatus, setWsStatus] = useState('ws: idle');
  const [wsLive, setWsLive] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('session: idle');
  const [sessionLive, setSessionLive] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('history: idle');
  const [historyLive, setHistoryLive] = useState(false);
  const [qr, setQr] = useState('Waiting for QR...');
  const [qrImage, setQrImage] = useState('');
  const [qrExpires, setQrExpires] = useState('expires: -');
  const [hasRequestedSession, setHasRequestedSession] = useState(() => Boolean(sessionId));
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState('');
  const wsRef = useRef(null);
  const wsHeartbeatRef = useRef(null);
  const wsReconnectRef = useRef({ timer: null, attempts: 0, manualClose: false });
  const qrVersionRef = useRef(0);

  const { accessToken, refresh, status } = useAuth();

  const apiHeaders = useMemo(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }, [accessToken]);

  const buildQrDataUrl = async (value) => {
    return await QRCode.toDataURL(value, { margin: 1, width: 240 });
  };

  const ensureToken = () => {
    if (!accessToken?.trim()) {
      alert('Access token is required');
      return null;
    }
    return accessToken.trim();
  };

  const clearWsTimers = () => {
    if (wsHeartbeatRef.current) {
      clearInterval(wsHeartbeatRef.current);
      wsHeartbeatRef.current = null;
    }
    if (wsReconnectRef.current.timer) {
      clearTimeout(wsReconnectRef.current.timer);
      wsReconnectRef.current.timer = null;
    }
  };

  const scheduleReconnect = async () => {
    if (wsReconnectRef.current.manualClose) {
      return;
    }

    wsReconnectRef.current.attempts += 1;
    const delayMs = Math.min(1000 * 2 ** (wsReconnectRef.current.attempts - 1), 15000);
    setWsStatus(`ws: reconnecting in ${Math.round(delayMs / 1000)}s`);
    wsReconnectRef.current.timer = setTimeout(async () => {
      wsReconnectRef.current.timer = null;
      await refresh();
      await connectWs();
    }, delayMs);
  };

  const startHeartbeat = () => {
    if (wsHeartbeatRef.current) {
      clearInterval(wsHeartbeatRef.current);
    }
    wsHeartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('__ping__');
      }
    }, 20000);
  };

  const connectWs = async () => {
    const authToken = ensureToken();
    if (!authToken) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    wsReconnectRef.current.manualClose = false;
    clearWsTimers();
    const socket = new WebSocket(toWsUrl(API_BASE_URL, authToken));
    wsRef.current = socket;

    socket.addEventListener('open', () => {
      setWsStatus('ws: connected');
      setWsLive(true);
      wsReconnectRef.current.attempts = 0;
      startHeartbeat();
    });

    socket.addEventListener('close', (event) => {
      setWsStatus(`ws: closed (${event.code})`);
      setWsLive(false);
      clearWsTimers();
      void scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      setWsStatus('ws: error');
      setWsLive(false);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'session.qr.updated') {
          setQr(data.payload.qr);
          setQrExpires(`expires: ${data.payload.expiresAt}`);
          setSessionStatus('session: pending_qr');
          setSessionLive(true);
          const version = ++qrVersionRef.current;
          buildQrDataUrl(data.payload.qr)
            .then((url) => {
              if (qrVersionRef.current === version) {
                setQrImage(url);
              }
            })
            .catch(() => {
              if (qrVersionRef.current === version) {
                setQrImage('');
              }
            });
        }

        if (data.type === 'session.snapshot') {
          const snapshot = data.payload?.session;
          if (!snapshot) {
            setSessionStatus('session: idle');
            setSessionLive(false);
          } else {
            setSessionId(snapshot.id);
            setHasRequestedSession(true);
            if (snapshot.status === 'connected') {
              setSessionStatus('session: connected');
              setSessionLive(true);
              void loadChats({ sessionIdOverride: snapshot.id });
            } else if (snapshot.status === 'pending_qr') {
              setSessionStatus('session: pending_qr');
              setSessionLive(true);
              if (snapshot.qr) {
                setQr(snapshot.qr);
                setQrExpires(`expires: ${snapshot.qrExpiresAt ?? '-'}`);
                const version = ++qrVersionRef.current;
                buildQrDataUrl(snapshot.qr)
                  .then((url) => {
                    if (qrVersionRef.current === version) {
                      setQrImage(url);
                    }
                  })
                  .catch(() => {
                    if (qrVersionRef.current === version) {
                      setQrImage('');
                    }
                  });
              }
            } else if (snapshot.status === 'disconnected') {
              setSessionStatus('session: disconnected');
              setSessionLive(false);
            }
          }
        }

        if (data.type === 'session.status.connected') {
          setSessionStatus('session: connected');
          setSessionLive(true);
          setHasRequestedSession(true);
          void loadChats();
        }

        if (data.type === 'session.status.disconnected') {
          setSessionStatus('session: disconnected');
          setSessionLive(false);
        }

        if (data.type === 'session.history.sync') {
          const payload = data.payload || {};
          const progress =
            typeof payload.progress === 'number' && !Number.isNaN(payload.progress)
              ? Math.max(0, Math.min(100, Math.round(payload.progress)))
              : null;
          const isLatest = Boolean(payload.isLatest);
          const label = progress !== null ? `${progress}%` : 'syncing';
          const suffix = isLatest ? 'complete' : 'syncing';
          setHistoryStatus(`history: ${label} (${suffix})`);
          setHistoryLive(!isLatest);
          if (isLatest) {
            void loadChats();
          }
        }

        if (data.type === 'session.messages.upsert') {
          const payload = data.payload || {};
          const upsertMessages = Array.isArray(payload.messages) ? payload.messages : [];
          if (upsertMessages.length) {
            updateChatsFromUpsert(upsertMessages, payload.upsertType);
            if (selectedChat) {
              const matches = upsertMessages.some((msg) => msg.remoteJid === selectedChat.chatJid);
              if (matches) {
                void loadMessages(selectedChat.chatJid);
              }
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    });
  };

  const loadChats = async ({ sessionIdOverride, skipFallback } = {}) => {
    const authToken = ensureToken();
    if (!authToken) return;

    const resolvedSessionId = sessionIdOverride ?? sessionId;
    const response = await fetch(
      `${API_BASE_URL}/chats${resolvedSessionId ? `?sessionId=${encodeURIComponent(resolvedSessionId)}` : ''}`,
      { headers: apiHeaders, credentials: 'include' }
    );
    const payload = await response.json().catch(() => null);
    if (!payload || !response.ok) {
      return;
    }

    if (payload.sessionId) {
      setSessionId(payload.sessionId);
    } else if (resolvedSessionId && !skipFallback) {
      setSessionId('');
      await loadChats({ sessionIdOverride: '', skipFallback: true });
      return;
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    setChats(items);
    if (!selectedChat && items.length) {
      setSelectedChat(items[0]);
      void loadMessages(items[0].chatJid);
    }
  };

  const loadMessages = async (chatJid) => {
    const authToken = ensureToken();
    if (!authToken) return;

    const base = `${API_BASE_URL}/chats/${encodeURIComponent(chatJid)}/messages?limit=50`;
    const sessionParam = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : '';
    const response = await fetch(`${base}${sessionParam}`, {
      headers: apiHeaders,
      credentials: 'include',
    });
    const payload = await response.json().catch(() => null);
    if (!payload || !response.ok) {
      return;
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    const ordered = [...items].reverse();
    setMessages(ordered);
  };

  const updateChatsFromUpsert = (items, upsertType) => {
    setChats((prev) => {
      const next = [...prev];
      const updates = new Map();
      for (const msg of items) {
        if (!msg.remoteJid) {
          continue;
        }
        updates.set(msg.remoteJid, msg);
      }

      for (const [jid, msg] of updates.entries()) {
        const index = next.findIndex((chat) => chat.chatJid === jid);
        const messageTs = msg.timestamp ? new Date(msg.timestamp * 1000) : null;
        const messageText = msg.text || (msg.type ? `[${msg.type}]` : '');
        const unreadDelta = upsertType === 'notify' && !msg.fromMe && (!selectedChat || selectedChat.chatJid !== jid)
          ? 1
          : 0;

        if (index >= 0) {
          const chat = next[index];
          next[index] = {
            ...chat,
            lastMessageId: msg.id ?? chat.lastMessageId,
            lastMessageTs: messageTs ?? chat.lastMessageTs,
            lastMessageText: messageText ?? chat.lastMessageText,
            lastMessageType: msg.type ?? chat.lastMessageType,
            unreadCount: (chat.unreadCount || 0) + unreadDelta,
          };
        } else {
          next.push({
            chatJid: jid,
            chatName: null,
            lastMessageId: msg.id ?? null,
            lastMessageTs: messageTs,
            lastMessageText: messageText || null,
            lastMessageType: msg.type ?? null,
            unreadCount: unreadDelta,
          });
        }
      }

      next.sort((a, b) => {
        const aTs = a.lastMessageTs ? new Date(a.lastMessageTs).getTime() : 0;
        const bTs = b.lastMessageTs ? new Date(b.lastMessageTs).getTime() : 0;
        return bTs - aTs;
      });
      return next;
    });
  };

  const startSession = async () => {
    const authToken = ensureToken();
    if (!authToken) return;

    setHasRequestedSession(true);
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: apiHeaders,
      credentials: 'include',
    });

    const payload = await response.json().catch(() => ({}));
    if (payload.sessionId) {
      setSessionId(payload.sessionId);
    }
  };

  const sendMessage = async () => {
    const authToken = ensureToken();
    if (!authToken || !selectedChat) return;

    const content = messageContent.trim();
    if (!content) {
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/chats/${encodeURIComponent(selectedChat.chatJid)}/messages`,
      {
        method: 'POST',
        headers: apiHeaders,
        credentials: 'include',
        body: JSON.stringify({ content, sessionId }),
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (payload.commandId) {
      setMessageContent('');
    }
  };

  useEffect(() => {
    if (accessToken) {
      void connectWs();
    }
    return () => {
      wsReconnectRef.current.manualClose = true;
      clearWsTimers();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [accessToken]);

  useEffect(() => {
    if (status !== 'ready' || !accessToken) {
      return;
    }
    void loadChats();
  }, [status, accessToken]);

  useEffect(() => {
    if (sessionId) {
      setHasRequestedSession(true);
    }
  }, [sessionId]);

  const groupedChats = useMemo(() => {
    const people = [];
    const groups = [];
    for (const chat of chats) {
      if (chat.chatJid?.endsWith('@g.us')) {
        groups.push(chat);
      } else {
        people.push(chat);
      }
    }
    const sortByTs = (items) =>
      items.sort((a, b) => {
        const aTs = a.lastMessageTs ? new Date(a.lastMessageTs).getTime() : 0;
        const bTs = b.lastMessageTs ? new Date(b.lastMessageTs).getTime() : 0;
        return bTs - aTs;
      });
    return { people: sortByTs(people), groups: sortByTs(groups) };
  }, [chats]);

  const selectedMessages = messages.map((msg) => ({
    id: msg.id,
    fromMe: msg.fromMe,
    text: msg.text || (msg.type ? `[${msg.type}]` : ''),
    timestamp: msg.timestamp,
  }));

  return (
    <div className="console-shell">
      <aside className="console-sidebar">
        <div className="sidebar-top">
          <div>
            <h2>Chats</h2>
            <div className="note">{sessionStatus}</div>
          </div>
          <button onClick={startSession}>Start session</button>
        </div>
        <div className="sidebar-status">
          <span className={`pill ${wsLive ? 'live' : ''}`}>{wsStatus}</span>
          <span className={`pill ${sessionLive ? 'live' : ''}`}>{sessionStatus}</span>
          <span className={`pill ${historyLive ? 'live' : ''}`}>{historyStatus}</span>
          <RefreshStatusPill />
        </div>

        <div className="chat-section">
          <div className="chat-section-title">Personas</div>
          {groupedChats.people.length === 0 ? (
            <div className="note">Sin chats aun.</div>
          ) : (
            groupedChats.people.map((chat) => (
              <button
                key={chat.chatJid}
                className={`chat-row ${selectedChat?.chatJid === chat.chatJid ? 'active' : ''}`}
                onClick={() => {
                  setSelectedChat(chat);
                  void loadMessages(chat.chatJid);
                }}
              >
                <div className="chat-avatar">{(chat.chatName || chat.chatJid || '?')[0]}</div>
                <div className="chat-body">
                  <div className="chat-title">{chat.chatName || chat.chatJid}</div>
                  <div className="chat-preview">{chat.lastMessageText || 'Sin mensajes'}</div>
                </div>
                {chat.unreadCount > 0 ? <div className="chat-unread">{chat.unreadCount}</div> : null}
              </button>
            ))
          )}
        </div>

        <div className="chat-section">
          <div className="chat-section-title">Grupos</div>
          {groupedChats.groups.length === 0 ? (
            <div className="note">Sin grupos aun.</div>
          ) : (
            groupedChats.groups.map((chat) => (
              <button
                key={chat.chatJid}
                className={`chat-row ${selectedChat?.chatJid === chat.chatJid ? 'active' : ''}`}
                onClick={() => {
                  setSelectedChat(chat);
                  void loadMessages(chat.chatJid);
                }}
              >
                <div className="chat-avatar">{(chat.chatName || chat.chatJid || '?')[0]}</div>
                <div className="chat-body">
                  <div className="chat-title">{chat.chatName || chat.chatJid}</div>
                  <div className="chat-preview">{chat.lastMessageText || 'Sin mensajes'}</div>
                </div>
                {chat.unreadCount > 0 ? <div className="chat-unread">{chat.unreadCount}</div> : null}
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="console-chat">
        {hasRequestedSession && sessionStatus === 'session: pending_qr' && !selectedChat ? (
          <div className="qr-panel">
            <h3>Escanea el QR</h3>
            {qrImage ? <img className="qr-image" src={qrImage} alt="QR code" /> : <div className="qr-box">{qr}</div>}
            <div className="status">
              <span className="pill">{qrExpires}</span>
            </div>
          </div>
        ) : selectedChat ? (
          <div className="chat-window">
            <div className="chat-header">
              <div>
                <div className="chat-title">{selectedChat.chatName || selectedChat.chatJid}</div>
                <div className="note">{selectedChat.chatJid}</div>
              </div>
              {!sessionLive ? <span className="pill">offline</span> : null}
            </div>
            <div className="chat-messages">
              {selectedMessages.length === 0 ? (
                <div className="note">Sin mensajes aun.</div>
              ) : (
                selectedMessages.map((msg) => (
                  <div key={msg.id} className={`bubble ${msg.fromMe ? 'out' : 'in'}`}>
                    <div>{msg.text}</div>
                  </div>
                ))
              )}
            </div>
            <div className="chat-input">
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Escribe un mensaje"
              ></textarea>
              <button onClick={sendMessage} disabled={!sessionLive}>Enviar</button>
            </div>
          </div>
        ) : !sessionLive ? (
          <div className="chat-empty">
            <h3>Inicia una sesion</h3>
            <p>Presiona Start session para generar el QR y conectar tu cuenta.</p>
          </div>
        ) : (
          <div className="chat-empty">
            <h3>Selecciona un chat</h3>
            <p>Cuando la sincronizacion termine, tus chats apareceran aqui.</p>
          </div>
        )}
      </main>
    </div>
  );
};

const RequireAuth = ({ children }) => {
  const { status, accessToken } = useAuth();
  if (status === 'loading') {
    return (
      <div>
        <header>
          <h1>Anna Sessions Console</h1>
          <p>Checking session...</p>
        </header>
        <section className="grid">
          <div className="card">
            <div className="status">
              <RefreshStatusPill />
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/console" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/console"
          element={
            <RequireAuth>
              <ConsolePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/console" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
