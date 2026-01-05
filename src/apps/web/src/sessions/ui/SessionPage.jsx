import React from 'react';
import ChatSidebar from '../../chats/ui/ChatSidebar';
import MessagePanel from '../../messages/ui/MessagePanel';
import useSessionController from '../useSessionController';
import usePresenceStore from '../../presence/state/usePresenceStore';
import { useShallow } from 'zustand/react/shallow';
import useAuthStore from '../../auth/state/useAuthStore';
import QrPanel from './QrPanel';
import SessionEmptyState from './SessionEmptyState';
import LeftRail from './LeftRail';
import HistoryLoadingPanel from './HistoryLoadingPanel';

const resolvePresenceLabel = (presence) => {
  if (!presence) return null;
  if (presence.presence === 'composing') return 'Escribiendo...';
  if (presence.presence === 'recording') return 'Grabando audio...';
  if (presence.presence === 'available') return 'En linea';
  return null;
};

const SessionPage = () => {
  const {
    wsStatus,
    wsLive,
    sessionStatus,
    sessionLive,
    historyStatus,
    historyLive,
    qr,
    qrImage,
    qrExpires,
    hasRequestedSession,
    groupedChats,
    selectedChat,
    selectedMessages,
    draftMessage,
    startSession,
    selectChat,
    setDraft,
    sendMessage,
  } = useSessionController();

  const { email, logout } = useAuthStore(
    useShallow((state) => ({
      email: state.email,
      logout: state.logout,
    }))
  );

  const presence = usePresenceStore((state) =>
    selectedChat ? state.presenceByChat[selectedChat.chatJid] : null
  );

  const profileInitial = email?.trim()?.[0]?.toUpperCase() ?? 'A';
  const chatCount = groupedChats.people.length + groupedChats.groups.length;
  const historyComplete = historyStatus.includes('complete');
  const historySyncing =
    historyStatus.includes('syncing') || historyStatus.includes('%');
  const showHistoryLoading =
    sessionLive &&
    !selectedChat &&
    (historySyncing || (!historyComplete && chatCount === 0));
  const loadingTitle = historySyncing ? 'Sincronizando historial' : 'Preparando chats';
  const loadingStatus = historySyncing ? historyStatus : 'Recibiendo datos de WhatsApp...';

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(16,185,129,0.08),_transparent_60%)] bg-[#f0f2f5] font-['IBM_Plex_Sans',_sans-serif] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 lg:h-[calc(100vh-3rem)] lg:flex-row lg:overflow-hidden">
        <div className="w-full lg:h-full lg:w-16">
          <LeftRail onLogout={logout} profileInitial={profileInitial} />
        </div>
        <div className="w-full max-w-sm lg:h-full">
          <ChatSidebar
            wsStatus={wsStatus}
            wsLive={wsLive}
            sessionStatus={sessionStatus}
            sessionLive={sessionLive}
            historyStatus={historyStatus}
            historyLive={historyLive}
            groupedChats={groupedChats}
            selectedChat={selectedChat}
            onSelectChat={selectChat}
            onStartSession={startSession}
          />
        </div>

        <div className="flex min-h-0 flex-1 items-stretch justify-stretch lg:h-full">
          {hasRequestedSession && sessionStatus === 'session: pending_qr' && !selectedChat ? (
            <QrPanel qrImage={qrImage} qr={qr} qrExpires={qrExpires} />
          ) : selectedChat ? (
            <MessagePanel
              chat={selectedChat}
              messages={selectedMessages}
              draft={draftMessage}
              onDraftChange={setDraft}
              onSend={sendMessage}
              sessionLive={sessionLive}
              presenceLabel={resolvePresenceLabel(presence)}
            />
          ) : showHistoryLoading ? (
            <HistoryLoadingPanel title={loadingTitle} status={loadingStatus} />
          ) : !sessionLive ? (
            <SessionEmptyState
              title="Inicia una sesion"
              description="Presiona Start session para generar el QR y conectar tu cuenta."
              action={
                <button
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200"
                  onClick={startSession}
                >
                  Start session
                </button>
              }
            />
          ) : (
            <SessionEmptyState
              title="Selecciona un chat"
              description="Cuando la sincronizacion termine, tus chats apareceran aqui."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionPage;
