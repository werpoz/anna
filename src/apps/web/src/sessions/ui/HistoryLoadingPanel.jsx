import React from 'react';
import Spinner from '../../shared/ui/Spinner';

const HistoryLoadingPanel = ({ title, status }) => (
  <div className="grid w-full max-w-md gap-3 rounded-3xl border border-emerald-100 bg-white/90 p-6 text-center shadow-xl shadow-emerald-200/40">
    <h3 className="font-['Sora',_sans-serif] text-lg font-semibold text-slate-800">{title}</h3>
    <div className="flex flex-col items-center gap-2">
      <Spinner label="Sincronizando..." />
      {status ? <div className="text-xs text-slate-500">{status}</div> : null}
    </div>
  </div>
);

export default HistoryLoadingPanel;
