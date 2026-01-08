'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  email: string;
  // Add other user properties as needed
}

export default function ConsolePage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  // Protect the route
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    // Redirect is handled in AuthContext but we can ensure it here or just let context do it
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="bg-white dark:bg-zinc-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Anna Sessions Console
            </h1>
            <div className="flex items-center space-x-4">
              {user && (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Panel de Control
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenido al panel de control de Anna Sessions. Aquí podrás gestionar tus sesiones de WhatsApp.
          </p>
        </div>
      </main>
    </div>
  );
}