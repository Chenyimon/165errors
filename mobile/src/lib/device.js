import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedId = null;

function randomId() {
  return 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export async function getDeviceId() {
  if (cachedId) return cachedId;
  let id = await AsyncStorage.getItem('deviceId');
  if (!id) {
    id = randomId();
    await AsyncStorage.setItem('deviceId', id);
  }
  cachedId = id;
  return id;
}
