import React from 'react';

const QrPanel = ({ qrImage, qr, qrExpires }) => (
  <div className="grid w-full max-w-md gap-3 rounded-3xl border border-emerald-100 bg-white/90 p-6 text-center shadow-xl shadow-emerald-200/40">
    <h3 className="font-['Sora',_sans-serif] text-lg font-semibold text-slate-800">Escanea el QR</h3>
    {qrImage ? (
      <img
        className="mx-auto w-full max-w-[240px] rounded-2xl border border-emerald-100 bg-white p-3"
        src={qrImage}
        alt="QR code"
      />
    ) : (
      <div className="min-h-[120px] rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-xs text-slate-500">
        {qr}
      </div>
    )}
    <div className="flex justify-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-2.5 py-1 text-[11px] text-slate-500">
        {qrExpires}
      </span>
    </div>
  </div>
);

export default QrPanel;
