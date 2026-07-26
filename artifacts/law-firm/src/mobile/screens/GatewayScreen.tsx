import React from "react";
import { Pressable, Platform, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeScreen } from "../components/SafeScreen";
import { DharmaChakra } from "../components/DharmaChakra";
import { AppText } from "../components/ui/AppText";
import { SurfaceCard } from "../components/ui/SurfaceCard";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors, radii, roleTheme, spacing } from "../theme/tokens";

type RootStackParamList = {
  RoleSelector: undefined;
  ClientApp: undefined;
  AdvocateApp: undefined;
  InternApp: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "RoleSelector">;

const PORTALS = [
  { key: "ClientApp" as const, role: "client" as const },
  { key: "AdvocateApp" as const, role: "advocate" as const },
  { key: "InternApp" as const, role: "intern" as const },
];

/** RNA gateway — updated existing file */
export function GatewayScreen({ navigation }: Props) {
  const { isTablet, gridColumns, useSplitLayout } = useResponsiveLayout();

  return (
    <SafeScreen>
      <View style={[styles.hero, useSplitLayout && styles.heroRow]}>
        <View style={styles.copy}>
          <AppText variant="label" muted>
            Rishika Nagpal and Associates
          </AppText>
          <AppText variant="kicker" style={styles.brand}>
            Legal Connect
          </AppText>
          <AppText variant="caption" muted style={styles.tagline}>
            Serve Dharma. Deliver Justice.
          </AppText>
          <Text style={styles.headline}>
            Law. Simplified.{"\n"}Justice. <Text style={styles.gold}>Empowered.</Text>
          </Text>
        </View>
        <View style={styles.chakraWrap}>
          <DharmaChakra size={isTablet ? 240 : 150} />
        </View>
      </View>

      <AppText variant="kicker" style={styles.section}>
        Choose your path
      </AppText>

      <View style={[styles.grid, gridColumns > 1 && styles.gridMulti]}>
        {PORTALS.map(({ key, role }) => {
          const t = roleTheme[role];
          return (
            <Pressable key={key} onPress={() => navigation.navigate(key)} style={styles.flex}>
              <SurfaceCard accent={t.accent} style={styles.portalCard}>
                <AppText variant="kicker" style={{ color: t.accent }}>
                  {t.kicker}
                </AppText>
                <AppText variant="subtitle" style={styles.portalTitle}>
                  {t.label}
                </AppText>
                <AppText variant="caption" muted style={styles.portalDesc}>
                  {role === "client" && "Legal SOS · Book counsel · Track matters"}
                  {role === "advocate" && "ProxyHub · Diary · eCourts · Judgments"}
                  {role === "intern" && "Quests · XP · Rewards at 1,000 points"}
                </AppText>
                <AppText variant="body" gold style={styles.cta}>
                  Continue →
                </AppText>
              </SurfaceCard>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="caption" muted style={styles.footer}>
        MSME UDYAM-DL-11-0164811 · India's Litigation OS
      </AppText>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.xl },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  copy: { flex: 1 },
  brand: { marginTop: spacing.xs, letterSpacing: 4 },
  tagline: { marginTop: spacing.xs, marginBottom: spacing.md, fontStyle: "italic" },
  headline: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600",
    color: colors.text,
  },
  gold: { color: colors.goldBright },
  chakraWrap: { alignItems: "center" },
  section: { marginBottom: spacing.md },
  grid: { gap: spacing.md },
  gridMulti: { flexDirection: "row", flexWrap: "wrap" },
  flex: { flex: 1, minWidth: "46%" },
  portalCard: { minHeight: 168 },
  portalTitle: { marginTop: spacing.sm, marginBottom: spacing.sm },
  portalDesc: { marginBottom: spacing.md, lineHeight: 20 },
  cta: { fontWeight: "700" },
  footer: { textAlign: "center", marginTop: spacing.xl },
});
