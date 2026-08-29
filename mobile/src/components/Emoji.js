import React, { useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';

import { twemojiUrl } from '../lib/emoji';

// Renders Twemoji artwork so emoji look identical on iOS and Android. If the
// image cannot load - no signal, CDN down, an emoji Twemoji does not cover -
// fall back to the system emoji rather than showing nothing. Blank icons are a
// worse failure than slightly different-looking ones.
export default function Emoji({ symbol, size = 16, style }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Text
        style={[{ fontSize: size, lineHeight: size * 1.2 }, style]}
        accessibilityLabel={symbol}
      >
        {symbol}
      </Text>
    );
  }

  return (
    <Image
      source={{ uri: twemojiUrl(symbol) }}
      style={[styles.base, { width: size, height: size }, style]}
      onError={() => setFailed(true)}
      accessibilityLabel={symbol}
    />
  );
}

const styles = StyleSheet.create({
  base: { resizeMode: 'contain' },
});
