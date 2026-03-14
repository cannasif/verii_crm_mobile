import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import type { Customer360QuickQuotationDto } from "../types";
import { useUIStore } from "../../../store/ui";
import {
  Invoice03Icon,
  Calendar03Icon,
  Tick02Icon,
  Alert02Icon,
  ArrowRight01Icon,
  Coins01Icon,
  CheckmarkCircle02Icon,
  TaskDaily01Icon,
} from "hugeicons-react-native";

interface Customer360QuickQuotationsTabProps {
  items: Customer360QuickQuotationDto[];
  colors: Record<string, string>;
  emptyText: string;
}

function formatDate(value?: string | null, locale = "tr-TR"): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale);
}

function formatAmount(value: number, locale = "tr-TR"): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getLocale(language: string): string {
  switch (language) {
    case "de":
      return "de-DE";
    case "en":
      return "en-US";
    default:
      return "tr-TR";
  }
}

export function Customer360QuickQuotationsTab({
  items,
  colors,
  emptyText,
}: Customer360QuickQuotationsTabProps): React.ReactElement {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { themeMode } = useUIStore();

  const isDark = themeMode === "dark";
  const locale = getLocale(i18n.language);
  const titleText = isDark ? "#FFFFFF" : "#1F2937";
  const mutedText = isDark ? "rgba(255,255,255,0.58)" : "#6B7280";
  const softText = isDark ? "rgba(255,255,255,0.42)" : "#94A3B8";
  const accent = isDark ? "#EC4899" : "#DB2777";
  const accentSecondary = isDark ? "#F97316" : "#F59E0B";
  const cardBg = isDark ? "rgba(19,11,27,0.74)" : "rgba(255,245,248,0.88)";
  const cardBgAlt = isDark ? "rgba(18,8,25,0.80)" : "rgba(255,250,252,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(219,39,119,0.10)";
  const innerBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.12)";
  const positiveBg = isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.10)";
  const positiveText = "#10B981";
  const warningBg = isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.10)";
  const warningText = "#D97706";
  const infoBg = isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.10)";
  const infoText = "#2563EB";
  const neutralBg = isDark ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.10)";
  const neutralText = mutedText;

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: cardBgAlt,
              borderColor: cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIconWrap,
              {
                backgroundColor: `${accent}12`,
                borderColor: `${accent}22`,
              },
            ]}
          >
            <Invoice03Icon size={20} color={accent} variant="stroke" />
          </View>
          <Text style={[styles.emptyTitle, { color: titleText }]}>
            {emptyText}
          </Text>
          <Text style={[styles.emptySubTitle, { color: softText }]}>
            {t("customer360.quickQuotations.title")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatListScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => {
        const converted = !!item.hasConvertedQuotation;
        const approvalSent = !!item.hasApprovalRequest;

        return (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
              },
            ]}
          >
            <View style={styles.topRow}>
              <View style={styles.leftHeader}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: `${accent}10`,
                      borderColor: `${accent}22`,
                    },
                  ]}
                >
                  <Invoice03Icon size={16} color={accent} variant="stroke" />
                </View>

                <View style={styles.headerTextWrap}>
                  <Text style={[styles.title, { color: titleText }]} numberOfLines={1}>
                    {item.quotationNo ? item.quotationNo : `#${item.id}`}
                  </Text>

                  <View style={styles.metaRow}>
                    <Calendar03Icon size={12} color={softText} variant="stroke" />
                    <Text style={[styles.meta, { color: mutedText }]}>
                      {formatDate(item.offerDate, locale)}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={!item.quotationId}
                onPress={() => {
                  if (item.quotationId) {
                    router.push(`/(tabs)/sales/quotations/${item.quotationId}`);
                  }
                }}
                style={[
                  styles.openButton,
                  {
                    backgroundColor: item.quotationId ? `${accent}10` : "transparent",
                    borderColor: item.quotationId ? `${accent}22` : cardBorder,
                    opacity: item.quotationId ? 1 : 0.45,
                  },
                ]}
              >
                <ArrowRight01Icon size={14} color={accent} variant="stroke" />
              </TouchableOpacity>
            </View>

            <View style={styles.badges}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: converted ? positiveBg : warningBg },
                ]}
              >
                {converted ? (
                  <Tick02Icon size={12} color={positiveText} variant="stroke" />
                ) : (
                  <Alert02Icon size={12} color={warningText} variant="stroke" />
                )}
                <Text
                  style={[
                    styles.badgeText,
                    { color: converted ? positiveText : warningText },
                  ]}
                  numberOfLines={1}
                >
                  {converted
                    ? t("customer360.quickQuotations.converted")
                    : t("customer360.quickQuotations.draft")}
                </Text>
              </View>

              <View
                style={[
                  styles.badge,
                  { backgroundColor: approvalSent ? infoBg : neutralBg },
                ]}
              >
                {approvalSent ? (
                  <CheckmarkCircle02Icon size={12} color={infoText} variant="stroke" />
                ) : (
                  <TaskDaily01Icon size={12} color={neutralText} variant="stroke" />
                )}
                <Text
                  style={[
                    styles.badgeText,
                    { color: approvalSent ? infoText : neutralText },
                  ]}
                  numberOfLines={1}
                >
                  {approvalSent
                    ? item.approvalStatusName ?? t("customer360.quickQuotations.sentToApproval")
                    : t("customer360.quickQuotations.notSentToApproval")}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.gridShell,
                {
                  backgroundColor: cardBgAlt,
                  borderColor: innerBorder,
                },
              ]}
            >
              <View style={styles.gridRow}>
                <View
                  style={[
                    styles.metricCard,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.70)",
                      borderColor: innerBorder,
                    },
                  ]}
                >
                  <Text style={[styles.label, { color: softText }]}>
                    {t("customer360.quickQuotations.currency")}
                  </Text>
                  <View style={styles.metricInline}>
                    <Coins01Icon size={13} color={accentSecondary} variant="stroke" />
                    <Text style={[styles.value, { color: titleText }]} numberOfLines={1}>
                      {item.currencyCode || "-"}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.metricCard,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.70)",
                      borderColor: innerBorder,
                    },
                  ]}
                >
                  <Text style={[styles.label, { color: softText }]}>
                    {t("customer360.quickQuotations.total")}
                  </Text>
                  <Text style={[styles.value, { color: titleText }]} numberOfLines={1}>
                    {formatAmount(item.totalAmount, locale)}
                  </Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View
                  style={[
                    styles.metricCard,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.70)",
                      borderColor: innerBorder,
                    },
                  ]}
                >
                  <Text style={[styles.label, { color: softText }]}>
                    {t("customer360.quickQuotations.quotationStatus")}
                  </Text>
                  <Text style={[styles.valueSmall, { color: titleText }]} numberOfLines={2}>
                    {item.quotationStatusName ?? "-"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricCard,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.70)",
                      borderColor: innerBorder,
                    },
                  ]}
                >
                  <Text style={[styles.label, { color: softText }]}>
                    {t("customer360.quickQuotations.approvalStep")}
                  </Text>
                  <Text style={[styles.valueSmall, { color: titleText }]} numberOfLines={2}>
                    {item.approvalCurrentStep
                      ? t("customer360.quickQuotations.stepValue", {
                          step: item.approvalCurrentStep,
                        })
                      : "-"}
                  </Text>
                </View>
              </View>
            </View>

            {item.description ? (
              <View
                style={[
                  styles.descriptionWrap,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.62)",
                    borderColor: innerBorder,
                  },
                ]}
              >
                <Text style={[styles.description, { color: mutedText }]}>
                  {item.description}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.footer,
                {
                  borderTopColor: innerBorder,
                },
              ]}
            >
              <Text style={[styles.footerText, { color: mutedText }]}>
                {item.approvedDate
                  ? t("customer360.quickQuotations.convertedAt", {
                      date: formatDate(item.approvedDate, locale),
                    })
                  : t("customer360.quickQuotations.notConvertedYet")}
                {item.approvalFlowDescription ? ` · ${item.approvalFlowDescription}` : ""}
              </Text>

              {item.quotationId ? (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => router.push(`/(tabs)/sales/quotations/${item.quotationId}`)}
                  style={[
                    styles.linkButton,
                    {
                      backgroundColor: `${accent}10`,
                      borderColor: `${accent}22`,
                    },
                  ]}
                >
                  <Text style={[styles.link, { color: accent }]}>
                    {t("customer360.quickQuotations.openQuotation")}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingTop: 4,
    paddingBottom: 118,
    gap: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  emptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 19,
  },
  emptySubTitle: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "400",
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  leftHeader: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  meta: {
    fontSize: 10.5,
    fontWeight: "400",
  },
  openButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  badge: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
    flexShrink: 1,
  },
  gridShell: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    gap: 9,
  },
  gridRow: {
    flexDirection: "row",
    gap: 4,
  },
  metricCard: {
    flex: 1,
    minHeight: 62,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  label: {
    fontSize: 9.5,
    fontWeight: "400",
    marginBottom: 5,
  },
  metricInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  value: {
    fontSize: 12,
    fontWeight: "600",
  },
  valueSmall: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 15,
  },
  descriptionWrap: {
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "400",
  },
  footer: {
    gap: 5,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
  },
  footerText: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "400",
  },
  linkButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  link: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});