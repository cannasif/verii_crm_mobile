import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useTranslation } from "react-i18next";
import type { QuotationLineDetailGetDto } from "../types";

interface QuotationDetailLineRowProps {
  line: QuotationLineDetailGetDto;
  currency: string;
  isMain?: boolean;
  isRelated?: boolean;
}

const NUMERIC_CURRENCY_MAP: Record<string, string> = {
  "1": "TRY",
  "2": "USD",
  "3": "EUR",
  "4": "GBP",
};

function toIsoCurrency(currencyCode: string): string {
  const t = currencyCode?.trim() ?? "";
  if (!t) return "TRY";
  return (
    NUMERIC_CURRENCY_MAP[t] ??
    (t.length <= 3 && /^[A-Z]{3}$/i.test(t) ? t.toUpperCase() : "TRY")
  );
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  const iso = toIsoCurrency(currencyCode);
  try {
    return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: iso,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return formatNumber(amount, locale) + " " + (iso === "TRY" ? "₺" : iso);
  }
}

function QuotationDetailLineRowComponent({
  line,
  currency,
  isMain = false,
  isRelated = false,
}: QuotationDetailLineRowProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const cardBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.7)" : colors.card;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: cardBackground, borderColor: colors.cardBorder },
        isRelated && styles.relatedContainer,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
          {line.productName}
        </Text>
        {isMain && (
          <View style={[styles.mainBadge, { backgroundColor: colors.activeBackground }]}>
            <Text style={[styles.mainBadgeText, { color: colors.accent }]}>
              {t("quotation.main")}
            </Text>
          </View>
        )}
      </View>
      {line.productCode && (
        <Text style={[styles.productCode, { color: colors.textMuted }]}>{line.productCode}</Text>
      )}
      {!!(line as { unit?: string | null }).unit && (
        <Text style={[styles.productCode, { color: colors.accent }]}>
          {t("quotation.unit")}: {(line as { unit?: string | null }).unit}
        </Text>
      )}
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("quotation.quantity")}:</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatNumber(line.quantity, locale)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t("quotation.unitPrice")}:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatCurrency(line.unitPrice, currency, locale)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("quotation.discount1")}:</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatNumber(line.discountRate1, locale)}% ·{" "}
          {formatCurrency(line.discountAmount1, currency, locale)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("quotation.discount2")}:</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatNumber(line.discountRate2, locale)}% ·{" "}
          {formatCurrency(line.discountAmount2, currency, locale)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("quotation.discount3")}:</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatNumber(line.discountRate3, locale)}% ·{" "}
          {formatCurrency(line.discountAmount3, currency, locale)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t("quotation.lineTotal")}:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatCurrency(line.lineTotal, currency, locale)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t("quotation.vatRate")}:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatNumber(line.vatRate, locale)}%
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t("quotation.vatAmount")}:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatCurrency(line.vatAmount, currency, locale)}
        </Text>
      </View>
      <View style={[styles.row, styles.totalRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.text }]}>
          {t("quotation.lineGrandTotalLabel")}:
        </Text>
        <Text style={[styles.totalValue, { color: colors.accent }]}>
          {formatCurrency(line.lineGrandTotal, currency, locale)}
        </Text>
      </View>
    </View>
  );
}

export const QuotationDetailLineRow = memo(QuotationDetailLineRowComponent);

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  relatedContainer: {
    marginLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(236, 72, 153, 0.4)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  mainBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mainBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  productCode: {
    fontSize: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    fontWeight: "500",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "700",
  },
});
