import React, { memo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Text,
  DimensionValue,
} from "react-native";
import {
  PackageIcon,
  Tag01Icon,
  ArrowRight01Icon,
} from "hugeicons-react-native";
import type { StockGetDto } from "../types";

interface StockCardProps {
  item: StockGetDto;
  viewMode: "grid" | "list";
  isDark: boolean;
  router: any;
  theme: any;
  gridWidth: number;
}

const StockCardComponent = ({
  item,
  viewMode,
  isDark,
  router,
  theme,
  gridWidth,
}: StockCardProps) => {
  const [isPressed, setIsPressed] = useState(false);

  const borderColor = isPressed ? theme.primary : theme.cardBorder;
  const softBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.92)";
  const softBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.12)";
  const iconBg = isDark ? "rgba(219,39,119,0.10)" : "rgba(219,39,119,0.08)";
  const iconBorder = isDark ? "rgba(236,72,153,0.16)" : "rgba(219,39,119,0.14)";
  const muted = theme.textMute;
  const title = theme.textTitle;

  const containerStyle = [
    viewMode === "grid" ? styles.gridCard : styles.listCard,
    {
      width: (viewMode === "grid" ? gridWidth : "100%") as DimensionValue,
      backgroundColor: theme.cardBg,
      borderColor,
      borderWidth: 1.1,
      shadowColor: isDark ? "#000" : "#94a3b8",
      transform: [{ scale: isPressed ? 0.988 : 1 }],
    },
  ];

  return (
    <TouchableWithoutFeedback
      onPress={() => router.push(`/(tabs)/stock/${item.id}`)}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      <View style={containerStyle}>
        <View
          style={[
            viewMode === "grid" ? styles.iconBox : styles.listIconBox,
            {
              backgroundColor: iconBg,
              borderColor: iconBorder,
            },
          ]}
        >
          <PackageIcon size={17} color={theme.primary} variant="stroke" />
        </View>

        <View style={viewMode === "list" ? styles.listMiddle : styles.gridMiddle}>
          <Text
            style={[
              viewMode === "grid" ? styles.gridTitle : styles.listTitle,
              { color: title },
            ]}
            numberOfLines={viewMode === "grid" ? 2 : 1}
          >
            {item.stockName || "-"}
          </Text>

          <View style={styles.codeRow}>
            <Tag01Icon size={11} color={muted} variant="stroke" />
            <Text
              style={[
                viewMode === "grid" ? styles.stockCode : styles.listStockCode,
                { color: muted },
              ]}
              numberOfLines={1}
            >
              {item.erpStockCode || "-"}
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
              <Text style={[styles.stockText, { color: title }]}>{item.unit || "Adet"}</Text>
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
              <ArrowRight01Icon size={13} color={muted} variant="stroke" />
            </View>
          </View>
        ) : (
          <View style={styles.listRight}>
            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor: softBg,
                  borderColor: softBorder,
                },
              ]}
            >
              <Text style={[styles.stockText, { color: title }]}>{item.unit || "Adet"}</Text>
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
              <ArrowRight01Icon size={13} color={muted} variant="stroke" />
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export const StockCard = memo(StockCardComponent);

const styles = StyleSheet.create({
  gridCard: {
    borderRadius: 18,
    padding: 13,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.08,
    elevation: 2,
    minHeight: 154,
  },

  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 13,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    shadowOpacity: 0.06,
    elevation: 1,
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  listIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  gridMiddle: {
    marginBottom: 12,
  },

  listMiddle: {
    flex: 1,
    paddingHorizontal: 11,
  },

  gridTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 7,
  },

  listTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
    marginBottom: 6,
  },

  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  stockCode: {
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 13,
    flex: 1,
  },

  listStockCode: {
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 13,
    flex: 1,
  },

  gridFooter: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  listRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 8,
    minHeight: 50,
  },

  stockBadge: {
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stockText: {
    fontSize: 10,
    fontWeight: "600",
  },

  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});