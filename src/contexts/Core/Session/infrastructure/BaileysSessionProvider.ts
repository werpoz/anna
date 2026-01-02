import makeWASocket, {
  Browsers,
  DisconnectReason,
  type WASocket,
} from 'baileys';
import type { Pool } from 'pg';
import type {
  SessionProvider,
  SessionProviderHandlers,
  StartSessionRequest,
  SendSessionMessageRequest,
} from '@/contexts/Core/Session/application/SessionProvider';
import { usePostgresAuthState } from '@/contexts/Core/Session/infrastructure/PostgresBaileysAuthState';

export type BaileysSessionProviderOptions = {
  pool: Pool;
  qrTtlMs: number;
  printQrInTerminal: boolean;
  browserName: string;
  markOnlineOnConnect: boolean;
};

type ActiveSession = {
  socket: WASocket;
  handlers: SessionProviderHandlers;
};

export class BaileysSessionProvider implements SessionProvider {
  private readonly sessions: Map<string, ActiveSession>;
  private readonly options: BaileysSessionProviderOptions;

  constructor(options: BaileysSessionProviderOptions) {
    this.options = options;
    this.sessions = new Map();
  }

  async start(request: StartSessionRequest): Promise<void> {
    if (this.sessions.has(request.sessionId)) {
      return;
    }

    const { state, saveCreds } = await usePostgresAuthState(this.options.pool, {
      sessionId: request.sessionId,
      tenantId: request.tenantId,
    });
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: this.options.printQrInTerminal,
      browser: Browsers.ubuntu(this.options.browserName),
      markOnlineOnConnect: this.options.markOnlineOnConnect,
    });

    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        const expiresAt = new Date(Date.now() + this.options.qrTtlMs);
        void request.handlers.onQr(qr, expiresAt);
      }

      if (connection === 'open') {
        const phone = socket.user?.id ?? '';
        if (phone) {
          void request.handlers.onConnected(phone, new Date());
        }
      }

      if (connection === 'close') {
        const reason = resolveDisconnectReason(lastDisconnect?.error);
        void request.handlers.onDisconnected(reason, new Date());
        this.sessions.delete(request.sessionId);
      }
    });

    this.sessions.set(request.sessionId, { socket, handlers: request.handlers });
  }

  async stop(sessionId: string): Promise<void> {
    const active = this.sessions.get(sessionId);
    if (!active) {
      return;
    }

    try {
      active.socket.end(new Error('session_closed'));
    } finally {
      this.sessions.delete(sessionId);
    }
  }

  async sendMessage(request: SendSessionMessageRequest): Promise<void> {
    const active = this.sessions.get(request.sessionId);
    if (!active) {
      throw new Error(`Session <${request.sessionId}> is not active`);
    }

    await active.socket.sendMessage(request.to, { text: request.content });
  }
}

const resolveDisconnectReason = (error: unknown): string => {
  const statusCode = (error as { output?: { statusCode?: number } })?.output?.statusCode;

  if (typeof statusCode === 'number') {
    const reason = DisconnectReason[statusCode as DisconnectReason];
    if (typeof reason === 'string') {
      return reason;
    }
    return `status_${statusCode}`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'unknown';
};
