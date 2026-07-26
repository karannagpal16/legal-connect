import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, radii, spacing } from "../../theme/tokens";

type XPProgressProps = {
  current: number;
  max: number;
  rewardLabel: string;
};

/** Internverse XP bar — new file */
export function XPProgress({ current, max, rewardLabel }: XPProgressProps) {
  const pct = Math.min(100, Math.round((current / max) * 100));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AppText variant="caption" muted>
          XP Progress
        </AppText>
        <AppText variant="caption" gold>
          {current} / {max} XP
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.reward}>
        <AppText variant="caption" style={{ color: colors.goldBright }}>
          🎁 {rewardLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  track: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.intern,
  },
  reward: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineGold,
    borderStyle: "dashed",
    backgroundColor: colors.goldGlow,
  },
});
