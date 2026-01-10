export interface Chat {
    id: string; // chatJid
    name: string;
    avatar?: string;
    lastMessage: string;
    unreadCount: number;
    timestamp: string;
    isGroup: boolean;
}
