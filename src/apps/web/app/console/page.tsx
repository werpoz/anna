'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Modules
import { useSessions } from '../../modules/Session/application/useSessions';
import { Session } from '../../modules/Session/domain/Session';
import { useChats } from '../../modules/Chat/application/useChats';

import SessionSidebar from '../../modules/Session/ui/SessionSidebar';
import ChatList from '../../modules/Chat/ui/ChatList';
import AppWelcome from '../../modules/Shared/ui/AppWelcome';
import SessionQRView from '../../modules/Session/ui/SessionQRView';
import SessionSyncView from '../../modules/Session/ui/SessionSyncView';
import SessionWelcome from '../../modules/Session/ui/SessionWelcome';
import ChatConversation from '../../modules/Chat/ui/ChatConversation';

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
  const { user, isLoading } = useAuth();
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

  // Determine Main Content View
  let mainContent;
  if (!selectedSession) {
    mainContent = <AppWelcome />;
  } else if (selectedSession.status !== 'connected' && !activeChatId) {
    // If not connected, show QR (Connection Flow)
    mainContent = <SessionQRView session={selectedSession} />;
  } else if (!activeChatId) {
    // Connected but no chat selected
    if (selectedSession.syncProgress !== undefined) {
      mainContent = <SessionSyncView session={selectedSession} />;
    } else {
      mainContent = <SessionWelcome />;
    }
  } else {
    const activeChat = chats.find(c => c.id === activeChatId);
    mainContent = <ChatConversation
      activeChatId={activeChatId}
      chat={activeChat}
      messages={messages}
      onSendMessage={sendMessage}
    />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#d1d7db] dark:bg-[#0b141a] font-sans">

      {/* 1. Global Navigation Rail (Session Module) */}
      <SessionSidebar
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={() => setIsCreatingSession(true)}
        userEmail={user.email}
      />

      {/* 2. Context Panel (Chat Module - Chat List) */}
      <ChatList
        session={selectedSession}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onDeleteSession={handleDeleteSession}
      />

      {/* 3. Main Content (Dynamic) */}
      {mainContent}

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