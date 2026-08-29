// Twemoji gives every platform the same emoji artwork instead of Apple's on
// iOS and Google's on Android.
//
// The old jsdelivr /npm/twemoji path 404s - that package no longer ships its
// assets - which left every icon in the app blank. cdnjs still serves them.
const TWEMOJI_PNG_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/';

// U+FE0F is the "render this as emoji" variation selector. Twemoji filenames
// leave it out, so ♻️ is 267b.png, not 267b-fe0f.png.
const VARIATION_SELECTOR = 0xfe0f;

function toCodePoints(emoji) {
  const points = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp !== VARIATION_SELECTOR) {
      points.push(cp.toString(16));
    }
  }
  return points.join('-');
}

export function twemojiUrl(emoji) {
  return `${TWEMOJI_PNG_BASE}${toCodePoints(emoji)}.png`;
}
