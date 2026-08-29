import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { colors, radius } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { getMyPosts, imageSource } from '../lib/api';
import { EVENTS } from '../lib/content';
import { getJoinedEvents, setJoinedEvents } from '../lib/eventsStore';
import AppHeader from '../components/AppHeader';
import PostCard from '../components/PostCard';
import Button from '../components/Button';
import Emoji from '../components/Emoji';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dayKey(y, m, d) {
  return `${y}-${m}-${d}`;
}

export default function CalendarScreen() {
  const { guestTag } = useProfile();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [joined, setJoined] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyPosts(guestTag);
      setPosts(data);
    } catch (e) {
      console.warn('my posts load failed', e);
    }
    setJoined(await getJoinedEvents());
    setLoading(false);
  }, [guestTag]);

  const toggleEvent = async (id) => {
    const next = joined.includes(id) ? joined.filter((x) => x !== id) : [...joined, id];
    setJoined(next);
    await setJoinedEvents(next);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const grouped = useMemo(() => {
    const map = {};
    posts.forEach((p) => {
      const d = new Date(p.ts);
      const key = dayKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [posts]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const selectedPosts = selectedKey ? grouped[selectedKey] || [] : [];
  let selectedLabel = '';
  if (selectedKey) {
    const [sy, sm, sd] = selectedKey.split('-').map(Number);
    selectedLabel = new Date(sy, sm - 1, sd).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  const goPrevMonth = () =>
    setCursor((c) => {
      const d = new Date(c);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  const goNextMonth = () => {
    if (isCurrentMonth) return;
    setCursor((c) => {
      const d = new Date(c);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your calendar</Text>

        <View style={styles.nav}>
          <Pressable style={styles.navBtn} onPress={goPrevMonth}>
            <Text style={styles.navBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
            disabled={isCurrentMonth}
            onPress={goNextMonth}
          >
            <Text style={styles.navBtnText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={styles.weekday}>
              {w}
            </Text>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.forest} style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`e${i}`} style={styles.cellWrap} />;
              const key = dayKey(year, month + 1, day);
              const dayPosts = grouped[key] || [];
              const isToday = isCurrentMonth && today.getDate() === day;

              if (dayPosts.length === 0) {
                return (
                  <View key={key} style={styles.cellWrap}>
                    <View style={[styles.cellInner, isToday && styles.cellToday]}>
                      <Text style={styles.cellNum}>{day}</Text>
                    </View>
                  </View>
                );
              }

              return (
                <View key={key} style={styles.cellWrap}>
                  <Pressable
                    style={[styles.cellInner, styles.cellFilled, isToday && styles.cellTodayFilled]}
                    onPress={() => setSelectedKey(key)}
                  >
                    {dayPosts[0].imageUrl ? (
                      <Image source={imageSource(dayPosts[0].imageUrl)} style={styles.cellImage} />
                    ) : null}
                    <Text style={[styles.cellNum, styles.cellNumFilled]}>{day}</Text>
                    {dayPosts.length > 1 ? (
                      <View style={styles.cellBadge}>
                        <Text style={styles.cellBadgeText}>+{dayPosts.length - 1}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.title, { marginTop: 26 }]}>Upcoming events</Text>
        {EVENTS.map((ev) => {
          const isJoined = joined.includes(ev.id);
          return (
            <View key={ev.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{ev.title}</Text>
              <View style={styles.eventMetaRow}>
                <Emoji symbol="📅" size={12} style={{ marginRight: 5 }} />
                <Text style={styles.eventMeta}>{ev.date}</Text>
              </View>
              <View style={styles.eventMetaRow}>
                <Emoji symbol="📍" size={12} style={{ marginRight: 5 }} />
                <Text style={styles.eventMeta}>
                  {ev.location} · {ev.spots} spots
                </Text>
              </View>
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

      <Modal visible={!!selectedKey} animationType="slide" transparent onRequestClose={() => setSelectedKey(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectedLabel}</Text>
              <Pressable style={styles.closeBtn} onPress={() => setSelectedKey(null)}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={selectedPosts}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => <PostCard post={item} onDeleted={load} />}
            />
          </View>
        </View>
      </Modal>
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
  eventCard: {
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
  eventTitle: { fontWeight: '700', fontSize: 14, color: colors.ink, marginBottom: 4 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  eventMeta: { fontSize: 12, color: colors.inkDim },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontSize: 18, color: colors.forest, fontWeight: '700' },
  monthLabel: { fontWeight: '700', fontSize: 16, color: colors.ink },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkDim,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  cellInner: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellToday: { borderColor: colors.forest, borderWidth: 2 },
  cellNum: { fontSize: 12, fontWeight: '700', color: colors.inkDim },
  cellFilled: { borderWidth: 0 },
  cellImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  cellNumFilled: {
    position: 'absolute',
    top: 3,
    left: 5,
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cellTodayFilled: { borderWidth: 2, borderColor: colors.sun },
  cellBadge: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  cellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
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
});
