import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  Calendar03Icon,
  Coins01Icon,
  Invoice03Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Wallet01Icon,
} from "hugeicons-react-native";
import type {
  Customer360ErpBalanceDto,
  Customer360ErpMovementDto,
} from "../types";

interface Customer360ErpMovementsTabProps {
  balance?: Customer360ErpBalanceDto;
  items: Customer360ErpMovementDto[];
  colors: Record<string, string>;
  emptyText: string;
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale);
}

function formatAmount(value: number | null | undefined, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function getBalanceStatusTone(status: string | undefined, isDark: boolean) {
  const normalized = (status ?? "").toLocaleLowerCase("tr-TR");

  if (
    normalized.includes("alacak") ||
    normalized.includes("pozitif") ||
    normalized.includes("artı")
  ) {
    return {
      color: "#10B981",
      bg: isDark ? "rgba(16,185,129,0.10)" : "rgba(16,185,129,0.08)",
      border: isDark ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.14)",
    };
  }

  if (
    normalized.includes("borç") ||
    normalized.includes("negatif") ||
    normalized.includes("eksi")
  ) {
    return {
      color: "#F59E0B",
      bg: isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)",
      border: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.14)",
    };
  }

  return {
    color: isDark ? "#CBD5E1" : "#64748B",
    bg: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
  };
}

function SummaryStripItem({
  icon,
  label,
  value,
  textColor,
  valueColor,
  bg,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  textColor: string;
  valueColor: string;
  bg: string;
  border: string;
}): React.ReactElement {
  return (
    <View
      style={[
        styles.summaryStripItem,
        {
          backgroundColor: bg,
          borderColor: border,
        },
      ]}
    >
      <View style={styles.summaryStripTop}>
        <View style={[styles.summaryStripIconWrap, { backgroundColor: bg, borderColor: border }]}>
          {icon}
        </View>
        <Text style={[styles.summaryStripLabel, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <Text style={[styles.summaryStripValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MetaTile({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: Record<string, string>;
}): React.ReactElement {
  return (
    <View
      style={[
        styles.metaItem,
        {
          backgroundColor: colors.cardSoft ?? colors.surface ?? colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function MovementCard({
  item,
  colors,
  locale,
  isDark,
}: {
  item: Customer360ErpMovementDto;
  colors: Record<string, string>;
  locale: string;
  isDark: boolean;
}): React.ReactElement {
  const debit = item.borc ?? 0;
  const credit = item.alacak ?? 0;
  const isDebitDominant = debit >= credit;
  const toneColor = isDebitDominant ? "#F59E0B" : "#10B981";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.cardHeaderIconWrap,
              {
                backgroundColor: isDark
                  ? `${toneColor}14`
                  : `${toneColor}10`,
                borderColor: isDark
                  ? `${toneColor}24`
                  : `${toneColor}18`,
              },
            ]}
          >
            {isDebitDominant ? (
              <ArrowUp01Icon size={13} color={toneColor} variant="stroke" />
            ) : (
              <ArrowDown01Icon size={13} color={toneColor} variant="stroke" />
            )}
          </View>

          <View style={styles.cardHeaderTextWrap}>
            <Text style={[styles.cardDate, { color: colors.textMuted }]}>
              {formatDate(item.tarih, locale)}
            </Text>
            <Text style={[styles.cardCurrency, { color: colors.text }]}>
              {item.paraBirimi || "-"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.currencyBadge,
            {
              backgroundColor: colors.cardSoft ?? colors.surface ?? colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Coins01Icon size={11} color={colors.textMuted} variant="stroke" />
          <Text style={[styles.currencyBadgeText, { color: colors.textMuted }]}>
            {item.paraBirimi || "-"}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
        {item.aciklama || item.belgeNo || "-"}
      </Text>

      <View style={styles.metaGrid}>
        <MetaTile label="Belge No" value={item.belgeNo || "-"} colors={colors} />
        <MetaTile label="Vade" value={formatDate(item.vadeTarihi, locale)} colors={colors} />
        <MetaTile label="Borç" value={formatAmount(item.borc, locale)} colors={colors} />
        <MetaTile label="Alacak" value={formatAmount(item.alacak, locale)} colors={colors} />
        <MetaTile
          label="TL Bakiye"
          value={formatAmount(item.tarihSiraliTlBakiye, locale)}
          colors={colors}
        />
        <MetaTile
          label="Döviz Bakiye"
          value={formatAmount(item.tarihSiraliDovizBakiye, locale)}
          colors={colors}
        />
      </View>
    </View>
  );
}

export function Customer360ErpMovementsTab({
  balance,
  items,
  colors,
  emptyText,
}: Customer360ErpMovementsTabProps): React.ReactElement {
  const { i18n, t } = useTranslation();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const locale =
    i18n.language === "tr" ? "tr-TR" : i18n.language === "de" ? "de-DE" : "en-US";

  const balanceTone = getBalanceStatusTone(balance?.bakiyeDurumu, isDark);

  const debitTone = {
    color: "#F59E0B",
    bg: isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)",
    border: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.14)",
  };

  const creditTone = {
    color: "#10B981",
    bg: isDark ? "rgba(16,185,129,0.10)" : "rgba(16,185,129,0.08)",
    border: isDark ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.14)",
  };

  return (
    <FlatListScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summaryStrip}>
        <SummaryStripItem
          label={t("customer360.erpMovements.summary.totalDebit")}
          value={formatAmount(balance?.toplamBorc, locale)}
          textColor={colors.textMuted}
          valueColor={debitTone.color}
          bg={debitTone.bg}
          border={debitTone.border}
          icon={<ArrowUp01Icon size={14} color={debitTone.color} variant="stroke" />}
        />

        <SummaryStripItem
          label={t("customer360.erpMovements.summary.totalCredit")}
          value={formatAmount(balance?.toplamAlacak, locale)}
          textColor={colors.textMuted}
          valueColor={creditTone.color}
          bg={creditTone.bg}
          border={creditTone.border}
          icon={<ArrowDown01Icon size={14} color={creditTone.color} variant="stroke" />}
        />

        <SummaryStripItem
          label={t("customer360.erpMovements.summary.balance")}
          value={formatAmount(balance?.bakiyeTutari, locale)}
          textColor={colors.textMuted}
          valueColor={balanceTone.color}
          bg={balanceTone.bg}
          border={balanceTone.border}
          icon={<Wallet01Icon size={14} color={balanceTone.color} variant="stroke" />}
        />
      </View>

      {items.length === 0 ? (
        <View
          style={[
            styles.emptyWrap,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIconWrap,
              {
                backgroundColor: colors.cardSoft ?? colors.surface ?? colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Invoice03Icon size={16} color={colors.textMuted} variant="stroke" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>{emptyText}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <MovementCard
              key={`${item.cariKod}-${item.tarih ?? index}-${item.belgeNo ?? index}`}
              item={item}
              colors={colors}
              locale={locale}
              isDark={isDark}
            />
          ))}
        </View>
      )}
    </FlatListScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingTop: 8,
    paddingBottom: 124,
    gap: 20,
  },
  summaryStrip: {
    gap: 10,
    marginBottom: 6,
  },
  summaryStripItem: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  summaryStripTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 6,
  },
  summaryStripIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStripLabel: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
    flex: 1,
  },
  summaryStripValue: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  emptyWrap: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  emptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  list: {
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  cardHeaderIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardDate: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
    marginBottom: 2,
  },
  cardCurrency: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  currencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  currencyBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaItem: {
    width: "48%",
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  metaLabel: {
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
});