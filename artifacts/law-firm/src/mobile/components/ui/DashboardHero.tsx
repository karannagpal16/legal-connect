import React, { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors, radii, roleTheme, RoleKey, spacing } from "../../theme/tokens";

type DashboardHeroProps = PropsWithChildren<{
  role: RoleKey;
  title: string;
  subtitle: string;
  badge?: string;
}>;

/** Role-tinted hero banner — new file */
export function DashboardHero({ role, title, subtitle, badge, children }: DashboardHeroProps) {
  const theme = roleTheme[role];

  return (
    <View style={[styles.wrap, { borderColor: theme.accent + "33", backgroundColor: theme.accentBg }]}>
      <View style={[styles.glow, { backgroundColor: theme.accent + "18" }]} />
      <AppText variant="kicker" style={{ color: theme.accent }}>
        {theme.kicker}
      </AppText>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" muted style={styles.sub}>
        {subtitle}
      </AppText>
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="caption" style={{ color: colors.success, fontWeight: "700" }}>
            {badge}
          </AppText>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  title: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sub: {
    maxWidth: 520,
  },
  badge: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
});
