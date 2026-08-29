import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';

import { colors, radius } from '../theme';
import { useFriendsModal } from '../lib/FriendsModalContext';
import { useProfile } from '../lib/ProfileContext';
import { getFriends, addFriend, removeFriend } from '../lib/api';
import Button from './Button';

export default function FriendsModal() {
  const { visible, close } = useFriendsModal();
  const { authed, logout } = useProfile();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const data = await getFriends();
      setFriends(data);
    } catch (e) {
      console.warn('friends load failed', e);
    }
    setLoading(false);
  }, [authed]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const onAdd = async () => {
    const val = input.trim();
    if (!val) return;
    setError('');
    try {
      await addFriend(val);
      setInput('');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const onRemove = async (username) => {
    await removeFriend(username);
    load();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Friends</Text>
            <Pressable style={styles.closeBtn} onPress={close}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {!authed ? (
            <>
              <Text style={styles.muted}>
                Log in or create an account to add friends and see them on the leaderboard.
              </Text>
              <Button
                title="Log in / Sign up"
                variant="primary"
                onPress={async () => {
                  close();
                  await logout();
                }}
                style={{ width: '100%', marginTop: 4 }}
              />
            </>
          ) : (
            <>
              <View style={styles.addRow}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Add by username"
                  maxLength={24}
                  autoCapitalize="none"
                  style={styles.input}
                  placeholderTextColor={colors.inkDim}
                />
                <Button title="Add" variant="primary" onPress={onAdd} />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}

              {loading ? (
                <ActivityIndicator color={colors.forest} style={{ marginVertical: 20 }} />
              ) : friends.length === 0 ? (
                <Text style={styles.muted}>No friends yet — add one above.</Text>
              ) : (
                <FlatList
                  data={friends}
                  keyExtractor={(f) => f.username}
                  renderItem={({ item }) => (
                    <View style={styles.friendRow}>
                      <Text style={styles.friendName}>{item.username}</Text>
                      <Text style={styles.friendPts}>{item.points} pts</Text>
                      <Pressable onPress={() => onRemove(item.username)}>
                        <Text style={styles.remove}>Remove</Text>
                      </Pressable>
                    </View>
                  )}
                />
              )}

              <Pressable
                style={styles.logoutBtn}
                onPress={async () => {
                  close();
                  await logout();
                }}
              >
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
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
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
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
  error: { color: colors.terracotta, fontSize: 12.5, marginBottom: 8 },
  muted: { fontSize: 13, color: colors.inkDim, paddingVertical: 14 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  friendName: { flex: 1, fontWeight: '700', fontSize: 14, color: colors.ink },
  friendPts: { fontWeight: '800', fontSize: 13, color: colors.terracotta },
  remove: { color: colors.inkDim, fontSize: 11.5, fontWeight: '700', textDecorationLine: 'underline' },
  logoutBtn: { marginTop: 18, alignItems: 'center' },
  logoutText: { color: colors.forest, fontWeight: '700', fontSize: 12.5 },
});
