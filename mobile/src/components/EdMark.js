import React from 'react';
import { View, StyleSheet } from 'react-native';

import { colors } from '../theme';

// SORT/ED's mascot, "Ed" — reduced to a small icon mark for the header.
// Built from plain Views (no react-native-svg dependency), same proportions
// as the app-icon/favicon glyph in mobile/assets/icon.png.
export default function EdMark({ size = 28 }) {
  const faceWidth = size * 0.64;
  const faceHeight = size * 0.34;
  const faceTop = size * 0.28;
  const faceLeft = (size - faceWidth) / 2;
  const eyeSize = size * 0.13;
  const eyeTop = faceTop + faceHeight * 0.32;
  const mouthHalf = size * 0.055;
  const mouthHeight = size * 0.09;

  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.26 }]}>
      <View
        style={[
          styles.face,
          { width: faceWidth, height: faceHeight, top: faceTop, left: faceLeft, borderRadius: faceHeight * 0.5 },
        ]}
      >
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, top: eyeTop, left: faceWidth * 0.15 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, top: eyeTop, right: faceWidth * 0.15 }]} />
      </View>
      <View
        style={[
          styles.mouth,
          {
            top: faceTop + faceHeight + size * 0.07,
            left: size / 2 - mouthHalf,
            borderLeftWidth: mouthHalf,
            borderRightWidth: mouthHalf,
            borderBottomWidth: mouthHeight,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.sun, overflow: 'hidden' },
  face: { position: 'absolute', backgroundColor: colors.sage },
  eye: { position: 'absolute', backgroundColor: colors.forestDeep },
  mouth: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.terracotta,
  },
});
