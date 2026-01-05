import React from 'react';

const MessageReactions = ({ reactions, fromMe }) => {
  if (!Array.isArray(reactions) || reactions.length === 0) {
    return null;
  }
  const style = fromMe ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600';

  return (
    <div className={`inline-flex w-fit flex-wrap gap-2 rounded-full px-3 py-1 text-[11px] ${style}`}>
      {reactions.map((reaction) => (
        <span key={reaction.emoji}>
          {reaction.emoji}
          {reaction.count > 1 ? ` ${reaction.count}` : ''}
        </span>
      ))}
    </div>
  );
};

export default MessageReactions;
