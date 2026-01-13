import { useState, useEffect, useRef } from 'react';
import type { Session } from '../domain/Session';
import { messageEventBus } from '../../Shared/infrastructure/messageEventBus';

interface UseSessionsReturn {
    sessions: Session[];
    isConnected: boolean; // WebSocket status
    createSession: (id: string) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    // Helper to map backend status to UI status
    const mapStatus = (backendStatus: string): Session['status'] => {
        switch (backendStatus) {
            case 'authenticated': return 'connected';
            case 'ready': return 'connected';
            case 'connected': return 'connected';
            case 'disconnected': return 'disconnected';
            case 'initializing': return 'connecting';
            case 'pending_qr': return 'waiting_qr';
            default: return 'disconnected';
        }
    };

    useEffect(() => {
        // 1. Get Token
        const getCookies = () => {
            const cookies: { [key: string]: string } = {};
            if (typeof document !== 'undefined') {
                document.cookie.split(';').forEach((cookie) => {
                    const [name, value] = cookie.trim().split('=');
                    if (name && value) cookies[name] = value;
                });
            }
            return cookies;
        };
        const token = getCookies()['access_token'];

        // 2. Connect WebSocket
        if (typeof window === 'undefined') return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect directly to backend port 3000 in dev
        const wsHost = window.location.hostname;
        const wsPort = '3000';
        let wsUrl = `${protocol}//${wsHost}:${wsPort}/ws/sessions`;

        if (token) {
            wsUrl += `?token=${token}`;
        }

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setIsConnected(true);
            console.log('WS Connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WS Message:', data.type, data);

                if (data.type === 'session.snapshot') {
                    // Payload: { session: ..., sessions: [...] }
                    if (data.payload.sessions && Array.isArray(data.payload.sessions)) {
                        const mappedSessions: Session[] = data.payload.sessions.map((s: any) => ({
                            id: s.id,
                            status: mapStatus(s.status),
                            qr: s.qr || undefined, // Include QR if present
                            phone: s.phone || undefined
                        }));
                        setSessions(mappedSessions);
                    } else if (data.payload.session) {
                        // Fallback for single session
                        const s = data.payload.session;
                        setSessions([{
                            id: s.id,
                            status: mapStatus(s.status),
                            qr: s.qr || undefined,
                            phone: s.phone || undefined
                        }]);
                    }
                }

                if (data.type === 'session.status') {
                    const status = data.payload?.status || data.status;
                    const sessionId = data.sessionId;

                    if (sessionId && status) {
                        setSessions(prev => prev.map(s =>
                            s.id === sessionId ? { ...s, status: mapStatus(status) } : s
                        ));
                    }
                }


                if (data.type === 'session.qr' || data.type === 'session.qr.updated') {
                    const qr = data.payload?.qr || data.qr;
                    const sessionId = data.sessionId;

                    if (sessionId && qr) {
                        console.log('QR code received for session:', sessionId);
                        setSessions(prev => prev.map(s =>
                            s.id === sessionId ? { ...s, qr: qr, status: 'waiting_qr' } : s
                        ));
                    }
                }

                if (data.type === 'session.history.sync') {
                    const progress = data.payload?.progress;
                    const isLatest = data.payload?.isLatest;
                    const sessionId = data.sessionId;

                    if (sessionId) {
                        console.log('History sync progress:', sessionId, progress, 'isLatest:', isLatest);
                        setSessions(prev => prev.map(s =>
                            s.id === sessionId ? {
                                ...s,
                                status: 'connected', // Force connected state as we are receiving data
                                qr: undefined,       // Clear QR code
                                syncProgress: isLatest ? undefined : (progress || 0),
                                lastSyncedAt: isLatest ? Date.now() : s.lastSyncedAt
                            } : s
                        ));
                    }
                }

                // NEW: Handle real-time message events
                if (data.type === 'session.messages.upsert' || data.type === 'messages.upsert') {
                    const sessionId = data.sessionId;
                    const messages = data.payload?.messages || [];

                    if (sessionId && messages.length > 0) {
                        console.log(`[Real-time] Received ${messages.length} new message(s) for session ${sessionId}`);

                        // Emit to event bus for useChats to consume
                        messageEventBus.emitNewMessages({ sessionId, messages });
                    }
                }

                // NEW: Handle message status updates (sent/delivered/read)
                if (data.type === 'session.messages.update' || data.type === 'messages.update') {
                    const sessionId = data.sessionId;
                    const updates = data.payload?.updates || [];

                    if (sessionId && updates.length > 0) {
                        console.log(`[Real-time] Received ${updates.length} status update(s)`);

                        updates.forEach((update: any) => {
                            if (update.status) {
                                messageEventBus.emitMessageStatus({
                                    sessionId,
                                    messageId: update.messageId,
                                    chatJid: update.remoteJid || update.chatJid,
                                    status: update.status,
                                });
                            }
                        });
                    }
                }

            } catch (err) {
                console.error('WS Error parsing:', err);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            console.log('WS Disconnected');
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const createSession = async (id: string) => {
        // Optimistic Update
        const newSession: Session = { id, status: 'connecting' };
        setSessions(prev => [...prev, newSession]);

        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ sessionId: id })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Create session error:', res.status, errorData);
                throw new Error(errorData.message || `Failed to create: ${res.status}`);
            }

            const data = await res.json();
            console.log('Session create command sent:', data);
        } catch (err) {
            console.error('Create session failed:', err);
            // Revert optimistic
            setSessions(prev => prev.filter(s => s.id !== id));
            alert(`Error creating session: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const deleteSession = async (id: string) => {
        if (!confirm(`Are you sure you want to delete session "${id}"?`)) {
            return;
        }

        // Optimistic update
        const oldSessions = sessions;
        setSessions(prev => prev.filter(s => s.id !== id));

        try {
            const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                credentials: 'include', // Include cookies for auth
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
                console.error('Delete session error:', res.status, errorData);
                throw new Error(errorData.message || `Failed to delete: ${res.status}`);
            }

            const data = await res.json();
            console.log('Session delete command sent:', data);
        } catch (err) {
            console.error('Delete session failed:', err);
            // Revert optimistic update
            setSessions(oldSessions);
            alert(`Error deleting session: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    return {
        sessions,
        isConnected,
        createSession,
        deleteSession
    };
}
