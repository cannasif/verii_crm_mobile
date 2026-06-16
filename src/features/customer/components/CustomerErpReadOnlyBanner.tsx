import React, { memo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Alert02Icon } from "hugeicons-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";

interface CustomerErpReadOnlyBannerProps {
  style?: StyleProp<ViewStyle>;
}

function CustomerErpReadOnlyBannerComponent({
  style,
}: CustomerErpReadOnlyBannerProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const palette = {
    backgroundColor: isDark ? "rgba(251,191,36,0.08)" : "rgba(245,158,11,0.06)",
    borderColor: isDark ? "rgba(251,191,36,0.22)" : "rgba(217,119,6,0.16)",
    textColor: isDark ? "#D6B35A" : "#A16207",
    iconColor: isDark ? "#CA8A04" : "#B45309",
  };

  return (
    <View
      style={[
        styles.alert,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
    >
      <Alert02Icon
        size={14}
        color={palette.iconColor}
        variant="stroke"
        strokeWidth={1.8}
      />
      <Text style={[styles.message, { color: palette.textColor }]} numberOfLines={2}>
        {t("customer.erpReadOnlyMessage")}
      </Text>
    </View>
  );
}

export const CustomerErpReadOnlyBanner = memo(CustomerErpReadOnlyBannerComponent);

const styles = StyleSheet.create({
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
});
