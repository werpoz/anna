import React, { useEffect, useMemo, useRef } from 'react';
import MessageBubble from './MessageBubble';

const MessageList = ({ messages, replyLabel }) => {
  const endRef = useRef(null);
  const selfJid = useMemo(() => {
    const own = messages.find((msg) => msg?.fromMe && msg?.senderJid);
    return own?.senderJid ?? null;
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full min-h-0 space-y-3 overflow-y-auto px-5 py-6">
      {messages.length === 0 ? (
        <div className="text-xs text-slate-500">Sin mensajes aun.</div>
      ) : (
        messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            replyLabel={replyLabel}
            selfJid={selfJid}
          />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
};

export default MessageList;
