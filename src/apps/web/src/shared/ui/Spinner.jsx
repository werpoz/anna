import React from 'react';

const Spinner = ({ label = 'Cargando...' }) => (
  <div className="flex items-center gap-3 text-sm text-slate-500">
    <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
    <span>{label}</span>
  </div>
);

export default Spinner;
