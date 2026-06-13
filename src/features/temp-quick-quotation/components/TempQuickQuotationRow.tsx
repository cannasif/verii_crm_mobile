import React, { memo, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type GestureResponderEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  UserIcon,
  Calendar03Icon,
  Coins01Icon,
  Edit02Icon,
  Tick02Icon,
} from "hugeicons-react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { getCurrencyDisplayLabel } from "../../../lib/currencyDisplay";
import { formatSystemDate } from "../../../lib/systemSettings";
import type { TempQuotattionGetDto } from "../models/tempQuotattion.model";
import { resolveTempQuickQuotationCustomerLabel } from "../utils/resolveTempQuickQuotationCustomerLabel";

interface TempQuickQuotationRowProps {
  item: TempQuotattionGetDto;
  convertingId: number | null;
  isConverting: boolean;
  onPress: (id: number) => void;
  onRevise: (id: number) => void;
  onConvert: (id: number) => void;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return formatSystemDate(dateString);
}

function TempQuickQuotationRowComponent({
  item,
  convertingId,
  isConverting,
  onPress,
  onRevise,
  onConvert,
}: TempQuickQuotationRowProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";

  const colors = useMemo(
    () => ({
      cardBg: isDark ? "rgba(17,17,24,0.95)" : "rgba(255,255,255,0.98)",
      border: isDark ? "rgba(236,72,153,0.20)" : "rgba(219,39,119,0.14)",
      borderStrong: isDark ? "rgba(236,72,153,0.28)" : "rgba(219,39,119,0.22)",
      brand: isDark ? "#EC4899" : "#DB2777",
      brandSoft: isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.07)",
      text: isDark ? "#F8FAFC" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      shadow: isDark ? "#000000" : "#0F172A",
      violet: isDark ? "#C4B5FD" : "#7C3AED",
      violetSoft: isDark ? "rgba(167,139,250,0.14)" : "rgba(124,58,237,0.08)",
      violetBorder: isDark ? "rgba(167,139,250,0.28)" : "rgba(124,58,237,0.18)",
      blue: isDark ? "#7DD3FC" : "#0284C7",
      blueSoft: isDark ? "rgba(56,189,248,0.12)" : "rgba(14,165,233,0.08)",
      blueBorder: isDark ? "rgba(56,189,248,0.28)" : "rgba(14,165,233,0.18)",
      green: isDark ? "#34D399" : "#059669",
      greenSoft: isDark ? "rgba(52,211,153,0.12)" : "rgba(16,185,129,0.08)",
      greenBorder: isDark ? "rgba(52,211,153,0.28)" : "rgba(16,185,129,0.18)",
      orange: isDark ? "#FBBF24" : "#D97706",
      orangeSoft: isDark ? "rgba(251,191,36,0.12)" : "rgba(245,158,11,0.08)",
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
  const isRowConverting = isConverting && convertingId === item.id;
  const isConvertDisabled = isConverting || item.isApproved;

  const handleRowPress = (): void => {
    onPress(item.id);
  };

  const handleRevisePress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onRevise(item.id);
  };

  const handleConvertPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    if (isConvertDisabled) return;
    onConvert(item.id);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleRowPress}
      style={[
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.cardBg,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.idColumn}>
          <View
            style={[
              styles.idBadge,
              {
                backgroundColor: colors.brandSoft,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Text style={[styles.idText, { color: colors.brand }]}>#{item.id}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: statusBg,
              borderColor: statusBorder,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.customerRow}>
        <View
          style={[
            styles.avatarBox,
            {
              backgroundColor: colors.brandSoft,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <UserIcon size={14} color={colors.brand} variant="stroke" />
        </View>

        <View style={styles.customerContent}>
          <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={2}>
            {customerLabel}
          </Text>
          {item.customerName?.trim() ? (
            <Text style={[styles.metaLine, { color: colors.muted }]} numberOfLines={1}>
              {t("tempQuickQuotation.customerIdLabel", { id: item.customerId })}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.chipRow}>
        <View
          style={[
            styles.chip,
            styles.chipFlex,
            {
              backgroundColor: colors.blueSoft,
              borderColor: colors.blueBorder,
            },
          ]}
        >
          <Coins01Icon size={11} color={colors.blue} variant="stroke" />
          <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
            {currencyLabel}
          </Text>
        </View>

        <View
          style={[
            styles.chip,
            styles.chipFlex,
            {
              backgroundColor: colors.violetSoft,
              borderColor: colors.violetBorder,
            },
          ]}
        >
          <Calendar03Icon size={11} color={colors.violet} variant="stroke" />
          <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
            {formatDate(item.offerDate)}
          </Text>
        </View>
      </View>

      <View style={[styles.footerDivider, { backgroundColor: colors.borderStrong }]} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: colors.blueSoft,
              borderColor: colors.blueBorder,
            },
          ]}
          onPress={handleRevisePress}
          activeOpacity={0.78}
        >
          <Edit02Icon size={14} color={colors.blue} variant="stroke" />
          <Text style={[styles.actionBtnText, { color: colors.blue }]}>
            {t("tempQuickQuotation.revise")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: colors.greenSoft,
              borderColor: colors.greenBorder,
              opacity: isConvertDisabled ? 0.5 : 1,
            },
          ]}
          onPress={handleConvertPress}
          activeOpacity={0.78}
          disabled={isConvertDisabled}
        >
          {isRowConverting ? (
            <ActivityIndicator size="small" color={colors.green} />
          ) : (
            <>
              <Tick02Icon size={14} color={colors.green} variant="stroke" />
              <Text style={[styles.actionBtnText, { color: colors.green }]}>
                {item.isApproved
                  ? t("tempQuickQuotation.converted")
                  : t("tempQuickQuotation.convert")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export const TempQuickQuotationRow = memo(TempQuickQuotationRowComponent);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 9,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  idColumn: {
    flex: 1,
    minWidth: 0,
  },
  idBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  idText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
    flexShrink: 0,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 9,
    textTransform: "uppercase",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  avatarBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  customerContent: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  metaLine: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    minHeight: 28,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipFlex: {
    flex: 1,
  },
  chipText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: "600",
  },
  footerDivider: {
    height: 1,
    width: "100%",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 5,
    minHeight: 34,
  },
  actionBtnText: {
    fontWeight: "700",
    fontSize: 11,
  },
});
