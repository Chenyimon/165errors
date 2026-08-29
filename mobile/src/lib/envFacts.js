export const ENV_FACTS = [
  'Recycling one aluminum can saves enough energy to run a TV for three hours.',
  'It takes 500+ years for a plastic bottle to decompose in a landfill.',
  'Glass can be recycled endlessly without ever losing quality or purity.',
  'Recycling one ton of paper saves about 17 trees.',
  'The ocean gains roughly 8 million tons of plastic waste every year.',
  'E-waste is the fastest-growing waste stream on the planet.',
  'Composting food scraps can cut your household trash by up to 30%.',
  'A single mature tree can absorb up to 48 pounds of CO2 a year.',
  'Recycled steel takes about 75% less energy to produce than new steel.',
  'Only around 9% of all plastic ever made has actually been recycled.',
  'Rechargeable batteries can be reused hundreds of times before they need recycling.',
  'Textile waste takes up more landfill space than almost any other material.',
];

export function randomFact() {
  return ENV_FACTS[Math.floor(Math.random() * ENV_FACTS.length)];
}

// Returns a copy of `posts` with a fact item spliced in every `every` posts.
export function interleaveFacts(posts, keyPrefix, every = 4) {
  const out = [];
  posts.forEach((post, i) => {
    out.push({ type: 'post', key: post.id, post });
    if ((i + 1) % every === 0) {
      out.push({ type: 'fact', key: `${keyPrefix}-fact-${i}`, fact: randomFact() });
    }
  });
  return out;
}
