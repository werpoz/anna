import React from 'react';
import ChatListItem from './ChatListItem';

const ChatListSection = ({ title, items, selectedChat, onSelect, emptyLabel }) => (
  <div className="space-y-2">
    <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
      {title}
    </div>
    {items.length === 0 ? (
      <div className="px-2 text-xs text-slate-400">{emptyLabel}</div>
    ) : (
      items.map((chat) => (
        <ChatListItem
          key={chat.chatJid}
          chat={chat}
          isActive={selectedChat?.chatJid === chat.chatJid}
          onSelect={onSelect}
        />
      ))
    )}
  </div>
);

export default ChatListSection;
