export const IMPACT = {
  plastic: { co2: 1.5, label: 'Plastic', icon: '♳', tag: 'sun', recyclable: true, recycleLabel: 'Recyclable' },
  glass: { co2: 0.3, label: 'Glass', icon: '🍾', tag: 'water', recyclable: true, recycleLabel: 'Recyclable' },
  metal: { co2: 4.0, label: 'Metal', icon: '🥫', tag: 'terracotta', recyclable: true, recycleLabel: 'Recyclable' },
  paper: { co2: 0.9, label: 'Paper', icon: '📄', tag: 'sage', recyclable: true, recycleLabel: 'Recyclable' },
  compost: { co2: 0.4, label: 'Compost', icon: '🍂', tag: 'compost', recyclable: true, recycleLabel: 'Compostable' },
  other: { co2: 0.5, label: 'Other', icon: '♻️', tag: 'neutral', recyclable: false, recycleLabel: 'Non-recyclables' },

  // Not blue-bin items, but they have real routes in Singapore and score
  // highly - a battery is the most harmful thing most people throw away.
  // co2 values here are rough and only drive the "CO2 saved" display; the
  // points themselves come from the server.
  battery: { co2: 5.0, label: 'Battery', icon: '🔋', tag: 'sun', recyclable: true, recycleLabel: 'ALBA e-waste bin' },
  ewaste: { co2: 6.0, label: 'E-waste', icon: '🔌', tag: 'terracotta', recyclable: true, recycleLabel: 'ALBA e-waste bin' },
  textile: { co2: 2.0, label: 'Textile', icon: '👕', tag: 'water', recyclable: true, recycleLabel: 'Donate or Cloop bin' },
};

const SIZE_G = { small: 15, medium: 80, large: 300 };

// No fixed point numbers here on purpose — the real score also depends on
// size, quantity and contamination (see scorer.py's calculate_points), so a
// hardcoded number here would eventually contradict the actual score shown
// above it. This just explains the reasoning behind the category weighting.
export const POINTS_EXPLAINER = {
  battery: "🔋 Batteries can catch fire in bins and trucks, and leak lithium, cobalt and cadmium — the most harmful thing you can throw away. That's why this category scores the highest.",
  ewaste: "🔌 E-waste leaks heavy metals and toxic fumes if it's burnt, but its gold and copper are worth recovering — high harm and high recovery value.",
  plastic: '♳ Plastic is fossil-fuel based and can last centuries in landfill, but recycling it saves about 76% of the energy of making it new.',
  textile: '👕 Synthetic fabric and dyes break down slowly and take up landfill space.',
  metal: '🥫 Metal is harmless sitting in landfill, but recycling aluminium saves up to 95% of the energy of making it from scratch — the best recovery rate of any material.',
  glass: '🍾 Glass is inert but takes up permanent space at Semakau, and recycling it only saves about 30% of the energy of making new glass.',
  paper: '📄 Paper biodegrades, and recycling it saves about 60% of the energy of making it new.',
  compost: "🍂 Singapore doesn't have widespread food waste recycling yet, so this won't earn points — but keeping it out of general waste still helps.",
  other: '♻️ No clear recycling route for this in Singapore, so it scores on the low end.',
};

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
