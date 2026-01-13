import { EventEmitter } from 'events';

// Event types for type safety
export interface MessageEvent {
    sessionId: string;
    messages: Array<{
        id: string;
        chatJid: string;
        text: string;
        fromMe: boolean;
        timestamp: string;
        type: string;
        senderJid?: string;
        media?: {
            kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
            url: string;
            mime: string;
            fileName?: string;
        } | null;
    }>;
}

export interface MessageStatusEvent {
    sessionId: string;
    messageId: string;
    chatJid: string;
    status: 'sent' | 'delivered' | 'read';
}

// Singleton event bus for cross-module communication
class MessageEventBus extends EventEmitter {
    emitNewMessages(event: MessageEvent) {
        this.emit('messages:new', event);
    }

    emitMessageStatus(event: MessageStatusEvent) {
        this.emit('messages:status', event);
    }

    onNewMessages(handler: (event: MessageEvent) => void) {
        this.on('messages:new', handler);
        return () => this.off('messages:new', handler);
    }

    onMessageStatus(handler: (event: MessageStatusEvent) => void) {
        this.on('messages:status', handler);
        return () => this.off('messages:status', handler);
    }
}

export const messageEventBus = new MessageEventBus();
