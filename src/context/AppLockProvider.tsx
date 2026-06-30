import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthProvider';

const TIMEOUT_KEY = 'lock_timeout_minutes';
const DEFAULT_MINUTES = 2;

interface AppLockContextValue {
  locked: boolean;
  timeoutMinutes: number;
  setTimeoutMinutes: (m: number) => void;
  lockNow: () => void;
  unlock: () => void;
}

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [locked, setLocked] = useState(false);
  const [timeoutMinutes, setTimeoutMinutesState] = useState(DEFAULT_MINUTES);
  const backgroundedAt = useRef<number | null>(null);

  // Load the saved timeout preference.
  useEffect(() => {
    AsyncStorage.getItem(TIMEOUT_KEY).then((v) => {
      const n = Number(v);
      if (v && !isNaN(n) && n > 0) setTimeoutMinutesState(n);
    });
  }, []);

  // Reset the lock whenever the user signs out / in.
  useEffect(() => {
    if (!session) setLocked(false);
  }, [session]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (next === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (
          session &&
          since != null &&
          Date.now() - since >= timeoutMinutes * 60_000
        ) {
          setLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [session, timeoutMinutes]);

  const setTimeoutMinutes = useCallback((m: number) => {
    setTimeoutMinutesState(m);
    AsyncStorage.setItem(TIMEOUT_KEY, String(m));
  }, []);

  const value: AppLockContextValue = {
    // Only meaningful while signed in.
    locked: locked && !!session,
    timeoutMinutes,
    setTimeoutMinutes,
    lockNow: () => setLocked(true),
    unlock: () => setLocked(false),
  };

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within an AppLockProvider');
  return ctx;
}
