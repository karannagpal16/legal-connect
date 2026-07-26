import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { SurfaceCard } from "./SurfaceCard";
import { spacing } from "../../theme/tokens";

type ActionTileProps = {
  icon: string;
  title: string;
  desc: string;
  accent?: string;
  urgent?: boolean;
  onPress?: () => void;
};

/** Dashboard action tile — new file */
export function ActionTile({ icon, title, desc, accent, urgent, onPress }: ActionTileProps) {
  return (
    <SurfaceCard accent={accent} urgent={urgent} onPress={onPress} style={styles.tile}>
      <AppText style={styles.icon}>{icon}</AppText>
      <AppText variant="subtitle" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="caption" muted>
        {desc}
      </AppText>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: "46%",
  },
  icon: {
    fontSize: 26,
    marginBottom: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
});
