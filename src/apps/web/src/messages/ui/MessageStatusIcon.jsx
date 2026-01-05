import React from 'react';

const statusStyles = {
  sent: 'text-slate-400',
  delivered: 'text-slate-400',
  read: 'text-emerald-500',
  played: 'text-emerald-500',
};

const statusSymbol = (status) => {
  if (!status) return '';
  if (status === 'sent') return '✓';
  if (status === 'delivered') return '✓✓';
  if (status === 'read') return '✓✓';
  if (status === 'played') return '✓✓';
  return '';
};

const MessageStatusIcon = ({ status }) => {
  const symbol = statusSymbol(status);
  if (!symbol) return null;
  return <span className={`text-[11px] ${statusStyles[status] || 'text-slate-400'}`}>{symbol}</span>;
};

export default MessageStatusIcon;
