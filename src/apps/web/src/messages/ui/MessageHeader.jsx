import React from 'react';

const MessageHeader = ({ title, subtitle, presenceLabel, sessionLive }) => (
  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
        {(title || '?')[0]}
      </div>
      <div>
        <div className="text-base font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">
          {presenceLabel ? presenceLabel : subtitle}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {!sessionLive ? (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
          offline
        </span>
      ) : null}
      <button className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200" type="button">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" />
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
);

export default MessageHeader;
