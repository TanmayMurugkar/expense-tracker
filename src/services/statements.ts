import { supabase } from './supabase';
import { Statement, StatementStatus } from '../types';

/** Inserts a statement row in 'processing' state and returns it (incl. id). */
export async function createStatement(params: {
  userId: string;
  fileName: string;
  storagePath: string;
  statementType: 'bank' | 'credit_card';
}): Promise<Statement> {
  const { data, error } = await supabase
    .from('statements')
    .insert({
      user_id: params.userId,
      file_name: params.fileName,
      storage_path: params.storagePath,
      statement_type: params.statementType,
      status: 'processing',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Statement;
}

/** Reads the current status of a statement (used to poll processing → done). */
export async function getStatementStatus(
  id: string,
): Promise<{ status: StatementStatus; error_message: string | null }> {
  const { data, error } = await supabase
    .from('statements')
    .select('status, error_message')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as { status: StatementStatus; error_message: string | null };
}
