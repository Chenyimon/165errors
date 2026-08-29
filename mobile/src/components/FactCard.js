import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, radius } from '../theme';
import Emoji from './Emoji';

export default function FactCard({ fact, icon = '🌍', label = 'Did you know?' }) {
  return (
    <View style={styles.card}>
      <Emoji symbol={icon} size={20} />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.text}>{fact}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.sageDeep,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.sageDeep,
    marginBottom: 3,
  },
  text: { fontSize: 13, color: colors.ink, lineHeight: 18 },
});
