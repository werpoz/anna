import React from 'react';

const RailButton = ({ label, active, onClick, children }) => (
  <button
    className={`group flex h-11 w-11 items-center justify-center rounded-2xl transition ${
      active
        ? 'bg-[#00a884] text-white shadow-md shadow-emerald-900/20'
        : 'text-slate-300 hover:bg-[#2a3942]'
    }`}
    onClick={onClick}
    type="button"
    aria-label={label}
    title={label}
  >
    {children}
  </button>
);

const LeftRail = ({ onLogout, profileInitial = 'A' }) => (
  <aside className="flex h-full w-full flex-row items-center justify-between gap-4 rounded-3xl border border-[#111b21] bg-[#202c33] px-3 py-4 text-slate-200 shadow-lg shadow-slate-900/30 lg:w-16 lg:flex-col">
    <div className="flex items-center gap-3 lg:flex-col">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#00a884] text-sm font-bold text-white shadow-md shadow-emerald-900/20">
        {profileInitial}
      </div>
      <RailButton label="Chats" active>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M21 12a8 8 0 1 1-3.6-6.7L21 5v7z" />
        </svg>
      </RailButton>
      <RailButton label="Estados">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </svg>
      </RailButton>
      <RailButton label="Comunidades">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M7 11h10M7 7h10M7 15h10" />
        </svg>
      </RailButton>
    </div>

    <div className="flex items-center gap-3 lg:flex-col">
      <RailButton label="Ajustes">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </RailButton>
      <RailButton label="Cerrar sesion" onClick={onLogout}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
        </svg>
      </RailButton>
    </div>
  </aside>
);

export default LeftRail;
