import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Alert02Icon } from "hugeicons-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../ui/text";
import type { DocumentApprovalModule } from "../../lib/documentApprovalStatus";

type AlertTone = "amber" | "green" | "gray" | "rose";

interface StatusAlertConfig {
  tone: AlertTone;
  message: string;
}

export interface DocumentDetailStatusAlertsProps {
  module: DocumentApprovalModule;
  status: number | null | undefined;
  showApprovalLockBanner: boolean;
  cancellationReason?: string | null;
  isDark: boolean;
}

function resolveToneColors(tone: AlertTone, isDark: boolean): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
} {
  switch (tone) {
    case "green":
      return {
        backgroundColor: isDark ? "rgba(52,211,153,0.14)" : "rgba(16,185,129,0.10)",
        borderColor: isDark ? "rgba(52,211,153,0.35)" : "rgba(5,150,105,0.28)",
        textColor: isDark ? "#6EE7B7" : "#047857",
        iconColor: isDark ? "#34D399" : "#059669",
      };
    case "gray":
      return {
        backgroundColor: isDark ? "rgba(148,163,184,0.14)" : "#F1F5F9",
        borderColor: isDark ? "rgba(148,163,184,0.30)" : "rgba(100,116,139,0.22)",
        textColor: isDark ? "#CBD5E1" : "#475569",
        iconColor: isDark ? "#94A3B8" : "#64748B",
      };
    case "rose":
      return {
        backgroundColor: isDark ? "rgba(244,63,94,0.14)" : "rgba(244,63,94,0.08)",
        borderColor: isDark ? "rgba(244,63,94,0.35)" : "rgba(225,29,72,0.24)",
        textColor: isDark ? "#FDA4AF" : "#BE123C",
        iconColor: isDark ? "#FB7185" : "#E11D48",
      };
    case "amber":
    default:
      return {
        backgroundColor: isDark ? "rgba(251,191,36,0.14)" : "rgba(245,158,11,0.10)",
        borderColor: isDark ? "rgba(251,191,36,0.35)" : "rgba(217,119,6,0.24)",
        textColor: isDark ? "#FCD34D" : "#B45309",
        iconColor: isDark ? "#FBBF24" : "#D97706",
      };
  }
}

function DocumentDetailStatusAlertsComponent({
  module,
  status,
  showApprovalLockBanner,
  cancellationReason,
  isDark,
}: DocumentDetailStatusAlertsProps): React.ReactElement | null {
  const { t } = useTranslation();

  const alerts = useMemo((): StatusAlertConfig[] => {
    const items: StatusAlertConfig[] = [];

    if (showApprovalLockBanner) {
      items.push({
        tone: "amber",
        message: t("approval.lockedForNonApprover"),
      });
      return items;
    }

    switch (status) {
      case 2:
        items.push({
          tone: "green",
          message: t(`approval.approvedReadOnlyReason.${module}`),
        });
        break;
      case 3:
        items.push({
          tone: "amber",
          message: t(`approval.rejectedReadOnlyReason.${module}`),
        });
        break;
      case 4:
        items.push({
          tone: "gray",
          message: t("approval.closedReason"),
        });
        break;
      case 5: {
        const reason = cancellationReason?.trim();
        const baseMessage = t(`customerCancel.readOnlyReason.${module}`);
        items.push({
          tone: "rose",
          message: reason
            ? `${baseMessage} ${t("customerCancel.reasonLabel", { reason })}`
            : baseMessage,
        });
        break;
      }
      case 6:
        items.push({
          tone: "gray",
          message: `${t("common.salespersonClosedForRevision")} ${t("approval.readOnlySuffix")}`,
        });
        break;
      case 7:
        items.push({
          tone: "gray",
          message: `${t("common.supersededByApprovedRevision")} ${t("approval.readOnlySuffix")}`,
        });
        break;
      default:
        break;
    }

    return items;
  }, [cancellationReason, module, showApprovalLockBanner, status, t]);

  if (alerts.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {alerts.map((alert) => {
        const palette = resolveToneColors(alert.tone, isDark);
        return (
          <View
            key={`${alert.tone}-${alert.message}`}
            style={[
              styles.alert,
              {
                backgroundColor: palette.backgroundColor,
                borderColor: palette.borderColor,
              },
            ]}
          >
            <Alert02Icon
              size={18}
              color={palette.iconColor}
              variant="stroke"
              strokeWidth={1.8}
            />
            <Text style={[styles.message, { color: palette.textColor }]}>{alert.message}</Text>
          </View>
        );
      })}
    </View>
  );
}

export const DocumentDetailStatusAlerts = memo(DocumentDetailStatusAlertsComponent);

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 12,
  },
  alert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
