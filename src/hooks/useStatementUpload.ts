import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { supabase } from '../services/supabase';
import { createStatement, getStatementStatus } from '../services/statements';
import { StatementType, UploadedFile } from '../types';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — mirrors the edge-function cap
const ALLOWED_EXT = ['.pdf', '.csv', '.xlsx', '.xls'];

type UploadResult = { ok: true; count?: number; warning?: string | null } | { ok: false; error: string };

export function useStatementUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function pickDocument(): Promise<UploadedFile | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size,
    };
  }

  async function uploadStatement(
    file: UploadedFile,
    statementType: StatementType,
  ): Promise<UploadResult> {
    try {
      setUploading(true);
      setError(null);
      setProgress(0);
      setStatusText('Validating file…');

      // ── Client-side guards (defense-in-depth with the server) ──
      const lowerName = file.name.toLowerCase();
      if (!ALLOWED_EXT.some((ext) => lowerName.endsWith(ext))) {
        throw new Error('Unsupported file type. Choose a PDF, Excel, or CSV.');
      }
      if (file.size && file.size > MAX_BYTES) {
        throw new Error('File is larger than 10 MB.');
      }

      // ── Identify the user (path + ownership are scoped to them) ──
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to upload.');

      const bytes = await new File(file.uri).bytes();
      setProgress(20);
      setStatusText('Uploading…');

      // Upload under the user's own prefix so storage RLS permits it.
      const storagePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(storagePath, bytes, { contentType: file.mimeType, upsert: false });
      if (uploadError) throw uploadError;
      setProgress(45);

      // ── Log the statement (status defaults to 'processing') ──
      const statement = await createStatement({
        userId: user.id,
        fileName: file.name,
        storagePath,
        statementType,
      });
      setProgress(60);
      setStatusText('Processing your data…');

      // ── Invoke the parser (user_id is derived server-side from the JWT) ──
      const { error: fnError } = await supabase.functions.invoke('parse-statement', {
        body: { statementId: statement.id },
      });
      if (fnError) throw fnError;

      // ── Poll status until the parser finishes ──
      const finalStatus = await pollStatus(statement.id);
      setProgress(100);

      if (finalStatus.status === 'failed') {
        throw new Error(finalStatus.error_message ?? 'Parsing failed.');
      }
      return { ok: true, warning: finalStatus.error_message };
    } catch (err: any) {
      const message = err?.message ?? 'Upload failed.';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setUploading(false);
    }
  }

  async function pollStatus(statementId: string) {
    // Poll for up to ~30s (15 × 2s) before giving up.
    for (let i = 0; i < 15; i++) {
      const s = await getStatementStatus(statementId);
      if (s.status === 'completed' || s.status === 'failed') return s;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return { status: 'failed' as const, error_message: 'Timed out while processing.' };
  }

  return { pickDocument, uploadStatement, uploading, progress, statusText, error };
}
