import React, { memo, useState } from "react";
import {
  View,
 StyleSheet,
  TouchableOpacity,
  Text,
  DimensionValue,
} from "react-native";
import { useRouter } from "expo-router";
import {
  PackageIcon,
  BarCode01Icon,
  ArrowRight01Icon,
} from "hugeicons-react-native";
import type { StockGetDto } from "../types";

interface StockCardTheme {
  primary: string;
  cardBorder: string;
  cardBg: string;
  textMute: string;
  textTitle: string;
}

interface StockCardProps {
  item: StockGetDto;
  viewMode: "grid" | "list";
  isDark: boolean;
  theme: StockCardTheme;
  gridWidth: number;
}

function safeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

const StockCardComponent = ({
  item,
  viewMode,
  isDark,
  theme,
  gridWidth,
}: StockCardProps): React.ReactElement => {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);

  const stockName = safeText(item?.stockName, "-");
  const stockCode = safeText(item?.erpStockCode, "-");
  const unitText = safeText(item?.unit, "Adet");

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
        viewMode === "grid" ? styles.gridCard : styles.listCard,
        {
          width: (viewMode === "grid" ? gridWidth : "100%") as DimensionValue,
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
          viewMode === "grid" ? styles.iconBox : styles.listIconBox,
          {
            backgroundColor: currentIconBg,
            borderColor: currentIconBorder,
          },
        ]}
      >
        <PackageIcon
          size={viewMode === "grid" ? 17 : 16}
          color={theme.primary}
          variant="stroke"
          strokeWidth={1.9}
        />
      </View>

      <View style={viewMode === "list" ? styles.listMiddle : styles.gridMiddle}>
        <Text
          style={[
            viewMode === "grid" ? styles.gridTitle : styles.listTitle,
            { color: titleColor },
          ]}
          numberOfLines={viewMode === "grid" ? 3 : 1}
          ellipsizeMode="tail"
        >
          {stockName}
        </Text>

        <View style={styles.codeRow}>
          <BarCode01Icon
            size={11}
            color={mutedColor}
            variant="stroke"
            strokeWidth={1.9}
          />
          <Text
            style={[
              viewMode === "grid" ? styles.stockCode : styles.listStockCode,
              { color: mutedColor },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {stockCode}
          </Text>
        </View>
      </View>

      {viewMode === "grid" ? (
        <View style={styles.gridFooter}>
          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor: softBg,
                borderColor: softBorder,
              },
            ]}
          >
            <Text style={[styles.stockText, { color: titleColor }]}>
              {unitText}
            </Text>
          </View>

          <View
            style={[
              styles.chevronWrap,
              {
                backgroundColor: softBg,
                borderColor: softBorder,
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
      ) : (
        <View style={styles.listRight}>
          <View
            style={[
              styles.listBadge,
              {
                backgroundColor: softBg,
                borderColor: softBorder,
              },
            ]}
          >
            <Text style={[styles.stockText, { color: titleColor }]}>
              {unitText}
            </Text>
          </View>

          <View
            style={[
              styles.listChevronWrap,
              {
                backgroundColor: softBg,
                borderColor: softBorder,
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
      )}
    </TouchableOpacity>
  );
};

export const StockCard = memo(StockCardComponent);

const styles = StyleSheet.create({
  gridCard: {
    borderRadius: 18,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.08,
    elevation: 2,
    minHeight: 150,
    marginBottom: 10,
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

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  listIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  gridMiddle: {
    marginBottom: 10,
  },

  listMiddle: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 8,
  },

  gridTitle: {
    fontSize: 11.4,
    fontWeight: "600",
    lineHeight: 14,
    minHeight: 42,
    marginBottom: 6,
    letterSpacing: -0.1,
    includeFontPadding: false,
  },

  listTitle: {
    fontSize: 11.8,
    fontWeight: "600",
    lineHeight: 14,
    marginBottom: 4,
    letterSpacing: -0.08,
    includeFontPadding: false,
  },

  codeRow: {
    flexDirection: "row",
    alignItems: "center",
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

  gridFooter: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  chevronWrap: {
    width: 27,
    height: 27,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
  },

  listChevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});