import React, { createContext, useContext, useMemo, useState } from 'react';

const AppMenuContext = createContext(null);

// The "..." menu lives in AppHeader, which every tab renders, so its state has
// to sit above the screens - same pattern as FriendsModalContext.
export function AppMenuProvider({ children }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [postsVisible, setPostsVisible] = useState(false);
  const [medalsVisible, setMedalsVisible] = useState(false);

  const value = useMemo(() => ({
    menuVisible,
    openMenu: () => setMenuVisible(true),
    closeMenu: () => setMenuVisible(false),
    postsVisible,
    openPosts: () => { setMenuVisible(false); setPostsVisible(true); },
    closePosts: () => setPostsVisible(false),
    medalsVisible,
    openMedals: () => { setMenuVisible(false); setMedalsVisible(true); },
    closeMedals: () => setMedalsVisible(false),
  }), [menuVisible, postsVisible, medalsVisible]);

  return <AppMenuContext.Provider value={value}>{children}</AppMenuContext.Provider>;
}

export function useAppMenu() {
  const ctx = useContext(AppMenuContext);
  if (!ctx) throw new Error('useAppMenu must be used within AppMenuProvider');
  return ctx;
}
