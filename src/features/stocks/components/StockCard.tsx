import React, { memo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  DimensionValue,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  PackageIcon,
  BarCode01Icon,
  ArrowRight01Icon,
  WeightScale01Icon,
  Money01Icon,
} from "hugeicons-react-native";
import type { StockGetDto } from "../types";
import { getApiBaseUrl } from "../../../constants/config";

export interface StockCardUnitPrice {
  listPrice: number;
  currency: string;
}

interface StockCardTheme {
  primary: string;
  cardBorder: string;
  cardBg: string;
  textMute: string;
  textTitle: string;
  /** Liste ekranı `theme.borderColor` — aydınlık grid kart çerçevesi */
  borderColor?: string;
  /** Hafif yüzey; gradient üzerinde kartı biraz ayırır */
  surfaceBgSoft?: string;
}

interface StockCardProps {
  item: StockGetDto;
  viewMode: "grid" | "list";
  isDark: boolean;
  theme: StockCardTheme;
  gridWidth: number;
  /** Teklif `price-of-product` ile uyumlu liste fiyatı */
  unitPriceInfo?: StockCardUnitPrice | null;
  unitPriceLoading?: boolean;
}

function safeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

interface CurrencyUi {
  symbol: string;
  label: string;
}

/** ISO kodu, ERP metni veya sayısal dovizTipi (örn. "1" → TL) */
function resolveCurrencyUi(raw: string | undefined | null): CurrencyUi {
  const s = String(raw ?? "").trim();
  if (!s) return { symbol: "₺", label: "TL" };

  const u = s.toUpperCase();

  if (u === "TRY" || u === "TRL" || u === "TL" || u === "YTL") {
    return { symbol: "₺", label: "TL" };
  }
  if (u === "USD" || u === "US" || u === "DOLAR" || u === "DOLLAR") {
    return { symbol: "$", label: "Dolar" };
  }
  if (u === "EUR" || u === "EURO") {
    return { symbol: "€", label: "Euro" };
  }
  if (u === "GBP" || u === "STERLIN" || u === "STERLİN" || u === "POUND") {
    return { symbol: "£", label: "Sterlin" };
  }
  if (u === "CHF") {
    return { symbol: "Fr.", label: "CHF" };
  }

  if (/^\d+$/.test(s)) {
    const byNum: Record<string, CurrencyUi> = {
      "0": { symbol: "₺", label: "TL" },
      "1": { symbol: "₺", label: "TL" },
      "2": { symbol: "$", label: "Dolar" },
      "3": { symbol: "€", label: "Euro" },
      "4": { symbol: "£", label: "Sterlin" },
    };
    return byNum[s] ?? { symbol: "₺", label: "TL" };
  }

  return { symbol: "", label: s };
}

type PriceParts =
  | { kind: "loading" }
  | { kind: "empty" }
  /** Örn. 12,00$ — sembol bitişik, "Dolar" metni yok */
  | { kind: "price"; compact: string };

function formatPriceCompact(info: StockCardUnitPrice): string {
  const amount = info.listPrice.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const { symbol, label } = resolveCurrencyUi(info.currency);
  if (symbol) return `${amount}${symbol}`;
  return label ? `${amount} ${label}` : amount;
}

function formatPriceParts(
  info: StockCardUnitPrice | null | undefined,
  loading: boolean
): PriceParts {
  if (loading) return { kind: "loading" };
  if (!info || !Number.isFinite(info.listPrice)) return { kind: "empty" };
  return { kind: "price", compact: formatPriceCompact(info) };
}

function chevronWrapStyle(isDark: boolean) {
  return {
    borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(148, 163, 184, 0.42)",
    shadowColor: isDark ? "#000" : "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.22 : 0.08,
    shadowRadius: 2,
    elevation: isDark ? 2 : 1,
  } as const;
}

function gridStripBorderColor(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.11)" : "rgba(15, 23, 42, 0.09)";
}

const StockCardComponent = ({
  item,
  viewMode,
  isDark,
  theme,
  gridWidth,
  unitPriceInfo = null,
  unitPriceLoading = false,
}: StockCardProps): React.ReactElement => {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);

  const stockName = safeText(item?.stockName, "-");
  const stockCode = safeText(item?.erpStockCode, "-");
  const unitText = safeText(item?.unit, "Adet");
  const hasProductCode = Boolean((item?.erpStockCode ?? "").trim());
  const grupKodu = safeText(item?.grupKodu, "");
  const balanceTextRaw = item?.balanceText;
  const balanceText =
    typeof balanceTextRaw === "string" && balanceTextRaw.trim().length > 0
      ? balanceTextRaw.trim()
      : null;
  const balanceNum =
    item?.balance !== undefined && item?.balance !== null && !Number.isNaN(Number(item.balance))
      ? Number(item.balance)
      : null;
  const footerHero = balanceText ?? (balanceNum !== null ? String(balanceNum) : stockCode);
  const primaryImage = item?.stockImages?.find((img) => img?.isPrimary && img?.filePath)
    ?? item?.stockImages?.find((img) => img?.filePath);

  const imageUri = (() => {
    const filePath = primaryImage?.filePath;
    if (!filePath) return "";
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
    const currentBaseUrl = getApiBaseUrl();
    const baseUrl = currentBaseUrl.endsWith("/") ? currentBaseUrl.slice(0, -1) : currentBaseUrl;
    const path = filePath.startsWith("/") ? filePath : `/${filePath}`;
    return `${baseUrl}${path}`;
  })();

  const softBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.96)";
  const softBorder = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(148,163,184,0.14)";

  const baseIconBg = isDark
    ? "rgba(219,39,119,0.10)"
    : "rgba(219,39,119,0.08)";
  const pressedIconBg = isDark
    ? "rgba(219,39,119,0.16)"
    : "rgba(219,39,119,0.12)";
  const baseIconBorder = isDark
    ? "rgba(236,72,153,0.16)"
    : "rgba(219,39,119,0.14)";
  const pressedIconBorder = isDark
    ? "rgba(236,72,153,0.32)"
    : "rgba(219,39,119,0.28)";

  const titleColor = theme.textTitle;
  const mutedColor = theme.textMute;

  const borderColor = isPressed ? theme.primary : theme.cardBorder;
  const currentIconBg = isPressed ? pressedIconBg : baseIconBg;
  const currentIconBorder = isPressed ? pressedIconBorder : baseIconBorder;
  const chevronColor = isPressed ? theme.primary : mutedColor;

  const gridLightBorderIdle =
    theme.borderColor ?? "rgba(219, 39, 119, 0.16)";
  const gridLightSurface = theme.surfaceBgSoft ?? theme.cardBg;

  const priceParts = formatPriceParts(unitPriceInfo, unitPriceLoading);
  /** Başlıktan biraz yumuşak; tam siyah/beyaz değil */
  const elegantPriceColor = isDark ? "#CBD5E1" : "#475569";
  const chevronBox = chevronWrapStyle(isDark);
  const stripOutline = gridStripBorderColor(isDark);

  if (viewMode === "grid") {
    return (
      <TouchableOpacity
        activeOpacity={0.96}
        onPress={() => router.push(`/(tabs)/stock/${item.id}`)}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={stockName}
        accessibilityHint="Stok detay ekranını açar"
        style={[
          styles.gridCard,
          {
            width: gridWidth as DimensionValue,
            backgroundColor: isDark ? theme.cardBg : gridLightSurface,
            borderColor: isPressed
              ? theme.primary
              : isDark
                ? theme.cardBorder
                : gridLightBorderIdle,
            borderWidth: isPressed ? 1.2 : 1,
            shadowColor: isDark ? "#000" : "#64748B",
            shadowOffset: { width: 0, height: isDark ? 4 : 3 },
            shadowOpacity: isDark ? 0.08 : 0.14,
            shadowRadius: isDark ? 8 : 11,
            elevation: isDark ? 2 : 4,
            transform: [{ scale: isPressed ? 0.992 : 1 }],
          },
        ]}
      >
        <View
          style={[
            styles.gridHeroImageWrap,
            {
              backgroundColor: currentIconBg,
              borderBottomColor: currentIconBorder,
            },
          ]}
        >
          {grupKodu ? (
            <View
              style={[
                styles.gridImageBadge,
                {
                  backgroundColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.92)",
                  borderColor: currentIconBorder,
                },
              ]}
            >
              <Text style={[styles.gridImageBadgeText, { color: titleColor }]} numberOfLines={1}>
                {grupKodu}
              </Text>
            </View>
          ) : null}
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.gridHeroImage} resizeMode="cover" />
          ) : (
            <View style={styles.gridHeroPlaceholder}>
              <PackageIcon
                size={30}
                color={theme.primary}
                variant="stroke"
                strokeWidth={1.9}
              />
            </View>
          )}
        </View>

        <View style={styles.gridBody}>
          <View style={styles.gridTitleSlot}>
            <Text
              style={[styles.gridTitleEcom, { color: titleColor }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {stockName}
            </Text>
          </View>

          <Text
            style={[styles.gridMetaAboveStrip, { color: mutedColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {stockCode} · {unitText}
          </Text>

          <View
            style={[
              styles.gridFooterStrip,
              {
                backgroundColor: softBg,
                borderColor: stripOutline,
              },
            ]}
          >
            <View style={styles.gridFooterLeft}>
              {priceParts.kind === "loading" ? (
                <Text
                  style={[styles.gridFooterPriceCompact, { color: mutedColor }]}
                  numberOfLines={1}
                >
                  …
                </Text>
              ) : priceParts.kind === "price" ? (
                <Text
                  style={[styles.gridFooterPriceCompact, { color: elegantPriceColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {priceParts.compact}
                </Text>
              ) : (
                <Text
                  style={[styles.gridFooterPriceCompact, { color: elegantPriceColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {footerHero}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.gridFooterDetailBtn,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(248,250,252,0.98)",
                  borderColor: chevronBox.borderColor,
                  shadowColor: chevronBox.shadowColor,
                  shadowOffset: chevronBox.shadowOffset,
                  shadowOpacity: chevronBox.shadowOpacity,
                  shadowRadius: chevronBox.shadowRadius,
                  elevation: chevronBox.elevation,
                },
              ]}
            >
              <ArrowRight01Icon
                size={14}
                color={chevronColor}
                variant="stroke"
                strokeWidth={2}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.96}
      onPress={() => router.push(`/(tabs)/stock/${item.id}`)}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={stockName}
      accessibilityHint="Stok detay ekranını açar"
      style={[
        styles.listCard,
        {
          width: "100%" as DimensionValue,
          backgroundColor: theme.cardBg,
          borderColor,
          borderWidth: isPressed ? 1.2 : 1,
          shadowColor: isDark ? "#000" : "#94a3b8",
          transform: [{ scale: isPressed ? 0.992 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.listIconBox,
          {
            backgroundColor: currentIconBg,
            borderColor: currentIconBorder,
          },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.listIconImage} resizeMode="cover" />
        ) : (
          <PackageIcon
            size={20}
            color={theme.primary}
            variant="stroke"
            strokeWidth={1.9}
          />
        )}
      </View>

      <View style={styles.listMiddle}>
        <Text
          style={[styles.listTitle, { color: titleColor }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {stockName}
        </Text>

        <View style={styles.listMetaRow}>
          <View style={styles.listMetaCluster}>
            <BarCode01Icon
              size={11}
              color={mutedColor}
              variant="stroke"
              strokeWidth={1.9}
            />
            <Text
              style={[styles.listMetaLineText, styles.listCodeBesideUnit, { color: mutedColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {stockCode}
            </Text>
            <Text style={[styles.listMetaSep, { color: mutedColor }]}>·</Text>
            <WeightScale01Icon
              size={11}
              color={mutedColor}
              variant="stroke"
              strokeWidth={1.9}
            />
            <Text
              style={[styles.listMetaLineText, styles.listUnitBesideCode, { color: mutedColor }]}
              numberOfLines={1}
            >
              {unitText}
            </Text>
          </View>
          {hasProductCode ? (
            priceParts.kind === "loading" ? (
              <Text style={[styles.listUnitPriceText, { color: mutedColor }]} numberOfLines={1}>
                …
              </Text>
            ) : priceParts.kind === "price" ? (
              <View style={styles.listPricePartsRow}>
                <Money01Icon
                  size={12}
                  color={elegantPriceColor}
                  variant="stroke"
                  strokeWidth={1.85}
                />
                <Text
                  style={[styles.listPriceCompact, { color: elegantPriceColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {priceParts.compact}
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.listUnitPriceText, { color: mutedColor }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                —
              </Text>
            )
          ) : null}
        </View>
      </View>

      <View style={styles.listRight}>
        <View
          style={[
            styles.listChevronWrap,
            {
              backgroundColor: softBg,
              borderColor: chevronBox.borderColor,
              shadowColor: chevronBox.shadowColor,
              shadowOffset: chevronBox.shadowOffset,
              shadowOpacity: chevronBox.shadowOpacity,
              shadowRadius: chevronBox.shadowRadius,
              elevation: chevronBox.elevation,
            },
          ]}
        >
          <ArrowRight01Icon
            size={13}
            color={chevronColor}
            variant="stroke"
            strokeWidth={2}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const StockCard = memo(StockCardComponent);

const styles = StyleSheet.create({
  gridCard: {
    borderRadius: 16,
    padding: 0,
    justifyContent: "flex-start",
    overflow: "hidden",
    marginBottom: 0,
  },

  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.02,
    elevation: 0,
    minHeight: 64,
    marginBottom: 6,
  },

  /** ~%70 yükseklik: height = width / aspectRatio → 1/0.7 ≈ 1.43 */
  gridHeroImageWrap: {
    width: "100%",
    aspectRatio: 1.42,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gridHeroImage: {
    width: "100%",
    height: "100%",
  },
  gridHeroPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  gridImageBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    zIndex: 2,
    maxWidth: "72%",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  gridImageBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  gridBody: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 9,
  },
  /** Her zaman 2 satır yüksekliği — tek satırlı isimde şerit aşağı kaymasın */
  gridTitleSlot: {
    minHeight: 34,
    justifyContent: "flex-start",
  },
  gridTitleEcom: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    letterSpacing: -0.2,
    includeFontPadding: false,
    textAlign: "left",
  },
  gridMetaAboveStrip: {
    fontSize: 8.5,
    fontWeight: "500",
    lineHeight: 11,
    letterSpacing: -0.05,
    includeFontPadding: false,
    marginTop: 4,
    marginBottom: 4,
    minHeight: 11,
    opacity: 0.92,
  },
  gridFooterStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  gridFooterLeft: {
    flex: 1,
    minWidth: 0,
  },
  gridFooterPriceCompact: {
    fontSize: 11.5,
    fontWeight: "600",
    letterSpacing: -0.22,
    includeFontPadding: false,
  },
  gridFooterDetailBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  listIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  listMiddle: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 8,
  },

  listTitle: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    marginBottom: 4,
    letterSpacing: -0.08,
    includeFontPadding: false,
  },

  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "space-between",
    gap: 6,
    minWidth: 0,
  },
  listUnitPriceText: {
    flexShrink: 0,
    maxWidth: "42%",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: -0.15,
    includeFontPadding: false,
    textAlign: "right",
  },
  listPricePartsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    maxWidth: "48%",
    justifyContent: "flex-end",
    gap: 4,
    minWidth: 0,
  },
  listPriceCompact: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: -0.18,
    includeFontPadding: false,
    flexShrink: 1,
    minWidth: 0,
  },

  listMetaCluster: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
  },

  listMetaSep: {
    fontSize: 9.7,
    fontWeight: "400",
    lineHeight: 11,
    opacity: 0.55,
    marginHorizontal: 3,
  },

  listCodeBesideUnit: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
  },

  listUnitBesideCode: {
    flexGrow: 0,
    flexShrink: 0,
    marginLeft: 4,
  },

  stockCode: {
    fontSize: 9.6,
    fontWeight: "400",
    lineHeight: 11,
    marginLeft: 5,
    flex: 1,
    letterSpacing: -0.04,
    includeFontPadding: false,
  },

  listStockCode: {
    fontSize: 9.7,
    fontWeight: "400",
    lineHeight: 11,
    marginLeft: 5,
    flex: 1,
    letterSpacing: -0.03,
    includeFontPadding: false,
  },

  listMetaLineText: {
    fontSize: 9.7,
    fontWeight: "400",
    lineHeight: 11,
    marginLeft: 5,
    letterSpacing: -0.03,
    includeFontPadding: false,
  },

  listRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: 8,
  },

  stockBadge: {
    minWidth: 50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  listBadge: {
    minWidth: 46,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  stockText: {
    fontSize: 9.4,
    fontWeight: "500",
    lineHeight: 11,
    letterSpacing: -0.03,
    includeFontPadding: false,
  },

  listChevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.15,
    alignItems: "center",
    justifyContent: "center",
  },

  listIconImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
});