import React, { memo, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, type GestureResponderEvent } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useTranslation } from "react-i18next";
import {
  Mail01Icon,
  UserIcon,
  Coins01Icon,
  Calendar03Icon,
} from "hugeicons-react-native";
import type { OrderGetDto } from "../types";
import { getCurrencyDisplayLabel, resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";

interface OrderRowProps {
  order: OrderGetDto;
  onPress: (id: number) => void;
  onRevision: (e: GestureResponderEvent, id: number) => void;
  onGoogleMail: (e: GestureResponderEvent, order: OrderGetDto) => void;
  onOutlookMail: (e: GestureResponderEvent, order: OrderGetDto) => void;
  isPending: boolean;
}

function formatDate(dateString: string | null | undefined, language: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString(language === "tr" ? "tr-TR" : "en-US");
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

function formatCurrency(amount: unknown, currencyCode: string | number | null | undefined, language: string): string {
  const n = parseAmount(amount);
  if (n === null) return "-";
  const code = resolveCurrencyIsoCode(currencyCode);
  try {
    return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return (
      new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n) +
      " " +
      code
    );
  }
}

function OrderRowComponent({
  order,
  onPress,
  onRevision,
  onGoogleMail,
  onOutlookMail,
  isPending,
}: OrderRowProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const { i18n } = useTranslation();
  const isDark = themeMode === "dark";

  const colors = useMemo(
    () => ({
      cardBg: isDark ? "rgba(17,17,24,0.95)" : "rgba(255,255,255,0.98)",
      border: isDark ? "rgba(255,255,255,0.16)" : "rgba(148,163,184,0.26)",
      borderStrong: isDark ? "rgba(236,72,153,0.28)" : "rgba(219,39,119,0.22)",
      brand: isDark ? "#EC4899" : "#DB2777",
      brandSoft: isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.08)",
      text: isDark ? "#F8FAFC" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      blue: "#38BDF8",
      blueSoft: "rgba(56,189,248,0.10)",
      softBg: isDark ? "rgba(255,255,255,0.035)" : "#F8FAFC",
      shadow: isDark ? "#000000" : "#0F172A",
      green: "#10B981",
      greenSoft: "rgba(16,185,129,0.10)",
    }),
    [isDark]
  );

  const handleRowPress = (): void => {
    onPress(order.id);
  };

  const handleRevisionPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onRevision(e, order.id);
  };

  const handleGoogleMailPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onGoogleMail(e, order);
  };

  const handleOutlookMailPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onOutlookMail(e, order);
  };

  const canRevise = order.status === 0 || order.status === 3;
  const statusColor = order.status === 1 ? colors.green : colors.muted;
  const statusBg = order.status === 1 ? colors.greenSoft : colors.softBg;
  const statusText = order.status === 1 ? "Aktif" : "Pasif";

  const totalFormatted =
    order.grandTotalDisplay?.trim() ||
    formatCurrency(order.grandTotal, order.currencyCode || order.currency, i18n.language);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
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
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <View
            style={[
              styles.idBadge,
              {
                backgroundColor: colors.brandSoft,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Text style={[styles.idText, { color: colors.brand }]}>#{order.id}</Text>
          </View>
          {order.offerNo ? (
            <Text style={[styles.offerNoInline, { color: colors.muted }]} numberOfLines={1}>
              {order.offerNo}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: statusBg,
              borderColor: `${statusColor}35`,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.primaryInfoRow}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: colors.brandSoft,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <UserIcon size={15} color={colors.brand} variant="stroke" />
          </View>

          <View style={styles.primaryInfoContent}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Müşteri</Text>
            <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
              {order.potentialCustomerName || "-"}
            </Text>
            {order.representativeName ? (
              <Text style={[styles.customerSubText, { color: colors.muted }]} numberOfLines={1}>
                Temsilci: {order.representativeName}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.metaChip,
              {
                backgroundColor: colors.blueSoft,
                borderColor: "rgba(56,189,248,0.20)",
              },
            ]}
          >
            <Coins01Icon size={13} color={colors.blue} variant="stroke" />
            <Text style={[styles.metaChipText, { color: colors.text }]} numberOfLines={1}>
              {order.currencyDisplay?.trim() || getCurrencyDisplayLabel(order.currencyCode || order.currency)}
            </Text>
          </View>

          <View
            style={[
              styles.metaChip,
              {
                backgroundColor: colors.softBg,
                borderColor: colors.border,
              },
            ]}
          >
            <Calendar03Icon size={13} color={colors.muted} variant="stroke" />
            <Text style={[styles.metaChipText, { color: colors.text }]} numberOfLines={1}>
              {formatDate(order.offerDate, i18n.language)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.totalStrip,
            {
              backgroundColor: colors.brandSoft,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <Text style={[styles.totalLabel, { color: colors.muted }]}>Toplam</Text>
          <Text style={[styles.totalAmount, { color: colors.brand }]} numberOfLines={1}>
            {totalFormatted}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: colors.blueSoft,
              borderColor: "rgba(56,189,248,0.24)",
            },
          ]}
          onPress={handleGoogleMailPress}
          activeOpacity={0.78}
        >
          <Mail01Icon size={15} color={colors.blue} variant="stroke" />
          <Text style={[styles.actionBtnText, { color: colors.blue }]}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: "rgba(0,120,212,0.10)",
              borderColor: "rgba(0,120,212,0.24)",
            },
          ]}
          onPress={handleOutlookMailPress}
          activeOpacity={0.78}
        >
          <Mail01Icon size={15} color="#0078D4" variant="stroke" />
          <Text style={[styles.actionBtnText, { color: "#0078D4" }]}>Outlook</Text>
        </TouchableOpacity>
      </View>

      {canRevise ? (
        <TouchableOpacity
          style={[
            styles.revisionBtn,
            {
              backgroundColor: colors.softBg,
              borderColor: colors.border,
            },
          ]}
          onPress={handleRevisionPress}
          disabled={isPending}
          activeOpacity={0.78}
        >
          <Text style={[styles.revisionBtnText, { color: colors.text }]}>
            {isPending ? "Yükleniyor..." : "Revize Et"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

export const OrderRow = memo(OrderRowComponent);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.2,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    marginBottom: 0,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  idBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  idText: {
    fontWeight: "800",
    fontSize: 13,
  },
  offerNoInline: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 10.5,
    textTransform: "uppercase",
  },
  cardBody: {
    gap: 10,
  },
  primaryInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  primaryInfoContent: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  customerSubText: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaChip: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaChipText: {
    flex: 1,
    fontSize: 10.8,
    fontWeight: "500",
    lineHeight: 13,
  },
  totalStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontWeight: "700",
    fontSize: 11.5,
  },
  revisionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  revisionBtnText: {
    fontWeight: "700",
    fontSize: 12.5,
  },
});
