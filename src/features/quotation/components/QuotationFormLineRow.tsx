import React, { memo, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { Edit02Icon, Delete02Icon, Alert02Icon } from "hugeicons-react-native";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";
import { useTranslation } from "react-i18next";
import { getApiBaseUrl } from "@/constants/config";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida/hooks/useWindoDefinitionOptions";
import {
  formatQuotationLineMoney,
  formatQuotationLineQty,
  formatQuotationLineRate,
} from "../utils/quotationLineDisplayFormat";
import type { QuotationLineFormState } from "../types";

function resolveMobileImageUri(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("file://")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${getApiBaseUrl()}${path}`;
  }
  return path;
}

export interface QuotationFormLineRowProps {
  line: QuotationLineFormState;
  related?: boolean;
  isReadonly?: boolean;
  currencyLabel?: string | null;
  hideVatRate?: boolean;
  onEdit: (line: QuotationLineFormState) => void;
  onDelete: (lineId: string) => void;
}

function QuotationFormLineRowComponent({
  line,
  related = false,
  isReadonly = false,
  currencyLabel,
  hideVatRate = false,
  onEdit,
  onDelete,
}: QuotationFormLineRowProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";
  const { profilMap, demirMap, vidaMap, baskiMap } = useWindoDefinitionOptions();

  const accent = colors.accent;
  const titleText = colors.text;
  const mutedText = colors.textMuted;
  const softText = colors.textSecondary;

  const palette = useMemo(
    () => ({
      surface: related
        ? isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(15,23,42,0.02)"
        : isDark
          ? "#1a1228"
          : "#FFFFFF",
      border: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
      accentBar: isDark ? "rgba(236,72,153,0.85)" : "rgba(219,39,119,0.75)",
      codeBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
      footerBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
      footerBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
      actionEditBg: isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.07)",
      actionEditBorder: isDark ? "rgba(236,72,153,0.28)" : "rgba(219,39,119,0.18)",
      actionDeleteBg: isDark ? "rgba(239,68,68,0.10)" : "rgba(239,68,68,0.06)",
      actionDeleteBorder: isDark ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.18)",
      badgeBorder: isDark ? "rgba(236,72,153,0.35)" : "rgba(219,39,119,0.22)",
      badgeBg: isDark ? "rgba(236,72,153,0.12)" : "rgba(236,72,153,0.08)",
    }),
    [isDark, related]
  );

  const hasImage = Boolean(line.imagePath?.trim());
  const descriptionSummary = [line.description1, line.description2, line.description3]
    .filter(Boolean)
    .join(" · ");
  const definitionSummary = [
    line.profilDefinitionId
      ? `${t("common.profil")}: ${profilMap[line.profilDefinitionId] ?? `#${line.profilDefinitionId}`}`
      : "",
    line.demirDefinitionId
      ? `${t("common.demir")}: ${demirMap[line.demirDefinitionId] ?? `#${line.demirDefinitionId}`}`
      : "",
    line.vidaDefinitionId
      ? `${t("common.vida")}: ${line.vidaDefinitionName ?? vidaMap[line.vidaDefinitionId] ?? `#${line.vidaDefinitionId}`}`
      : "",
    line.baskiDefinitionId
      ? `Baskı: ${line.baskiDefinitionName ?? baskiMap[line.baskiDefinitionId] ?? `#${line.baskiDefinitionId}`}`
      : "",
    line.baskiAciklama ? `Baskı açıklaması: ${line.baskiAciklama}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const discountRates = [line.discountRate1, line.discountRate2, line.discountRate3]
    .filter((rate) => rate > 0)
    .map((rate) => `${formatQuotationLineRate(rate)}%`);
  const needsApproval = !related && line.approvalStatus === 1;
  const imageUri = resolveMobileImageUri(line.imagePath) ?? line.imagePath ?? "";

  return (
    <View
      style={[
        styles.card,
        related && styles.cardRelated,
        {
          backgroundColor: palette.surface,
          borderColor: needsApproval ? colors.warning : palette.border,
          borderWidth: needsApproval ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: palette.accentBar }]} />

      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={[styles.codeChip, { backgroundColor: palette.codeBg }]}>
            <Text style={[styles.codeText, { color: softText }]} numberOfLines={1}>
              {line.productCode || "—"}
            </Text>
          </View>

          <View style={styles.topActions}>
            {!related ? (
              <View
                style={[
                  styles.mainBadge,
                  { backgroundColor: palette.badgeBg, borderColor: palette.badgeBorder },
                ]}
              >
                <Text style={[styles.mainBadgeText, { color: accent }]}>{t("quotation.main")}</Text>
              </View>
            ) : null}
            {!isReadonly ? (
              <View style={styles.actionGroup}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      borderColor: palette.actionEditBorder,
                      backgroundColor: palette.actionEditBg,
                    },
                  ]}
                  onPress={() => onEdit(line)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.82}
                >
                  <Edit02Icon size={15} color={accent} variant="stroke" strokeWidth={1.8} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      borderColor: palette.actionDeleteBorder,
                      backgroundColor: palette.actionDeleteBg,
                    },
                  ]}
                  onPress={() => onDelete(line.id)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.82}
                >
                  <Delete02Icon size={15} color={colors.error} variant="stroke" strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.bodyRow, hasImage && styles.bodyRowWithThumb]}>
          {hasImage ? (
            <Image
              source={{ uri: imageUri }}
              style={related ? styles.thumbRelated : styles.thumb}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.bodyText}>
            <Text style={[styles.productName, { color: titleText }]} numberOfLines={2}>
              {line.productName || t("quotation.productNotSelected")}
            </Text>
            {descriptionSummary ? (
              <Text style={[styles.metaText, { color: softText }]} numberOfLines={2}>
                {descriptionSummary}
              </Text>
            ) : null}
            {definitionSummary ? (
              <Text style={[styles.metaText, { color: mutedText }]} numberOfLines={2}>
                {definitionSummary}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.pricingStrip,
            { backgroundColor: palette.footerBg, borderColor: palette.footerBorder },
          ]}
        >
          <View style={styles.pricingTopRow}>
            <Text style={[styles.pricingQty, { color: titleText }]}>
              {formatQuotationLineQty(line.quantity)}
              <Text style={[styles.pricingUnit, { color: mutedText }]}> ad.</Text>
            </Text>
            <Text style={[styles.pricingMultiply, { color: mutedText }]}>×</Text>
            <Text style={[styles.pricingUnitPrice, { color: titleText }]}>
              {formatQuotationLineMoney(line.unitPrice)}
              {currencyLabel ? (
                <Text style={[styles.pricingCurrency, { color: mutedText }]}> {currencyLabel}</Text>
              ) : null}
            </Text>
            {discountRates.length > 0 ? (
              <Text style={[styles.pricingDiscount, { color: mutedText }]}>
                {` · ${t("common.discount")} `}
                <Text style={{ color: titleText, fontWeight: "600" }}>{discountRates.join("/")}</Text>
              </Text>
            ) : null}
          </View>

          <View style={[styles.pricingDivider, { backgroundColor: palette.footerBorder }]} />

          <View style={styles.pricingBottomRow}>
            <View style={styles.pricingBreakdown}>
              <Text style={[styles.pricingBreakdownText, { color: mutedText }]}>
                <Text style={{ color: mutedText, fontWeight: "500" }}>KDV hariç </Text>
                <Text style={{ color: titleText, fontWeight: "600" }}>
                  {formatQuotationLineMoney(line.lineTotal)}
                </Text>
                {currencyLabel ? ` ${currencyLabel}` : ""}
                {!hideVatRate ? (
                  <>
                    {` · KDV ${formatQuotationLineRate(line.vatRate)}% `}
                    <Text style={{ color: titleText, fontWeight: "600" }}>
                      {formatQuotationLineMoney(line.vatAmount)}
                    </Text>
                    {currencyLabel ? ` ${currencyLabel}` : ""}
                  </>
                ) : null}
              </Text>
            </View>
            <Text style={[styles.pricingGrandTotal, { color: accent }]}>
              <Text style={[styles.pricingGrandLabel, { color: mutedText }]}>KDV dahil </Text>
              {formatQuotationLineMoney(line.lineGrandTotal)}
              {currencyLabel ? (
                <Text style={[styles.pricingGrandCurrency, { color: accent }]}> {currencyLabel}</Text>
              ) : null}
            </Text>
          </View>
        </View>

        {needsApproval ? (
          <View style={[styles.approvalBanner, { backgroundColor: colors.warning + "18" }]}>
            <Alert02Icon size={12} color={colors.warning} variant="stroke" strokeWidth={1.8} />
            <Text style={[styles.approvalText, { color: colors.warning }]}>
              {t("quotation.approvalRequired")}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export const QuotationFormLineRow = memo(QuotationFormLineRowComponent);

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  cardRelated: {
    borderRadius: 14,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  inner: {
    paddingLeft: 14,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  codeChip: {
    maxWidth: "42%",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    justifyContent: "flex-end",
  },
  mainBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  mainBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyRow: {
    gap: 0,
  },
  bodyRowWithThumb: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  thumbRelated: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  bodyText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  productName: {
    fontSize: 14.5,
    fontWeight: "700",
    lineHeight: 19,
    letterSpacing: -0.15,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
  pricingStrip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
  },
  pricingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  pricingQty: {
    fontSize: 12.5,
    fontWeight: "700",
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },
  pricingUnit: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  pricingMultiply: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
  pricingUnitPrice: {
    fontSize: 12.5,
    fontWeight: "700",
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },
  pricingCurrency: {
    fontSize: 11,
    fontWeight: "500",
  },
  pricingDiscount: {
    fontSize: 11,
    fontWeight: "500",
  },
  pricingDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  pricingBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  pricingBreakdown: {
    flex: 1,
    minWidth: 0,
  },
  pricingBreakdownText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "500",
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },
  pricingGrandTotal: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },
  pricingGrandLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  pricingGrandCurrency: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  approvalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  approvalText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
});
