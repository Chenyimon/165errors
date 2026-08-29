import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

import { colors, radius } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { getMyPosts, deletePost, updatePost, imageSource } from '../lib/api';
import { IMPACT } from '../lib/impact';
import { showToast } from '../lib/toast';
import Emoji from './Emoji';

function when(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// One row: the photo, what it was, what it scored, and the caption - which is
// the only thing an author may change. Category and points come from the agent.
function Row({ post, guestTag, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.funFact || '');
  const [busy, setBusy] = useState(false);
  const imp = IMPACT[post.category] || IMPACT.other;

  async function save() {
    setBusy(true);
    try {
      await updatePost(post.id, draft, guestTag);
      setEditing(false);
      onChanged();
    } catch (e) {
      Alert.alert("Couldn't save", 'Please try again.');
    }
    setBusy(false);
  }

  function confirmDelete() {
    Alert.alert('Delete this post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deletePost(post.id, guestTag);
            showToast('Post deleted');
            onChanged();
          } catch (e) {
            Alert.alert("Couldn't delete", 'Please try again.');
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.row}>
      {post.imageUrl ? (
        <Image source={imageSource(post.imageUrl)} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Emoji symbol={imp.icon} size={20} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.item} numberOfLines={1}>{post.itemName}</Text>
        <Text style={styles.meta}>
          {imp.label} · +{post.points} pts · {when(post.ts)}
        </Text>

        {editing ? (
          <View style={styles.editBox}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a caption"
              placeholderTextColor={colors.inkDim}
              style={styles.input}
              multiline
              maxLength={280}
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => { setEditing(false); setDraft(post.funFact || ''); }}>
                <Text style={styles.link}>Cancel</Text>
              </Pressable>
              <Pressable onPress={save} disabled={busy}>
                <Text style={[styles.link, styles.linkStrong]}>{busy ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {!!post.funFact && <Text style={styles.caption} numberOfLines={2}>{post.funFact}</Text>}
            <View style={styles.rowActions}>
              <Pressable onPress={() => setEditing(true)} disabled={busy} hitSlop={8}>
                <Text style={styles.link}>Edit caption</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} disabled={busy} hitSlop={8}>
                <Text style={[styles.link, styles.linkDanger]}>Delete</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default function MyPostsModal({ visible, onClose }) {
  const { guestTag } = useProfile();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getMyPosts(guestTag);
      // The API already returns newest first; sort defensively so the screen
      // does not depend on that.
      setPosts([...rows].sort((a, b) => b.ts - a.ts));
    } catch (e) {
      setPosts([]);
    }
    setLoading(false);
  }, [guestTag]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Your posts</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.link}>Done</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={colors.forest} />
          ) : posts.length === 0 ? (
            <Text style={styles.empty}>
              Nothing here yet. Scan something and it will show up.
            </Text>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <Row post={item} guestTag={guestTag} onChanged={load} />
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 18,
    paddingTop: 18,
    maxHeight: '85%',
  },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.forest },
  empty: { textAlign: 'center', color: colors.inkDim, marginVertical: 40, fontSize: 14 },
  row: {
    flexDirection: 'row', gap: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  thumb: { width: 58, height: 58, borderRadius: 12, backgroundColor: colors.track },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  item: { fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12.5, color: colors.inkDim, marginTop: 2 },
  caption: { fontSize: 13.5, color: colors.ink, marginTop: 6 },
  rowActions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  link: { fontSize: 13.5, fontWeight: '600', color: colors.forest },
  linkStrong: { color: colors.terracotta },
  linkDanger: { color: '#A33B3B' },
  editBox: { marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 13.5,
    color: colors.ink, minHeight: 58, textAlignVertical: 'top',
  },
  editActions: { flexDirection: 'row', gap: 18, marginTop: 8 },
});
