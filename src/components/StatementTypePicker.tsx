import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatementType } from '../types';

interface Props {
  value: StatementType | null;
  onChange: (type: StatementType) => void;
  disabled?: boolean;
}

const OPTIONS: { type: StatementType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'bank', label: 'Bank Account', icon: 'wallet-outline' },
  { type: 'credit_card', label: 'Credit Card', icon: 'card-outline' },
];

export function StatementTypePicker({ value, onChange, disabled }: Props) {
  return (
    <View>
      <Text style={styles.label}>Statement type</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const selected = value === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(opt.type)}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Ionicons
                name={opt.icon}
                size={22}
                color={selected ? '#4ECDC4' : '#AAA'}
              />
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    backgroundColor: '#FFF',
  },
  optionSelected: { borderColor: '#4ECDC4', backgroundColor: '#F0FFFE' },
  optionText: { fontSize: 14, fontWeight: '600', color: '#888' },
  optionTextSelected: { color: '#1A1A2E' },
});
