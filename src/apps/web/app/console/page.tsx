'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions, Session } from '@/hooks/useSessions';

// WhatsApp Web Color Palette
// Light Mode
// Sidebar: #ffffff
// Header: #f0f2f5
// Main BG: #efeae2
// Green Accent: #008069

// Dark Mode
// Sidebar: #111b21
// Header: #202c33
// Main BG: #0b141a
// Green Accent: #00a884

export default function ConsolePage() {
  const { user, isLoading, logout } = useAuth();
  const { sessions, isConnected } = useSessions();
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Protect the route
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Select first session by default if available
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0]);
    }
  }, [sessions, selectedSession]);

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      // WhatsApp Web Loading Screen style
      <div className="flex flex-col min-h-screen items-center justify-center bg-[#f0f2f5] dark:bg-[#111b21]">
        <div className="w-16 h-16 border-4 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin mb-8"></div>
        <div className="flex items-center gap-2 text-[#41525d] dark:text-[#8696a0] font-medium text-sm uppercase tracking-wide">
          <span className="w-4 h-4 bg-[#00a884] mask-icon" />
          Whatsapp Web Clone
        </div>
        <p className="mt-4 text-sm text-gray-400">End-to-end encrypted</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#d1d7db] dark:bg-[#0b141a]">
      {/* Sidebar */}
      <div className="w-[400px] flex flex-col border-r border-[#d1d7db] dark:border-[#202c33] bg-white dark:bg-[#111b21]">
        {/* Sidebar Header */}
        <div className="h-[60px] px-4 py-2.5 flex justify-between items-center bg-[#f0f2f5] dark:bg-[#202c33]">
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden cursor-pointer">
            {/* User Avatar Placeholder */}
            <div className="w-full h-full flex items-center justify-center bg-[#dfe3e5] dark:bg-[#667781] text-white font-bold">
              {user.email[0].toUpperCase()}
            </div>
          </div>

          <div className="flex gap-5 text-[#54656f] dark:text-[#aebac1]">
            <button title="Status" className="hover:text-black dark:hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 5.523 4.477 9.999 9.999 9.999 5.523 0 9.999-4.476 9.999-9.999 0-5.522-4.476-9.999-9.999-9.999zm0 1.5a8.499 8.499 0 1 1 0 16.998 8.499 8.499 0 0 1 0-16.998zm0 13.998a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0-11a4 4 0 0 1 4 4c0 1.474-.81 2.75-2.001 3.444v1.054a.75.75 0 1 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75c.81 0 1.442-.423 1.442-1.071 0-.649-.632-1.177-1.442-1.177-.81 0-1.442.528-1.442 1.177a.75.75 0 1 1-1.5 0c0-1.474 1.191-2.177 2.001-2.177z"></path></svg>
            </button>
            <button onClick={handleLogout} title="Logout" className="hover:text-red-500 transition-colors">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2.75a.75.75 0 0 1 .75.75V7a.75.75 0 0 1-1.5 0V3.5a.75.75 0 0 1 .75-.75zM12 17a.75.75 0 0 1 .75.75V21.25a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75zM12 12a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"></path></svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="h-[49px] flex items-center px-3 bg-white dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#202c33]">
          <div className="w-full h-[35px] flex items-center px-4 rounded-lg bg-[#f0f2f5] dark:bg-[#202c33]">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-[#54656f] dark:text-[#aebac1] mr-4"><path d="M15.009 13.801c.6.935 1.518 1.534 2.106 2.083l4.757 4.757a1.496 1.496 0 1 1-2.112 2.122l-4.764-4.758c-.543-.586-1.144-1.517-2.073-2.115a9.01 9.01 0 1 1 2.086-2.09zM10.01 6.005a7.01 7.01 0 1 0 0 14.02 7.01 7.01 0 0 0 0-14.02z"></path></svg>
            <input type="text" placeholder="Search or start new chat" className="w-[200px] h-[24px] bg-transparent outline-none text-[14px] text-[#3b4a54] dark:text-[#d1d7db] placeholder-[#54656f] dark:placeholder-[#8696a0]" />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-sm text-[#54656f] dark:text-[#8696a0]">
              No active sessions.
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`flex h-[72px] px-3 items-center cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] ${selectedSession?.id === session.id ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : ''}`}
              >
                <div className="w-[49px] h-[49px] rounded-full bg-[#dfe3e5] dark:bg-[#667781] mr-3 overflow-hidden flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" className="text-white"><path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 5.523 4.477 9.999 9.999 9.999 5.523 0 9.999-4.476 9.999-9.999 0-5.522-4.476-9.999-9.999-9.999zm0 18.498c-4.687 0-8.499-3.812-8.499-8.499 0-4.687 3.812-8.499 8.499-8.499s8.499 3.812 8.499 8.499-3.812 8.499-8.499 8.499z"></path></svg>
                </div>
                <div className="flex-1 border-b border-[#e9edef] dark:border-[#222d34] h-full flex flex-col justify-center gap-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[17px] text-[#111b21] dark:text-[#e9edef] font-normal truncate">
                      Session {session.id.substring(0, 8)}
                    </h3>
                    <span className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-[#54656f] dark:text-[#8696a0] truncate flex items-center gap-1">
                      {session.status === 'connected' ? (
                        <span className="text-[#00a884]">Connected</span>
                      ) : session.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative">
        {/* Main Background Pattern (Doodles) */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>

        {selectedSession ? (
          <>
            {/* Header */}
            <div className="h-[60px] px-4 py-2.5 flex justify-between items-center bg-[#f0f2f5] dark:bg-[#202c33] border-l border-[#d1d7db] dark:border-[#202c33] z-10 w-full">
              <div className="flex items-center cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-[#dfe3e5] dark:bg-[#667781] mr-4 flex items-center justify-center text-white">
                  {/* Session Icon */}
                  S
                </div>
                <div className="flex flex-col justify-center">
                  <h2 className="text-[#111b21] dark:text-[#e9edef] text-[16px] font-normal leading-tight">
                    Session {selectedSession.id}
                  </h2>
                  <span className="text-[13px] text-[#667781] dark:text-[#8696a0] leading-tight">
                    online
                  </span>
                </div>
              </div>
              <div className="flex gap-6 text-[#54656f] dark:text-[#aebac1]">
                <button><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.9l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"></path></svg></button>
                <button><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z"></path></svg></button>
              </div>
            </div>

            {/* Chat Area / Details */}
            <div className="flex-1 overflow-y-auto p-8 z-10">
              {/* Connection Status or QR */}
              <div className="bg-[#ffeecd] dark:bg-[#182229] p-3 rounded-lg shadow-sm text-center mb-6 text-sm text-[#54656f] dark:text-[#f1f1f2]">
                Messages are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them. Click to learn more.
              </div>

              {selectedSession.status !== 'connected' && (
                <div className="flex justify-center my-10">
                  <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
                    <h3 className="text-xl font-light text-[#41525d] mb-4">Connect this device</h3>
                    {selectedSession.qr ? (
                      <div className="w-64 h-64 bg-gray-200">
                        {/* QR Code Placeholder */}
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                          QR CODE: {selectedSession.qr.substring(0, 20)}...
                        </div>
                      </div>
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                        Waiting for QR...
                      </div>
                    )}
                    <p className="mt-6 text-sm text-gray-500">
                      Open WhatsApp on your phone to scan this code
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer (Input) */}
            <div className="h-[62px] min-h-[62px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 flex items-center gap-2 z-10">
              {/* Footer content */}
              <div className="flex-1 h-[42px] bg-white dark:bg-[#2a3942] rounded-lg px-4 flex items-center text-[#54656f] dark:text-[#d1d7db] text-sm">
                Select a session to view details
              </div>
            </div>

          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center z-10">
            <div className="relative">
              {/* Placeholder Image */}
              <svg viewBox="0 0 24 24" width="120" height="120" className="text-[#aebac1] mb-6" fill="currentColor"><path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 5.523 4.477 9.999 9.999 9.999 5.523 0 9.999-4.476 9.999-9.999 0-5.522-4.476-9.999-9.999-9.999zm0 18.498c-4.687 0-8.499-3.812-8.499-8.499 0-4.687 3.812-8.499 8.499-8.499s8.499 3.812 8.499 8.499-3.812 8.499-8.499 8.499z"></path></svg>
            </div>
            <h1 className="text-3xl font-light text-[#41525d] dark:text-[#e9edef] mt-4">Anna Sessions</h1>
            <p className="text-sm text-[#667781] dark:text-[#8696a0] mt-4 max-w-md">
              Send and receive messages without keeping your phone online.<br />
              Use Anna on up to 4 linked devices and 1 phone.
            </p>
            <div className="flex items-center gap-2 mt-8 text-xs text-[#8696a0]">
              <span className="w-3 h-3 bg-[#8696a0] mask-icon" />
              End-to-end encrypted
            </div>
          </div>
        )}

        {/* Green Accent Line */}
        <div className="absolute bottom-0 w-full h-[6px] bg-[#00a884] opacity-0" />
      </div>
    </div>
  );
}