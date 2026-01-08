import { useEffect, useState, useRef } from 'react';
import { connectWebSocket } from '@/lib/api';

export interface Session {
    id: string;
    status: 'connected' | 'disconnected' | 'connecting';
    qr?: string;
    // Add other session properties as needed
}

export function useSessions() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Initialize WebSocket connection
        const ws = connectWebSocket();
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, []);

    const handleMessage = (data: any) => {
        switch (data.type) {
            case 'session.snapshot':
                if (data.payload && data.payload.session) {
                    // Transform payload to Session object if needed
                    const sessionData = data.payload.session;
                    setSessions([sessionData]); // Current implementation sends single session?
                }
                break;
            // Add other event handlers
            default:
                break;
        }
    };

    return {
        sessions,
        isConnected,
    };
}
