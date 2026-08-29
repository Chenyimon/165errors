import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'joinedEvents';

export async function getJoinedEvents() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function setJoinedEvents(ids) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn('save joined events failed', e);
  }
}
