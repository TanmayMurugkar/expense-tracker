import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { ConsentModal } from '../components/ConsentModal';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import {
  validateEmail,
  validatePassword,
  friendlyAuthError,
} from '../utils/validation';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [consentVisible, setConsentVisible] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

  async function handleSubmit() {
    setError(null);
    setInfo(null);

    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    const passErr = validatePassword(password);
    if (passErr) return setError(passErr);

    if (mode === 'login') {
      setLoading(true);
      try {
        await signIn(email, password);
        // On success the auth listener swaps navigation automatically.
      } catch (e: any) {
        setError(friendlyAuthError(e?.message));
      } finally {
        setLoading(false);
      }
    } else {
      // Registration requires explicit data-processing consent first.
      setConsentVisible(true);
    }
  }

  async function handleConsentAccept() {
    setConsentVisible(false);
    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(email, password, {
        data_processing_consent: true,
        consent_accepted_at: new Date().toISOString(),
      });
      if (needsEmailConfirmation) {
        setInfo('Account created! Check your inbox to confirm your email, then log in.');
        setMode('login');
        setPassword('');
      }
    } catch (e: any) {
      setError(friendlyAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <Ionicons name="pie-chart" size={44} color="#4ECDC4" />
            <Text style={styles.title}>Expense Tracker</Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Welcome back — log in to continue'
                : 'Create an account to get started'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#AAA" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#AAA"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#AAA" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#AAA"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#AAA"
                />
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <Text style={styles.hint}>
                At least 8 characters, with a letter and a number.
              </Text>
            )}

            {mode === 'login' && (
              <TouchableOpacity
                style={styles.forgotWrap}
                onPress={() => setForgotVisible(true)}
                disabled={loading}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={15} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {info && (
              <View style={styles.infoBox}>
                <Ionicons name="checkmark-circle" size={15} color="#0E9F6E" />
                <Text style={styles.infoText}>{info}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Log In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode((m) => (m === 'login' ? 'register' : 'login'));
                setError(null);
                setInfo(null);
              }}
              disabled={loading}
            >
              <Text style={styles.switchText}>
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Log in'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={forgotVisible}
        initialEmail={email}
        onClose={() => setForgotVisible(false)}
      />

      <ConsentModal
        visible={consentVisible}
        onAccept={handleConsentAccept}
        onDecline={() => setConsentVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 28 },
  brand: { alignItems: 'center', marginBottom: 36, gap: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  form: { gap: 14 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1A1A2E' },
  hint: { fontSize: 12, color: '#AAA', marginLeft: 4 },
  forgotWrap: { alignSelf: 'flex-end' },
  forgotText: { fontSize: 13, color: '#4ECDC4', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  switchText: {
    textAlign: 'center',
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    padding: 10,
  },
  errorText: { color: '#FF6B6B', fontSize: 13, flex: 1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 10,
  },
  infoText: { color: '#0E9F6E', fontSize: 13, flex: 1 },
});
