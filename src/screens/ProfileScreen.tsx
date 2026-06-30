import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SettingRow } from '../components/SettingRow';
import { useAuth } from '../context/AuthProvider';
import { useAppLock } from '../context/AppLockProvider';
import { useProfile } from '../hooks/useProfile';
import { exportTransactions } from '../services/export';
import { wipeAllData, deleteAccount } from '../services/account';
import {
  hasBiometrics,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticateBiometric,
} from '../services/biometrics';
import { SUPPORTED_CURRENCIES } from '../types';
import { ingestAddress } from '../constants/config';

const LOCK_OPTIONS = [1, 2, 5, 10];

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut, signOutEverywhere } = useAuth();
  const { timeoutMinutes, setTimeoutMinutes } = useAppLock();
  const { profile, save } = useProfile();

  const [biometric, setBiometric] = useState(false);
  const [nameModal, setNameModal] = useState(false);

  // Load the saved biometric preference on mount.
  React.useEffect(() => {
    isBiometricEnabled().then(setBiometric);
  }, []);

  async function toggleBiometric(next: boolean) {
    if (next) {
      const available = await hasBiometrics();
      if (!available) {
        Alert.alert(
          'Biometrics unavailable',
          'Set up Face ID / fingerprint in your device settings first.',
        );
        return;
      }
      // Confirm the user can actually authenticate before enabling.
      const ok = await authenticateBiometric('Confirm to enable biometric unlock');
      if (!ok) return;
    }
    await setBiometricEnabled(next);
    setBiometric(next);
  }

  const [nameDraft, setNameDraft] = useState('');
  const [currencyModal, setCurrencyModal] = useState(false);
  const [lockModal, setLockModal] = useState(false);
  const [confirm, setConfirm] = useState<null | 'wipe' | 'delete'>(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveName() {
    try {
      await save({ full_name: nameDraft.trim() || null });
      setNameModal(false);
    } catch (e: any) {
      Alert.alert('Could not save name', e?.message ?? 'Please try again.');
    }
  }

  async function chooseCurrency(code: string) {
    try {
      await save({ currency: code });
      setCurrencyModal(false);
    } catch (e: any) {
      Alert.alert('Could not save currency', e?.message ?? 'Please try again.');
    }
  }

  async function handleExport() {
    Alert.alert('Export data', 'Choose a format', [
      { text: 'CSV', onPress: () => runExport('csv') },
      { text: 'JSON', onPress: () => runExport('json') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  async function runExport(fmt: 'csv' | 'json') {
    try {
      const count = await exportTransactions(fmt);
      if (count === 0) Alert.alert('Nothing to export', 'You have no transactions yet.');
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    }
  }

  async function runConfirmedAction() {
    const action = confirm;
    setBusy(true);
    try {
      if (action === 'wipe') {
        await wipeAllData();
        Alert.alert('Done', 'All your data has been wiped.');
      } else if (action === 'delete') {
        await deleteAccount();
        // Account gone — sign out returns to the auth screen.
        await signOut();
      }
      setConfirm(null);
      setConfirmText('');
    } catch (e: any) {
      Alert.alert('Action failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const confirmKeyword = confirm === 'delete' ? 'DELETE' : 'WIPE';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Profile</Text>

        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <View style={styles.group}>
          <SettingRow
            icon="person-outline"
            label="Name"
            value={profile?.full_name ?? 'Add name'}
            onPress={() => { setNameDraft(profile?.full_name ?? ''); setNameModal(true); }}
          />
          <SettingRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
          <SettingRow
            icon="cash-outline"
            label="Currency"
            value={profile?.currency ?? 'INR'}
            onPress={() => setCurrencyModal(true)}
          />
        </View>

        {/* Security */}
        <Text style={styles.section}>Security</Text>
        <View style={styles.group}>
          <SettingRow
            icon="finger-print-outline"
            label="Biometric unlock"
            right={
              <Switch
                value={biometric}
                onValueChange={toggleBiometric}
                trackColor={{ true: '#4ECDC4' }}
              />
            }
          />
          <SettingRow
            icon="timer-outline"
            label="Auto-lock after"
            value={`${timeoutMinutes} min`}
            onPress={() => setLockModal(true)}
          />
          <SettingRow icon="phone-portrait-outline" label="Sign out of all devices"
            onPress={() =>
              Alert.alert('Sign out everywhere?', 'This ends every active session on all devices.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out all', style: 'destructive', onPress: () => signOutEverywhere() },
              ])
            }
          />
          <SettingRow icon="log-out-outline" label="Sign out" onPress={() => signOut()} />
        </View>

        {/* Data */}
        <Text style={styles.section}>Data</Text>
        <View style={styles.group}>
          <SettingRow
            icon="mail-open-outline"
            label="Email statements in"
            onPress={() => {
              const addr = ingestAddress(profile?.ingest_token);
              Alert.alert(
                'Forward statements here',
                addr
                  ? `Set your bank alerts (or forward statements) to:\n\n${addr}\n\nOnly emails from recognised bank domains are accepted.`
                  : 'Your email-in address is being set up. Pull to refresh shortly.',
              );
            }}
          />
          <SettingRow icon="download-outline" label="Export my data" onPress={handleExport} />
          <SettingRow
            icon="flame-outline"
            label="Wipe all data"
            danger
            onPress={() => { setConfirm('wipe'); setConfirmText(''); }}
          />
        </View>

        {/* Legal */}
        <Text style={styles.section}>Legal</Text>
        <View style={styles.group}>
          <SettingRow icon="shield-checkmark-outline" label="Privacy Policy"
            onPress={() => navigation.navigate('Privacy')} />
          <SettingRow icon="document-text-outline" label="Terms of Service"
            onPress={() => navigation.navigate('Terms')} />
        </View>

        {/* Danger zone */}
        <Text style={styles.section}>Danger zone</Text>
        <View style={styles.group}>
          <SettingRow
            icon="trash-outline"
            label="Delete account"
            danger
            onPress={() => { setConfirm('delete'); setConfirmText(''); }}
          />
        </View>

        <Text style={styles.footer}>Expense Tracker v1.0.0</Text>
      </ScrollView>

      {/* Name edit modal */}
      <CenterModal visible={nameModal} onClose={() => setNameModal(false)}>
        <Text style={styles.modalTitle}>Your name</Text>
        <TextInput
          style={styles.modalInput}
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder="Enter your name"
          placeholderTextColor="#AAA"
          autoFocus
        />
        <TouchableOpacity style={styles.modalBtn} onPress={saveName}>
          <Text style={styles.modalBtnText}>Save</Text>
        </TouchableOpacity>
      </CenterModal>

      {/* Currency modal */}
      <CenterModal visible={currencyModal} onClose={() => setCurrencyModal(false)}>
        <Text style={styles.modalTitle}>Currency</Text>
        {SUPPORTED_CURRENCIES.map((c) => (
          <TouchableOpacity key={c} style={styles.optionRow} onPress={() => chooseCurrency(c)}>
            <Text style={styles.optionText}>{c}</Text>
            {profile?.currency === c && <Ionicons name="checkmark" size={18} color="#4ECDC4" />}
          </TouchableOpacity>
        ))}
      </CenterModal>

      {/* Auto-lock modal */}
      <CenterModal visible={lockModal} onClose={() => setLockModal(false)}>
        <Text style={styles.modalTitle}>Auto-lock after</Text>
        {LOCK_OPTIONS.map((m) => (
          <TouchableOpacity key={m} style={styles.optionRow}
            onPress={() => { setTimeoutMinutes(m); setLockModal(false); }}>
            <Text style={styles.optionText}>{m} minute{m > 1 ? 's' : ''}</Text>
            {timeoutMinutes === m && <Ionicons name="checkmark" size={18} color="#4ECDC4" />}
          </TouchableOpacity>
        ))}
      </CenterModal>

      {/* Typed-confirm modal for wipe / delete */}
      <CenterModal visible={confirm !== null} onClose={() => !busy && setConfirm(null)}>
        <Text style={styles.modalTitle}>
          {confirm === 'delete' ? 'Delete account' : 'Wipe all data'}
        </Text>
        <Text style={styles.modalBody}>
          This is permanent and cannot be undone. Type{' '}
          <Text style={styles.bold}>{confirmKeyword}</Text> to confirm.
        </Text>
        <TextInput
          style={styles.modalInput}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          placeholder={confirmKeyword}
          placeholderTextColor="#AAA"
        />
        <TouchableOpacity
          style={[styles.modalBtn, styles.dangerBtn, confirmText !== confirmKeyword && styles.btnDisabled]}
          disabled={confirmText !== confirmKeyword || busy}
          onPress={runConfirmedAction}
        >
          {busy ? <ActivityIndicator color="#FFF" /> : (
            <Text style={styles.modalBtnText}>
              {confirm === 'delete' ? 'Delete forever' : 'Wipe data'}
            </Text>
          )}
        </TouchableOpacity>
      </CenterModal>
    </SafeAreaView>
  );
}

function CenterModal({ visible, onClose, children }: {
  visible: boolean; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>{children}</TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  section: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginTop: 20, marginBottom: 8, marginLeft: 4 },
  group: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFF' },
  footer: { textAlign: 'center', color: '#BBB', fontSize: 12, marginTop: 28 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 22, width: '100%', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  modalBody: { fontSize: 14, color: '#666', lineHeight: 20 },
  bold: { fontWeight: '700', color: '#E5484D' },
  modalInput: {
    borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E',
  },
  modalBtn: { backgroundColor: '#4ECDC4', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  dangerBtn: { backgroundColor: '#E5484D' },
  btnDisabled: { opacity: 0.4 },
  modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  optionText: { fontSize: 15, color: '#1A1A2E' },
});
