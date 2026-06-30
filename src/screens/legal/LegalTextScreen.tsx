import React from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Renders a block of legal copy with a simple heading style. */
export function LegalTextScreen({ content }: { content: string }) {
  const [title, ...body] = content.split('\n');
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body.join('\n')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  scroll: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  body: { fontSize: 14, color: '#444', lineHeight: 22 },
});
