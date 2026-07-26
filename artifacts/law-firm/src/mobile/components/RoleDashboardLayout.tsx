import React, { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./ui/AppText";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors, roleTheme, RoleKey, spacing } from "../theme/tokens";

type RoleDashboardLayoutProps = PropsWithChildren<{
  role: RoleKey;
  active?: string;
  items: string[];
}>;

/** iPad sidebar + phone full-bleed layout — new file */
export function RoleDashboardLayout({ role, active, items, children }: RoleDashboardLayoutProps) {
  const { useSplitLayout } = useResponsiveLayout();
  const theme = roleTheme[role];

  if (!useSplitLayout) {
    return <View style={styles.phone}>{children}</View>;
  }

  return (
    <View style={styles.split}>
      <View style={styles.sidebar}>
        <AppText variant="kicker" style={{ color: theme.accent, paddingHorizontal: spacing.lg }}>
          {theme.label}
        </AppText>
        {items.map((item) => (
          <Pressable key={item} style={[styles.navItem, item === active && styles.navActive]}>
            <AppText
              variant="body"
              style={{
                color: item === active ? theme.accent : colors.textMuted,
                fontWeight: item === active ? "700" : "500",
              }}
            >
              {item}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.main}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: { flex: 1 },
  split: { flex: 1, flexDirection: "row" },
  sidebar: {
    width: 260,
    backgroundColor: colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.lineGold,
    paddingTop: spacing.lg,
  },
  navItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  navActive: {
    backgroundColor: colors.goldGlow,
  },
  main: { flex: 1 },
});
