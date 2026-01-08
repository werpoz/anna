'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get('redirect');
      router.push(redirectTo || '/console');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white selection:bg-purple-500/30">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 scale-105"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      {/* Animated Glowing Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-700" />

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/20">
            <span className="text-2xl font-bold">A</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Bienvenido a Anna
          </h1>
          <p className="mt-2 text-zinc-400 font-medium">
            Gestión inteligente de sesiones de WhatsApp
          </p>
        </div>

        <div className="p-8 backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 text-sm font-medium text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-1.5 font-medium">
              <label htmlFor="email" className="block text-sm text-zinc-400 px-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-3.5 bg-black/40 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all duration-200 placeholder:text-zinc-600"
                placeholder="nombre@ejemplo.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5 font-medium">
              <label htmlFor="password" className="block text-sm text-zinc-400 px-1">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-3.5 bg-black/40 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all duration-200 placeholder:text-zinc-600"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full group overflow-hidden py-4 px-6 rounded-2xl bg-white text-black font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <span>Entrar ahora</span>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-zinc-500 text-sm">
              ¿No tienes una cuenta? <a href="#" className="text-white hover:text-purple-400 transition-colors font-semibold">Regístrate</a>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600 font-medium tracking-widest uppercase italic">
          Powering professional communications
        </p>
      </div>
    </div>
  );
}
