export function defaultProfile() {
  return {
    username: null,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastScanDate: null,
    totalScans: 0,
    byCategory: {},
  };
}

export function updateStreak(profile) {
  const today = new Date().toISOString().slice(0, 10);
  if (profile.lastScanDate === today) return profile;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const currentStreak = profile.lastScanDate === yesterday ? profile.currentStreak + 1 : 1;
  return {
    ...profile,
    currentStreak,
    lastScanDate: today,
    longestStreak: Math.max(profile.longestStreak, currentStreak),
  };
}

export function applyStreakBonus(profile, points) {
  const bonus = 1 + Math.min(profile.currentStreak, 10) * 0.1;
  return Math.round(points * bonus);
}

export function computeBadges(profile) {
  const b = [];
  if (profile.totalScans >= 1) b.push({ icon: '🏷️', label: 'First sort', sub: "You've logged your very first item." });
  if (profile.totalScans >= 10) b.push({ icon: '📦', label: '10 scans', sub: 'Ten items diverted from landfill.' });
  if (profile.totalScans >= 50) b.push({ icon: '🏭', label: '50 scans', sub: 'Fifty items and counting — serious impact.' });
  if (profile.longestStreak >= 3) b.push({ icon: '🔥', label: '3-day streak', sub: 'Three days in a row. Keep the chain going.' });
  if (profile.longestStreak >= 7) b.push({ icon: '🔥', label: 'Week streak', sub: 'A full week of consistent sorting.' });
  if (profile.longestStreak >= 30) b.push({ icon: '🔥', label: '30-day streak', sub: 'Top-tier consistency. A month strong.' });
  if (profile.totalPoints >= 100) b.push({ icon: '⭐', label: '100 pts', sub: 'Triple digits on the scoreboard.' });
  if (profile.totalPoints >= 500) b.push({ icon: '🌟', label: '500 pts', sub: 'Halfway to a thousand points.' });
  if (profile.totalPoints >= 1000) b.push({ icon: '💫', label: '1000 pts', sub: 'Four figures of environmental impact.' });
  return b;
}

export function nextMilestone(points) {
  const steps = [100, 500, 1000, 2000, 5000, 10000];
  const found = steps.find((m) => m > points);
  return found || Math.ceil((points + 500) / 500) * 500;
}
