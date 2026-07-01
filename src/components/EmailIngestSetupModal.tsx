import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ingestAddress } from '../constants/config';

// Official auto-forwarding help pages.
const FORWARD_HELP = {
  gmail: 'https://support.google.com/mail/answer/10957',
  outlook: 'https://support.microsoft.com/en-us/office/turn-on-automatic-forwarding-in-outlook-7f2670a1-7fff-4475-8a3c-5822d63b0c8e',
};

interface Props {
  visible: boolean;
  ingestToken: string | null | undefined;
  onClose: () => void;
}

const STEPS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'card-outline', label: 'Bank emails\nyour statement' },
  { icon: 'mail-outline', label: 'Forward it to\nyour address' },
  { icon: 'pie-chart-outline', label: 'Auto-parsed to\nyour dashboard' },
];

/**
 * First-run pop-up explaining email ingestion, with a small looping animation
 * of an envelope flowing across the 3-step workflow, then the user's unique
 * forwarding address.
 */
export function EmailIngestSetupModal({ visible, ingestToken, onClose }: Props) {
  const address = ingestAddress(ingestToken);
  const flow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flow, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(300),
        Animated.timing(flow, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, flow]);

  // Envelope glides left→right across the workflow row.
  const translateX = flow.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });
  const opacity = flow.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] });

  async function shareAddress() {
    if (address) await Share.share({ message: address });
  }

  function showForwardHelp() {
    Alert.alert(
      'Auto-forward statements',
      'Open a step-by-step guide for setting up an auto-forwarding rule:',
      [
        { text: 'Gmail', onPress: () => Linking.openURL(FORWARD_HELP.gmail) },
        { text: 'Outlook', onPress: () => Linking.openURL(FORWARD_HELP.outlook) },
        { text: 'Close', style: 'cancel' },
      ],
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="mail-open-outline" size={28} color="#4ECDC4" />
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Automate your uploads</Text>
          <Text style={styles.body}>
            We've created a private email address just for you. Send your bank
            statements there and they'll be parsed into your dashboard
            automatically — no manual uploads.
          </Text>

          {/* Animated workflow */}
          <View style={styles.flowRow}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.label}>
                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Ionicons name={s.icon} size={22} color="#4ECDC4" />
                  </View>
                  <Text style={styles.stepLabel}>{s.label}</Text>
                </View>
                {i < STEPS.length - 1 && <Ionicons name="chevron-forward" size={16} color="#CCC" />}
              </React.Fragment>
            ))}
            {/* Gliding envelope overlay */}
            <Animated.View style={[styles.envelope, { transform: [{ translateX }], opacity }]}>
              <Ionicons name="mail" size={18} color="#FFF" />
            </Animated.View>
          </View>

          {/* Personal statements address */}
          <Text style={styles.addrLabel}>Your private statements address</Text>
          <View style={styles.addrBox}>
            <Text style={styles.addr} selectable numberOfLines={1}>
              {address ?? 'Setting up… pull to refresh shortly'}
            </Text>
          </View>

          {/* How to use */}
          <View style={styles.howto}>
            <View style={styles.howRow}>
              <Text style={styles.howNum}>1</Text>
              <Text style={styles.howText}>Copy your address (long-press it, or tap Share).</Text>
            </View>
            <View style={styles.howRow}>
              <Text style={styles.howNum}>2</Text>
              <Text style={styles.howText}>
                In your bank or email, forward statement emails here — or set a
                rule to auto-forward them.
              </Text>
              <TouchableOpacity onPress={showForwardHelp} hitSlop={8} style={styles.infoBtn}>
                <Ionicons name="information-circle-outline" size={19} color="#4ECDC4" />
              </TouchableOpacity>
            </View>
            <View style={styles.howRow}>
              <Text style={styles.howNum}>3</Text>
              <Text style={styles.howText}>That's it — new statements appear on your dashboard automatically.</Text>
            </View>
          </View>

          <Text style={styles.note}>
            For your security, only emails from recognised bank domains are accepted.
          </Text>

          <TouchableOpacity style={styles.shareBtn} onPress={shareAddress} disabled={!address}>
            <Ionicons name="share-outline" size={18} color="#FFF" />
            <Text style={styles.shareText}>Share address</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.later}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  body: { fontSize: 14, color: '#666', lineHeight: 20 },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#F7FBFB',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  step: { alignItems: 'center', width: 80, gap: 6 },
  stepIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E7FAF8', alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: { fontSize: 11, color: '#666', textAlign: 'center', lineHeight: 14 },
  envelope: {
    position: 'absolute', top: 12, left: 36,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#4ECDC4', alignItems: 'center', justifyContent: 'center',
  },
  addrLabel: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginTop: 4 },
  addrBox: { backgroundColor: '#F2F2F2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  addr: { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },
  howto: { gap: 10, marginTop: 4 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#4ECDC4',
    color: '#FFF', fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 20, overflow: 'hidden',
  },
  howText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },
  infoBtn: { paddingTop: 1 },
  note: { fontSize: 12, color: '#999', lineHeight: 17 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#4ECDC4', borderRadius: 12, paddingVertical: 15, marginTop: 4,
  },
  shareText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  later: { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 6 },
});
