import { supabase } from './supabase';
import { Profile } from '../types';

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  return user.id;
}

/**
 * Fetches the signed-in user's profile (RLS-scoped). Self-heals: if no row
 * exists (e.g. the account predates the signup trigger, or the profiles table
 * was recreated), it creates a default row instead of erroring.
 */
export async function fetchProfile(): Promise<Profile> {
  const id = await currentUserId();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as Profile;

  const { data: created, error: insErr } = await supabase
    .from('profiles')
    .insert({ id })
    .select()
    .single();

  if (insErr) throw insErr;
  return created as Profile;
}

/**
 * Updates editable profile fields. Uses upsert so it works even if the profile
 * row doesn't exist yet. RLS allows only the owner to write.
 */
export async function updateProfile(
  patch: Partial<Pick<Profile, 'full_name' | 'currency'>>,
): Promise<Profile> {
  const id = await currentUserId();

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

/** Records the user's explicit data-processing consent. */
export async function recordConsent(): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      data_processing_consent: true,
      consent_accepted_at: new Date().toISOString(),
    });

  if (error) throw error;
}
