import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthProvider';
import { useAppLock } from '../context/AppLockProvider';
import { friendlyAuthError } from '../utils/validation';
import {
  hasBiometrics,
  isBiometricEnabled,
  authenticateBiometric,
} from '../services/biometrics';

/**
 * Full-screen lock shown after the inactivity timeout. Unlocks via biometrics
 * (when enabled & available) or by re-entering the password.
 */
export function LockScreen() {
  const { user, signOut } = useAuth();
  const { unlock } = useAppLock();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Offer (and auto-trigger) biometric unlock on mount if the user enabled it.
  useEffect(() => {
    (async () => {
      const enabled = await isBiometricEnabled();
      const available = enabled && (await hasBiometrics());
      setBiometricAvailable(available);
      if (available) tryBiometric();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryBiometric() {
    const ok = await authenticateBiometric('Unlock Expense Tracker');
    if (ok) unlock();
  }

  async function handleUnlock() {
    if (!user?.email) return;
    setLoading(true);
    setError(null);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInErr) throw signInErr;
      setPassword('');
      unlock();
    } catch (e: any) {
      setError(friendlyAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={48} color="#4ECDC4" />
      <Text style={styles.title}>App Locked</Text>
      <Text style={styles.subtitle}>Enter your password to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#AAA"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
        onSubmitEditing={handleUnlock}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleUnlock}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Unlock</Text>}
      </TouchableOpacity>

      {biometricAvailable && (
        <TouchableOpacity style={styles.bioBtn} onPress={tryBiometric} disabled={loading}>
          <Ionicons name="finger-print" size={20} color="#4ECDC4" />
          <Text style={styles.bioText}>Use biometrics</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={signOut} disabled={loading}>
        <Text style={styles.signOut}>Sign out instead</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    zIndex: 100,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 12 },
  input: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A2E',
  },
  error: { color: '#FF6B6B', fontSize: 13 },
  btn: {
    width: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  bioText: { color: '#4ECDC4', fontSize: 15, fontWeight: '600' },
  signOut: { color: '#888', fontSize: 14, marginTop: 8 },
});
