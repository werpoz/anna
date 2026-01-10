import { useState, useEffect } from 'react';
import { Chat } from '../domain/Chat';
import { Message } from '../domain/Message';

interface BackendChat {
    chatJid: string;
    chatName: string | null;
    lastMessageText: string | null;
    lastMessageTs: string | null;
    lastMessageType: string | null;
    unreadCount: number;
}

interface BackendMessage {
    id: string;
    fromMe: boolean;
    senderJid: string;
    timestamp: string | null;
    type: string;
    text: string | null;
    status: string | null;
}

const formatTimestamp = (isoString: string | null): string => {
    if (!isoString) return '';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const mapBackendStatus = (status: string | null): 'sent' | 'delivered' | 'read' => {
    switch (status) {
        case 'SERVER_ACK':
        case 'DELIVERY_ACK':
            return 'delivered';
        case 'READ':
            return 'read';
        default:
            return 'sent';
    }
};

export function useChats(sessionId: string | null, lastSyncedAt?: number) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Fetch chats when session changes
    useEffect(() => {
        if (!sessionId) {
            setChats([]);
            setActiveChatId(null);
            return;
        }

        setIsLoadingChats(true);
        fetch(`/api/chats?sessionId=${sessionId}`)
            .then(res => res.json())
            .then(data => {
                if (data.items && Array.isArray(data.items)) {
                    const mappedChats: Chat[] = data.items.map((item: BackendChat) => ({
                        id: item.chatJid,
                        name: item.chatName || item.chatJid.split('@')[0] || 'Unknown',
                        lastMessage: item.lastMessageText || '',
                        unreadCount: item.unreadCount || 0,
                        timestamp: formatTimestamp(item.lastMessageTs),
                        isGroup: item.chatJid.endsWith('@g.us'),
                    }));
                    setChats(mappedChats);
                } else {
                    setChats([]);
                }
            })
            .catch(err => {
                console.error('Failed to fetch chats:', err);
                setChats([]);
            })
            .finally(() => {
                setIsLoadingChats(false);
            });
    }, [sessionId, lastSyncedAt]);

    // Fetch messages when active chat changes
    useEffect(() => {
        if (!activeChatId || !sessionId) {
            setMessages([]);
            return;
        }

        setIsLoadingMessages(true);
        fetch(`/api/chats/${encodeURIComponent(activeChatId)}/messages?sessionId=${sessionId}&limit=50`)
            .then(res => res.json())
            .then(data => {
                if (data.items && Array.isArray(data.items)) {
                    const mappedMessages: Message[] = data.items.map((item: BackendMessage) => ({
                        id: item.id,
                        text: item.text || `[${item.type}]`,
                        sender: item.fromMe ? 'me' : 'them',
                        timestamp: formatTimestamp(item.timestamp),
                        status: mapBackendStatus(item.status),
                        type: item.type,
                        senderJid: item.senderJid,
                    }));
                    // Backend returns newest first, reverse for chat display (oldest first)
                    setMessages(mappedMessages.reverse());
                } else {
                    setMessages([]);
                }
            })
            .catch(err => {
                console.error('Failed to fetch messages:', err);
                setMessages([]);
            })
            .finally(() => {
                setIsLoadingMessages(false);
            });
    }, [activeChatId, sessionId]);

    const sendMessage = async (text: string) => {
        if (!activeChatId || !sessionId) return;

        // Optimistic UI update
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            text,
            sender: 'me',
            timestamp: 'Just now',
            status: 'sent',
        };

        setMessages((prev) => [...prev, tempMessage]);

        try {
            // Call sendMessage endpoint (this might need adjustment based on your actual endpoint)
            const res = await fetch(`/api/chats/${encodeURIComponent(activeChatId)}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    text,
                }),
            });

            if (!res.ok) throw new Error('Failed to send message');

            // Optionally update with real message ID from response
            // For now, we'll rely on WebSocket updates or polling to get the real message

        } catch (err) {
            console.error('Failed to send message:', err);
            // Remove optimistic message on failure
            setMessages((prev) => prev.filter(m => m.id !== tempMessage.id));
            alert('Failed to send message');
        }
    };

    return {
        chats,
        activeChatId,
        setActiveChatId,
        messages,
        sendMessage,
        isLoadingChats,
        isLoadingMessages,
    };
}
