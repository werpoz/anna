import React from 'react';
import { formatTime } from '../../shared/utils/date';
import useContactsStore from '../../contacts/state/useContactsStore';
import MessageMedia from './MessageMedia';
import MessageReactions from './MessageReactions';
import MessageStatusIcon from './MessageStatusIcon';

const pickContactName = (contact) =>
  contact?.name || contact?.notify || contact?.verifiedName || contact?.phoneNumber || null;

const resolveSelfLabel = (jidOrId, selfJid) => {
  if (!jidOrId || !selfJid) {
    return null;
  }
  const rawId = jidOrId.includes('@') ? jidOrId.split('@')[0] : jidOrId;
  const selfId = selfJid.split('@')[0];
  if (rawId && selfId && rawId === selfId) {
    return 'Tú';
  }
  return null;
};

const buildMentionMap = (mentions, contactsByJid, selfJid) => {
  const map = new Map();
  if (!Array.isArray(mentions)) {
    return map;
  }

  for (const mention of mentions) {
    if (!mention?.jid) continue;
    const id = mention.jid.split('@')[0];
    if (!id) continue;

    const contact = contactsByJid?.[mention.jid];
    const selfLabel = resolveSelfLabel(mention.jid, selfJid);
    const name = selfLabel || mention.name || pickContactName(contact) || id;

    map.set(id, name);
  }

  return map;
};

const buildMentionMapFromText = (text, contactsByJid, selfJid) => {
  const map = new Map();
  if (!text || typeof text !== 'string') {
    return map;
  }

  const regex = /@([0-9A-Za-z._-]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const id = match[1];
    if (!id || map.has(id)) continue;
    const contact =
      contactsByJid?.[`${id}@lid`] ||
      contactsByJid?.[`${id}@s.whatsapp.net`] ||
      contactsByJid?.[`${id}@c.us`];
    const selfLabel = resolveSelfLabel(id, selfJid);
    const name = selfLabel || pickContactName(contact);
    if (name) {
      map.set(id, name);
    }
  }

  return map;
};

const renderTextWithMentions = (text, mentionMap) => {
  if (!text) {
    return '';
  }
  if (!mentionMap || mentionMap.size === 0) {
    return text;
  }

  const nodes = [];
  const regex = /@([0-9A-Za-z._-]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    const mentionId = match[1];
    const label = mentionMap.get(mentionId);

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    if (label) {
      nodes.push(
        <span
          key={`${mentionId}-${start}`}
          className="rounded bg-emerald-100 px-1 text-emerald-700"
        >
          @{label}
        </span>
      );
    } else {
      nodes.push(text.slice(start, end));
    }

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const MessageBubble = ({ message, replyLabel, selfJid }) => {
  const contactsByJid = useContactsStore((state) => state.contactsByJid);
  const bubbleStyle = message.fromMe
    ? 'ml-auto bg-[#d9fdd3] text-slate-900'
    : 'bg-white text-slate-900';

  const deleted = message.isDeleted;
  const mentionMap = buildMentionMap(message.mentions, contactsByJid, selfJid);
  const fallbackMentionMap =
    mentionMap.size === 0
      ? buildMentionMapFromText(message.text, contactsByJid, selfJid)
      : mentionMap;
  const body = deleted
    ? 'Mensaje eliminado'
    : message.text
      ? renderTextWithMentions(message.text, fallbackMentionMap)
      : message.type
        ? `[${message.type}]`
        : '';

  const replyText = message.replyTo?.text || message.replyTo?.type || 'Mensaje';
  const replyMentionMap = message.replyTo?.text
    ? buildMentionMapFromText(message.replyTo.text, contactsByJid, selfJid)
    : null;
  const replyBody = message.replyTo?.text
    ? renderTextWithMentions(replyText, replyMentionMap)
    : replyText;

  return (
    <div className={`flex max-w-[70%] flex-col gap-2 rounded-2xl px-3 py-2 text-sm shadow ${bubbleStyle}`}>
      {message.forward?.isForwarded ? (
        <div className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
          <span className="text-[11px]">FWD</span>
          <span>Reenviado</span>
        </div>
      ) : null}
      {message.replyTo ? (
        <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-50 px-2 py-1 text-[11px] text-slate-600">
          <div className="font-semibold text-emerald-700">
            {replyLabel || 'Respuesta'}
          </div>
          <div className="truncate">
            {replyBody}
          </div>
        </div>
      ) : null}
      <MessageMedia media={message.media} />
      <div className={`break-words ${deleted ? 'italic text-slate-400' : ''}`}>
        {body}
      </div>
      <MessageReactions reactions={message.reactions} fromMe={message.fromMe} />
      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
        {message.isEdited ? <span>(editado)</span> : null}
        <span>{formatTime(message.timestamp)}</span>
        {message.fromMe ? <MessageStatusIcon status={message.status} /> : null}
      </div>
    </div>
  );
};

export default MessageBubble;
