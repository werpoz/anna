import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import useAuthStore from '../state/useAuthStore';
import RefreshStatusPill from './RefreshStatusPill';
import { API_BASE_URL } from '../../shared/config';

const LoginPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { email, setEmail, login, accessToken, status } = useAuthStore(
    useShallow((state) => ({
      email: state.email,
      setEmail: state.setEmail,
      login: state.login,
      accessToken: state.accessToken,
      status: state.status,
    }))
  );

  useEffect(() => {
    if (status === 'ready' && accessToken) {
      navigate('/app', { replace: true });
    }
  }, [status, accessToken, navigate]);

  const handleLogin = async () => {
    const emailValue = email.trim();
    if (!emailValue || !password) {
      setError('Email y password son requeridos');
      return;
    }

    try {
      await login(emailValue, password);
      setPassword('');
      setError('');
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-emerald-100 font-['IBM_Plex_Sans',_sans-serif] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-12 lg:flex-row lg:gap-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              WhatsApp Sessions Console
            </div>
            <h1 className="font-['Sora',_sans-serif] text-3xl font-semibold text-slate-900">
              Acceso rapido para gestionar sesiones
            </h1>
            <p className="text-sm text-slate-600">
              Inicia sesion para conectar el WebSocket y manejar chats en tiempo real.
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-200/40">
            <div className="grid gap-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Email
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Password
                </label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={password}
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {error ? <div className="text-xs text-red-500">{error}</div> : null}
              <button
                className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-300/40 transition hover:-translate-y-0.5"
                onClick={handleLogin}
              >
                Entrar
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <RefreshStatusPill />
              </div>
              <div className="text-xs text-slate-500">Backend: {API_BASE_URL}</div>
            </div>
          </div>
        </div>
        <div className="mt-10 w-full max-w-md rounded-[32px] border border-emerald-100 bg-white/80 p-8 shadow-2xl shadow-emerald-200/50 backdrop-blur lg:mt-0">
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
              Flujo rapido
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                Login + refresh automatico con cookies seguras.
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                WebSocket en vivo con estado de sesion y sincronizacion.
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                Vista estilo WhatsApp Web para chats, reacciones y media.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
