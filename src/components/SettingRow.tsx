import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  iconColor?: string;
}

export function SettingRow({
  icon,
  label,
  value,
  right,
  onPress,
  danger,
  iconColor,
}: Props) {
  const color = danger ? '#E5484D' : '#1A1A2E';
  const tint = iconColor ?? (danger ? '#E5484D' : '#4ECDC4');
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <Ionicons name={icon} size={20} color={tint} style={styles.icon} />
      <Text style={[styles.label, { color }]}>{label}</Text>
      <View style={styles.right}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#CCC" /> : null)}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  icon: { marginRight: 14, width: 22 },
  label: { flex: 1, fontSize: 15 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 14, color: '#999' },
});
