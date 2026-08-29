import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking, Image, ActivityIndicator, Modal } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { colors, radius } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { imageSource, getMedals } from '../lib/api';
import { prepareAvatarForUpload } from '../lib/imagePrep';
import { IMPACT } from '../lib/impact';
import { computeBadges, nextMilestone, edMessage } from '../lib/profileStore';
import { CHALLENGES, SPONSOR_CHALLENGES, BINS, metricValue, haversineKm } from '../lib/content';
import { showToast } from '../lib/toast';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Emoji from '../components/Emoji';
import MyPostsModal from '../components/MyPostsModal';

const MEDAL_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR = { 1: '#D4A017', 2: '#9AA5B1', 3: '#B8722D' };

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// A leafy divider between You-page sections — purely decorative.
function SectionDivider({ label }) {
  return (
    <>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Emoji symbol="🌿" size={15} />
        <View style={styles.dividerLine} />
      </View>
      <Text style={styles.sectionLabel}>{label}</Text>
    </>
  );
}

export default function ProfileScreen() {
  const { profile, authed, logout, changeAvatar, guestTag } = useProfile();
  const [binResults, setBinResults] = useState(null);
  const [locating, setLocating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [medalsVisible, setMedalsVisible] = useState(false);
  const [medals, setMedals] = useState([]);
  const [medalsLoading, setMedalsLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [myPostsVisible, setMyPostsVisible] = useState(false);

  useEffect(() => {
    if (!medalsVisible) return;
    let cancelled = false;
    setMedalsLoading(true);
    getMedals(guestTag)
      .then((data) => {
        if (!cancelled) setMedals(data);
      })
      .catch(() => {
        if (!cancelled) setMedals([]);
      })
      .finally(() => {
        if (!cancelled) setMedalsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [medalsVisible, guestTag]);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast('Photo library access is needed to set a profile picture');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploadingAvatar(true);
    try {
      const { uri, mediaType } = await prepareAvatarForUpload(result.assets[0].uri);
      await changeAvatar(uri, mediaType);
      showToast('Profile photo updated');
    } catch (e) {
      showToast("Couldn't update photo — try again");
    }
    setUploadingAvatar(false);
  }

  const badges = useMemo(() => computeBadges(profile), [profile]);
  const cats = useMemo(
    () => Object.entries(profile.byCategory || {}).sort((a, b) => b[1] - a[1]),
    [profile.byCategory]
  );
  const maxCat = cats.length ? cats[0][1] : 1;
  const goal = nextMilestone(profile.totalPoints);
  const goalPct = Math.min(100, Math.round((profile.totalPoints / goal) * 100));

  async function findBins() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission is needed to find nearby bins');
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const sorted = BINS
        .map((b) => ({ ...b, dist: haversineKm(pos.coords.latitude, pos.coords.longitude, b.lat, b.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);
      setBinResults(sorted);
    } catch (e) {
      showToast("Couldn't get your location");
    }
    setLocating(false);
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        rightAction={
          <Pressable
            style={styles.menuBtn}
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="More"
            hitSlop={6}
          >
            <Text style={styles.menuDots}>⋯</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your impact</Text>
        <View style={styles.heroBlock}>
          <View style={styles.leafDecorRow}>
            <Emoji symbol="🌿" size={18} />
            <Emoji symbol="🍃" size={18} style={{ transform: [{ scaleX: -1 }] }} />
          </View>
          <View style={styles.avatarWrap}>
            {profile.avatarUrl ? (
              <Image source={imageSource(profile.avatarUrl)} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{(profile.username || '?').trim().charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {authed ? (
              <Pressable style={styles.avatarEditBtn} onPress={pickAvatar} disabled={uploadingAvatar}>
                <Emoji symbol="📷" size={13} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.name}>{profile.username || 'Guest'}</Text>
          {!authed ? (
            <Text style={styles.guestNote}>
              Browsing as a guest — your progress stays on this device only.{' '}
              <Text style={styles.guestLink} onPress={logout}>
                Log in to save it
              </Text>
            </Text>
          ) : null}
        </View>

        <View style={styles.edGreeting}>
          <Image source={require('../../assets/ed-mascot.png')} style={styles.edGreetingIcon} />
          <View style={styles.edBubble}>
            <Text style={styles.edBubbleText}>{edMessage(profile)}</Text>
          </View>
        </View>

        <View style={styles.pointsHero}>
          <Pressable style={styles.pointsHeroMedalBtn} onPress={() => setMedalsVisible(true)}>
            <Emoji symbol="🏅" size={16} />
          </Pressable>
          <Text style={styles.pointsHeroLabel}>Total points</Text>
          <Text style={styles.pointsHeroNum}>{profile.totalPoints}</Text>
          <Text style={styles.pointsHeroSub}>Lifetime impact across every scan.</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.num}>{profile.currentStreak}</Text>
            <Text style={styles.lbl}>Current streak</Text>
          </View>
          <View style={styles.card}>
            <Text style={[styles.num, styles.accent]}>{profile.totalScans}</Text>
            <Text style={styles.lbl}>Items sorted</Text>
          </View>
          <View style={styles.card}>
            <Text style={[styles.num, styles.accent]}>{profile.longestStreak}</Text>
            <Text style={styles.lbl}>Longest streak</Text>
          </View>
        </View>

        <SectionDivider label="Next milestone" />
        <View style={styles.goalRow}>
          <Text style={styles.goalLabel}>Points to next milestone</Text>
          <Text style={styles.goalValue}>
            {profile.totalPoints} / {goal}
          </Text>
        </View>
        <View style={styles.goalTrack}>
          <View style={[styles.goalFill, { width: `${goalPct}%` }]} />
        </View>

        <SectionDivider label="Challenges" />
        {CHALLENGES.map((c) => {
          const val = metricValue(profile, c.metric);
          const pct = Math.min(100, Math.round((val / c.target) * 100));
          const complete = val >= c.target;
          return (
            <View key={c.id} style={styles.challengeCard}>
              <Text style={styles.challengeTitle}>
                {c.title}
                {complete ? ' ✓' : ''}
              </Text>
              <Text style={styles.challengeDesc}>{c.desc}</Text>
              <View style={styles.challengeTrack}>
                <View style={[styles.challengeFill, { width: `${pct}%` }, complete && styles.challengeFillComplete]} />
              </View>
              <Text style={styles.challengeProgress}>
                {Math.min(val, c.target)} / {c.target}
              </Text>
            </View>
          );
        })}

        <SectionDivider label="Sponsored challenges" />
        {SPONSOR_CHALLENGES.map((s) => {
          const val = metricValue(profile, s.metric);
          const pct = Math.min(100, Math.round((val / s.target) * 100));
          return (
            <View key={s.id} style={styles.sponsorCardShadow}>
              <View style={styles.sponsorCard}>
                <View style={[styles.sponsorBanner, { backgroundColor: s.color }]}>
                  <Emoji symbol={s.icon} size={14} style={{ marginRight: 6 }} />
                  <Text style={styles.sponsorBannerText}>{s.sponsor}</Text>
                </View>
                <View style={styles.sponsorBody}>
                  <Text style={styles.sponsorDesc}>{s.desc}</Text>
                  <View style={styles.challengeTrack}>
                    <View style={[styles.challengeFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.challengeProgress}>
                    {Math.min(val, s.target)} / {s.target}
                  </Text>
                  <View style={styles.sponsorRewardRow}>
                    <Emoji symbol="🎁" size={13} style={{ marginRight: 5 }} />
                    <Text style={styles.sponsorReward}>{s.reward}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        <SectionDivider label="By material" />
        {cats.length ? (
          cats.map(([cat, count]) => {
            const imp = IMPACT[cat];
            const pct = Math.round((count / maxCat) * 100);
            return (
              <View key={cat} style={styles.catRow}>
                <View style={styles.catNameRow}>
                  <Emoji symbol={imp.icon} size={13} style={{ marginRight: 4 }} />
                  <Text style={styles.catName}>{imp.label}</Text>
                </View>
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

        <SectionDivider label="Milestones" />
        {badges.length ? (
          badges.map((b, i) => (
            <View key={b.label} style={styles.milestoneRow}>
              <View style={[styles.milestoneBadge, { transform: [{ rotate: i % 2 === 0 ? '-4deg' : '4deg' }] }]}>
                <Emoji symbol={b.icon} size={18} />
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

        <SectionDivider label="Nearby recycling bins" />
        <View style={styles.binsCard}>
          {binResults ? (
            binResults.map((b, i) => (
              <View key={b.id} style={[styles.binRow, i === binResults.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.binName}>{b.name}</Text>
                <Pressable
                  onPress={() =>
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`)
                  }
                >
                  <Text style={styles.binDist}>{b.dist.toFixed(1)} km · Directions</Text>
                </Pressable>
              </View>
            ))
          ) : (
            <>
              <Text style={styles.mutedText}>Find the closest drop-off points using your current location.</Text>
              <Button
                title={locating ? 'Locating…' : 'Use my location'}
                variant="primary"
                onPress={findBins}
                disabled={locating}
                style={{ width: '100%', marginTop: 12 }}
              />
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={menuVisible} animationType="fade" transparent onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuSheet}>
            <Pressable
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); setMyPostsVisible(true); }}
            >
              <Emoji symbol="📸" size={17} />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Your posts</Text>
                <Text style={styles.menuItemSub}>Newest first — edit captions or delete</Text>
              </View>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); setMedalsVisible(true); }}
            >
              <Emoji symbol="🏅" size={17} />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemText}>Medals</Text>
                <Text style={styles.menuItemSub}>Every medal you have earned</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <MyPostsModal visible={myPostsVisible} onClose={() => setMyPostsVisible(false)} />

      <Modal visible={medalsVisible} animationType="slide" transparent onRequestClose={() => setMedalsVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Medals</Text>
              <Pressable style={styles.closeBtn} onPress={() => setMedalsVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            {medalsLoading ? (
              <ActivityIndicator color={colors.forest} style={{ marginVertical: 30 }} />
            ) : medals.length === 0 ? (
              <View style={styles.empty}>
                <Emoji symbol="🏅" size={34} style={styles.emptyBig} />
                <Text style={styles.emptyText}>No medals yet.{'\n'}Finish top 3 in a month to earn one.</Text>
              </View>
            ) : (
              medals.map((m) => (
                <View key={m.month} style={styles.milestoneRow}>
                  <View style={[styles.milestoneBadge, { backgroundColor: MEDAL_COLOR[m.rank] }]}>
                    <Emoji symbol={MEDAL_EMOJI[m.rank]} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.milestoneTitle}>{monthLabel(m.month)}</Text>
                    <Text style={styles.milestoneSub}>
                      #{m.rank} place · {m.points} points
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.sage,
    alignItems: 'center', justifyContent: 'center',
  },
  menuDots: { fontSize: 20, lineHeight: 22, color: colors.forest, fontWeight: '800' },
  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 96, paddingRight: 14,
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 6,
    width: 268,
    shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  menuItemText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  menuItemSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
  menuDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
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
  heroBlock: { marginBottom: 22, alignItems: 'center' },
  leafDecorRow: { flexDirection: 'row', justifyContent: 'space-between', width: 130, opacity: 0.6, marginBottom: -6 },
  avatarWrap: { width: 88, height: 88, marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '700', fontSize: 32, color: colors.forest },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.forest,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontWeight: '700', fontSize: 22, color: colors.ink, textAlign: 'center' },
  guestNote: {
    fontSize: 12.5,
    color: colors.inkDim,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  guestLink: { color: colors.forest, fontWeight: '700' },
  edGreeting: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 18 },
  edGreetingIcon: { width: 56, height: 69 },
  edBubble: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    marginLeft: 4,
    marginBottom: 12,
  },
  edBubbleText: { fontSize: 13, color: colors.ink, lineHeight: 18 },
  pointsHero: {
    backgroundColor: colors.forest,
    borderRadius: radius.lg,
    padding: 26,
    marginBottom: 22,
    alignItems: 'center',
    shadowColor: '#20362A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  pointsHeroLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.65)',
  },
  pointsHeroNum: { fontWeight: '800', fontSize: 44, color: '#fff', marginTop: 4 },
  pointsHeroSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 8, textAlign: 'center' },
  pointsHeroMedalBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyBig: { marginBottom: 10 },
  emptyText: { fontSize: 13, lineHeight: 20, color: colors.inkDim, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(20,24,20,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '82%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontWeight: '700', fontSize: 16, color: colors.ink },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.inkDim, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: {
    width: '31%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#2C4736',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  num: { fontWeight: '800', fontSize: 24, color: colors.ink },
  accent: { color: colors.terracotta },
  lbl: { fontSize: 11, color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
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
  catNameRow: { flexDirection: 'row', alignItems: 'center', width: 90 },
  catName: { fontSize: 12.5, color: colors.inkDim },
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
    shadowColor: '#6B3B57',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  milestoneTitle: { fontWeight: '700', fontSize: 14, color: colors.ink },
  milestoneSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
  challengeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#2C4736',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  challengeTitle: { fontWeight: '700', fontSize: 14, color: colors.ink, marginBottom: 2 },
  challengeDesc: { fontSize: 12, color: colors.inkDim, marginBottom: 10 },
  challengeTrack: { height: 8, backgroundColor: colors.track, borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  challengeFill: { height: '100%', backgroundColor: colors.forest, borderRadius: 5 },
  challengeFillComplete: { backgroundColor: colors.sun },
  challengeProgress: { fontSize: 11, color: colors.inkDim, textAlign: 'right' },
  sponsorCardShadow: {
    borderRadius: radius.lg,
    marginBottom: 12,
    shadowColor: '#2C4736',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  sponsorCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sponsorBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  sponsorBannerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sponsorBody: { padding: 16, backgroundColor: colors.surface },
  sponsorDesc: { fontSize: 12.5, color: colors.inkDim, marginBottom: 10, lineHeight: 18 },
  sponsorRewardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  sponsorReward: { fontSize: 12, color: colors.terracotta, fontWeight: '700' },
  binsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    shadowColor: '#2C4736',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  binRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  binName: { fontSize: 13, fontWeight: '600', color: colors.ink, flex: 1, marginRight: 10 },
  binDist: { fontSize: 12, color: colors.forest, fontWeight: '700' },
});
