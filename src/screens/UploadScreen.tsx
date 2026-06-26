import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilePicker } from '../components/FilePicker';
import { useStatementUpload } from '../hooks/useStatementUpload';
import { UploadedFile } from '../types';

export function UploadScreen() {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const { pickDocument, uploadStatement, uploading, progress, error } =
    useStatementUpload();

  async function handlePickPress() {
    const file = await pickDocument();
    if (file) setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    const success = await uploadStatement(selectedFile);
    if (success) {
      Alert.alert('Uploaded!', 'Your statement is being processed.');
      setSelectedFile(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Upload Statement</Text>
        <Text style={styles.sub}>
          Upload a PDF or CSV bank/credit card statement to track your spending.
        </Text>

        <FilePicker
          onFilePicked={setSelectedFile}
          onPickPress={handlePickPress}
          selectedFile={selectedFile}
          uploading={uploading}
          progress={progress}
          error={error}
        />

        {selectedFile && !uploading && (
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
            <Text style={styles.uploadBtnText}>Upload & Parse</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { flex: 1, padding: 24, gap: 16 },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  sub: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  uploadBtn: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
