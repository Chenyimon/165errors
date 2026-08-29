import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';
import { useFriendsModal } from '../lib/FriendsModalContext';
import Emoji from './Emoji';
import EdMark from './EdMark';

// `rightAction` lets one screen add its own button beside Friends without
// putting it on every screen.
export default function AppHeader({ rightAction }) {
  const insets = useSafeAreaInsets();
  const { open } = useFriendsModal();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.brand}>
        <EdMark size={26} />
        <Text style={styles.wordmark}>
          SORT<Text style={styles.slash}>/</Text>ED
        </Text>
      </View>
      <View style={styles.actions}>
        {rightAction}
        <Pressable style={styles.friendsBtn} onPress={open} accessibilityLabel="Friends">
          <Emoji symbol="👥" size={16} />
        </Pressable>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
});
