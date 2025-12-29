export type EmailMessage = {
  to: string;
  subject: string;
} & (
  | { html: string; text?: string }
  | { text: string; html?: string }
);

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
