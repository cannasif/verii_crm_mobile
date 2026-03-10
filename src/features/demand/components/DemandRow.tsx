import React, { memo } from "react";
import { View, TouchableOpacity, StyleSheet, type GestureResponderEvent } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useTranslation } from "react-i18next";
import { Mail01Icon } from "hugeicons-react-native";
import type { DemandGetDto } from "../types";

interface DemandRowProps {
  demand: DemandGetDto;
  onPress: (id: number) => void;
  onRevision: (e: GestureResponderEvent, id: number) => void;
  onGoogleMail: (e: GestureResponderEvent, demand: DemandGetDto) => void;
  onOutlookMail: (e: GestureResponderEvent, demand: DemandGetDto) => void;
  isPending: boolean;
}

function formatDate(dateString: string | null | undefined, language: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString(language === "tr" ? "tr-TR" : "en-US");
}

function formatCurrency(amount: number, currencyCode: string, language: string): string {
  try {
    return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return (
      new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) +
      " " +
      currencyCode
    );
  }
}

function DemandRowComponent({
  demand,
  onPress,
  onRevision,
  onGoogleMail,
  onOutlookMail,
  isPending,
}: DemandRowProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { i18n } = useTranslation();

  const handleRowPress = (): void => {
    onPress(demand.id);
  };

  const handleRevisionPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onRevision(e, demand.id);
  };

  const handleGoogleMailPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onGoogleMail(e, demand);
  };

  const handleOutlookMailPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onOutlookMail(e, demand);
  };

  const cardBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.7)" : colors.card;
  const statusColor = demand.status === 1 ? colors.accent : colors.textMuted;
  const statusText = demand.status === 1 ? "Aktif" : "Pasif";

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: cardBackground, borderColor: colors.cardBorder }]}
      onPress={handleRowPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.id, { color: colors.text }]}>#{demand.id}</Text>
            {demand.offerNo && (
              <Text style={[styles.offerNo, { color: colors.textSecondary }]}>
                {demand.offerNo}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.activeBackground }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Müşteri:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
              {demand.potentialCustomerName || "-"}
            </Text>
          </View>

          {demand.representativeName && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Temsilci:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                {demand.representativeName}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Tarih:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(demand.offerDate, i18n.language)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Para Birimi:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{demand.currency}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Toplam:</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatCurrency(demand.grandTotal, demand.currency, i18n.language)}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: "#4285F4", backgroundColor: "rgba(66,133,244,0.12)" }]}
            onPress={handleGoogleMailPress}
            activeOpacity={0.7}
          >
            <Mail01Icon size={14} color="#4285F4" variant="stroke" />
            <Text style={[styles.actionButtonText, { color: "#4285F4" }]}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: "#0078D4", backgroundColor: "rgba(0,120,212,0.12)" }]}
            onPress={handleOutlookMailPress}
            activeOpacity={0.7}
          >
            <Mail01Icon size={14} color="#0078D4" variant="stroke" />
            <Text style={[styles.actionButtonText, { color: "#0078D4" }]}>Outlook</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.revisionButton, { borderColor: colors.border }]}
          onPress={handleRevisionPress}
          disabled={isPending}
          activeOpacity={0.7}
        >
          <Text style={[styles.revisionButtonText, { color: colors.text }]}>
            {isPending ? "Yükleniyor..." : "Revize Et"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export const DemandRow = memo(DemandRowComponent);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  content: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  id: {
    fontSize: 16,
    fontWeight: "600",
  },
  offerNo: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
    marginRight: 8,
    minWidth: 90,
  },
  detailValue: {
    fontSize: 13,
    flex: 1,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  revisionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  revisionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
