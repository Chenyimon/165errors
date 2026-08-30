import React from 'react';
import { StyleSheet, View } from 'react-native';

import Emoji from './Emoji';

// Ruby and platinum have no good emoji - a heart is not a gemstone and a grey
// circle is not a medal - so they are drawn, in the same plain-View style as
// EdMark rather than pulling in an SVG library.

// A cushion-cut stone: a rotated square, with a lighter facet across the top
// half so it reads as faceted rather than as a plain diamond shape.
function Gem({ size, body, facet }) {
  const s = size * 0.7;
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: s,
          height: s,
          backgroundColor: body,
          transform: [{ rotate: '45deg' }],
          borderRadius: s * 0.16,
          overflow: 'hidden',
        }}
      >
        <View style={{ height: s / 2, backgroundColor: facet }} />
      </View>
    </View>
  );
}

// A struck coin: a ring with a raised inner disc and a highlight arc.
function Coin({ size, outer, inner, sheen }) {
  const s = size * 0.86;
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={{
          width: s,
          height: s,
          borderRadius: s / 2,
          backgroundColor: outer,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: s * 0.62,
            height: s * 0.62,
            borderRadius: s * 0.31,
            backgroundColor: inner,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: s * 0.62,
              height: s * 0.22,
              backgroundColor: sheen,
              transform: [{ rotate: '-20deg' }, { translateY: -s * 0.04 }],
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default function MedalIcon({ tier, size = 18 }) {
  if (tier === 'ruby') {
    return <Gem size={size} body="#9E1C2C" facet="#D24457" />;
  }
  if (tier === 'platinum') {
    return <Coin size={size} outer="#8A97A3" inner="#C9D2D9" sheen="#EDF2F5" />;
  }
  // Gold, silver, bronze and diamond all have emoji that actually look right.
  const EMOJI = { gold: '🥇', silver: '🥈', bronze: '🥉', diamond: '💎' };
  return <Emoji symbol={EMOJI[tier] || '🏅'} size={size} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
