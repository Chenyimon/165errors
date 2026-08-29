import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { colors, radius } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { getLeaderboard } from '../lib/api';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Emoji from '../components/Emoji';

export default function BoardScreen() {
  const { profile, authed, logout, guestTag } = useProfile();
  const myDisplayName = profile.username || (guestTag ? `Guest ${guestTag}` : null);
  const [scope, setScope] = useState('global');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (activeScope) => {
      setLoading(true);
      if (activeScope === 'friends' && !authed) {
        setEntries([]);
        setLoading(false);
        return;
      }
      try {
        const data = await getLeaderboard(activeScope);
        setEntries(data);
      } catch (e) {
        console.warn('leaderboard load failed', e);
      }
      setLoading(false);
    },
    [authed]
  );

  useFocusEffect(
    useCallback(() => {
      load(scope);
    }, [load, scope])
  );

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Resets every month · Top 3 win a medal</Text>

        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, scope === 'global' && styles.toggleBtnActive]}
            onPress={() => setScope('global')}
          >
            <Text style={[styles.toggleText, scope === 'global' && styles.toggleTextActive]}>Global</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, scope === 'friends' && styles.toggleBtnActive]}
            onPress={() => setScope('friends')}
          >
            <Text style={[styles.toggleText, scope === 'friends' && styles.toggleTextActive]}>Friends</Text>
          </Pressable>
        </View>

        {scope === 'friends' && !authed ? (
          <View style={styles.empty}>
            <Emoji symbol="🔒" size={34} style={styles.emptyBig} />
            <Text style={styles.emptyText}>Log in to see how you and your friends stack up.</Text>
            <Button title="Log in / Sign up" variant="primary" onPress={logout} style={{ marginTop: 14 }} />
          </View>
        ) : loading ? (
          <ActivityIndicator color={colors.forest} style={{ marginTop: 40 }} />
        ) : entries.length === 0 ? (
          <View style={styles.empty}>
            <Emoji symbol={scope === 'friends' ? '🧑‍🤝‍🧑' : '🏆'} size={34} style={styles.emptyBig} />
            <Text style={styles.emptyText}>
              {scope === 'friends'
                ? 'No friends yet.\nAdd some from the friends icon up top.'
                : "You're the first one here.\nScan something to take the top spot."}
            </Text>
          </View>
        ) : (
          entries.map((item, index) => {
            const mine = !!myDisplayName && item.username === myDisplayName;
            return (
              <View key={item.username} style={[styles.row, mine && styles.rowMe]}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Text style={styles.name}>
                  {item.username}
                  {item.isGuest ? ' · Guest' : ''}
                  {mine ? ' (you)' : ''}
                </Text>
                <Text style={styles.pts}>{item.points}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 40 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkDim,
    marginBottom: 18,
  },
  subtitle: { fontSize: 12.5, color: colors.inkDim, marginTop: -12, marginBottom: 16 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  toggleText: { fontWeight: '700', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.inkDim },
  toggleTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyBig: { marginBottom: 10 },
  emptyText: { fontSize: 13, lineHeight: 20, color: colors.inkDim, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.sm,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMe: { borderColor: colors.forest, backgroundColor: colors.sage },
  rank: { fontWeight: '800', fontSize: 13, color: colors.inkDim, width: 22 },
  name: { flex: 1, fontWeight: '700', fontSize: 14, color: colors.ink },
  pts: { fontWeight: '800', color: colors.terracotta, fontSize: 14 },
});
