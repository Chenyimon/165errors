export const PREP_TIPS = {
  plastic: [
    'Empty and rinse the container',
    'Remove the cap and recycle it separately if your area requires that',
    'Flatten it to save space',
  ],
  glass: ['Empty out any liquid', 'Give it a quick rinse', 'Remove metal or plastic lids'],
  metal: ['Empty the can completely', 'Rinse off any food residue', 'Labels are fine to leave on'],
  paper: [
    "Make sure it's dry",
    'Remove plastic wrapping, tape, or bubble wrap',
    'Flatten boxes to save space',
  ],
  compost: ['Remove any packaging or stickers', 'Keep liquids and oils out'],
  other: [
    'Check your local recycling guidelines for this material',
    'When in doubt, keep it out of the recycling bin',
  ],
};

export const CHALLENGES = [
  { id: 'plastic20', title: 'Plastic Purge', desc: 'Recycle 20 plastic items', metric: 'category:plastic', target: 20 },
  { id: 'items50', title: 'Half Century', desc: 'Recycle 50 items in total', metric: 'totalScans', target: 50 },
  { id: 'streak7', title: 'Week Warrior', desc: 'Reach a 7-day streak', metric: 'longestStreak', target: 7 },
  { id: 'points500', title: 'Point Hoarder', desc: 'Earn 500 points', metric: 'totalPoints', target: 500 },
];

export const SPONSOR_CHALLENGES = [
  {
    id: 'coke20',
    sponsor: '🥤 Coca-Cola Recycling Challenge',
    color: '#B3221E',
    desc: 'Recycle 20 bottles this month.',
    metric: 'category:plastic',
    target: 20,
    reward: 'Earn 500 SORT points → Get a $5 voucher',
  },
  {
    id: 'nus30',
    sponsor: '🎓 NUS × SORT/ED Sustainability Challenge',
    color: '#2C4736',
    desc: 'Recycle 30 items this semester as part of the campus drive.',
    metric: 'totalScans',
    target: 30,
    reward: 'Featured on the NUS sustainability leaderboard',
  },
];

export const EVENTS = [
  { id: 'beach1', title: 'East Coast Beach Cleanup', date: 'Sat, 6 Sep · 9:00 AM', location: 'East Coast Park, Area C', spots: 40 },
  { id: 'park1', title: 'Bishan Park Litter Sweep', date: 'Sun, 14 Sep · 8:30 AM', location: 'Bishan-Ang Mo Kio Park', spots: 25 },
  { id: 'campus1', title: 'Campus Green Day', date: 'Fri, 19 Sep · 3:00 PM', location: 'NUS University Town', spots: 60 },
];

export const BINS = [
  { id: 'bin1', name: 'NUS UTown Recycling Point', lat: 1.3055, lng: 103.7734 },
  { id: 'bin2', name: 'East Coast Park Recycling Bin', lat: 1.3010, lng: 103.9120 },
  { id: 'bin3', name: 'Bishan Park Recycling Station', lat: 1.3506, lng: 103.8496 },
  { id: 'bin4', name: 'Orchard Road Recycling Bin', lat: 1.3048, lng: 103.8318 },
  { id: 'bin5', name: 'Jurong Lake Gardens Bin', lat: 1.3399, lng: 103.7269 },
];

export function metricValue(profile, metric) {
  if (metric === 'totalScans') return profile.totalScans;
  if (metric === 'totalPoints') return profile.totalPoints;
  if (metric === 'longestStreak') return profile.longestStreak;
  if (metric.startsWith('category:')) return profile.byCategory[metric.split(':')[1]] || 0;
  return 0;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
