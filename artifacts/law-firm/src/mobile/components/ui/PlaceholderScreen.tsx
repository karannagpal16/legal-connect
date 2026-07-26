import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeScreen } from "../SafeScreen";
import { AppText } from "./AppText";
import { DharmaChakra } from "../DharmaChakra";
import { spacing } from "../../theme/tokens";

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
};

/** Themed coming-soon screen — new file */
export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <SafeScreen>
      <View style={styles.center}>
        <DharmaChakra size={100} />
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="body" muted style={styles.sub}>
          {subtitle ?? "This module ships in the next Legal Connect mobile release."}
        </AppText>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: "center",
  },
  sub: {
    marginTop: spacing.sm,
    textAlign: "center",
    maxWidth: 280,
  },
});
