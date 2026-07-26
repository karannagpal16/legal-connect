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

/** Client dashboard — updated existing file */
export function ClientHomeScreenNative() {
  const { gridColumns } = useResponsiveLayout();

  return (
    <RoleDashboardLayout
      role="client"
      active="Dashboard"
      items={["Dashboard", "My Matters", "Legal Help", "Profile"]}
    >
      <SafeScreen padBottom={false}>
        <DashboardHero
          role="client"
          title="Your legal status, plain and clear."
          subtitle="Book RNA counsel, trigger Legal SOS, or follow your matter — no jargon, no confusion."
          badge="✓ No court attendance needed today"
        >
          <MetricRow
            accent={colors.client}
            metrics={[
              { label: "Status", value: "Active" },
              { label: "Next", value: "5 Aug" },
              { label: "Receipt", value: "Ready" },
            ]}
          />
        </DashboardHero>

        <View style={[styles.grid, gridColumns > 1 && styles.gridMulti]}>
          <ActionTile icon="🆘" title="Legal SOS" desc="Emergency routing in seconds" urgent />
          <ActionTile icon="⚖" title="Book Counsel" desc="Chat, video, or visit" accent={colors.client} />
          <ActionTile icon="📁" title="My Matters" desc="Timeline & documents" accent={colors.gold} />
          <ActionTile icon="📄" title="Documents" desc="Drafts, upload, receipts" accent={colors.success} />
        </View>

        <SurfaceCard style={styles.timeline}>
          <AppText variant="subtitle">Case timeline</AppText>
          {[
            ["Case recorded", "Documents saved privately."],
            ["Opponent notified", "Notice stage complete."],
            ["Awaiting reply", "We'll alert you before action is needed."],
          ].map(([title, desc]) => (
            <View key={title} style={styles.step}>
              <View style={styles.dot} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ fontWeight: "600" }}>
                  {title}
                </AppText>
                <AppText variant="caption" muted>
                  {desc}
                </AppText>
              </View>
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
  timeline: { marginBottom: spacing.lg },
  step: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.client,
    marginTop: 6,
  },
});
