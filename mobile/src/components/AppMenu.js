import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';
import { useAppMenu } from '../lib/AppMenuContext';
import Emoji from './Emoji';
import MyPostsModal from './MyPostsModal';
import MedalsModal from './MedalsModal';

// Mounted once at the app root so the menu and everything it opens are
// available from every tab.
export default function AppMenu() {
  const {
    menuVisible, closeMenu,
    postsVisible, openPosts, closePosts,
    medalsVisible, openMedals, closeMedals,
  } = useAppMenu();

  return (
    <>
      <Modal visible={menuVisible} animationType="fade" transparent onRequestClose={closeMenu}>
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View style={styles.sheet}>
            <Pressable style={styles.item} onPress={openPosts}>
              <Emoji symbol="📸" size={17} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemText}>Your posts</Text>
                <Text style={styles.itemSub}>Newest first — edit captions or delete</Text>
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.item} onPress={openMedals}>
              <Emoji symbol="🏅" size={17} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemText}>Medals</Text>
                <Text style={styles.itemSub}>Every medal you have earned</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <MyPostsModal visible={postsVisible} onClose={closePosts} />
      <MedalsModal visible={medalsVisible} onClose={closeMedals} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 96, paddingRight: 14,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 6,
    width: 268,
    shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  itemText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  itemSub: { fontSize: 12, color: colors.inkDim, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
});
