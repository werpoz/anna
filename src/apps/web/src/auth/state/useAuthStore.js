import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '../api/authApi';

const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: '',
      email: '',
      status: 'idle',
      refreshStatus: 'refresh: idle',
      refreshLive: false,
      setEmail: (email) => set({ email }),
      setAccessToken: (accessToken) => set({ accessToken }),
      login: async (email, password) => {
        const result = await authApi.login(email, password);
        if (!result.ok) {
          const message =
            (result.payload && typeof result.payload === 'object' && result.payload.message) ||
            'Login failed';
          throw new Error(message);
        }
        if (result.payload?.accessToken) {
          set({ accessToken: result.payload.accessToken });
        }
        return result.payload;
      },
      refresh: async () => {
        try {
          const result = await authApi.refresh();
          if (!result.ok) {
            set({ accessToken: '', refreshStatus: 'refresh: failed', refreshLive: false });
            return { ok: false, payload: result.payload };
          }
          if (result.payload?.accessToken) {
            set({
              accessToken: result.payload.accessToken,
              refreshStatus: 'refresh: ok',
              refreshLive: true,
            });
          }
          return { ok: true, payload: result.payload };
        } catch (error) {
          set({ accessToken: '', refreshStatus: 'refresh: failed', refreshLive: false });
          return { ok: false, payload: { message: String(error) } };
        }
      },
      logout: async () => {
        await authApi.logout().catch(() => null);
        set({ accessToken: '' });
      },
      bootstrap: async () => {
        if (get().status !== 'idle') {
          return;
        }
        set({ status: 'loading' });
        await get().refresh();
        set({ status: 'ready' });
      },
    }),
    {
      name: 'anna.auth',
      partialize: (state) => ({ accessToken: state.accessToken, email: state.email }),
    }
  )
);

export default useAuthStore;
