import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { InformationCircleIcon } from "hugeicons-react-native";

interface ErpOrderScopeBadgeProps {
  isDark: boolean;
}

function ErpOrderScopeBadgeComponent({ isDark }: ErpOrderScopeBadgeProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.08)",
          borderColor: isDark ? "rgba(96, 165, 250, 0.25)" : "rgba(59, 130, 246, 0.18)",
        },
      ]}
    >
      <InformationCircleIcon
        size={14}
        color={isDark ? "#93C5FD" : "#2563EB"}
        variant="stroke"
        strokeWidth={2}
      />
      <Text unstyled disableThemeColor style={[styles.text, { color: isDark ? "#BFDBFE" : "#1D4ED8" }]}>
        {t("erpOrder.scopeBadge")}
      </Text>
    </View>
  );
}

export const ErpOrderScopeBadge = memo(ErpOrderScopeBadgeComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
});
