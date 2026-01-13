import type { WASocket, ConnectionState } from 'baileys';
import { DisconnectReason } from 'baileys';
import type { SessionProviderHandlers } from '@/contexts/Core/Session/application/SessionProvider';
import { resolveDisconnectReason, shouldReconnect } from '../mappers/BaileysUtils';

export class BaileysConnectionHandler {
    constructor(
        private readonly sessionId: string,
        private readonly requestHandlers: SessionProviderHandlers,
        private readonly qrTtlMs: number,
        private readonly onClearReconnectState: (sessionId: string) => void,
        private readonly onScheduleReconnect: (sessionId: string) => void,
        private readonly onSessionEnded: (sessionId: string) => void
    ) { }

    handle(socket: WASocket): void {
        socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
            const { connection, qr, lastDisconnect } = update;

            if (qr) {
                const expiresAt = new Date(Date.now() + this.qrTtlMs);
                void this.requestHandlers.onQr(qr, expiresAt);
            }

            if (connection === 'open') {
                this.onClearReconnectState(this.sessionId);
                const phone = socket.user?.id ?? '';
                if (phone) {
                    void this.requestHandlers.onConnected(phone, new Date());
                }
            }

            if (connection === 'close') {
                const reason = resolveDisconnectReason(lastDisconnect?.error);
                void this.requestHandlers.onDisconnected(reason, new Date());
                this.onSessionEnded(this.sessionId);

                if (shouldReconnect(lastDisconnect?.error)) {
                    this.onScheduleReconnect(this.sessionId);
                }
            }
        });
    }
}
