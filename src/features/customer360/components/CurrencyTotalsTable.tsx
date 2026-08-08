import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { Customer360CurrencyAmountDto } from "../types/customer360-types";

interface CurrencyTotalsTableProps {
  items: Customer360CurrencyAmountDto[];
  colors: Record<string, string>;
  formatAmount: (value: number) => string;
  title: string;
  currencyLabel: string;
  demandAmountLabel: string;
  quotationAmountLabel: string;
  orderAmountLabel: string;
  noDataKey: string;
}

function getCurrencySymbol(currency?: string | null): string {
  const code = (currency ?? "").toUpperCase().trim();
  switch (code) {
    case "TRY":
      return "₺";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "CHF":
        return "₣";
    case "JPY":
      return "¥";
    default:
      return code || "—";
  }
}

export function CurrencyTotalsTable({
  items,
  formatAmount,
  currencyLabel,
  demandAmountLabel,
  quotationAmountLabel,
  orderAmountLabel,
  noDataKey,
}: CurrencyTotalsTableProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const list = items ?? [];
  const sectionBg = isDark ? "rgba(18,8,25,0.58)" : "rgba(255,250,252,0.82)";
  const sectionBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(219,39,119,0.06)";
  const tableBg = isDark ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.78)";
  const headerBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.022)";
  const gridLine = isDark ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.045)";
  const titleText = isDark ? "#F8FAFC" : "#1F2937";
  const mutedText = isDark ? "rgba(255,255,255,0.48)" : "#6B7280";
  const softText = isDark ? "rgba(255,255,255,0.36)" : "#94A3B8";
  const accent = isDark ? "#F472B6" : "#DB2777";

  if (list.length === 0) {
    return (
      <View
        style={[
          styles.section,
          {
            backgroundColor: sectionBg,
            borderColor: sectionBorder,
          },
        ]}
      >
        <View
          style={[
            styles.emptyWrap,
            {
              backgroundColor: tableBg,
              borderColor: gridLine,
            },
          ]}
        >
          <Text style={[styles.noData, { color: mutedText }]}>{noDataKey}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: sectionBg,
          borderColor: sectionBorder,
        },
      ]}
    >
      <View
        style={[
          styles.table,
          {
            backgroundColor: tableBg,
            borderColor: gridLine,
          },
        ]}
      >
        <View
          style={[
            styles.headerRow,
            {
              backgroundColor: headerBg,
              borderBottomColor: gridLine,
            },
          ]}
        >
          <View style={[styles.cellBase, styles.currencyColumn, styles.rightDivider, { borderRightColor: gridLine }]}>
            <Text style={[styles.headerCell, { color: softText }]} numberOfLines={2}>
              {currencyLabel}
            </Text>
          </View>

          <View style={[styles.cellBase, styles.rightDivider, { borderRightColor: gridLine }]}>
            <Text style={[styles.headerCell, { color: softText }]} numberOfLines={2}>
              {demandAmountLabel}
            </Text>
          </View>

          <View style={[styles.cellBase, styles.rightDivider, { borderRightColor: gridLine }]}>
            <Text style={[styles.headerCell, { color: softText }]} numberOfLines={2}>
              {quotationAmountLabel}
            </Text>
          </View>

          <View style={styles.cellBase}>
            <Text style={[styles.headerCell, { color: softText }]} numberOfLines={2}>
              {orderAmountLabel}
            </Text>
          </View>
        </View>

        {list.map((row, index) => (
          <View
            key={`${row.currency}-${index}`}
            style={[
              styles.dataRow,
              {
                borderBottomWidth: index < list.length - 1 ? 1 : 0,
                borderBottomColor: gridLine,
              },
            ]}
          >
            <View style={[styles.cellBase, styles.currencyColumn, styles.rightDivider, { borderRightColor: gridLine }]}>
              <View
                style={[
                  styles.currencyBadge,
                  {
                    backgroundColor: `${accent}0F`,
                    borderColor: `${accent}16`,
                  },
                ]}
              >
                <Text style={[styles.currencyText, { color: titleText }]} numberOfLines={1}>
                  {getCurrencySymbol(row.currency)}
                </Text>
              </View>
            </View>

            <View style={[styles.cellBase, styles.rightDivider, { borderRightColor: gridLine }]}>
              <Text style={[styles.valueCell, { color: titleText }]} numberOfLines={1}>
                {formatAmount(row.demandAmount)}
              </Text>
            </View>

            <View style={[styles.cellBase, styles.rightDivider, { borderRightColor: gridLine }]}>
              <Text style={[styles.valueCell, { color: titleText }]} numberOfLines={1}>
                {formatAmount(row.quotationAmount)}
              </Text>
            </View>

            <View style={styles.cellBase}>
              <Text style={[styles.valueCell, { color: titleText }]} numberOfLines={1}>
                {formatAmount(row.orderAmount)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 2,
  },
  emptyWrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  noData: {
    fontSize: 9,
    fontWeight: "400",
    lineHeight: 12,
    textAlign: "center",
  },
  table: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    minHeight: 28,
    borderBottomWidth: 1,
  },
  dataRow: {
    flexDirection: "row",
    minHeight: 34,
    alignItems: "center",
  },
  cellBase: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  currencyColumn: {
    flex: 0.62,
  },
  rightDivider: {
    borderRightWidth: 1,
  },
  headerCell: {
    fontSize: 6.5,
    fontWeight: "500",
    lineHeight: 8,
    textAlign: "center",
    letterSpacing: 0,
  },
  valueCell: {
    fontSize: 8.5,
    fontWeight: "500",
    lineHeight: 10,
    textAlign: "center",
  },
  currencyBadge: {
    minWidth: 22,
    height: 18,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyText: {
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 9,
  },
});