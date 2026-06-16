import React, { memo, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  type GestureResponderEvent,
} from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useTranslation } from "react-i18next";
import { UserIcon, Calendar03Icon, Coins01Icon } from "hugeicons-react-native";
import type { QuotationGetDto } from "../types";
import { formatNumberBySettings, getCurrencyDisplayLabel, stripCurrencySuffixFromDisplay } from "../../../lib/currencyDisplay";
import { formatSystemDate } from "../../../lib/systemSettings";
import { resolveDocumentApprovalStatusMeta } from "../../../lib/documentApprovalStatus";
import { DocumentApprovalStatusBadge } from "../../../components/paged/DocumentApprovalStatusBadge";
import { ErpCleanupInfoLine } from "../../../components/paged/ErpCleanupInfoLine";
import { useToastStore } from "../../../store/toast";
import { ApprovalStatus } from "../../../lib/documentApprovalFilter";
import { resolveErpCleanupInfo } from "../../../lib/erpCleanupInfo";

interface QuotationRowProps {
  quotation: QuotationGetDto;
  paymentTypeLabel: string;
  onPress: (id: number) => void;
  onMenuPress: (e: GestureResponderEvent, quotation: QuotationGetDto) => void;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return formatSystemDate(dateString);
}

function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatAmountOnly(amount: unknown): string {
  const n = parseAmount(amount);
  if (n === null) return "-";
  return formatNumberBySettings(n, 2, 2);
}

function resolveRowCurrencyLabel(quotation: QuotationGetDto): string {
  const fromDisplay = quotation.currencyDisplay?.trim();
  if (fromDisplay) {
    const cleaned = fromDisplay
      .replace(/\s*\(\d+\)\s*/g, "")
      .replace(/\s*Döviz\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) return cleaned;
  }
  return getCurrencyDisplayLabel(quotation.currencyCode ?? quotation.currency);
}

function QuotationRowComponent({
  quotation,
  paymentTypeLabel,
  onPress,
  onMenuPress,
}: QuotationRowProps): React.ReactElement {
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
      menuBg: isDark ? "rgba(236,72,153,0.08)" : "rgba(219,39,119,0.05)",
      menuBorder: isDark ? "rgba(236,72,153,0.24)" : "rgba(219,39,119,0.18)",
      violet: isDark ? "#C4B5FD" : "#7C3AED",
      violetSoft: isDark ? "rgba(167,139,250,0.14)" : "rgba(124,58,237,0.08)",
      violetBorder: isDark ? "rgba(167,139,250,0.28)" : "rgba(124,58,237,0.18)",
      blue: isDark ? "#7DD3FC" : "#0284C7",
      blueSoft: isDark ? "rgba(56,189,248,0.12)" : "rgba(14,165,233,0.08)",
      blueBorder: isDark ? "rgba(56,189,248,0.28)" : "rgba(14,165,233,0.18)",
    }),
    [isDark]
  );

  const statusMeta = resolveDocumentApprovalStatusMeta(
    quotation.status,
    isDark,
    t,
    "quotation"
  );

  const currencyLabel = useMemo(
    () => resolveRowCurrencyLabel(quotation),
    [quotation]
  );

  const amountText = useMemo(() => {
    const numericTotal = parseAmount(quotation.grandTotal);
    if (numericTotal !== null) {
      return formatAmountOnly(numericTotal);
    }
    const display = quotation.grandTotalDisplay?.trim();
    if (display) {
      return stripCurrencySuffixFromDisplay(display, currencyLabel);
    }
    return "-";
  }, [currencyLabel, quotation.grandTotal, quotation.grandTotalDisplay]);

  const paymentChipValue = paymentTypeLabel;
  const erpCleanupInfo = resolveErpCleanupInfo(quotation, t);

  const showToast = useToastStore((state) => state.showToast);
  const cancellationReason = quotation.cancellationReason?.trim();
  const canShowCancellationReason =
    quotation.status === ApprovalStatus.CustomerCancelled && Boolean(cancellationReason);

  const handleStatusPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    if (!canShowCancellationReason || !cancellationReason) return;
    showToast("info", cancellationReason);
  };

  const handleRowPress = (): void => {
    onPress(quotation.id);
  };

  const handleMenuPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onMenuPress(e, quotation);
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
            <Text style={[styles.idText, { color: colors.brand }]}>#{quotation.id}</Text>
          </View>
          {quotation.offerNo ? (
            <Text style={[styles.offerNoText, { color: colors.muted }]} numberOfLines={1}>
              {quotation.offerNo}
            </Text>
          ) : null}
        </View>

        <DocumentApprovalStatusBadge
          meta={statusMeta}
          isDark={isDark}
          onPress={canShowCancellationReason ? handleStatusPress : undefined}
        />
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
          <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
            {quotation.potentialCustomerName || "-"}
          </Text>

          {quotation.representativeName ? (
            <Text style={[styles.metaLine, { color: colors.muted }]} numberOfLines={1}>
              {t("quotation.representative")}: {quotation.representativeName}
            </Text>
          ) : null}

          {quotation.koliBaskiDefinitionName ? (
            <Text style={[styles.metaLine, { color: colors.muted }]} numberOfLines={1}>
              {t("quotation.koliBaski")}: {quotation.koliBaskiDefinitionName}
            </Text>
          ) : null}

          {erpCleanupInfo ? (
            <ErpCleanupInfoLine text={erpCleanupInfo} isDark={isDark} />
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
            {paymentChipValue}
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
            {formatDate(quotation.offerDate)}
          </Text>
        </View>
      </View>

      <View style={[styles.footerDivider, { backgroundColor: colors.borderStrong }]} />

      <View style={styles.footerRow}>
        <View style={styles.totalBlock}>
          <Text style={[styles.totalLabel, { color: colors.muted }]}>
            {t("quotation.rowActions.totalAmount")}
          </Text>
          <View style={styles.totalValueRow}>
            <Text style={[styles.totalAmount, { color: colors.text }]} numberOfLines={1}>
              {amountText}
            </Text>
            <Text style={[styles.totalCurrency, { color: colors.brand }]}>{currencyLabel}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleMenuPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.menuBtn,
            {
              backgroundColor: pressed ? colors.brandSoft : colors.menuBg,
              borderColor: colors.menuBorder,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("quotation.rowActions.menuTitle")}
        >
          <Text style={[styles.menuDots, { color: colors.brand }]}>•••</Text>
        </Pressable>
      </View>
    </TouchableOpacity>
  );
}

export const QuotationRow = memo(QuotationRowComponent);

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
    gap: 3,
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
  offerNoText: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
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
  footerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 2,
  },
  totalBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  totalValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    flexWrap: "wrap",
  },
  totalAmount: {
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 22,
  },
  totalCurrency: {
    fontSize: 13,
    fontWeight: "800",
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  menuDots: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
    lineHeight: 16,
  },
});
