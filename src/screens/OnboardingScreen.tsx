import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'document-text-outline',
    title: 'Upload your statements',
    body: 'Add a PDF, Excel, or CSV bank or credit-card statement. We read the dates, descriptions, and amounts to build your spending picture.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Your data stays private',
    body: 'Parsing happens on our own secure servers — never sent to outside AI services. The original file is deleted the moment it is processed.',
  },
  {
    icon: 'pie-chart-outline',
    title: 'See where money goes',
    body: 'Get clear category breakdowns and weekly trends, and fix any category the app gets wrong — all isolated to your account.',
  },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  function next() {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      onDone();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.skip} onPress={onDone}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(s) => s.title}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Ionicons name={item.icon} size={72} color="#4ECDC4" />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>
          {index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  skip: { alignSelf: 'flex-end', padding: 20 },
  skipText: { color: '#888', fontSize: 14, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  body: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D5D5D5' },
  dotActive: { backgroundColor: '#4ECDC4', width: 20 },
  btn: {
    backgroundColor: '#4ECDC4',
    marginHorizontal: 32,
    marginBottom: 24,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
