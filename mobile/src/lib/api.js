// Same HTTPS API used by the web app (see ../../server). Update these two values
// to match whatever you set API_ENDPOINT / APP_SECRET to in index.html.
export const API_BASE = 'https://canine-cupbearer-cringing.ngrok-free.dev';
const APP_SECRET = 'REPLACE_WITH_YOUR_OWN_SECRET';

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

function baseHeaders(extra) {
  return { 'x-app-secret': APP_SECRET, 'ngrok-skip-browser-warning': 'true', ...(extra || {}) };
}
function authHeaders(extra) {
  return { ...baseHeaders(extra), Authorization: `Bearer ${authToken || ''}` };
}
function requestHeaders(extra) {
  return authToken ? authHeaders(extra) : baseHeaders(extra);
}

export async function classifyImage(base64, mediaType) {
  const res = await fetch(`${API_BASE}/api/classify`, {
    method: 'POST',
    headers: baseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ image_base64: base64, media_type: mediaType }),
  });
  if (!res.ok) throw new Error('classify failed: ' + res.status);
  return res.json();
}

export async function signup(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: baseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Signup failed');
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: baseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}

export async function logout() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: authHeaders() });
  } catch (e) {}
}

export async function getMyProfile() {
  const res = await fetch(`${API_BASE}/api/profile`, { headers: authHeaders() });
  if (!res.ok) throw new Error('profile fetch failed: ' + res.status);
  return res.json();
}

export async function putMyProfile(profile) {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('profile save failed: ' + res.status);
  return res.json();
}

export async function getLeaderboard(scope) {
  const url = scope === 'friends' ? `${API_BASE}/api/leaderboard/friends` : `${API_BASE}/api/leaderboard`;
  const headers = scope === 'friends' ? authHeaders() : baseHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('leaderboard fetch failed: ' + res.status);
  return res.json();
}

export async function getFriends() {
  const res = await fetch(`${API_BASE}/api/friends`, { headers: authHeaders() });
  if (!res.ok) throw new Error('friends fetch failed: ' + res.status);
  return res.json();
}

export async function addFriend(username) {
  const res = await fetch(`${API_BASE}/api/friends`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Could not add friend');
  return data;
}

export async function removeFriend(username) {
  await fetch(`${API_BASE}/api/friends/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function getPosts(guestTag) {
  const qs = !authToken && guestTag ? `?guest_tag=${encodeURIComponent(guestTag)}` : '';
  const res = await fetch(`${API_BASE}/api/posts${qs}`, { headers: requestHeaders() });
  if (!res.ok) throw new Error('feed fetch failed: ' + res.status);
  return res.json();
}

export async function createPost({ category, itemName, weightG, co2G, points, funFact, imageUri, mediaType, guestTag }) {
  const form = new FormData();
  form.append('category', category);
  form.append('item_name', itemName);
  form.append('weight_g', String(weightG));
  form.append('co2_g', String(co2G));
  form.append('points', String(points));
  form.append('fun_fact', funFact || '');
  if (!authToken && guestTag) form.append('guest_tag', guestTag);
  form.append('image', {
    uri: imageUri,
    name: mediaType === 'image/png' ? 'photo.png' : 'photo.jpg',
    type: mediaType,
  });

  const res = await fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: requestHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error('post failed: ' + res.status);
  return res.json();
}

export async function toggleLike(postId, guestTag) {
  const res = await fetch(`${API_BASE}/api/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ guest_tag: authToken ? null : guestTag }),
  });
  if (!res.ok) throw new Error('like failed: ' + res.status);
  return res.json();
}

export async function getComments(postId) {
  const res = await fetch(`${API_BASE}/api/posts/${encodeURIComponent(postId)}/comments`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error('comments fetch failed: ' + res.status);
  return res.json();
}

export async function addComment(postId, text, guestTag) {
  const res = await fetch(`${API_BASE}/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: requestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text, guest_tag: authToken ? null : guestTag }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Could not post comment');
  return data;
}

export function imageUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}
