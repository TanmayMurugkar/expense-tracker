import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONSENT_SUMMARY } from '../constants/legal';

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/** Required data-processing consent shown during sign-up. */
export function ConsentModal({ visible, onAccept, onDecline }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons name="shield-checkmark" size={36} color="#4ECDC4" />
          <Text style={styles.title}>Before you continue</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.body}>{CONSENT_SUMMARY}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.accept} onPress={onAccept}>
            <Text style={styles.acceptText}>I Agree & Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDecline}>
            <Text style={styles.decline}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  scroll: { maxHeight: 200, marginVertical: 4 },
  body: { fontSize: 14, color: '#555', lineHeight: 21, textAlign: 'center' },
  accept: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  acceptText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  decline: { color: '#888', fontSize: 14, marginTop: 6 },
});
