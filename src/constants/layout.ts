import { Platform } from "react-native";

/**
 * BottomNavBar içindeki NAV_HEIGHT ile aynı olmalı.
 * Liste içeriği bu kadar + güvenli alan + pay kadar yukarıda bitsin ki kartlar tab bar altına binmesin.
 */
export const BOTTOM_NAV_HEIGHT = 65;

/**
 * BottomNavBar kapalıyken FAB çentiği ve dekor için wrapper'a eklenen yükseklik.
 * Aksiyon butonları son kartta kalınca bu alanı hesaba katmazsak tab bar altında kalabiliyor.
 */
export const BOTTOM_NAV_DECOR_HEIGHT = 35;

/** Tab bar üzerinde ek nefes payı (px) */
const LIST_GAP_ABOVE_TAB_BAR = 28;

/** BottomNavBar `safeBottom` ile aynı */
export function normalizeBottomInset(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom, Platform.OS === "android" ? 15 : 0);
}

/** Ekran altında BottomNavBar tarafından kaplanan toplam yükseklik */
export function bottomNavReservedHeight(safeAreaBottom: number): number {
  return BOTTOM_NAV_HEIGHT + BOTTOM_NAV_DECOR_HEIGHT + normalizeBottomInset(safeAreaBottom);
}

/**
 * Sabit alt aksiyon çubuğu (Onaya Gönder, Onayla/Reddet vb.) için paddingBottom.
 */
export function stickyActionBarBottomPadding(
  safeAreaBottom: number,
  contentPadding = 12,
): number {
  return bottomNavReservedHeight(safeAreaBottom) + contentPadding;
}

/**
 * PagedFlatList / FlatList `contentContainerStyle.paddingBottom` için.
 */
export function listContentBottomPadding(safeAreaBottom: number): number {
  const bottom = Math.max(safeAreaBottom, Platform.OS === "android" ? 8 : 0);
  return BOTTOM_NAV_HEIGHT + BOTTOM_NAV_DECOR_HEIGHT + bottom + LIST_GAP_ABOVE_TAB_BAR;
}
