import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

import { colors } from '../theme';

export default function Button({ title, onPress, variant = 'outline', style, disabled }) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.primary : styles.outline,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, isPrimary && styles.labelPrimary]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  primary: { backgroundColor: colors.forest },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  label: { fontWeight: '700', fontSize: 14, color: colors.ink },
  labelPrimary: { color: '#fff' },
});
