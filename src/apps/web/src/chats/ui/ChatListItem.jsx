import React from 'react';
import { formatChatDate } from '../../shared/utils/date';

const ChatListItem = ({ chat, isActive, onSelect }) => (
  <button
    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
      isActive ? 'bg-emerald-50' : 'hover:bg-slate-100'
    }`}
    onClick={() => onSelect(chat)}
  >
    <div className="grid h-11 w-11 flex-none place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
      {(chat.chatName || chat.chatJid || '?')[0]}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-sm font-semibold text-slate-800">
          {chat.chatName || chat.chatJid}
        </div>
        <div className="text-[11px] text-slate-400">
          {formatChatDate(chat.lastMessageTs)}
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <div className="truncate text-xs text-slate-500">
          {chat.lastMessageText || 'Sin mensajes'}
        </div>
        {chat.unreadCount > 0 ? (
          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            {chat.unreadCount}
          </span>
        ) : null}
      </div>
    </div>
  </button>
);

export default ChatListItem;
