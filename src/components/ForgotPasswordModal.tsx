import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import {
  validateEmail,
  validatePassword,
  friendlyAuthError,
} from '../utils/validation';

interface Props {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
}

/** In-app password reset using an emailed 6-digit OTP code. */
export function ForgotPasswordModal({ visible, initialEmail = '', onClose }: Props) {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep(1); setCode(''); setPassword(''); setError(null); setLoading(false);
  }
  function close() { reset(); onClose(); }

  async function sendCode() {
    setError(null);
    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setStep(2);
    } catch (e: any) {
      setError(friendlyAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword() {
    setError(null);
    if (code.trim().length < 6) return setError('Enter the 6-digit code from your email.');
    const passErr = validatePassword(password);
    if (passErr) return setError(passErr);
    setLoading(true);
    try {
      await confirmPasswordReset(email, code, password);
      close();
      // The auth listener will pick up the new session automatically.
    } catch (e: any) {
      setError(friendlyAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Reset password</Text>
            <TouchableOpacity onPress={close} hitSlop={10}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          {step === 1 ? (
            <>
              <Text style={styles.body}>
                Enter your email and we'll send you a 6-digit code to reset your password.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#AAA"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={sendCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Send code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.body}>
                Enter the code sent to <Text style={styles.bold}>{email}</Text> and choose a new password.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor="#AAA"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                editable={!loading}
                maxLength={6}
              />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor="#AAA"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <Text style={styles.hint}>At least 8 characters, with a letter and a number.</Text>
              {error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={submitNewPassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Reset password</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={sendCode} disabled={loading}>
                <Text style={styles.resend}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: '#FFF', borderRadius: 18, padding: 22, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  body: { fontSize: 14, color: '#666', lineHeight: 20 },
  bold: { fontWeight: '700', color: '#1A1A2E' },
  input: {
    borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E',
  },
  hint: { fontSize: 12, color: '#AAA' },
  error: { color: '#FF6B6B', fontSize: 13 },
  btn: { backgroundColor: '#4ECDC4', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  resend: { textAlign: 'center', color: '#4ECDC4', fontSize: 14, fontWeight: '600', marginTop: 4 },
});
