import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { RoleDashboardLayout } from "../components/RoleDashboardLayout";
import { DashboardHero } from "../components/ui/DashboardHero";
import { ActionTile } from "../components/ui/ActionTile";
import { MetricRow } from "../components/ui/MetricRow";
import { SurfaceCard } from "../components/ui/SurfaceCard";
import { AppText } from "../components/ui/AppText";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors, spacing } from "../theme/tokens";

/** Advocate command centre — new file */
export function AdvocateHomeScreenNative() {
  const { gridColumns } = useResponsiveLayout();

  return (
    <RoleDashboardLayout
      role="advocate"
      active="Today"
      items={["Today", "Matters", "Court Desk", "Chamber", "Profile"]}
    >
      <SafeScreen padBottom={false}>
        <DashboardHero
          role="advocate"
          title="Today's court cockpit."
          subtitle="ProxyHub, diary, eCourts sync, and daily judgments — RNA advocate command."
        >
          <MetricRow
            metrics={[
              { label: "Hearings", value: "2" },
              { label: "Filings", value: "3" },
              { label: "Proxy", value: "1" },
            ]}
          />
        </DashboardHero>

        <View style={[styles.grid, gridColumns > 1 && styles.gridMulti]}>
          <ActionTile icon="🎯" title="ProxyHub" desc="Missions & proof holds" accent={colors.advocate} />
          <ActionTile icon="📓" title="Case Diary" desc="Matters & next dates" accent={colors.goldBright} />
          <ActionTile icon="🏛" title="Court Calendar" desc="Cause list & pass-over" accent={colors.advocate} />
          <ActionTile icon="🔗" title="eCourts" desc="CNR sync & listings" accent={colors.info} />
          <ActionTile icon="📚" title="Judgments" desc="Daily research feed" accent={colors.gold} />
          <ActionTile icon="🏢" title="Chamber" desc="Drafts & intern assign" accent={colors.textMuted} />
        </View>

        <SurfaceCard style={styles.panel}>
          <AppText variant="subtitle">Today's cause list</AppText>
          {[
            ["State v. Mehra", "Delhi HC · Court 5 · Item 17", "Arguments"],
            ["Metro Infra", "Saket · Room 214 · Item 8", "Pass-over watch"],
          ].map(([matter, court, action]) => (
            <View key={matter} style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ fontWeight: "600" }}>
                  {matter}
                </AppText>
                <AppText variant="caption" muted>
                  {court}
                </AppText>
              </View>
              <AppText variant="caption" gold>
                {action}
              </AppText>
            </View>
          ))}
        </SurfaceCard>
      </SafeScreen>
    </RoleDashboardLayout>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md, marginBottom: spacing.lg },
  gridMulti: { flexDirection: "row", flexWrap: "wrap" },
  panel: { marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineGold,
  },
});
