export const IMPACT = {
  plastic: { co2: 1.5, label: 'Plastic', icon: '♳', tag: 'sun', recyclable: true, recycleLabel: 'Recyclable' },
  glass: { co2: 0.3, label: 'Glass', icon: '🍾', tag: 'water', recyclable: true, recycleLabel: 'Recyclable' },
  metal: { co2: 4.0, label: 'Metal', icon: '🥫', tag: 'terracotta', recyclable: true, recycleLabel: 'Recyclable' },
  paper: { co2: 0.9, label: 'Paper', icon: '📄', tag: 'sage', recyclable: true, recycleLabel: 'Recyclable' },
  compost: { co2: 0.4, label: 'Compost', icon: '🍂', tag: 'compost', recyclable: true, recycleLabel: 'Compostable' },
  other: { co2: 0.5, label: 'Other', icon: '♻️', tag: 'neutral', recyclable: false, recycleLabel: 'Check locally' },

  // Not blue-bin items, but they have real routes in Singapore and score
  // highly - a battery is the most harmful thing most people throw away.
  // co2 values here are rough and only drive the "CO2 saved" display; the
  // points themselves come from the server.
  battery: { co2: 5.0, label: 'Battery', icon: '🔋', tag: 'sun', recyclable: true, recycleLabel: 'ALBA e-waste bin' },
  ewaste: { co2: 6.0, label: 'E-waste', icon: '🔌', tag: 'terracotta', recyclable: true, recycleLabel: 'ALBA e-waste bin' },
  textile: { co2: 2.0, label: 'Textile', icon: '👕', tag: 'water', recyclable: true, recycleLabel: 'Donate or Cloop bin' },
};

const SIZE_G = { small: 15, medium: 80, large: 300 };

// The backend scores each item by how harmful it is if binned (weighted x3)
// plus how much energy recycling it saves - a battery is 37, an aluminium can
// is 16. Prefer that when the API sends it; the CO2 estimate below is only a
// fallback for responses that don't carry `points`.
export function computeImpact(category, sizeBucket, serverPoints) {
  const imp = IMPACT[category] || IMPACT.other;
  const weightG = SIZE_G[sizeBucket] || SIZE_G.medium;
  const co2G = Math.round(weightG * imp.co2);

  const points = Number.isFinite(serverPoints)
    ? Math.max(0, Math.round(serverPoints))
    : Math.max(5, Math.round(co2G / 3));

  return { weightG, co2G, points, imp, category: IMPACT[category] ? category : 'other' };
}
