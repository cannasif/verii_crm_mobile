import React, { memo } from "react";
import { View, TouchableOpacity, StyleSheet, type GestureResponderEvent } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useTranslation } from "react-i18next";
import type { ApprovalActionGetDto } from "../types";

interface ApprovalRowProps {
  approval: ApprovalActionGetDto;
  onPress: (approvalRequestId: number) => void;
  onApprove: (e: GestureResponderEvent, approval: ApprovalActionGetDto) => void;
  onReject: (e: GestureResponderEvent, approval: ApprovalActionGetDto) => void;
  isPending: boolean;
}

function ApprovalRowComponent({
  approval,
  onPress,
  onApprove,
  onReject,
  isPending,
}: ApprovalRowProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { i18n } = useTranslation();

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === "tr" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRowPress = (): void => {
    onPress(approval.approvalRequestId);
  };

  const handleApprovePress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onApprove(e, approval);
  };

  const handleRejectPress = (e: GestureResponderEvent): void => {
    e.stopPropagation();
    onReject(e, approval);
  };

  const statusColor = approval.status === 1 ? colors.accent : colors.textMuted;
  const cardBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.7)" : colors.card;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: cardBackground, borderColor: colors.cardBorder }]}
      onPress={handleRowPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.requestId, { color: colors.text }]}>
            #{approval.approvalRequestId}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.activeBackground }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {approval.statusName || "Bekliyor"}
            </Text>
          </View>
        </View>

        {approval.approvalRequestDescription && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {approval.approvalRequestDescription}
          </Text>
        )}

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Adım:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{approval.stepOrder}</Text>
          </View>

          {approval.approvedByUserFullName && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Onaylayan:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {approval.approvedByUserFullName}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Tarih:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(approval.actionDate)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.approveButton, { backgroundColor: colors.accent }]}
            onPress={handleApprovePress}
            disabled={isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>✓ Onayla</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rejectButton, { backgroundColor: colors.error }]}
            onPress={handleRejectPress}
            disabled={isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>✕ Reddet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ApprovalRow = memo(ApprovalRowComponent);

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
  requestId: {
    fontSize: 16,
    fontWeight: "600",
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
  description: {
    fontSize: 14,
    lineHeight: 20,
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
    minWidth: 80,
  },
  detailValue: {
    fontSize: 13,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  approveButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
