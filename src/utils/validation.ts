// Client-side input validation for auth forms (defense-in-depth; the server
// is the real authority). Keep messages generic where they touch credentials.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required.';
  if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include a letter and a number.';
  }
  return null;
}

/** Normalises Supabase auth errors into generic, non-enumerating copy. */
export function friendlyAuthError(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Incorrect email or password.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  // Avoid leaking "user already registered" → generic instead.
  if (m.includes('already registered') || m.includes('already exists')) {
    return 'If that email is available, your account will be created.';
  }
  return 'Something went wrong. Please try again.';
}
