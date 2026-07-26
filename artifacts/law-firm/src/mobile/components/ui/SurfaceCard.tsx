import React, { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, shadows, spacing } from "../../theme/tokens";

type SurfaceCardProps = PropsWithChildren<{
  onPress?: () => void;
  accent?: string;
  urgent?: boolean;
  style?: ViewStyle;
  padded?: boolean;
}>;

/** Elevated card with optional gold accent border — new file */
export function SurfaceCard({
  children,
  onPress,
  accent,
  urgent,
  style,
  padded = true,
}: SurfaceCardProps) {
  const borderColor = urgent
    ? "rgba(248, 113, 113, 0.45)"
    : accent
      ? accent + "44"
      : colors.lineGold;

  const content = (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        { borderColor },
        urgent && styles.urgent,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
  urgent: {
    backgroundColor: colors.dangerBg,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
