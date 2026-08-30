import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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

function tierFor(medal) {
  const ladder = TIERS[medal.scope] || TIERS.global;
  return ladder[medal.rank] || ladder[3];
}

function monthLabel(ym) {
  const [y, m] = String(ym).split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// Lifted out of ProfileScreen so the "..." menu can reach it from any tab.
export default function MedalsModal({ visible, onClose }) {
  const { guestTag } = useProfile();
  const [medals, setMedals] = useState([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Medals</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.forest} style={{ marginVertical: 30 }} />
          ) : medals.length === 0 ? (
            <View style={styles.empty}>
              <View style={{ marginBottom: 10 }}>
                <MedalIcon tier="gold" size={34} />
              </View>
              <Text style={styles.emptyText}>
                No medals yet.{'\n'}Finish top 3 in a month to earn one.
              </Text>
            </View>
          ) : (
            medals.map((m) => {
              const tier = tierFor(m);
              return (
                <View key={`${m.month}-${m.scope}`} style={styles.milestoneRow}>
                  <View style={[styles.milestoneBadge, { backgroundColor: tier.color }]}>
                    <MedalIcon tier={tier.tier} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.milestoneTitle}>
                      {tier.name} · {m.scope === 'friends' ? 'Friends' : 'Global'}
                    </Text>
                    <Text style={styles.milestoneSub}>
                      {monthLabel(m.month)} · #{m.rank} place · {m.points} points
                    </Text>
                  </View>
                </View>
              );
            })
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
    padding: 20,
    maxHeight: '82%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontWeight: '700', fontSize: 16, color: colors.ink },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: colors.inkDim, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 13, lineHeight: 20, color: colors.inkDim, textAlign: 'center' },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  milestoneBadge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneTitle: { fontWeight: '700', fontSize: 14, color: colors.ink },
  milestoneSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
});
