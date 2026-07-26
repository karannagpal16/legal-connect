import React from "react";
import { Platform, StyleSheet, Text, TextProps, TextStyle } from "react-native";
import { colors, typography } from "../../theme/tokens";

type Variant = "display" | "hero" | "title" | "subtitle" | "body" | "caption" | "label" | "kicker";

type AppTextProps = TextProps & {
  variant?: Variant;
  muted?: boolean;
  gold?: boolean;
  accent?: string;
};

const serif = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

/** Typography primitive — new file */
export function AppText({
  variant = "body",
  muted,
  gold,
  accent,
  style,
  children,
  ...rest
}: AppTextProps) {
  const variantStyle = styles[variant];
  const colorStyle: TextStyle = gold
    ? { color: colors.goldBright }
    : accent
      ? { color: accent }
      : muted
        ? { color: colors.textMuted }
        : { color: colors.text };

  return (
    <Text style={[variantStyle, colorStyle, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: serif,
    fontSize: typography.display,
    lineHeight: 40,
    fontWeight: "600",
  },
  hero: {
    fontFamily: serif,
    fontSize: typography.hero,
    lineHeight: 34,
    fontWeight: "600",
  },
  title: {
    fontFamily: serif,
    fontSize: typography.title,
    lineHeight: 28,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: typography.subtitle,
    lineHeight: 24,
    fontWeight: "600",
  },
  body: {
    fontSize: typography.body,
    lineHeight: 22,
  },
  caption: {
    fontSize: typography.caption,
    lineHeight: 18,
  },
  label: {
    fontSize: typography.label,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  kicker: {
    fontSize: typography.label,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
    color: colors.gold,
  },
});
