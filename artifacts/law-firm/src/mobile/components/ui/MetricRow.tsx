import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, radii, spacing } from "../../theme/tokens";

type Metric = { label: string; value: string };

type MetricRowProps = {
  metrics: Metric[];
  accent?: string;
};

/** Horizontal stat metrics — new file */
export function MetricRow({ metrics, accent = colors.goldBright }: MetricRowProps) {
  return (
    <View style={styles.row}>
      {metrics.map((m) => (
        <View key={m.label} style={styles.metric}>
          <AppText variant="label" muted style={styles.label}>
            {m.label}
          </AppText>
          <AppText variant="subtitle" style={{ color: accent }}>
            {m.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metric: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.lineGold,
  },
  label: {
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
});
