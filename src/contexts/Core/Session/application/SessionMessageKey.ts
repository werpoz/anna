import type { SessionMessageKey } from '@/contexts/Core/Session/application/SessionProvider';

type RawMessage = {
  key?: {
    id?: string | null;
    remoteJid?: string | null;
    fromMe?: boolean | null;
    participant?: string | null;
  };
};

export const extractSessionMessageKey = (raw: Record<string, unknown> | null): SessionMessageKey | null => {
  if (!raw) {
    return null;
  }
  const key = (raw as RawMessage).key;
  const id = key?.id ?? '';
  const remoteJid = key?.remoteJid ?? '';
  if (!id || !remoteJid) {
    return null;
  }

  return {
    id,
    remoteJid,
    fromMe: key?.fromMe ?? undefined,
    participant: key?.participant ?? undefined,
  };
};
