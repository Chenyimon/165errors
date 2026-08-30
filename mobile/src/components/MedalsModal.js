import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text,
  useWindowDimensions, View,
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

function tierFor(medal) {
  const ladder = TIERS[medal.scope] || TIERS.global;
  return ladder[medal.rank] || ladder[3];
}

function monthLabel(ym) {
  const [y, m] = String(ym).split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// One medal, sized to fill the sheet so swiping moves a whole card at a time.
function MedalPage({ medal, width }) {
  const tier = tierFor(medal);
  return (
    <View style={[styles.page, { width }]}>
      <View style={[styles.disc, { borderColor: tier.color }]}>
        <MedalIcon tier={tier.tier} size={92} />
      </View>

      <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
      <Text style={styles.scope}>
        {medal.scope === 'friends' ? 'Friends leaderboard' : 'Global leaderboard'}
      </Text>

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

export default function MedalsModal({ visible, onClose }) {
  const { guestTag } = useProfile();
  const { width: screenW } = useWindowDimensions();
  const [medals, setMedals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  // The sheet is inset from the screen edges, so a page is narrower than the
  // window - getItemLayout and the dot maths both depend on this matching.
  const pageWidth = screenW - 36;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setIndex(0);
    getMedals(guestTag)
      .then((data) => { if (!cancelled) setMedals(data); })
      .catch(() => { if (!cancelled) setMedals([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, guestTag]);

  function onScroll(e) {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== index) setIndex(i);
  }

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
          ) : medals.length === 0 ? (
            <View style={styles.empty}>
              <View style={{ marginBottom: 14, opacity: 0.35 }}>
                <MedalIcon tier="gold" size={56} />
              </View>
              <Text style={styles.emptyText}>
                No medals yet.{'\n'}Finish top 3 in a month to earn one.
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
                getItemLayout={(_, i) => ({
                  length: pageWidth, offset: pageWidth * i, index: i,
                })}
              />

              {medals.length > 1 && (
                <>
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
                  <Text style={styles.counter}>
                    {index + 1} of {medals.length} — swipe to see the rest
                  </Text>
                </>
              )}
            </>
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
    paddingBottom: 26,
    paddingHorizontal: 18,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  sheetTitle: { fontWeight: '700', fontSize: 16, color: colors.ink },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: colors.inkDim, fontSize: 14 },

  page: { alignItems: 'center', paddingTop: 22, paddingBottom: 8 },
  disc: {
    width: 150, height: 150, borderRadius: 75,
    borderWidth: 2.5,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  tierName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  scope: { fontSize: 13.5, color: colors.inkDim, marginTop: 3 },

  statRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, marginBottom: 16,
  },
  stat: { alignItems: 'center', paddingHorizontal: 26 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statNum: { fontSize: 17, fontWeight: '700', color: colors.ink },
  statLbl: {
    fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase',
    color: colors.inkDim, marginTop: 2,
  },
  month: { fontSize: 13, color: colors.inkDim },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.forest, width: 18 },
  counter: {
    textAlign: 'center', fontSize: 11.5, color: colors.inkDim, marginTop: 10,
  },

  empty: { alignItems: 'center', paddingVertical: 56 },
  emptyText: { fontSize: 13, lineHeight: 20, color: colors.inkDim, textAlign: 'center' },
});
