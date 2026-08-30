import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet,
  Text, useWindowDimensions, View,
} from 'react-native';

import { colors } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { getMedals } from '../lib/api';
import MedalIcon from './MedalIcon';

// Two ladders. Friends placings use the familiar medals; the global board -
// harder to place in - uses gemstones, so a global third still reads as rarer
// than a friends first.
const TIERS = {
  friends: {
    1: { tier: 'gold',   name: 'Gold',   color: '#D4A017' },
    2: { tier: 'silver', name: 'Silver', color: '#9AA5B1' },
    3: { tier: 'bronze', name: 'Bronze', color: '#B8722D' },
  },
  global: {
    1: { tier: 'diamond',  name: 'Diamond',  color: '#2E86A8' },
    2: { tier: 'ruby',     name: 'Ruby',     color: '#6E1420' },
    3: { tier: 'platinum', name: 'Platinum', color: '#5F6B76' },
  },
};

const PLACE = { 1: '1st place', 2: '2nd place', 3: '3rd place' };

const SECTIONS = [
  { scope: 'global',  title: 'Global',  blurb: 'Everyone on SORT/ED' },
  { scope: 'friends', title: 'Friends', blurb: 'You and the people you follow' },
];

function tierFor(medal) {
  const ladder = TIERS[medal.scope] || TIERS.global;
  return ladder[medal.rank] || ladder[3];
}

function monthLabel(ym) {
  const [y, m] = String(ym).split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function MedalPage({ medal, width }) {
  const tier = tierFor(medal);
  return (
    <View style={[styles.page, { width }]}>
      <View style={[styles.disc, { borderColor: tier.color }]}>
        <MedalIcon tier={tier.tier} size={68} />
      </View>
      <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{PLACE[medal.rank] || `#${medal.rank}`}</Text>
          <Text style={styles.statLbl}>Finish</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{medal.points}</Text>
          <Text style={styles.statLbl}>Points</Text>
        </View>
      </View>

      <Text style={styles.month}>{monthLabel(medal.month)}</Text>
    </View>
  );
}

// One board's worth of medals, swiped horizontally. Each section tracks its own
// page, so swiping Global does not move Friends.
function Section({ title, blurb, medals, pageWidth }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const onScroll = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setIndex((prev) => (i === prev ? prev : i));
  }, [pageWidth]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionBlurb}>{blurb}</Text>
      </View>

      {medals.length === 0 ? (
        <View style={styles.sectionEmpty}>
          <Text style={styles.sectionEmptyText}>
            No {title.toLowerCase()} medals yet — finish top 3 in a month to earn one.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={medals}
            keyExtractor={(m) => `${m.month}-${m.scope}`}
            renderItem={({ item }) => <MedalPage medal={item} width={pageWidth} />}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
          />
          {medals.length > 1 && (
            <View style={styles.dots}>
              {medals.map((m, i) => (
                <Pressable
                  key={`${m.month}-${m.scope}`}
                  hitSlop={6}
                  onPress={() => listRef.current?.scrollToIndex({ index: i, animated: true })}
                >
                  <View style={[styles.dot, i === index && styles.dotActive]} />
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function MedalsModal({ visible, onClose }) {
  const { guestTag } = useProfile();
  const { width: screenW } = useWindowDimensions();
  const [medals, setMedals] = useState([]);
  const [loading, setLoading] = useState(false);

  // The sheet is inset 18px each side, so a page is narrower than the window -
  // getItemLayout and the active-dot maths both depend on this matching.
  const pageWidth = screenW - 36;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    getMedals(guestTag)
      .then((data) => { if (!cancelled) setMedals(data); })
      .catch(() => { if (!cancelled) setMedals([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, guestTag]);

  const total = medals.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Medals</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.forest} style={{ marginVertical: 70 }} />
          ) : total === 0 ? (
            <View style={styles.empty}>
              <View style={{ marginBottom: 14, opacity: 0.35 }}>
                <MedalIcon tier="gold" size={56} />
              </View>
              <Text style={styles.emptyText}>
                No medals yet.{'\n'}Finish top 3 in a month to earn one.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {SECTIONS.map((s) => (
                <Section
                  key={s.scope}
                  title={s.title}
                  blurb={s.blurb}
                  medals={medals.filter((m) => m.scope === s.scope)}
                  pageWidth={pageWidth}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,24,20,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 18,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  sheetTitle: { fontWeight: '700', fontSize: 16, color: colors.ink },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: colors.inkDim, fontSize: 14 },

  section: { paddingTop: 14 },
  sectionHead: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 11.5, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', color: colors.forest,
  },
  sectionBlurb: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
  sectionEmpty: {
    paddingVertical: 22, paddingHorizontal: 14, marginTop: 8,
    backgroundColor: colors.surfaceAlt, borderRadius: 14,
  },
  sectionEmptyText: {
    fontSize: 12.5, lineHeight: 18, color: colors.inkDim, textAlign: 'center',
  },

  page: { alignItems: 'center', paddingTop: 14, paddingBottom: 4 },
  disc: {
    width: 116, height: 116, borderRadius: 58,
    borderWidth: 2.5,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  tierName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  stat: { alignItems: 'center', paddingHorizontal: 24 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statNum: { fontSize: 16, fontWeight: '700', color: colors.ink },
  statLbl: {
    fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase',
    color: colors.inkDim, marginTop: 2,
  },
  month: { fontSize: 12.5, color: colors.inkDim },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.forest, width: 18 },

  empty: { alignItems: 'center', paddingVertical: 56 },
  emptyText: { fontSize: 13, lineHeight: 20, color: colors.inkDim, textAlign: 'center' },
});
