import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

import { colors, radius } from '../theme';
import { IMPACT } from '../lib/impact';
import { timeAgo } from '../lib/format';
import { imageUrl } from '../lib/api';
import Tag from './Tag';
import RecycleBadge from './RecycleBadge';

export default function PostCard({ post }) {
  const imp = IMPACT[post.category] || IMPACT.other;
  const initial = (post.username || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{post.username || 'Someone'}</Text>
            {post.isGuest ? (
              <View style={styles.guestTag}>
                <Text style={styles.guestTagText}>Guest</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.time}>{timeAgo(post.ts)}</Text>
        </View>
        <Tag tag={imp.tag} label={`${imp.icon} ${imp.label}`} />
      </View>

      {post.imageUrl ? <Image source={{ uri: imageUrl(post.imageUrl) }} style={styles.image} /> : null}

      <View style={styles.body}>
        <View style={styles.itemRow}>
          <Text style={styles.item}>{post.itemName}</Text>
          <RecycleBadge recyclable={imp.recyclable} label={imp.recycleLabel} />
        </View>
        {post.funFact ? <Text style={styles.fact}>{post.funFact}</Text> : null}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{post.weightG}g</Text>
            <Text style={styles.statLbl}>Weight</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{post.co2G}g</Text>
            <Text style={styles.statLbl}>CO2 saved</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.terracotta }]}>+{post.points}</Text>
            <Text style={styles.statLbl}>Points</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontWeight: '700', fontSize: 13.5, color: colors.ink },
  guestTag: { backgroundColor: colors.track, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  guestTagText: { fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase', color: colors.inkDim },
  time: { fontSize: 11, color: colors.inkDim, marginTop: 1 },
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceAlt },
  body: { padding: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  item: { fontWeight: '700', fontSize: 17, color: colors.ink },
  fact: { fontSize: 12.5, color: colors.inkDim, lineHeight: 18, marginBottom: 12 },
  stats: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontWeight: '800', fontSize: 15, color: colors.ink },
  statLbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.inkDim, marginTop: 2 },
});
