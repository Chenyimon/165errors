import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { colors } from '../theme';
import { getPosts, getFriends } from '../lib/api';
import { useProfile } from '../lib/ProfileContext';
import AppHeader from '../components/AppHeader';
import PostCard from '../components/PostCard';
import Button from '../components/Button';
import Emoji from '../components/Emoji';
import CommentsModal from '../components/CommentsModal';

export default function FeedScreen() {
  const navigation = useNavigation();
  const { authed, guestTag } = useProfile();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePostId, setActivePostId] = useState(null);

  const load = useCallback(async () => {
    try {
      const posts = await getPosts(guestTag);

      let friendSet = new Set();
      if (authed) {
        try {
          const friends = await getFriends();
          friendSet = new Set(friends.map((f) => f.username));
        } catch (e) {
          // not fatal — just falls back to a flat feed
        }
      }

      if (friendSet.size > 0) {
        const friendPosts = posts.filter((p) => friendSet.has(p.username));
        const otherPosts = posts.filter((p) => !friendSet.has(p.username));
        const next = [];
        if (friendPosts.length) {
          next.push({ type: 'header', key: 'h-friends', label: 'From your friends' });
          friendPosts.forEach((p) => next.push({ type: 'post', key: p.id, post: p }));
        }
        if (otherPosts.length) {
          next.push({
            type: 'header',
            key: 'h-other',
            label: friendPosts.length ? 'More from the community' : 'Community',
          });
          otherPosts.forEach((p) => next.push({ type: 'post', key: p.id, post: p }));
        }
        setItems(next);
      } else {
        setItems(posts.map((p) => ({ type: 'post', key: p.id, post: p })));
      }
    } catch (e) {
      console.warn('feed load failed', e);
    }
  }, [authed, guestTag]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <AppHeader />
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <Text style={styles.sectionLabel}>{item.label}</Text>
          ) : (
            <PostCard post={item.post} onCommentPress={setActivePostId} />
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.forest} />}
        ListHeaderComponent={<Text style={styles.title}>Community feed</Text>}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Emoji symbol="📸" size={34} style={styles.emptyBig} />
              <Text style={styles.emptyText}>No posts yet.{'\n'}Be the first to share what you're recycling.</Text>
              <Button
                title="Take a photo"
                variant="primary"
                style={{ marginTop: 14 }}
                onPress={() => navigation.navigate('Scan')}
              />
            </View>
          ) : null
        }
      />
      <CommentsModal
        postId={activePostId}
        visible={!!activePostId}
        onClose={() => setActivePostId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 18, paddingBottom: 40 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkDim,
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.inkDim,
    marginTop: 4,
    marginBottom: 10,
  },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyBig: { marginBottom: 10 },
  emptyText: { fontSize: 13, lineHeight: 20, color: colors.inkDim, textAlign: 'center' },
});
