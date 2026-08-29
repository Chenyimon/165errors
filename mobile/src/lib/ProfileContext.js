import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getDeviceId } from './device';
import { getProfile, putProfile } from './api';
import { defaultProfile } from './profileStore';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [deviceId, setDeviceId] = useState(null);
  const [profile, setProfile] = useState(defaultProfile());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const id = await getDeviceId();
      setDeviceId(id);
      try {
        const remote = await getProfile(id);
        setProfile(remote);
      } catch (e) {
        console.warn('profile load failed', e);
      }
      setLoading(false);
    })();
  }, []);

  const saveProfile = useCallback(
    async (next) => {
      setProfile(next);
      if (deviceId) {
        try {
          await putProfile(deviceId, next);
        } catch (e) {
          console.warn('profile save failed', e);
        }
      }
    },
    [deviceId]
  );

  return (
    <ProfileContext.Provider value={{ deviceId, profile, saveProfile, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
