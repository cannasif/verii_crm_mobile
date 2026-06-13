import React, { memo } from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { stockBrowseStyles as styles } from "@/components/shared/stock-browse/stockBrowseStyles";
import { useUIStore } from "../../../store/ui";
import { formatErpOrderAmount, formatErpOrderText } from "../utils/erpOrderFormatters";
import type { NetsisOrderHeader } from "../types";

interface ErpOrderListRowProps {
  item: NetsisOrderHeader;
  selected?: boolean;
  locale: string;
  onPress: () => void;
}

function ErpOrderListRowComponent({
  item,
  selected = false,
  locale,
  onPress,
}: ErpOrderListRowProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const frameColor = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;

  return (
    <View style={styles.listItemShell}>
      <Pressable
        style={({ pressed }) => [
          styles.listRowPressable,
          selected && { backgroundColor: colors.accent + "12" },
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
                borderColor: frameColor,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
              },
            ]}
          >
            <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.textMuted + "88"} />
          </View>

          <View style={styles.listTextCol}>
            <Text
              unstyled
              disableThemeColor
              style={[styles.listCode, { color: colors.accent }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.fatirsNo}
            </Text>
            <Text
              unstyled
              disableThemeColor
              style={[styles.listName, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {formatErpOrderText(item.cariIsim)}
            </Text>
            <Text
              unstyled
              disableThemeColor
              style={[styles.listMetaText, { color: colors.textMuted }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {`${formatErpOrderText(item.tarih)} • ${formatErpOrderAmount(item.genelToplam, locale)} • ${formatErpOrderText(item.plasiyerKodu)}`}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export const ErpOrderListRow = memo(ErpOrderListRowComponent);
