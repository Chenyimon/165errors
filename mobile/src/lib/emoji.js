const TWEMOJI_PNG_BASE = 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/72x72/';

function toCodePoints(emoji) {
  const points = [];
  for (const char of emoji) {
    points.push(char.codePointAt(0).toString(16));
  }
  return points.join('-');
}

export function twemojiUrl(emoji) {
  return `${TWEMOJI_PNG_BASE}${toCodePoints(emoji)}.png`;
}
