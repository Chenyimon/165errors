import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, Dimensions } from 'react-native';

import { colors } from '../theme';

const { width, height } = Dimensions.get('window');
const PIECE_COLORS = [colors.sun, colors.terracotta, colors.forest, colors.sageDeep];
const COUNT = 24;

// Bump `trigger` (e.g. a counter) each time you want a fresh burst — this
// component has no library dependency, just the built-in Animated API.
export default function Confetti({ trigger }) {
  const pieces = useRef(
    Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      color: PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)],
      anim: new Animated.Value(0),
      dx: Math.random() * 160 - 80,
      rotate: Math.random() * 720 - 360,
      delay: Math.random() * 150,
    }))
  ).current;

  useEffect(() => {
    if (!trigger) return;
    pieces.forEach((p) => p.anim.setValue(0));
    const anims = pieces.map((p) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 1300,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.stagger(0, anims).start();
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, height] });
        const translateX = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotate}deg`] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                left: p.x,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, width: 8, height: 14, borderRadius: 2 },
});
