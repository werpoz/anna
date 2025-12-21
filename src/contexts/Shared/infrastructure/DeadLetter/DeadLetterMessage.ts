export type DeadLetterMessage = {
  id: string;
  eventId: string;
  aggregateId: string;
  eventName: string;
  occurredOn: Date;
  payload: Record<string, unknown>;
  error: string;
  attempts: number;
};
