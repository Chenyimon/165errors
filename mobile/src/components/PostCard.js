import React, { useState } from 'react';
import { View, Text, Image, Pressable, Alert, StyleSheet } from 'react-native';

import { colors, radius } from '../theme';
import { IMPACT } from '../lib/impact';
import { timeAgo } from '../lib/format';
import { imageSource, toggleLike, deletePost } from '../lib/api';
import { useProfile } from '../lib/ProfileContext';
import Tag from './Tag';
import RecycleBadge from './RecycleBadge';
import Emoji from './Emoji';

export default function PostCard({ post, onCommentPress, onDeleted }) {
  const { profile, guestTag } = useProfile();
  const imp = IMPACT[post.category] || IMPACT.other;
  const initial = (post.username || '?').trim().charAt(0).toUpperCase();
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const myDisplayName = profile.username || (guestTag ? `Guest ${guestTag}` : null);
  const isMine = !!myDisplayName && post.username === myDisplayName;

  async function handleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const data = await toggleLike(post.id, guestTag);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch (e) {
      // keep previous state on failure
    }
    setLikeBusy(false);
  }

  function confirmDelete() {
    Alert.alert('Delete this post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deletePost(post.id, guestTag);
            onDeleted && onDeleted(post.id);
          } catch (e) {
            Alert.alert("Couldn't delete", 'Please try again.');
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        <View style={styles.header}>
          {post.avatarUrl ? (
            <Image source={imageSource(post.avatarUrl)} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
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
          <Tag tag={imp.tag} icon={imp.icon} label={imp.label} />
          {isMine ? (
            <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={deleting}>
              <Emoji symbol="🗑️" size={14} />
            </Pressable>
          ) : null}
        </View>

        {post.imageUrl ? <Image source={imageSource(post.imageUrl)} style={styles.image} /> : null}

        <View style={styles.body}>
          <View style={styles.itemRow}>
            <Text style={styles.item}>{post.itemName}</Text>
            <RecycleBadge recyclable={imp.recyclable} label={imp.recycleLabel} />
          </View>
          {post.funFact ? <Text style={styles.fact}>{post.funFact}</Text> : null}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.terracotta }]}>+{post.points}</Text>
              <Text style={styles.statLbl}>Points</Text>
            </View>
          </View>
          <View style={styles.postDivider}>
            <View style={styles.postDividerLine} />
            <Emoji symbol="🌱" size={11} />
            <View style={styles.postDividerLine} />
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, liked && styles.actionBtnLiked]}
              onPress={handleLike}
              disabled={likeBusy}
            >
              <Emoji symbol={liked ? '❤️' : '🤍'} size={14} />
              <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{likeCount}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => onCommentPress && onCommentPress(post.id)}>
              <Emoji symbol="💬" size={14} />
              <Text style={styles.actionText}>{post.commentCount || 0}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    borderRadius: radius.lg,
    marginBottom: 16,
    shadowColor: '#2C4736',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
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
  postDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
  postDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionBtnLiked: { backgroundColor: '#F3DDE6', borderColor: '#F3DDE6' },
  actionText: { fontWeight: '700', fontSize: 13, color: colors.inkDim },
  actionTextLiked: { color: '#8A3B5C' },
  deleteBtn: { padding: 6, borderRadius: 8, flexShrink: 0 },
});
