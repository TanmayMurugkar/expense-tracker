// Guarded require so the app still runs on builds without the native module.
let JailMonkey: any = null;
try {
  const mod = require('jail-monkey');
  JailMonkey = mod?.default ?? mod;
} catch {
  JailMonkey = null;
}

/**
 * Returns true if the device appears rooted/jailbroken or running in a way that
 * could expose memory to malware. Fails open to `false` if the module is absent
 * so we never falsely lock out a legitimate user on an unsupported build.
 */
export function isDeviceCompromised(): boolean {
  if (!JailMonkey) return false;
  try {
    return Boolean(JailMonkey.isJailBroken());
  } catch {
    return false;
  }
}
