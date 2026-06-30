import AsyncStorage from '@react-native-async-storage/async-storage';

// Guarded require: on a build that doesn't yet include the native module
// (e.g. before the Stage B rebuild), this stays null and biometrics report
// as unavailable instead of crashing the app.
let LocalAuth: typeof import('expo-local-authentication') | null = null;
try {
  LocalAuth = require('expo-local-authentication');
} catch {
  LocalAuth = null;
}

const ENABLED_KEY = 'biometric_enabled';

/** True only if the device has biometric hardware AND an enrolled credential. */
export async function hasBiometrics(): Promise<boolean> {
  if (!LocalAuth) return false;
  try {
    const hasHardware = await LocalAuth.hasHardwareAsync();
    const enrolled = await LocalAuth.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Prompts the OS biometric dialog. Returns true on success. */
export async function authenticateBiometric(
  reason = 'Unlock Expense Tracker',
): Promise<boolean> {
  if (!LocalAuth) return false;
  try {
    const res = await LocalAuth.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}
