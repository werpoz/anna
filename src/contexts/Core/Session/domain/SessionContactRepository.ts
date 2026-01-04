export type SessionContactRecord = {
  id: string;
  tenantId: string;
  sessionId: string;
  contactJid: string;
  contactLid: string | null;
  phoneNumber: string | null;
  name: string | null;
  notify: string | null;
  verifiedName: string | null;
  imgUrl: string | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionContactSummary = {
  contactJid: string;
  contactLid: string | null;
  phoneNumber: string | null;
  name: string | null;
  notify: string | null;
  verifiedName: string | null;
  imgUrl: string | null;
  status: string | null;
};

export interface SessionContactRepository {
  upsertMany(records: SessionContactRecord[]): Promise<void>;
  listByTenant(tenantId: string, sessionId?: string): Promise<SessionContactSummary[]>;
  deleteBySession(sessionId: string): Promise<void>;
}
