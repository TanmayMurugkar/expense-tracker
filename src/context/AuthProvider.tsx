import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface SignUpResult {
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Load any persisted session on cold start.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });

    // Keep state in sync with sign-in / sign-out / token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }

  async function signUp(
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: metadata ? { data: metadata } : undefined,
    });
    if (error) throw error;
    // When email confirmation is on, Supabase returns a user with no session.
    return { needsEmailConfirmation: !data.session };
  }

  async function signOut() {
    // Clears the persisted session from AsyncStorage as well.
    await supabase.auth.signOut();
    setSession(null);
  }

  async function signOutEverywhere() {
    // Revokes refresh tokens across all of this user's devices/sessions.
    await supabase.auth.signOut({ scope: 'global' });
    setSession(null);
  }

  // Sends a recovery email containing a 6-digit OTP code.
  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  }

  // Verifies the recovery OTP, then sets the new password.
  async function confirmPasswordReset(email: string, token: string, newPassword: string) {
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    });
    if (verifyErr) throw verifyErr;

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updateErr) throw updateErr;
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    initializing,
    signIn,
    signUp,
    signOut,
    signOutEverywhere,
    requestPasswordReset,
    confirmPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
