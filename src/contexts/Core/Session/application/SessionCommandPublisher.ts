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
  content?: string;
  media?: {
    kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
    url: string;
    mime?: string | null;
    fileName?: string | null;
    size?: number | null;
  } | null;
  caption?: string | null;
  ptt?: boolean;
  messageId?: string;
  replyToMessageId?: string;
  forwardMessageId?: string;
};

export type ReadSessionMessagesCommand = {
  type: 'session.readMessages';
  commandId: string;
  sessionId: string;
  messageIds: string[];
};

export type EditSessionMessageCommand = {
  type: 'session.editMessage';
  commandId: string;
  sessionId: string;
  messageId: string;
  content: string;
};

export type DeleteSessionMessageCommand = {
  type: 'session.deleteMessage';
  commandId: string;
  sessionId: string;
  messageId: string;
};

export type ReactSessionMessageCommand = {
  type: 'session.reactMessage';
  commandId: string;
  sessionId: string;
  messageId: string;
  emoji: string | null;
};

export type DeleteSessionCommand = {
  type: 'session.delete';
  commandId: string;
  sessionId: string;
};

export type SessionCommand =
  | StartSessionCommand
  | StopSessionCommand
  | SendSessionMessageCommand
  | ReadSessionMessagesCommand
  | EditSessionMessageCommand
  | DeleteSessionMessageCommand
  | ReactSessionMessageCommand
  | DeleteSessionCommand;

export interface SessionCommandPublisher {
  publish(command: SessionCommand): Promise<void>;
}
