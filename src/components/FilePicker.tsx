import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UploadedFile } from '../types';

interface FilePickerProps {
  onFilePicked: (file: UploadedFile) => void;
  onPickPress: () => void;
  selectedFile: UploadedFile | null;
  uploading: boolean;
  progress: number;
  error: string | null;
}

export function FilePicker({
  onPickPress,
  selectedFile,
  uploading,
  progress,
  error,
}: FilePickerProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.dropZone, selectedFile ? styles.dropZoneActive : null]}
        onPress={onPickPress}
        disabled={uploading}
        activeOpacity={0.7}
      >
        <Ionicons
          name={selectedFile ? 'document-text' : 'cloud-upload-outline'}
          size={40}
          color={selectedFile ? '#4ECDC4' : '#AAA'}
        />
        {selectedFile ? (
          <>
            <Text style={styles.fileName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Text style={styles.fileSize}>
              {selectedFile.size
                ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                : ''}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.dropText}>Tap to select PDF or CSV</Text>
            <Text style={styles.dropSubText}>Bank & credit card statements</Text>
          </>
        )}
      </TouchableOpacity>

      {uploading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator color="#4ECDC4" />
          <Text style={styles.progressText}>Uploading... {progress}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  dropZone: {
    borderWidth: 2,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  dropZoneActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#F0FFFE',
  },
  dropText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
  dropSubText: {
    fontSize: 12,
    color: '#AAA',
  },
  fileName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    maxWidth: 200,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 12,
    color: '#888',
  },
  progressContainer: {
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#555',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#EEE',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F0',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    flex: 1,
  },
});
