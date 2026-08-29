import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { tagColors } from '../theme';

export default function Tag({ tag, label }) {
  const c = tagColors[tag] || tagColors.neutral;
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
