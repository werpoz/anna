import React from 'react';

const StatusPill = ({ label, live }) => {
  const base =
    'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide';
  const state = live
    ? 'border-emerald-400/60 text-emerald-600 bg-white/90'
    : 'border-slate-200 text-slate-500 bg-white/80';

  return <span className={`${base} ${state}`}>{label}</span>;
};

export default StatusPill;
