import React, { createContext, useContext, useState } from 'react';

const FriendsModalContext = createContext(null);

export function FriendsModalProvider({ children }) {
  const [visible, setVisible] = useState(false);
  return (
    <FriendsModalContext.Provider value={{ visible, open: () => setVisible(true), close: () => setVisible(false) }}>
      {children}
    </FriendsModalContext.Provider>
  );
}

export function useFriendsModal() {
  const ctx = useContext(FriendsModalContext);
  if (!ctx) throw new Error('useFriendsModal must be used within FriendsModalProvider');
  return ctx;
}
