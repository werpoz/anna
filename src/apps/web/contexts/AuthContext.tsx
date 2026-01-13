'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, refreshToken, logout, login } from '@/lib/api';
import type { User, LoginResponse } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        // User not logged in, ignore
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);


  // Setup automatic token refresh
  useEffect(() => {
    if (!user) return;

    const setupTokenRefresh = () => {
      const refreshInterval = setInterval(async () => {
        try {
          console.log('Refreshing token...');
          await refreshToken();
          console.log('Token refreshed successfully via cookies');
        } catch (error) {
          console.error('Token refresh failed:', error);
          handleLogout();
        }
      }, 14 * 60 * 1000); // Refresh every 14 minutes (just before 15m expiration)

      return () => clearInterval(refreshInterval);
    };

    return setupTokenRefresh();
  }, [user]);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);

    // Fetch user details since login response doesn't include it
    const userData = await getCurrentUser();
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}