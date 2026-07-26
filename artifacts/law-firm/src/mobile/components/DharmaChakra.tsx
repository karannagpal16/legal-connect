import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Stop } from "react-native-svg";
import { colors } from "../theme/tokens";

type DharmaChakraProps = {
  size?: number;
};

/** Sharp 24-spoke Ashoka-style chakra — Expo-compatible via react-native-svg. New file. */
export function DharmaChakra({ size = 160 }: DharmaChakraProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 48000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const spokes = Array.from({ length: 24 }, (_, i) => (
    <Line
      key={`outer-${i}`}
      x1="0"
      y1="-78"
      x2="0"
      y2="-48"
      stroke="url(#chakraGold)"
      strokeWidth="2.2"
      strokeLinecap="butt"
      transform={`rotate(${i * 15})`}
    />
  ));

  const innerSpokes = Array.from({ length: 24 }, (_, i) => (
    <Line
      key={`inner-${i}`}
      x1="0"
      y1="-42"
      x2="0"
      y2="-26"
      stroke="url(#chakraGold)"
      strokeWidth="1.8"
      strokeLinecap="butt"
      transform={`rotate(${i * 15})`}
    />
  ));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <LinearGradient id="chakraGold" x1="0" y1="0" x2="200" y2="200">
              <Stop offset="0%" stopColor="#FFF0C8" />
              <Stop offset="50%" stopColor={colors.gold} />
              <Stop offset="100%" stopColor={colors.goldMuted} />
            </LinearGradient>
          </Defs>
          <G transform="translate(100,100)">
            <Circle r="92" fill="none" stroke="url(#chakraGold)" strokeWidth="2" opacity={0.85} />
            <Circle r="82" fill="none" stroke="url(#chakraGold)" strokeWidth="1" opacity={0.45} />
            {spokes}
            <Circle r="48" fill="none" stroke="url(#chakraGold)" strokeWidth="1.6" />
            {innerSpokes}
            <Circle r="10" fill={colors.gold} />
            <Circle r="5" fill={colors.bg} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
