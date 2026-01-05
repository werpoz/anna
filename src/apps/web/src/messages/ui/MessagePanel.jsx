import React from 'react';
import MessageHeader from './MessageHeader';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';

const MessagePanel = ({
  chat,
  messages,
  draft,
  onDraftChange,
  onSend,
  sessionLive,
  presenceLabel,
}) => (
  <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
    <MessageHeader
      title={chat.chatName || chat.chatJid}
      subtitle={chat.chatJid}
      presenceLabel={presenceLabel}
      sessionLive={sessionLive}
    />
    <div className="flex-1 min-h-0 bg-[#efeae2]">
      <MessageList
        messages={messages}
        replyLabel={chat.chatName || chat.chatJid}
      />
    </div>
    <MessageComposer
      value={draft}
      onChange={onDraftChange}
      onSend={onSend}
      disabled={!sessionLive}
    />
  </div>
);

export default MessagePanel;
