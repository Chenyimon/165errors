import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { subscribeToast } from '../lib/toast';
import { colors } from '../theme';

export default function ToastHost() {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    return subscribeToast((msg) => {
      setMessage(msg);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), 2200);
    });
  }, []);

  if (!message) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  toast: { backgroundColor: colors.forest, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30 },
  text: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
