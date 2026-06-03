import React, { memo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { StockBrowseUnitBadge } from "./StockBrowseUnitBadge";
import { StockNameWithTooltip } from "./StockNameWithTooltip";
import type { StockBrowseItemFields, StockBrowseThemeColors } from "./types";
import { stockBrowseStyles as styles } from "./stockBrowseStyles";

export const StockBrowseListRow = memo(function StockBrowseListRow({
  item,
  colors,
  frameColor,
  isDark,
  onPress,
  selected = false,
  trailing,
  prefixActions,
  metaRow,
}: {
  item: StockBrowseItemFields;
  colors: StockBrowseThemeColors;
  frameColor: string;
  isDark: boolean;
  onPress: () => void;
  selected?: boolean;
  trailing?: ReactNode;
  prefixActions?: ReactNode;
  metaRow?: ReactNode;
}) {
  const [nameTooltipOpen, setNameTooltipOpen] = useState(false);

  return (
    <View style={[styles.listItemShell, nameTooltipOpen && styles.listItemShellTooltipOpen]}>
      <Pressable
        style={({ pressed }) => [
          styles.listRowPressable,
          selected && { backgroundColor: colors.accent + "0A" },
          pressed && styles.listRowPressed,
        ]}
        android_ripple={{ color: "rgba(0,0,0,0)" }}
        onPress={onPress}
      >
        <View style={styles.listRowInner}>
          <View
            style={[
              styles.listIconCircle,
              {
                borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : frameColor,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
              },
            ]}
          >
            <MaterialCommunityIcons name="package-variant-closed" size={18} color={colors.textMuted + "55"} />
          </View>
          <View style={styles.listTextCol}>
            <Text
              unstyled
              disableThemeColor
              style={[styles.listCode, { color: colors.accent }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.erpStockCode}
            </Text>
            <StockNameWithTooltip
              name={item.stockName}
              textColor={colors.text}
              isDark={isDark}
              nameStyle={styles.listName}
              onTooltipOpenChange={setNameTooltipOpen}
              tooltipPlacement="below"
            />
          </View>
          <View style={styles.listActionsCol}>
            {prefixActions}
            {item.unit ? <StockBrowseUnitBadge unit={item.unit} colors={colors} isDark={isDark} /> : null}
            {trailing}
          </View>
        </View>
      </Pressable>
      {metaRow ? (
        <View style={[styles.listMetaRow, { borderTopColor: isDark ? "rgba(255,255,255,0.06)" : colors.border }]}>
          <View style={styles.listMetaContent}>{metaRow}</View>
        </View>
      ) : null}
    </View>
  );
});
