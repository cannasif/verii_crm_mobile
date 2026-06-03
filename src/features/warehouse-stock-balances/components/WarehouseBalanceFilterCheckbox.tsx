import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";

interface WarehouseBalanceFilterCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const WarehouseBalanceFilterCheckbox = memo(function WarehouseBalanceFilterCheckbox({
  checked,
  onChange,
}: WarehouseBalanceFilterCheckboxProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={styles.row}>
        <Text
          unstyled
          disableThemeColor
          style={[styles.label, { color: colors.text }]}
          numberOfLines={2}
        >
          {t("stock.filterOnlyWithWarehouseBalance")}
        </Text>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: checked ? colors.accent : isDark ? "rgba(255,255,255,0.35)" : colors.border,
              backgroundColor: checked ? colors.accent : "transparent",
            },
          ]}
        >
          {checked ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
