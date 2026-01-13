import { DisconnectReason, proto } from 'baileys';

export const resolveDisconnectReason = (error: unknown): string => {
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

export const shouldReconnect = (error: unknown): boolean => {
    const statusCode = (error as { output?: { statusCode?: number } })?.output?.statusCode;
    if (statusCode === DisconnectReason.loggedOut) {
        return false;
    }

    if (error instanceof Error && error.message === 'session_closed') {
        return false;
    }

    return true;
};

export const toBaileysKey = (key: {
    id: string;
    remoteJid: string;
    fromMe?: boolean;
    participant?: string;
}): proto.IMessageKey => ({
    id: key.id,
    remoteJid: key.remoteJid,
    fromMe: key.fromMe,
    participant: key.participant,
});

export const resolveTimestampSeconds = (
    value: number | bigint | { toNumber?: () => number } | null | undefined
): number | null => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'bigint') {
        return Number(value);
    }
    if (typeof value === 'object' && typeof value.toNumber === 'function') {
        return value.toNumber();
    }
    return null;
};

export const normalizeTimestampSeconds = (
    value: number | bigint | { toNumber?: () => number } | null | undefined
): number | null => {
    const resolved = resolveTimestampSeconds(value);
    if (resolved === null) {
        return null;
    }
    return resolved > 1_000_000_000_000 ? Math.floor(resolved / 1000) : resolved;
};
