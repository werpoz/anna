import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialState = {
  sessionId: '',
  wsStatus: 'ws: idle',
  wsLive: false,
  sessionStatus: 'session: idle',
  sessionLive: false,
  historyStatus: 'history: idle',
  historyLive: false,
  qr: 'Waiting for QR...',
  qrImage: '',
  qrExpires: 'expires: -',
  hasRequestedSession: false,
};

const useSessionStore = create(
  persist(
    (set) => ({
      ...initialState,
      setSessionId: (sessionId) =>
        set({ sessionId, hasRequestedSession: Boolean(sessionId) }),
      setWsState: (wsStatus, wsLive) => set({ wsStatus, wsLive }),
      setSessionState: (sessionStatus, sessionLive) => set({ sessionStatus, sessionLive }),
      setHistoryState: (historyStatus, historyLive) => set({ historyStatus, historyLive }),
      setQrState: ({ qr, qrImage, qrExpires }) =>
        set((state) => ({
          qr: qr ?? state.qr,
          qrImage: qrImage ?? state.qrImage,
          qrExpires: qrExpires ?? state.qrExpires,
        })),
      setHasRequestedSession: (value) => set({ hasRequestedSession: value }),
      resetSession: () => set(initialState),
    }),
    {
      name: 'anna.session',
      partialize: (state) => ({ sessionId: state.sessionId }),
    }
  )
);

export default useSessionStore;
