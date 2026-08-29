// Same HTTPS API used by the web app (see ../../server). Update these two values
// to match whatever you set API_ENDPOINT / APP_SECRET to in index.html.
export const API_BASE = 'https://canine-cupbearer-cringing.ngrok-free.dev';
const APP_SECRET = 'REPLACE_WITH_YOUR_OWN_SECRET';

function authHeaders(extra) {
  return { 'x-app-secret': APP_SECRET, 'ngrok-skip-browser-warning': 'true', ...(extra || {}) };
}

export async function classifyImage(base64, mediaType) {
  const res = await fetch(`${API_BASE}/api/classify`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ image_base64: base64, media_type: mediaType }),
  });
  if (!res.ok) throw new Error('classify failed: ' + res.status);
  return res.json();
}

export async function getProfile(deviceId) {
  const res = await fetch(`${API_BASE}/api/profile/${deviceId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('profile fetch failed: ' + res.status);
  return res.json();
}

export async function putProfile(deviceId, profile) {
  const res = await fetch(`${API_BASE}/api/profile/${deviceId}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('profile save failed: ' + res.status);
  return res.json();
}

export async function getLeaderboard() {
  const res = await fetch(`${API_BASE}/api/leaderboard`, { headers: authHeaders() });
  if (!res.ok) throw new Error('leaderboard fetch failed: ' + res.status);
  return res.json();
}

export async function getPosts() {
  const res = await fetch(`${API_BASE}/api/posts`, { headers: authHeaders() });
  if (!res.ok) throw new Error('feed fetch failed: ' + res.status);
  return res.json();
}

export async function createPost({ username, category, itemName, weightG, co2G, points, funFact, imageUri, mediaType }) {
  const form = new FormData();
  form.append('username', username);
  form.append('category', category);
  form.append('item_name', itemName);
  form.append('weight_g', String(weightG));
  form.append('co2_g', String(co2G));
  form.append('points', String(points));
  form.append('fun_fact', funFact || '');
  form.append('image', {
    uri: imageUri,
    name: mediaType === 'image/png' ? 'photo.png' : 'photo.jpg',
    type: mediaType,
  });

  const res = await fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error('post failed: ' + res.status);
  return res.json();
}

export function imageUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}
