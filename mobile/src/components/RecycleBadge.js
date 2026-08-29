import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RecycleBadge({ recyclable, label }) {
  return (
    <View style={[styles.badge, recyclable ? styles.yes : styles.no]}>
      <Text style={[styles.text, recyclable ? styles.textYes : styles.textNo]}>
        {recyclable ? '✓' : '!'} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  yes: { backgroundColor: '#DCEBD6' },
  no: { backgroundColor: '#F5E3C9' },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  textYes: { color: '#2C6B3F' },
  textNo: { color: '#8A5A22' },
});
