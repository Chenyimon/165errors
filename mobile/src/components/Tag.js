import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { tagColors } from '../theme';
import Emoji from './Emoji';

export default function Tag({ tag, icon, label }) {
  const c = tagColors[tag] || tagColors.neutral;
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      {icon ? <Emoji symbol={icon} size={11} style={styles.icon} /> : null}
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  icon: { marginRight: 1 },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
