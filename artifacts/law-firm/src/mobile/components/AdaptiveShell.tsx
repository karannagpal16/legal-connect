import React, { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors } from "../theme/tokens";

type AdaptiveShellProps = PropsWithChildren<{
  sidebar?: React.ReactNode;
  style?: ViewStyle;
}>;

/**
 * iPad: sidebar + main split. iPhone: single column.
 * New file — wrap role dashboards for tablet-optimized layouts.
 */
export function AdaptiveShell({ sidebar, children, style }: AdaptiveShellProps) {
  const { useSplitLayout } = useResponsiveLayout();

  if (!useSplitLayout || !sidebar) {
    return <View style={[styles.single, style]}>{children}</View>;
  }

  return (
    <View style={[styles.split, style]}>
      <View style={styles.sidebar}>{sidebar}</View>
      <View style={styles.main}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  single: {
    flex: 1,
  },
  split: {
    flex: 1,
    flexDirection: "row",
    gap: 0,
  },
  sidebar: {
    width: 280,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.line,
    backgroundColor: colors.surface,
    paddingVertical: 16,
  },
  main: {
    flex: 1,
  },
});
