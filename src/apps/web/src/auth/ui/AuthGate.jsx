import React from 'react';
import { Navigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import useAuthStore from '../state/useAuthStore';
import Spinner from '../../shared/ui/Spinner';
import RefreshStatusPill from './RefreshStatusPill';

const AuthGate = ({ children }) => {
  const { status, accessToken } = useAuthStore(
    useShallow((state) => ({
      status: state.status,
      accessToken: state.accessToken,
    }))
  );

  if (status !== 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-emerald-100 font-['IBM_Plex_Sans',_sans-serif] text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6">
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
            <div className="mb-4 font-['Sora',_sans-serif] text-xl font-semibold text-emerald-700">
              Anna Sessions
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Spinner label="Validando sesion..." />
              <RefreshStatusPill />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthGate;
