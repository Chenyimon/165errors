import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { colors, radius } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { getLeaderboard } from '../lib/api';
import { EVENTS } from '../lib/content';
import { getJoinedEvents, setJoinedEvents } from '../lib/eventsStore';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';

export default function BoardScreen() {
  const { profile, saveProfile } = useProfile();
  const [name, setName] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState([]);

  const load = useCallback(async () => {
    const joinedIds = await getJoinedEvents();
    setJoined(joinedIds);
    if (!profile.username) return;
    setLoading(true);
    try {
      const data = await getLeaderboard();
      setEntries(data);
    } catch (e) {
      console.warn('leaderboard load failed', e);
    }
    setLoading(false);
  }, [profile.username]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const join = async () => {
    const val = name.trim();
    if (!val) return;
    await saveProfile({ ...profile, username: val });
    load();
  };

  const toggleEvent = async (id) => {
    const next = joined.includes(id) ? joined.filter((x) => x !== id) : [...joined, id];
    setJoined(next);
    await setJoinedEvents(next);
  };

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Leaderboard</Text>

        {!profile.username ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>
              Pick a name to join the leaderboard. Everyone using this app will see it.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              maxLength={24}
              style={styles.input}
              placeholderTextColor={colors.inkDim}
            />
            <Button title="Join leaderboard" variant="primary" onPress={join} style={{ width: '100%' }} />
          </View>
        ) : loading ? (
          <ActivityIndicator color={colors.forest} style={{ marginTop: 40 }} />
        ) : entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyBig}>🏆</Text>
            <Text style={styles.emptyText}>You're the first one here.{'\n'}Scan something to take the top spot.</Text>
          </View>
        ) : (
          entries.map((item, index) => (
            <View key={item.username} style={[styles.row, item.username === profile.username && styles.rowMe]}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text style={styles.name}>
                {item.username}
                {item.username === profile.username ? ' (you)' : ''}
              </Text>
              <Text style={styles.pts}>{item.points}</Text>
            </View>
          ))
        )}

        <Text style={[styles.title, { marginTop: 26 }]}>Upcoming events</Text>
        {EVENTS.map((ev) => {
          const isJoined = joined.includes(ev.id);
          return (
            <View key={ev.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{ev.title}</Text>
              <Text style={styles.eventMeta}>📅 {ev.date}</Text>
              <Text style={styles.eventMeta}>
                📍 {ev.location} · {ev.spots} spots
              </Text>
              <Button
                title={isJoined ? 'Joined ✓' : 'Join'}
                variant={isJoined ? 'outline' : 'primary'}
                onPress={() => toggleEvent(ev.id)}
                style={{ marginTop: 10, alignSelf: 'flex-start' }}
              />
            </View>
          );
        })}
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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
  },
  cardText: { fontSize: 13, color: colors.inkDim, marginBottom: 14, lineHeight: 19, textAlign: 'center' },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 12,
  },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyBig: { fontSize: 34, marginBottom: 10 },
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
  eventCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: 10,
  },
  eventTitle: { fontWeight: '700', fontSize: 14, color: colors.ink, marginBottom: 4 },
  eventMeta: { fontSize: 12, color: colors.inkDim, marginBottom: 2 },
});
