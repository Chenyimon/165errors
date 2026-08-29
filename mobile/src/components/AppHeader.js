import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';
import { useFriendsModal } from '../lib/FriendsModalContext';

export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const { open } = useFriendsModal();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.wordmark}>
        SORT<Text style={styles.slash}>/</Text>ED
      </Text>
      <Pressable style={styles.friendsBtn} onPress={open} accessibilityLabel="Friends">
        <Text style={styles.friendsIcon}>👥</Text>
      </Pressable>
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
  friendsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsIcon: { fontSize: 16 },
});
