import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function RoundPulse({
  size = 220,
  color = 'rgba(207,219,39,0.28)',
  duration = 1200,
  playing = true,
  style,
}) {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;

  const loop = (val, delay = 0) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

  useEffect(() => {
    let l1, l2;
    if (playing) {
      l1 = loop(a1, 0);
      l2 = loop(a2, duration / 2);
      l1.start();
      l2.start();
    }
    return () => {
      l1?.stop();
      l2?.stop();
    };
  }, [playing, duration, a1, a2]);

  const ring = (val) => ({
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [
      { scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] }) },
    ],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} pointerEvents="none">
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, ring(a1)]}
      />
      <Animated.View
        style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, ring(a2)]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
});