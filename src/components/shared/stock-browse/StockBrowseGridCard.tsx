import React, { memo, useState, type ReactNode } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { getImageUrl } from "@/lib/getImageUrl";
import { StockBrowseCardChip } from "./StockBrowseCardChip";
import { StockBrowseUnitBadge } from "./StockBrowseUnitBadge";
import { StockNameWithTooltip } from "./StockNameWithTooltip";
import type { StockBrowseItemFields, StockBrowseThemeColors } from "./types";
import { STOCK_BROWSE_CARD_IMAGE_HEIGHT, stockBrowseStyles as styles } from "./stockBrowseStyles";

export const StockBrowseGridCard = memo(function StockBrowseGridCard({
  item,
  colors,
  isDark,
  frameColor,
  surfaceColor,
  onPress,
  selected = false,
  showSelectedBadge = false,
  imageOverlay,
  bodyExtra,
  footer,
}: {
  item: StockBrowseItemFields;
  colors: StockBrowseThemeColors;
  isDark: boolean;
  frameColor: string;
  surfaceColor: string;
  onPress: () => void;
  selected?: boolean;
  showSelectedBadge?: boolean;
  imageOverlay?: ReactNode;
  bodyExtra?: ReactNode;
  footer?: ReactNode;
}) {
  const imageUri = getImageUrl(item.imageUrl);
  const bodyBg = isDark ? surfaceColor : colors.card;
  const groupChip = item.grupKodu?.trim() || item.grupAdi?.trim() || "";
  const codeChip = item.kod1?.trim() || item.kod1Adi?.trim() || "";
  const [nameTooltipOpen, setNameTooltipOpen] = useState(false);

  return (
    <View
      style={[
        styles.cardFrame,
        nameTooltipOpen && styles.cardFrameTooltipOpen,
        {
          borderWidth: selected ? 1.5 : 1,
          borderColor: selected ? colors.accent + (isDark ? "AA" : "88") : frameColor,
          backgroundColor: selected ? colors.accent + (isDark ? "0A" : "04") : bodyBg,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
        android_ripple={{ color: "rgba(0,0,0,0)" }}
        onPress={onPress}
      >
        <View
          style={[
            styles.cardImage,
            {
              height: STOCK_BROWSE_CARD_IMAGE_HEIGHT,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.backgroundSecondary,
              borderBottomColor: isDark ? "rgba(255, 255, 255, 0.08)" : colors.border,
            },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImageAsset} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.textMuted + "66"} />
          )}

          {showSelectedBadge && selected ? (
            <View
              style={[
                styles.cardSelectedBadge,
                { backgroundColor: colors.accent, borderColor: isDark ? "#18181b" : "#fff" },
              ]}
            >
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          ) : null}

          {imageOverlay ? <View style={styles.cardImageMetaRow}>{imageOverlay}</View> : null}
        </View>

        <View style={[styles.cardBody, { backgroundColor: selected ? "transparent" : bodyBg }]}>
          <View style={styles.cardCodeRow}>
            <Text unstyled disableThemeColor style={[styles.cardCode, { color: colors.accent }]} numberOfLines={1}>
              {item.erpStockCode}
            </Text>
            {item.unit ? <StockBrowseUnitBadge unit={item.unit} colors={colors} isDark={isDark} compact /> : null}
          </View>

          <StockNameWithTooltip
            name={item.stockName}
            textColor={colors.text}
            isDark={isDark}
            nameStyle={styles.cardName}
            onTooltipOpenChange={setNameTooltipOpen}
            tooltipPlacement="above"
          />

          {bodyExtra}

          <View style={styles.cardChipRow}>
            {groupChip ? (
              <StockBrowseCardChip label={groupChip} variant="group" colors={colors} isDark={isDark} />
            ) : null}
            {codeChip ? (
              <StockBrowseCardChip label={codeChip} variant="code" colors={colors} isDark={isDark} />
            ) : null}
          </View>

          {footer ? <View style={styles.cardFooter}>{footer}</View> : null}
        </View>
      </Pressable>
    </View>
  );
});
