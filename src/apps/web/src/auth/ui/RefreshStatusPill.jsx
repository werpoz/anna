import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useAuthStore from '../state/useAuthStore';
import StatusPill from '../../shared/ui/StatusPill';

const RefreshStatusPill = () => {
  const { refreshStatus, refreshLive } = useAuthStore(
    useShallow((state) => ({
      refreshStatus: state.refreshStatus,
      refreshLive: state.refreshLive,
    }))
  );
  return <StatusPill label={refreshStatus} live={refreshLive} />;
};

export default RefreshStatusPill;
