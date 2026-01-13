import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionChatSummary } from '@/contexts/Core/Session/application/SessionProvider';

type SessionChatsUpsertDomainEventPayload = {
    chats: SessionChatSummary[];
    source: 'history' | 'event';
};

export class SessionChatsUpsertDomainEvent extends DomainEvent {
    static override readonly EVENT_NAME = 'session.chats.upsert';

    readonly payload: SessionChatsUpsertDomainEventPayload;
    readonly tenantId: string;

    constructor(payload: SessionChatsUpsertDomainEventPayload & {
        aggregateId: string;
        tenantId: string;
        eventId?: string;
        occurredOn?: Date;
    }) {
        super({
            eventName: SessionChatsUpsertDomainEvent.EVENT_NAME,
            aggregateId: payload.aggregateId,
            eventId: payload.eventId,
            occurredOn: payload.occurredOn
        });
        this.tenantId = payload.tenantId;
        this.payload = { chats: payload.chats, source: payload.source };
    }

    toPrimitives(): SessionChatsUpsertDomainEventPayload & { tenantId: string } {
        return {
            tenantId: this.tenantId,
            ...this.payload
        };
    }

    static override fromPrimitives(params: {
        aggregateId: string;
        eventId: string;
        occurredOn: Date;
        attributes: SessionChatsUpsertDomainEventPayload & { tenantId: string };
    }): SessionChatsUpsertDomainEvent {
        const { aggregateId, eventId, occurredOn, attributes } = params;
        return new SessionChatsUpsertDomainEvent({
            aggregateId,
            eventId,
            occurredOn,
            tenantId: attributes.tenantId,
            chats: attributes.chats,
            source: attributes.source
        });
    }
}
