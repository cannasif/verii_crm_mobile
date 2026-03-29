import { Platform } from "react-native";

/**
 * BottomNavBar içindeki NAV_HEIGHT ile aynı olmalı.
 * Liste içeriği bu kadar + güvenli alan + pay kadar yukarıda bitsin ki kartlar tab bar altına binmesin.
 */
export const BOTTOM_NAV_HEIGHT = 65;

/** Tab bar üzerinde ek nefes payı (px) */
const LIST_GAP_ABOVE_TAB_BAR = 20;

/**
 * PagedFlatList / FlatList `contentContainerStyle.paddingBottom` için.
 */
export function listContentBottomPadding(safeAreaBottom: number): number {
  const bottom = Math.max(safeAreaBottom, Platform.OS === "android" ? 8 : 0);
  return BOTTOM_NAV_HEIGHT + bottom + LIST_GAP_ABOVE_TAB_BAR;
}
