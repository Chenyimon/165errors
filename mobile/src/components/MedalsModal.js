import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { getMedals } from '../lib/api';
import Emoji from './Emoji';

const MEDAL_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_COLOR = { 1: '#D4A017', 2: '#9AA5B1', 3: '#B8722D' };

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
              <Emoji symbol="🏅" size={34} style={styles.emptyBig} />
              <Text style={styles.emptyText}>
                No medals yet.{'\n'}Finish top 3 in a month to earn one.
              </Text>
            </View>
          ) : (
            medals.map((m) => (
              <View key={m.month} style={styles.milestoneRow}>
                <View style={[styles.milestoneBadge, { backgroundColor: MEDAL_COLOR[m.rank] }]}>
                  <Emoji symbol={MEDAL_EMOJI[m.rank]} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.milestoneTitle}>{monthLabel(m.month)}</Text>
                  <Text style={styles.milestoneSub}>#{m.rank} place · {m.points} points</Text>
                </View>
              </View>
            ))
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
  emptyBig: { marginBottom: 10 },
  emptyText: { fontSize: 13, lineHeight: 20, color: colors.inkDim, textAlign: 'center' },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  milestoneBadge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneTitle: { fontWeight: '700', fontSize: 14, color: colors.ink },
  milestoneSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
});
