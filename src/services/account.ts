import { supabase } from './supabase';

/**
 * Permanently deletes all of the user's financial data while keeping the
 * account. RLS scopes every delete to the owner. Also clears any leftover
 * raw files under the user's storage prefix (there normally are none, since
 * the parser deletes them post-parse).
 */
export async function wipeAllData(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { error: txErr } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id);
  if (txErr) throw txErr;

  const { error: stmtErr } = await supabase
    .from('statements')
    .delete()
    .eq('user_id', user.id);
  if (stmtErr) throw stmtErr;

  // Best-effort storage cleanup under {user_id}/.
  const { data: files } = await supabase.storage
    .from('statements')
    .list(user.id);
  if (files && files.length > 0) {
    await supabase.storage
      .from('statements')
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }
}

/**
 * Permanently deletes the account itself. Calls the privileged
 * `delete-account` edge function, which removes the auth user; the DB
 * cascade then wipes profile → statements → transactions.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error) throw error;
}
