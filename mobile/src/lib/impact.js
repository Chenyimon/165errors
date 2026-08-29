export const IMPACT = {
  plastic: { co2: 1.5, label: 'Plastic', icon: '♳', tag: 'sun', recyclable: true, recycleLabel: 'Recyclable' },
  glass: { co2: 0.3, label: 'Glass', icon: '🍾', tag: 'water', recyclable: true, recycleLabel: 'Recyclable' },
  metal: { co2: 4.0, label: 'Metal', icon: '🥫', tag: 'terracotta', recyclable: true, recycleLabel: 'Recyclable' },
  paper: { co2: 0.9, label: 'Paper', icon: '📄', tag: 'sage', recyclable: true, recycleLabel: 'Recyclable' },
  compost: { co2: 0.4, label: 'Compost', icon: '🍂', tag: 'compost', recyclable: true, recycleLabel: 'Compostable' },
  other: { co2: 0.5, label: 'Other', icon: '♻️', tag: 'neutral', recyclable: false, recycleLabel: 'Check locally' },
};

const SIZE_G = { small: 15, medium: 80, large: 300 };

export function computeImpact(category, sizeBucket) {
  const imp = IMPACT[category] || IMPACT.other;
  const weightG = SIZE_G[sizeBucket] || SIZE_G.medium;
  const co2G = Math.round(weightG * imp.co2);
  const points = Math.max(5, Math.round(co2G / 3));
  return { weightG, co2G, points, imp, category: IMPACT[category] ? category : 'other' };
}
