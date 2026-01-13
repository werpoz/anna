export interface Session {
    id: string; // "sessionId"
    status: 'connected' | 'disconnected' | 'connecting' | 'waiting_qr'; // mapped from backend
    qr?: string;
    syncProgress?: number; // 0-100, undefined if not syncing
    lastSyncedAt?: number; // Timestamp of last completed sync
    phone?: string; // Connected user's JID
    // properties from backend primitives if needed:
    // failureReason?: string; 
}
