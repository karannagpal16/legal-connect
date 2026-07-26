import { DarkTheme, Theme } from "@react-navigation/native";
import { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { colors, roleTheme, RoleKey } from "./tokens";

/** NavigationContainer dark theme — update index.native.tsx */
export const appNavigationTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.gold,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.lineGold,
    notification: colors.goldBright,
  },
};

export function roleTabOptions(role: RoleKey): BottomTabNavigationOptions {
  const accent = roleTheme[role].accent;
  return {
    tabBarStyle: styles.tabBar,
    tabBarActiveTintColor: accent,
    tabBarInactiveTintColor: colors.textSubtle,
    tabBarLabelStyle: styles.tabLabel,
    headerStyle: styles.header,
    headerTintColor: colors.text,
    headerTitleStyle: styles.headerTitle,
    headerShadowVisible: false,
    sceneContainerStyle: { backgroundColor: colors.bg },
  };
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.lineGold,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    height: 86,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  header: {
    backgroundColor: colors.bg,
  },
  headerTitle: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 17,
  },
});
