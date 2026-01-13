'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/web/contexts/AuthContext';

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
    <div className="min-h-screen bg-[#d1d7db] dark:bg-[#111b21] font-sans flex flex-col relative overflow-hidden">

      {/* Background Accent (Top Strip - Modernized) */}
      <div className="absolute top-0 w-full h-[220px] bg-[#00a884] z-0">
        {/* Subtle pattern or gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent"></div>
      </div>

      {/* Header/Logo Area */}
      <div className="relative z-10 max-w-[1000px] mx-auto w-full px-5 py-5 lg:px-0 flex items-center gap-3 mb-8">
        <Link href="/" className="flex items-center gap-3 text-white hover:opacity-90 transition-opacity">
          <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#00a884] shadow-sm">
            <svg viewBox="0 0 33 33" width="18" height="18" fill="currentColor"><path d="M16.6 2c-8 0-14.5 6.5-14.5 14.5 0 8 6.5 14.5 14.5 14.5 8 0 14.5-6.5 14.5-14.5C31.1 8.5 24.6 2 16.6 2zm0 25.5c-6.1 0-11-4.9-11-11s4.9-11 11-11 11 4.9 11 11-4.9 11-11 11z"></path></svg>
          </span>
          <span className="font-bold text-sm uppercase tracking-widest leading-none mt-0.5">Anna Sessions</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="relative z-10 max-w-[1000px] mx-auto w-full px-4 lg:px-0 flex-1 flex flex-col mb-10">
        <div className="bg-white dark:bg-[#202c33] rounded-[3px] shadow-2xl flex flex-col md:flex-row overflow-hidden min-h-[500px] lg:h-[calc(100vh-180px)] max-h-[700px]">

          {/* Left Side: Value Props (Modernized Instructions) */}
          <div className="p-12 md:w-2/3 flex flex-col justify-center relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#00a884]/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-[#00a884]/10 rounded-full blur-3xl"></div>

            <h1 className="text-3xl md:text-4xl font-extralight text-[#41525d] dark:text-[#e9edef] mb-10 relative z-10 leading-tight">
              Enterprise-grade<br />
              <span className="font-semibold text-[#00a884]">WhatsApp Infrastructure</span>
            </h1>

            <div className="space-y-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-center text-[#00a884] font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#111b21] dark:text-[#e9edef]">Secure Access</h3>
                  <p className="text-[#54656f] dark:text-[#aebac1] text-sm leading-relaxed mt-1">Log in to manage your high-performance sessions.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-center text-[#00a884] font-bold text-xs">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#111b21] dark:text-[#e9edef]">Monitor Real-time</h3>
                  <p className="text-[#54656f] dark:text-[#aebac1] text-sm leading-relaxed mt-1">View active connections and message throughput.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-center text-[#00a884] font-bold text-xs">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#111b21] dark:text-[#e9edef]">Scale Comfortably</h3>
                  <p className="text-[#54656f] dark:text-[#aebac1] text-sm leading-relaxed mt-1">Add devices and manage heavy loads effortlessly.</p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-[#e9edef] dark:border-[#2a3942]">
              <Link href="/" className="text-[#00a884] font-medium text-sm hover:underline">Return to Home</Link>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="md:w-1/3 bg-white dark:bg-[#202c33] border-t md:border-t-0 md:border-l border-[#e9edef] dark:border-[#222d34] flex flex-col">
            <div className="flex-1 flex flex-col justify-center p-10">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-light text-[#41525d] dark:text-[#e9edef]">Sign In</h2>
                <p className="mt-2 text-sm text-[#8696a0]">to access your console</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded text-sm text-center border border-red-100 dark:border-red-900/30">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#00a884] uppercase tracking-wide ml-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#f0f2f5] dark:bg-[#2a3942] border-0 text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:ring-2 focus:ring-[#00a884] transition-all outline-none"
                    placeholder="name@company.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#00a884] uppercase tracking-wide ml-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#f0f2f5] dark:bg-[#2a3942] border-0 text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:ring-2 focus:ring-[#00a884] transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#00a884] hover:bg-[#008f6f] text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? 'Authenticating...' : 'Login'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="h-px bg-[#e9edef] dark:bg-[#2a3942] flex-1"></div>
                  <span className="text-[10px] text-[#8696a0] uppercase tracking-wider">Secure Connection</span>
                  <div className="h-px bg-[#e9edef] dark:bg-[#2a3942] flex-1"></div>
                </div>
                <p className="text-[10px] text-[#8696a0]">
                  Protected by HttpOnly Cookies & End-to-End Encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
