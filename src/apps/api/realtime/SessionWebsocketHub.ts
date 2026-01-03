import type { AuthPayload } from '@/apps/api/types';
import type { ServerWebSocket } from 'bun';

export type SessionSocketData = {
  auth: AuthPayload;
};

export type SessionEventMessage = {
  type: string;
  sessionId: string;
  eventId?: string;
  occurredOn?: string;
  payload: Record<string, unknown>;
};

export class SessionWebsocketHub {
  private readonly clients: Map<string, Set<ServerWebSocket<SessionSocketData>>>;

  constructor() {
    this.clients = new Map();
  }

  add(ws: ServerWebSocket<SessionSocketData>): void {
    const tenantId = ws.data.auth.userId;
    const existing = this.clients.get(tenantId) ?? new Set();
    existing.add(ws);
    this.clients.set(tenantId, existing);
  }

  remove(ws: ServerWebSocket<SessionSocketData>): void {
    const tenantId = ws.data.auth.userId;
    const existing = this.clients.get(tenantId);
    if (!existing) {
      return;
    }

    existing.delete(ws);
    if (existing.size === 0) {
      this.clients.delete(tenantId);
    }
  }

  broadcast(tenantId: string, message: SessionEventMessage): void {
    const targets = this.clients.get(tenantId);
    if (!targets || targets.size === 0) {
      return;
    }

    const payload = JSON.stringify(message);
    for (const ws of targets) {
      if (ws.readyState === 1) {
        ws.send(payload);
      }
    }
  }
}
