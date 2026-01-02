export type SessionProviderHandlers = {
  onQr: (qr: string, expiresAt: Date) => Promise<void> | void;
  onConnected: (phone: string, connectedAt: Date) => Promise<void> | void;
  onDisconnected: (reason: string, disconnectedAt: Date) => Promise<void> | void;
};

export type StartSessionRequest = {
  sessionId: string;
  tenantId: string;
  handlers: SessionProviderHandlers;
};

export type SendSessionMessageRequest = {
  sessionId: string;
  to: string;
  content: string;
  messageId?: string;
};

export interface SessionProvider {
  start(request: StartSessionRequest): Promise<void>;
  stop(sessionId: string): Promise<void>;
  sendMessage(request: SendSessionMessageRequest): Promise<void>;
}
