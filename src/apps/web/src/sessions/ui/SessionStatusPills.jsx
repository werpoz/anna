import React from 'react';
import StatusPill from '../../shared/ui/StatusPill';
import RefreshStatusPill from '../../auth/ui/RefreshStatusPill';

const SessionStatusPills = ({ wsStatus, wsLive, sessionStatus, sessionLive, historyStatus, historyLive }) => (
  <div className="flex flex-wrap gap-2">
    <StatusPill label={wsStatus} live={wsLive} />
    <StatusPill label={sessionStatus} live={sessionLive} />
    <StatusPill label={historyStatus} live={historyLive} />
    <RefreshStatusPill />
  </div>
);

export default SessionStatusPills;
