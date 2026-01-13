import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionChatSummary } from '@/contexts/Core/Session/application/SessionProvider';

type SessionChatsUpdateDomainEventPayload = {
    chats: Partial<SessionChatSummary> & { id: string }[];
    source: 'event';
};

export class SessionChatsUpdateDomainEvent extends DomainEvent {
    static override readonly EVENT_NAME = 'session.chats.update';

    readonly payload: SessionChatsUpdateDomainEventPayload;
    readonly tenantId: string;

    constructor(payload: SessionChatsUpdateDomainEventPayload & {
        aggregateId: string;
        tenantId: string;
        eventId?: string;
        occurredOn?: Date;
    }) {
        super({
            eventName: SessionChatsUpdateDomainEvent.EVENT_NAME,
            aggregateId: payload.aggregateId,
            eventId: payload.eventId,
            occurredOn: payload.occurredOn
        });
        this.tenantId = payload.tenantId;
        this.payload = { chats: payload.chats, source: payload.source };
    }

    toPrimitives(): SessionChatsUpdateDomainEventPayload & { tenantId: string } {
        return {
            tenantId: this.tenantId,
            ...this.payload
        };
    }

    static override fromPrimitives(params: {
        aggregateId: string;
        eventId: string;
        occurredOn: Date;
        attributes: SessionChatsUpdateDomainEventPayload & { tenantId: string };
    }): SessionChatsUpdateDomainEvent {
        const { aggregateId, eventId, occurredOn, attributes } = params;
        return new SessionChatsUpdateDomainEvent({
            aggregateId,
            eventId,
            occurredOn,
            tenantId: attributes.tenantId,
            chats: attributes.chats,
            source: attributes.source
        });
    }
}
