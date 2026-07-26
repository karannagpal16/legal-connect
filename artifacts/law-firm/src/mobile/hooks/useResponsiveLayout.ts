import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TABLET_MIN_WIDTH } from "../theme/tokens";

export type DeviceClass = "phone" | "tablet";

export interface ResponsiveLayout {
  width: number;
  height: number;
  deviceClass: DeviceClass;
  isTablet: boolean;
  isPhone: boolean;
  /** True when width allows split-view / sidebar (iPad landscape or large tablet) */
  useSplitLayout: boolean;
  contentMaxWidth: number;
  horizontalPadding: number;
  gridColumns: number;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

/**
 * Central responsive hook for iPhone 15 + iPad (10th gen).
 * Accounts for Dynamic Island via safe-area insets from SafeAreaProvider.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const isTablet =
      width >= TABLET_MIN_WIDTH || (Platform.OS === "ios" && Platform.isPad);
    const deviceClass: DeviceClass = isTablet ? "tablet" : "phone";
    const useSplitLayout = isTablet && width >= 900;
    const horizontalPadding = isTablet ? 28 : 20;
    const contentMaxWidth = isTablet ? Math.min(width - horizontalPadding * 2, 1080) : width;
    const gridColumns = useSplitLayout ? 3 : isTablet ? 2 : 1;

    return {
      width,
      height,
      deviceClass,
      isTablet,
      isPhone: !isTablet,
      useSplitLayout,
      contentMaxWidth,
      horizontalPadding,
      gridColumns,
      insets,
    };
  }, [width, height, insets]);
}
