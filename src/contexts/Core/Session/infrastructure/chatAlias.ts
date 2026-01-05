import type { SessionChatAliasRepository } from '@/contexts/Core/Session/domain/SessionChatAliasRepository';
import type {
  SessionChatAliasRecord,
  SessionChatAliasType,
} from '@/contexts/Core/Session/domain/SessionChatAliasRepository';

export const resolveAliasType = (alias: string): SessionChatAliasType => {
  if (alias.endsWith('@lid')) {
    return 'lid';
  }
  if (alias.endsWith('@s.whatsapp.net') || alias.endsWith('@g.us') || alias.endsWith('@broadcast')) {
    return 'jid';
  }
  return 'waid';
};

export const ensureAliases = async (params: {
  repository: SessionChatAliasRepository;
  sessionId: string;
  tenantId: string;
  aliases: string[];
  now?: Date;
}): Promise<Map<string, string>> => {
  const unique = Array.from(new Set(params.aliases.filter(Boolean)));
  if (!unique.length) {
    return new Map();
  }

  const existing = await params.repository.resolveMany({
    sessionId: params.sessionId,
    aliases: unique,
  });

  const now = params.now ?? new Date();
  const missing = unique.filter((alias) => !existing.has(alias));
  if (missing.length) {
    const records: SessionChatAliasRecord[] = missing.map((alias) => ({
      id: crypto.randomUUID(),
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      chatKey: crypto.randomUUID(),
      alias,
      aliasType: resolveAliasType(alias),
      createdAt: now,
      updatedAt: now,
    }));
    await params.repository.upsertMany(records);
    for (const record of records) {
      existing.set(record.alias, record.chatKey);
    }
  }

  return existing;
};
