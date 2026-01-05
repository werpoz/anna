import React from 'react';

const MessageMedia = ({ media }) => {
  if (!media) return null;

  if (!media.url) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
        Cargando media...
      </div>
    );
  }

  if (media.kind === 'image' || media.kind === 'sticker') {
    return (
      <img
        className="max-h-72 w-full rounded-2xl object-cover"
        src={media.url}
        alt={media.fileName || media.kind}
      />
    );
  }

  if (media.kind === 'video') {
    return (
      <video className="w-full rounded-2xl" controls src={media.url} />
    );
  }

  if (media.kind === 'audio') {
    return <audio className="w-full" controls src={media.url} />;
  }

  if (media.kind === 'document') {
    return (
      <a
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-emerald-600"
        href={media.url}
        target="_blank"
        rel="noreferrer"
      >
        <span className="font-semibold">Documento</span>
        <span className="truncate text-slate-500">{media.fileName || media.url}</span>
      </a>
    );
  }

  return null;
};

export default MessageMedia;
