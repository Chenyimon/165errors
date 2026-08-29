import React from 'react';
import { Image, StyleSheet } from 'react-native';

import { twemojiUrl } from '../lib/emoji';

export default function Emoji({ symbol, size = 16, style }) {
  return (
    <Image
      source={{ uri: twemojiUrl(symbol) }}
      style={[styles.base, { width: size, height: size }, style]}
      accessibilityLabel={symbol}
    />
  );
}

const styles = StyleSheet.create({
  base: { resizeMode: 'contain' },
});
