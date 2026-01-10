export interface Message {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
    type?: string;
    senderJid?: string;
}
