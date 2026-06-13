import React, { memo, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  type GestureResponderEvent,
} from "react-native";
import { Text } from "../ui/text";
import { useUIStore } from "../../store/ui";
import { useTranslation } from "react-i18next";
import { formatSystemDate } from "../../lib/systemSettings";
import { resolveDocumentApprovalStatusMeta } from "../../lib/documentApprovalStatus";
import type { DocumentApprovalModule } from "../../lib/documentApprovalStatus";
import { useToastStore } from "../../store/toast";
import { ApprovalStatus } from "../../lib/documentApprovalFilter";
import { DocumentApprovalStatusIcon } from "./DocumentApprovalStatusIcon";

export interface SalesDocumentCompactListRowProps {
  id: number;
  offerNo?: string | null;
  customerName: string;
  offerDate?: string | null;
  status?: number | null;
  cancellationReason?: string | null;
  amountText: string;
  currencyLabel: string;
  statusModule: DocumentApprovalModule;
  menuAccessibilityLabel?: string;
  onPress: (id: number) => void;
  onMenuPress?: (e: GestureResponderEvent, id: number) => void;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return formatSystemDate(dateString);
}

function SalesDocumentCompactListRowComponent({
  id,
  offerNo,
  customerName,
  offerDate,
  status,
  cancellationReason,
  amountText,
  currencyLabel,
  statusModule,
  menuAccessibilityLabel,
  onPress,
  onMenuPress,
}: SalesDocumentCompactListRowProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";

  const colors = useMemo(
    () => ({
      brand: isDark ? "#EC4899" : "#DB2777",
      text: isDark ? "#F8FAFC" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      menuPressed: isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.08)",
    }),
    [isDark]
  );

  const statusMeta = resolveDocumentApprovalStatusMeta(status, isDark, t, statusModule);

  const showToast = useToastStore((state) => state.showToast);
  const trimmedReason = cancellationReason?.trim();
  const canShowCancellationReason =
    status === ApprovalStatus.CustomerCancelled && Boolean(trimmedReason);

  const handleStatusPress = (): void => {
    if (!canShowCancellationReason || !trimmedReason) return;
    showToast("info", trimmedReason);
  };

  const handleRowPress = (): void => {
    onPress(id);
  };

  const handleMenuPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onMenuPress?.(e, id);
  };

  const trimmedOfferNo = offerNo?.trim();

  return (
    <TouchableOpacity activeOpacity={0.72} onPress={handleRowPress} style={styles.row}>
      <DocumentApprovalStatusIcon
        status={status}
        isDark={isDark}
        accessibilityLabel={statusMeta.label}
        onPress={canShowCancellationReason ? handleStatusPress : undefined}
      />

      <View style={styles.content}>
        <View style={styles.topLine}>
          <View style={styles.idBlock}>
            <Text style={[styles.idText, { color: colors.brand }]}>#{id}</Text>
            {trimmedOfferNo ? (
              <Text style={[styles.offerNo, { color: colors.muted }]} numberOfLines={1}>
                {trimmedOfferNo}
              </Text>
            ) : null}
          </View>

          <View style={styles.amountBlock}>
            <Text style={[styles.amount, { color: colors.text }]} numberOfLines={1}>
              {amountText}
            </Text>
            <Text style={[styles.currency, { color: colors.brand }]} numberOfLines={1}>
              {currencyLabel}
            </Text>
          </View>
        </View>

        <View style={styles.bottomLine}>
          <Text style={[styles.customer, { color: colors.text }]} numberOfLines={1}>
            {customerName}
          </Text>
          <Text style={[styles.date, { color: colors.muted }]} numberOfLines={1}>
            {formatDate(offerDate)}
          </Text>
        </View>
      </View>

      {onMenuPress && menuAccessibilityLabel ? (
        <Pressable
          onPress={handleMenuPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.menuBtn,
            pressed && { backgroundColor: colors.menuPressed },
          ]}
          accessibilityRole="button"
          accessibilityLabel={menuAccessibilityLabel}
        >
          <Text style={[styles.menuDots, { color: colors.brand }]}>•••</Text>
        </Pressable>
      ) : null}
    </TouchableOpacity>
  );
}

export const SalesDocumentCompactListRow = memo(SalesDocumentCompactListRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    minHeight: 58,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  idBlock: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  idText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  offerNo: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
  },
  amountBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    flexShrink: 0,
    maxWidth: "46%",
  },
  amount: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
  },
  currency: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
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
  menuBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuDots: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    lineHeight: 15,
  },
});
