import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../services/supabase';
import { UploadedFile } from '../types';

export function useStatementUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function pickDocument(): Promise<UploadedFile | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/csv'],
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

  async function uploadStatement(file: UploadedFile): Promise<boolean> {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setProgress(40);

      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(fileName, decode(fileContent), {
          contentType: file.mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(80);

      const { error: dbError } = await supabase.from('statements').insert({
        file_name: file.name,
        file_url: fileName,
        uploaded_at: new Date().toISOString(),
        parsed: false,
      });

      if (dbError) throw dbError;

      setProgress(100);
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Upload failed');
      return false;
    } finally {
      setUploading(false);
    }
  }

  return { pickDocument, uploadStatement, uploading, progress, error };
}

function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
