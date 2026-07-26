import React, { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { colors } from "../theme/tokens";

type SafeScreenProps = PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  padBottom?: boolean;
}>;

/** Safe area screen with midnight canvas + gold mesh — updated existing file */
export function SafeScreen({
  children,
  scroll = true,
  style,
  contentStyle,
  padBottom = true,
}: SafeScreenProps) {
  const { insets, horizontalPadding, contentMaxWidth, isTablet } = useResponsiveLayout();

  const paddingTop = insets.top + (isTablet ? 16 : 10);
  const paddingBottom = (padBottom ? insets.bottom : 0) + 28;

  const inner = (
    <View
      style={[
        styles.inner,
        {
          paddingTop,
          paddingBottom,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={[styles.root, style]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={[styles.root, style]}>{inner}</View>
  );

  return (
    <View style={styles.canvas}>
      <View style={styles.meshTop} pointerEvents="none" />
      <View style={styles.meshBottom} pointerEvents="none" />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  meshTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.goldGlow,
  },
  meshBottom: {
    position: "absolute",
    bottom: 120,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(91, 155, 213, 0.06)",
  },
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flexGrow: 1,
  },
});
