import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';
import { useProfile } from '../lib/ProfileContext';

export default function AppHeader() {
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.wordmark}>
        SORT<Text style={styles.slash}>/</Text>ED
      </Text>
      <View style={styles.stats}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>🔥 {profile.currentStreak}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>🌿 {profile.totalPoints}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  wordmark: { fontWeight: '800', fontSize: 20, color: colors.forest },
  slash: { color: colors.terracotta },
  stats: { flexDirection: 'row', gap: 10 },
  pill: { backgroundColor: colors.sage, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  pillText: { color: colors.forest, fontWeight: '700', fontSize: 13 },
});
