import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock04Icon,
  FileEditIcon,
} from "hugeicons-react-native";
import { ApprovalStatus } from "../../lib/documentApprovalFilter";

export interface DocumentApprovalStatusIconProps {
  status: number | null | undefined;
  isDark: boolean;
  accessibilityLabel: string;
  onPress?: () => void;
}

interface StatusIconConfig {
  bg: string;
  border: string;
  icon: React.ReactElement;
}

function resolveStatusIconConfig(
  status: number | null | undefined,
  isDark: boolean
): StatusIconConfig {
  switch (status) {
    case ApprovalStatus.Approved:
      return {
        bg: isDark ? "rgba(52,211,153,0.16)" : "rgba(16,185,129,0.12)",
        border: isDark ? "rgba(52,211,153,0.40)" : "rgba(16,185,129,0.32)",
        icon: (
          <CheckmarkCircle02Icon
            size={14}
            color={isDark ? "#34d399" : "#059669"}
            variant="stroke"
            strokeWidth={2.2}
          />
        ),
      };
    case ApprovalStatus.Rejected:
      return {
        bg: isDark ? "rgba(244,114,182,0.16)" : "rgba(219,39,119,0.10)",
        border: isDark ? "rgba(244,114,182,0.40)" : "rgba(219,39,119,0.32)",
        icon: (
          <Cancel01Icon
            size={13}
            color={isDark ? "#f472b6" : "#DB2777"}
            variant="stroke"
            strokeWidth={2.4}
          />
        ),
      };
    case ApprovalStatus.CustomerCancelled:
      return {
        bg: isDark ? "rgba(244,114,182,0.16)" : "rgba(244,63,94,0.10)",
        border: isDark ? "rgba(244,114,182,0.40)" : "rgba(244,63,94,0.32)",
        icon: (
          <Cancel01Icon
            size={13}
            color={isDark ? "#f472b6" : "#be123c"}
            variant="stroke"
            strokeWidth={2.4}
          />
        ),
      };
    case ApprovalStatus.SalespersonClosedForRevision:
      return {
        bg: isDark ? "rgba(251,146,60,0.16)" : "rgba(249,115,22,0.10)",
        border: isDark ? "rgba(251,146,60,0.40)" : "rgba(249,115,22,0.32)",
        icon: (
          <Alert02Icon
            size={14}
            color={isDark ? "#fb923c" : "#c2410c"}
            variant="stroke"
            strokeWidth={2.2}
          />
        ),
      };
    case ApprovalStatus.Waiting:
      return {
        bg: isDark ? "rgba(251,191,36,0.16)" : "rgba(245,158,11,0.12)",
        border: isDark ? "rgba(251,191,36,0.40)" : "rgba(245,158,11,0.34)",
        icon: (
          <Clock04Icon
            size={14}
            color={isDark ? "#fbbf24" : "#D97706"}
            variant="stroke"
            strokeWidth={2.2}
          />
        ),
      };
    case ApprovalStatus.Closed:
      return {
        bg: isDark ? "rgba(148,163,184,0.14)" : "rgba(148,163,184,0.16)",
        border: isDark ? "rgba(148,163,184,0.34)" : "rgba(100,116,139,0.28)",
        icon: (
          <Alert02Icon
            size={14}
            color={isDark ? "#94A3B8" : "#475569"}
            variant="stroke"
            strokeWidth={2.2}
          />
        ),
      };
    case ApprovalStatus.NotRequired:
    default:
      return {
        bg: isDark ? "rgba(148,163,184,0.14)" : "rgba(148,163,184,0.16)",
        border: isDark ? "rgba(148,163,184,0.34)" : "rgba(148,163,184,0.34)",
        icon: (
          <FileEditIcon
            size={13}
            color={isDark ? "#94A3B8" : "#475569"}
            variant="stroke"
            strokeWidth={2.2}
          />
        ),
      };
  }
}

export function DocumentApprovalStatusIcon({
  status,
  isDark,
  accessibilityLabel,
  onPress,
}: DocumentApprovalStatusIconProps): React.ReactElement {
  const config = resolveStatusIconConfig(status, isDark);

  const badge = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      {config.icon}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {badge}
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="image">
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
