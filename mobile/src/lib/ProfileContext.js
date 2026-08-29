import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  getMyProfile,
  putMyProfile,
  setAuthToken,
} from './api';
import { defaultProfile } from './profileStore';

const SESSION_KEY = 'session';
const GUEST_OPT_IN_KEY = 'guestOptIn';
const GUEST_PROFILE_KEY = 'guestProfile';
const GUEST_TAG_KEY = 'guestTag';
const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(defaultProfile());
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [guest, setGuest] = useState(false);
  const [guestTag, setGuestTag] = useState(null);

  const loadGuestProfile = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
      setProfile(raw ? { ...JSON.parse(raw), username: null } : { ...defaultProfile(), username: null });
    } catch (e) {
      setProfile({ ...defaultProfile(), username: null });
    }
  }, []);

  useEffect(() => {
    (async () => {
      let tag = await AsyncStorage.getItem(GUEST_TAG_KEY);
      if (!tag) {
        tag = String(Math.floor(1000 + Math.random() * 9000));
        await AsyncStorage.setItem(GUEST_TAG_KEY, tag);
      }
      setGuestTag(tag);

      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        const stored = raw ? JSON.parse(raw) : null;
        if (stored && stored.token) {
          setAuthToken(stored.token);
          try {
            const remote = await getMyProfile();
            setProfile({ ...remote, username: stored.username });
            setAuthed(true);
            setLoading(false);
            return;
          } catch (e) {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (e) {
        console.warn('session restore failed', e);
      }

      const guestOptIn = await AsyncStorage.getItem(GUEST_OPT_IN_KEY);
      if (guestOptIn === 'true') {
        await loadGuestProfile();
        setGuest(true);
      }
      setLoading(false);
    })();
  }, [loadGuestProfile]);

  const persistSession = useCallback(async (session) => {
    if (session.token) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const login = useCallback(
    async (username, password) => {
      const data = await apiLogin(username, password);
      setAuthToken(data.token);
      await persistSession({ token: data.token, username: data.username });
      await AsyncStorage.setItem(GUEST_OPT_IN_KEY, 'false');
      setProfile({ ...data.profile, username: data.username });
      setGuest(false);
      setAuthed(true);
    },
    [persistSession]
  );

  const signup = useCallback(
    async (username, password) => {
      const data = await apiSignup(username, password);
      setAuthToken(data.token);
      await persistSession({ token: data.token, username: data.username });
      await AsyncStorage.setItem(GUEST_OPT_IN_KEY, 'false');
      setProfile({ ...data.profile, username: data.username });
      setGuest(false);
      setAuthed(true);
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setAuthToken(null);
    await persistSession({ token: null, username: null });
    await AsyncStorage.setItem(GUEST_OPT_IN_KEY, 'false');
    setProfile(defaultProfile());
    setAuthed(false);
    setGuest(false);
  }, [persistSession]);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_OPT_IN_KEY, 'true');
    await loadGuestProfile();
    setGuest(true);
  }, [loadGuestProfile]);

  const saveProfile = useCallback(
    async (next) => {
      setProfile(next);
      if (authed) {
        try {
          await putMyProfile({
            totalPoints: next.totalPoints,
            currentStreak: next.currentStreak,
            longestStreak: next.longestStreak,
            lastScanDate: next.lastScanDate,
            totalScans: next.totalScans,
            byCategory: next.byCategory,
          });
        } catch (e) {
          console.warn('profile save failed', e);
        }
      } else {
        try {
          await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('guest profile save failed', e);
        }
      }
    },
    [authed]
  );

  return (
    <ProfileContext.Provider
      value={{ profile, saveProfile, login, signup, logout, continueAsGuest, loading, authed, guest, guestTag }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
