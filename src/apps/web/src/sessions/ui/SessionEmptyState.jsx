import React from 'react';

const SessionEmptyState = ({ title, description, action }) => (
  <div className="grid w-full max-w-md gap-3 rounded-3xl border border-emerald-100 bg-white/90 p-6 text-center shadow-xl shadow-emerald-200/40">
    <h3 className="font-['Sora',_sans-serif] text-lg font-semibold text-slate-800">{title}</h3>
    <p className="text-sm text-slate-600">{description}</p>
    {action ? <div className="pt-2">{action}</div> : null}
  </div>
);

export default SessionEmptyState;
