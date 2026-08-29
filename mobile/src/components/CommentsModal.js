import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';

import { colors, radius } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import { getComments, addComment } from '../lib/api';
import { timeAgo } from '../lib/format';
import Button from './Button';

export default function CommentsModal({ postId, visible, onClose }) {
  const { guestTag } = useProfile();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await getComments(postId);
      setComments(data);
    } catch (e) {
      console.warn('comments load failed', e);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || !postId) return;
    setError('');
    setPosting(true);
    try {
      await addComment(postId, text, guestTag);
      setInput('');
      load();
    } catch (e) {
      setError(e.message);
    }
    setPosting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Comments</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.forest} style={{ marginVertical: 20 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.muted}>No comments yet — be the first to say something.</Text>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {(item.username || '?').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentMetaRow}>
                      <Text style={styles.commentName}>{item.username}</Text>
                      {item.isGuest ? (
                        <View style={styles.guestTag}>
                          <Text style={styles.guestTagText}>Guest</Text>
                        </View>
                      ) : null}
                      <Text style={styles.commentTime}>{timeAgo(item.ts)}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                </View>
              )}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.addRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Write a comment…"
              maxLength={280}
              style={styles.input}
              placeholderTextColor={colors.inkDim}
            />
            <Button title="Post" variant="primary" onPress={onSend} disabled={posting} />
          </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontWeight: '700', fontSize: 18, color: colors.ink },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.inkDim, fontSize: 14 },
  muted: { fontSize: 13, color: colors.inkDim, paddingVertical: 14 },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  commentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentName: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  guestTag: { backgroundColor: colors.track, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  guestTagText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: colors.inkDim },
  commentTime: { fontSize: 10.5, color: colors.inkDim },
  commentText: { fontSize: 13, color: colors.ink, lineHeight: 18, marginTop: 2 },
  error: { color: colors.terracotta, fontSize: 12.5, marginTop: 8 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  input: {
    flex: 1,
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.ink,
    fontSize: 14,
  },
});
