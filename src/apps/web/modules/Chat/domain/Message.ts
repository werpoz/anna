export interface MessageMedia {
    kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
    url: string;
    mime: string;
    fileName?: string;
}

export interface Message {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
    type?: string;
    senderJid?: string;
    media?: MessageMedia | null;
    mentions?: Array<{
        jid: string;
        name: string | null;
    }>;
}
