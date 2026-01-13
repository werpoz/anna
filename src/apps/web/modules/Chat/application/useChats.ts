import { useState, useEffect } from 'react';
import type { Chat } from '../domain/Chat';
import type { Message } from '../domain/Message';
import type { MessageEvent, MessageStatusEvent } from '../../Shared/infrastructure/messageEventBus';

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
    media: {
        kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
        url: string;
        mime: string;
        fileName?: string;
    } | null;
    mentions?: Array<{
        jid: string;
        name: string | null;
    }>;
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
                        avatar: (item as any).avatar || undefined, // Profile picture URL from backend
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
                        text: item.text || (item.media ? '' : `[${item.type}]`),
                        sender: item.fromMe ? 'me' : 'them',
                        timestamp: formatTimestamp(item.timestamp),
                        status: mapBackendStatus(item.status),
                        type: item.type,
                        senderJid: item.senderJid,
                        media: item.media,
                        mentions: item.mentions,
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

    const sendMessage = async (text: string, media?: { file: File; kind: 'image' | 'video' | 'audio' | 'document' }) => {
        if (!activeChatId || !sessionId) return;

        // Optimistic UI update
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            text: text || (media?.kind ? '' : '...'),
            sender: 'me',
            timestamp: 'Just now',
            status: 'sent',
            media: media ? {
                kind: media.kind,
                url: URL.createObjectURL(media.file), // Temporary local preview
                mime: media.file.type,
                fileName: media.file.name
            } : null
        };

        setMessages((prev) => [...prev, tempMessage]);

        try {
            let uploadedMedia = null;
            if (media) {
                const formData = new FormData();
                formData.append('file', media.file);
                formData.append('kind', media.kind);
                formData.append('sessionId', sessionId);

                const uploadRes = await fetch('/api/media', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) throw new Error('Failed to upload media');
                const uploadData = await uploadRes.json();
                uploadedMedia = uploadData.media;
            }

            // Call sendMessage endpoint
            const res = await fetch(`/api/chats/${encodeURIComponent(activeChatId)}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    text,
                    media: uploadedMedia,
                }),
            });

            if (!res.ok) throw new Error('Failed to send message');

            // Cleanup local object URL
            if (tempMessage.media?.url.startsWith('blob:')) {
                URL.revokeObjectURL(tempMessage.media.url);
            }

        } catch (err) {
            console.error('Failed to send message:', err);
            // Remove optimistic message on failure
            setMessages((prev) => prev.filter(m => m.id !== tempMessage.id));
            alert('Failed to send message');
        }
    };

    // Real-time message updates via WebSocket
    useEffect(() => {
        if (!sessionId) return;

        const { messageEventBus } = require('../../Shared/infrastructure/messageEventBus');

        // Handle new messages
        const unsubscribeMessages = messageEventBus.onNewMessages((event: MessageEvent) => {
            const { sessionId: sid, messages: newMsgs } = event;
            if (sid !== sessionId) return;

            console.log('[useChats] Received real-time messages:', newMsgs.length);

            const mappedMessages: Message[] = newMsgs.map((item) => ({
                id: item.id,
                text: item.text || (item.media ? '' : `[${item.type}]`),
                sender: item.fromMe ? 'me' : 'them',
                timestamp: formatTimestamp(item.timestamp),
                status: 'sent',
                type: item.type,
                senderJid: item.senderJid,
                media: item.media,
            }));

            // Update messages if the new message belongs to the active chat
            newMsgs.forEach((msg) => {
                if (msg.chatJid === activeChatId) {
                    setMessages((prev) => [...prev, ...mappedMessages.filter(m => m.id === msg.id)]);
                }

                // Update chat list with new "last message"
                setChats((prev) =>
                    prev.map((chat) =>
                        chat.id === msg.chatJid
                            ? {
                                ...chat,
                                lastMessage: msg.text || `[${msg.type}]`,
                                timestamp: formatTimestamp(msg.timestamp),
                                unreadCount: msg.chatJid === activeChatId ? chat.unreadCount : chat.unreadCount + 1,
                            }
                            : chat
                    )
                );
            });
        });

        // Handle message status updates (sent → delivered → read)
        const unsubscribeStatus = messageEventBus.onMessageStatus((event: MessageStatusEvent) => {
            const { sessionId: sid, messageId, status } = event;
            if (sid !== sessionId) return;

            console.log('[useChats] Message status update:', messageId, status);

            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, status: mapBackendStatus(status) } : m))
            );
        });

        return () => {
            unsubscribeMessages();
            unsubscribeStatus();
        };
    }, [sessionId, activeChatId]);

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
