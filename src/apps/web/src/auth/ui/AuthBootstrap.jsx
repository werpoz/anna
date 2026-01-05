import React, { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useAuthStore from '../state/useAuthStore';

const AuthBootstrap = ({ children }) => {
  const { bootstrap, refresh, accessToken } = useAuthStore(
    useShallow((state) => ({
      bootstrap: state.bootstrap,
      refresh: state.refresh,
      accessToken: state.accessToken,
    }))
  );

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }
    const interval = setInterval(() => {
      void refresh();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [accessToken, refresh]);

  return children;
};

export default AuthBootstrap;
