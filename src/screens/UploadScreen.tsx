import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FilePicker } from '../components/FilePicker';
import { StatementTypePicker } from '../components/StatementTypePicker';
import { useStatementUpload } from '../hooks/useStatementUpload';
import { StatementType, UploadedFile } from '../types';

export function UploadScreen() {
  const navigation = useNavigation<any>();
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [statementType, setStatementType] = useState<StatementType | null>(null);
  const { pickDocument, uploadStatement, uploading, progress, statusText, error } =
    useStatementUpload();

  async function handlePickPress() {
    const file = await pickDocument();
    if (file) setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !statementType) return;
    const result = await uploadStatement(selectedFile, statementType);

    if (result.ok) {
      setSelectedFile(null);
      setStatementType(null);
      if (result.warning) {
        Alert.alert('Uploaded with notes', result.warning);
      } else {
        Alert.alert('Success!', 'Transactions added to your dashboard.', [
          { text: 'View Dashboard', onPress: () => navigation.navigate('Dashboard') },
        ]);
      }
    } else {
      Alert.alert('Upload failed', result.error);
    }
  }

  const canUpload = selectedFile && statementType && !uploading;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Upload Statement</Text>
        <Text style={styles.sub}>
          Upload a PDF, CSV, or Excel (.xlsx) bank or credit-card statement.
        </Text>

        <StatementTypePicker
          value={statementType}
          onChange={setStatementType}
          disabled={uploading}
        />

        <FilePicker
          onPickPress={handlePickPress}
          selectedFile={selectedFile}
          uploading={uploading}
          progress={progress}
          statusText={statusText}
          error={error}
        />

        {selectedFile && !statementType && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
            <Text style={styles.warningText}>
              Pick a statement type (Bank or Credit Card) to continue.
            </Text>
          </View>
        )}

        {canUpload && (
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
            <Text style={styles.uploadBtnText}>Upload & Parse</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Supported Formats</Text>
          <Text style={styles.tipText}>
            <Text style={styles.bold}>Excel (.xlsx)</Text> — direct bank export, first sheet is used{'\n'}
            <Text style={styles.bold}>CSV</Text> — needs Date, Description, and Debit/Credit columns{'\n'}
            <Text style={styles.bold}>PDF</Text> — digitally generated statements only (not scanned){'\n\n'}
            Most Indian bank exports (HDFC, ICICI, SBI, Axis, IDFC) work out of the box.
            Your file is deleted from our servers right after parsing.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { padding: 24, gap: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  sub: { fontSize: 14, color: '#888', lineHeight: 20 },
  uploadBtn: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  uploadBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 12,
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  tipBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  tipTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  tipText: { fontSize: 13, color: '#555', lineHeight: 20 },
  bold: { fontWeight: '600', color: '#333' },
});
