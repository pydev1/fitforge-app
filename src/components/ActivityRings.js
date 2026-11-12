import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Concentric progress rings that sweep in from 12 o'clock when they mount.
// rings: [{ progress: 0..1, color, track }] — outermost first. Values outside
// 0..1 are clamped; an empty ring shows just its track.
export default function ActivityRings({ rings, size = 200, stroke = 16, gap = 6, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // SVG props can't use the native driver
    }).start();
  }, [rings.map(r => r.progress.toFixed(3)).join('|')]);

  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {rings.map((ring, i) => {
          const r = center - stroke / 2 - i * (stroke + gap);
          if (r <= stroke / 2) return null;
          const circ = 2 * Math.PI * r;
          const p = Math.max(0, Math.min(1, ring.progress || 0));
          const target = circ * (1 - p);
          const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [circ, target] });
          return (
            <React.Fragment key={i}>
              <Circle cx={center} cy={center} r={r} stroke={ring.track} strokeWidth={stroke} fill="none" />
              <AnimatedCircle
                cx={center}
                cy={center}
                r={r}
                stroke={ring.color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circ} ${circ}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${center} ${center})`}
                opacity={p === 0 ? 0 : 1}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      {children}
    </View>
  );
}
