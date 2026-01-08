'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, refreshToken, logout, login, User, LoginResponse } from '@/lib/api';

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
        console.error('Auth initialization error:', error);
        // The user is not authenticated, this is normal for first visit
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const setAuthCookie = (token: string) => {
    // Access token usually expires in 15 minutes (900 seconds)
    document.cookie = `accessToken=${token}; path=/; max-age=900; SameSite=Lax`;
  };

  // Setup automatic token refresh
  useEffect(() => {
    if (!user) return;

    const setupTokenRefresh = () => {
      const refreshInterval = setInterval(async () => {
        try {
          console.log('Refreshing token...');
          const data = await refreshToken();
          setAuthCookie(data.accessToken);
          console.log('Token refreshed successfully and cookie updated');
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
    const data = await login(email, password);
    setAuthCookie(data.accessToken);

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
      // Clear cookie
      document.cookie = 'accessToken=; path=/; max-age=0;';
      localStorage.removeItem('accessToken');
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