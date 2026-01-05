import React from 'react';
import SessionStatusPills from '../../sessions/ui/SessionStatusPills';
import ChatListSection from './ChatListSection';

const ChatSidebar = ({
  wsStatus,
  wsLive,
  sessionStatus,
  sessionLive,
  historyStatus,
  historyLive,
  groupedChats,
  selectedChat,
  onSelectChat,
  onStartSession,
}) => (
  <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-lg shadow-slate-200/60">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-lg font-semibold text-slate-800">Chats</div>
        <div className="text-xs text-slate-500">{sessionStatus}</div>
      </div>
      <div className="flex items-center gap-2">
        <button className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200" type="button">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200" type="button">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>
    </div>

    <SessionStatusPills
      wsStatus={wsStatus}
      wsLive={wsLive}
      sessionStatus={sessionStatus}
      sessionLive={sessionLive}
      historyStatus={historyStatus}
      historyLive={historyLive}
    />

    <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3-3" />
      </svg>
      <input
        className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
        placeholder="Buscar o iniciar un chat"
      />
    </div>

    <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pb-2">
      <ChatListSection
        title="Personas"
        items={groupedChats.people}
        selectedChat={selectedChat}
        onSelect={onSelectChat}
        emptyLabel="Sin chats aun."
      />
      <ChatListSection
        title="Grupos"
        items={groupedChats.groups}
        selectedChat={selectedChat}
        onSelect={onSelectChat}
        emptyLabel="Sin grupos aun."
      />
    </div>

    <button
      className="mt-auto w-full rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onStartSession}
      disabled={sessionLive}
    >
      Start session
    </button>
  </aside>
);

export default ChatSidebar;
