import React from 'react';

const MessageComposer = ({ value, onChange, onSend, disabled }) => (
  <div className="flex items-end gap-3 border-t border-slate-200 bg-white px-4 py-3">
    <button
      className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
      type="button"
      aria-label="Emoji"
      title="Emoji"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14c1 1.5 3 2 4 2s3-0.5 4-2" />
        <circle cx="9" cy="10" r="1" />
        <circle cx="15" cy="10" r="1" />
      </svg>
    </button>
    <button
      className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
      type="button"
      aria-label="Adjuntar"
      title="Adjuntar"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </button>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-[46px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      placeholder="Escribe un mensaje"
    ></textarea>
    <button
      className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onSend}
      disabled={disabled}
    >
      Enviar
    </button>
  </div>
);

export default MessageComposer;
