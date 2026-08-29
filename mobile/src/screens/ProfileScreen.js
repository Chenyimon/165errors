import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

import { colors, radius } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { IMPACT } from '../lib/impact';
import { computeBadges, nextMilestone } from '../lib/profileStore';
import AppHeader from '../components/AppHeader';

export default function ProfileScreen() {
  const { profile } = useProfile();

  const badges = useMemo(() => computeBadges(profile), [profile]);
  const cats = useMemo(
    () => Object.entries(profile.byCategory || {}).sort((a, b) => b[1] - a[1]),
    [profile.byCategory]
  );
  const maxCat = cats.length ? cats[0][1] : 1;
  const ringPct = Math.min(100, Math.round((Math.min(profile.currentStreak, 7) / 7) * 100));
  const goal = nextMilestone(profile.totalPoints);
  const goalPct = Math.min(100, Math.round((profile.totalPoints / goal) * 100));

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your impact</Text>
        <Text style={styles.name}>{profile.username || 'Set a name in Board'}</Text>

        <View style={styles.streakCard}>
          <View style={styles.streakTop}>
            <View style={styles.streakIcon}>
              <Text style={{ fontSize: 20 }}>🔥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakTitle}>{profile.currentStreak > 0 ? 'Growing steady' : 'Ready to start'}</Text>
              <Text style={styles.streakSub}>
                {profile.currentStreak > 0
                  ? `You're on a ${profile.currentStreak}-day streak. Longest run so far: ${profile.longestStreak} days.`
                  : 'Scan an item today to start your streak.'}
              </Text>
            </View>
          </View>
          <View style={styles.streakTrack}>
            <View style={[styles.streakFill, { width: `${ringPct}%` }]} />
          </View>
          <View>
            <Text style={styles.streakBig}>{profile.currentStreak}</Text>
            <Text style={styles.streakCap}>DAY STREAK</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.num}>{profile.totalPoints}</Text>
            <Text style={styles.lbl}>Total points</Text>
          </View>
          <View style={styles.card}>
            <Text style={[styles.num, styles.accent]}>{profile.totalScans}</Text>
            <Text style={styles.lbl}>Items sorted</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.num}>{profile.currentStreak}</Text>
            <Text style={styles.lbl}>Current streak</Text>
          </View>
          <View style={styles.card}>
            <Text style={[styles.num, styles.accent]}>{profile.longestStreak}</Text>
            <Text style={styles.lbl}>Longest streak</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Next milestone</Text>
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>Points to next milestone</Text>
          <Text style={styles.goalValue}>
            {profile.totalPoints} / {goal}
          </Text>
        </View>
        <View style={styles.goalTrack}>
          <View style={[styles.goalFill, { width: `${goalPct}%` }]} />
        </View>

        <Text style={styles.sectionLabel}>By material</Text>
        {cats.length ? (
          cats.map(([cat, count]) => {
            const imp = IMPACT[cat];
            const pct = Math.round((count / maxCat) * 100);
            return (
              <View key={cat} style={styles.catRow}>
                <Text style={styles.catName}>
                  {imp.icon} {imp.label}
                </Text>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.catCount}>{count}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.mutedText}>Nothing sorted yet.</Text>
        )}

        <Text style={styles.sectionLabel}>Milestones</Text>
        {badges.length ? (
          badges.map((b) => (
            <View key={b.label} style={styles.milestoneRow}>
              <View style={styles.milestoneBadge}>
                <Text style={{ fontSize: 18 }}>{b.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.milestoneTitle}>{b.label}</Text>
                <Text style={styles.milestoneSub}>{b.sub}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.mutedText}>Scan items to unlock milestones.</Text>
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
  name: { fontWeight: '700', fontSize: 22, color: colors.ink, textAlign: 'center', marginBottom: 22 },
  streakCard: { backgroundColor: colors.forest, borderRadius: radius.lg, padding: 22, marginBottom: 22 },
  streakTop: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 16 },
  streakIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.forestDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTitle: { fontWeight: '700', fontSize: 16, color: '#fff', marginBottom: 4 },
  streakSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 18 },
  streakTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  streakFill: { height: '100%', backgroundColor: colors.sun, borderRadius: 5 },
  streakBig: { fontWeight: '800', fontSize: 32, color: '#fff' },
  streakCap: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
  },
  num: { fontWeight: '800', fontSize: 24, color: colors.ink },
  accent: { color: colors.terracotta },
  lbl: { fontSize: 11, color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.inkDim,
    marginTop: 4,
    marginBottom: 10,
  },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },
  goalValue: { fontSize: 13, fontWeight: '800', color: colors.ink },
  goalTrack: { height: 10, backgroundColor: colors.track, borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  goalFill: { height: '100%', backgroundColor: colors.forest, borderRadius: 6 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  catName: { width: 90, fontSize: 12.5, color: colors.inkDim },
  catTrack: { flex: 1, height: 8, backgroundColor: colors.track, borderRadius: 5, overflow: 'hidden' },
  catFill: { height: '100%', backgroundColor: colors.forest, borderRadius: 5 },
  catCount: { width: 20, textAlign: 'right', fontSize: 12.5, fontWeight: '700', color: colors.inkDim },
  mutedText: { fontSize: 13, color: colors.inkDim },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  milestoneBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTitle: { fontWeight: '700', fontSize: 14, color: colors.ink },
  milestoneSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
});
