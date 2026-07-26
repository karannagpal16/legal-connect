import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeScreen } from "../components/SafeScreen";
import { RoleDashboardLayout } from "../components/RoleDashboardLayout";
import { DashboardHero } from "../components/ui/DashboardHero";
import { ActionTile } from "../components/ui/ActionTile";
import { MetricRow } from "../components/ui/MetricRow";
import { XPProgress } from "../components/ui/XPProgress";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors, spacing } from "../theme/tokens";

/** Internverse gamified home — new file */
export function InternHomeScreenNative() {
  const { gridColumns } = useResponsiveLayout();

  return (
    <RoleDashboardLayout
      role="intern"
      active="Quests"
      items={["Quests", "My Tasks", "Learn", "Rewards"]}
    >
      <SafeScreen padBottom={false}>
        <DashboardHero
          role="intern"
          title="Level 2 · Researcher"
          subtitle="Admin-posted missions, mentor reviews, and rewards when you hit 1,000 XP."
        >
          <XPProgress
            current={620}
            max={1000}
            rewardLabel="Unlock Verified Intern Certificate + chamber priority"
          />
          <MetricRow
            accent={colors.intern}
            metrics={[
              { label: "Quests", value: "3" },
              { label: "XP Week", value: "+180" },
              { label: "Reviews", value: "2" },
            ]}
          />
        </DashboardHero>

        <View style={[styles.grid, gridColumns > 1 && styles.gridMulti]}>
          <ActionTile
            icon="🔍"
            title="Research Quest"
            desc="+250 XP · 5 bail judgments"
            accent={colors.intern}
          />
          <ActionTile
            icon="📋"
            title="Chamber Assist"
            desc="+180 XP · Index Delhi HC docs"
            accent={colors.intern}
          />
          <ActionTile icon="📖" title="Learn Track" desc="Bare acts & procedure" accent={colors.gold} />
          <ActionTile icon="🏆" title="Rewards" desc="Milestones & certificates" accent={colors.goldBright} />
        </View>
      </SafeScreen>
    </RoleDashboardLayout>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md, marginBottom: spacing.lg },
  gridMulti: { flexDirection: "row", flexWrap: "wrap" },
});
