'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions, Session } from '@/hooks/useSessions';
import { useChats } from '@/hooks/useChats';

import GlobalSidebar from '@/components/Console/GlobalSidebar';
import ContextPanel from '@/components/Console/ContextPanel';
import MainStage from '@/components/Console/MainStage';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ConsolePage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  // Data Hooks
  const { sessions, isConnected, createSession, deleteSession } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Derived State
  const selectedSession = sessions.find(s => s.id === selectedSessionId) || null;

  // Chat Hooks
  const { chats, activeChatId, setActiveChatId, messages, sendMessage } = useChats(selectedSessionId, selectedSession?.lastSyncedAt);

  // UI State
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionId, setNewSessionId] = useState('');

  // Protect Route
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Auto-select first session
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    } else if (sessions.length === 0) {
      if (selectedSessionId) setSelectedSessionId(null);
    }
  }, [sessions, selectedSessionId]);

  // Auto-select first chat when session is ready and sync is done
  useEffect(() => {
    if (
      selectedSession?.status === 'connected' &&
      selectedSession.syncProgress === undefined &&
      chats.length > 0 &&
      !activeChatId
    ) {
      setActiveChatId(chats[0].id);
    }
  }, [selectedSession, chats, activeChatId]);

  const handleSelectSession = (session: Session) => {
    setSelectedSessionId(session.id);
    setActiveChatId(null); // Reset chat when switching sessions
  };

  const handleCreateSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate a UUID for the session (backend requires UUID format)
    const sessionId = crypto.randomUUID();
    createSession(sessionId);
    setSelectedSessionId(sessionId);
    setNewSessionId('');
    setIsCreatingSession(false);
  };

  const handleDeleteSession = () => {
    if (selectedSessionId && confirm(`Delete session ${selectedSessionId}?`)) {
      deleteSession(selectedSessionId);
    }
  };

  if (isLoading || !user) return null; // Or loading spinner

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#d1d7db] dark:bg-[#0b141a] font-sans">

      {/* 1. Global Navigation Rail */}
      <GlobalSidebar
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={() => setIsCreatingSession(true)}
        userEmail={user.email}
      />

      {/* 2. Context Panel (Chats List) */}
      <ContextPanel
        session={selectedSession}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onDeleteSession={handleDeleteSession}
      />

      {/* 3. Main Stage (Messages / QR) */}
      <MainStage
        session={selectedSession}
        activeChatId={activeChatId}
        messages={messages}
        onSendMessage={sendMessage}
      />

      {/* Modal: Create Session */}
      <Dialog open={isCreatingSession} onOpenChange={setIsCreatingSession}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#202c33] border-[#e9edef] dark:border-[#222d34]">
          <DialogHeader>
            <DialogTitle className="text-[#111b21] dark:text-[#e9edef]">Add New Session</DialogTitle>
            <DialogDescription className="text-[#54656f] dark:text-[#aebac1]">
              A new WhatsApp session will be created. You can optionally give it a friendly name.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSessionSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sessionLabel" className="text-[#111b21] dark:text-[#e9edef]">
                Label (Optional)
              </Label>
              <Input
                id="sessionLabel"
                value={newSessionId}
                onChange={(e) => setNewSessionId(e.target.value)}
                className="col-span-3 bg-[#f0f2f5] dark:bg-[#2a3942] border-[#d1d7db] dark:border-[#222d34]"
                placeholder="e.g., Sales Team, Support"
              />
              <p className="text-xs text-[#54656f] dark:text-[#8696a0]">
                A unique UUID will be generated automatically
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreatingSession(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#00a884] hover:bg-[#008f6f] text-white">Create Session</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}