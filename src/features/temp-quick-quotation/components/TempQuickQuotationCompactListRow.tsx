import React, { memo, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { getCurrencyDisplayLabel } from "../../../lib/currencyDisplay";
import { formatSystemDate } from "../../../lib/systemSettings";
import type { TempQuotattionGetDto } from "../models/tempQuotattion.model";
import { resolveTempQuickQuotationCustomerLabel } from "../utils/resolveTempQuickQuotationCustomerLabel";

interface TempQuickQuotationCompactListRowProps {
  item: TempQuotattionGetDto;
  onPress: (id: number) => void;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return formatSystemDate(dateString);
}

function TempQuickQuotationCompactListRowComponent({
  item,
  onPress,
}: TempQuickQuotationCompactListRowProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";

  const colors = useMemo(
    () => ({
      brand: isDark ? "#EC4899" : "#DB2777",
      text: isDark ? "#F8FAFC" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      green: isDark ? "#34D399" : "#059669",
      greenSoft: isDark ? "rgba(52,211,153,0.14)" : "rgba(16,185,129,0.10)",
      greenBorder: isDark ? "rgba(52,211,153,0.28)" : "rgba(16,185,129,0.18)",
      orange: isDark ? "#FBBF24" : "#D97706",
      orangeSoft: isDark ? "rgba(251,191,36,0.14)" : "rgba(245,158,11,0.10)",
      orangeBorder: isDark ? "rgba(251,191,36,0.28)" : "rgba(245,158,11,0.18)",
    }),
    [isDark]
  );

  const statusColor = item.isApproved ? colors.green : colors.orange;
  const statusBg = item.isApproved ? colors.greenSoft : colors.orangeSoft;
  const statusBorder = item.isApproved ? colors.greenBorder : colors.orangeBorder;
  const statusLabel = item.isApproved
    ? t("tempQuickQuotation.statusApproved")
    : t("tempQuickQuotation.statusDraft");

  const customerLabel = resolveTempQuickQuotationCustomerLabel(
    item,
    t("tempQuickQuotation.customerIdLabel", { id: item.customerId })
  );

  const currencyLabel = getCurrencyDisplayLabel(item.currencyCode);

  const handleRowPress = (): void => {
    onPress(item.id);
  };

  return (
    <TouchableOpacity activeOpacity={0.72} onPress={handleRowPress} style={styles.row}>
      <View
        style={[
          styles.statusIconWrap,
          {
            backgroundColor: statusBg,
            borderColor: statusBorder,
          },
        ]}
        accessibilityLabel={statusLabel}
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text style={[styles.idText, { color: colors.brand }]}>#{item.id}</Text>
          <Text style={[styles.currency, { color: colors.brand }]} numberOfLines={1}>
            {currencyLabel}
          </Text>
        </View>

        <View style={styles.bottomLine}>
          <Text style={[styles.customer, { color: colors.text }]} numberOfLines={1}>
            {customerLabel}
          </Text>
          <Text style={[styles.date, { color: colors.muted }]} numberOfLines={1}>
            {formatDate(item.offerDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const TempQuickQuotationCompactListRow = memo(TempQuickQuotationCompactListRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    minHeight: 58,
  },
  statusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  idText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  currency: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
    flexShrink: 0,
  },
  bottomLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customer: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  date: {
    fontSize: 10,
    fontWeight: "500",
    flexShrink: 0,
    lineHeight: 13,
  },
});
