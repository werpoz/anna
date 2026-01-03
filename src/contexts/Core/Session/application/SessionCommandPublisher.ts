export type StartSessionCommand = {
  type: 'session.start';
  commandId: string;
  sessionId: string;
  tenantId: string;
};

export type StopSessionCommand = {
  type: 'session.stop';
  commandId: string;
  sessionId: string;
  reason?: string;
};

export type SendSessionMessageCommand = {
  type: 'session.sendMessage';
  commandId: string;
  sessionId: string;
  to: string;
  content: string;
  messageId?: string;
};

export type SessionCommand = StartSessionCommand | StopSessionCommand | SendSessionMessageCommand;

export interface SessionCommandPublisher {
  publish(command: SessionCommand): Promise<void>;
}
