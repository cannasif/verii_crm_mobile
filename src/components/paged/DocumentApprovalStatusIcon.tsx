import React, { memo, useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock04Icon,
  FileEditIcon,
} from "hugeicons-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "../ui/text";
import { ApprovalStatus } from "../../lib/documentApprovalFilter";
import {
  hasExpandableDocumentApprovalStatusLabel,
  type DocumentApprovalStatusMeta,
} from "../../lib/documentApprovalStatus";

export interface DocumentApprovalStatusIconProps {
  status: number | null | undefined;
  isDark: boolean;
  statusMeta: DocumentApprovalStatusMeta;
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
    case ApprovalStatus.SupersededByApprovedRevision:
      return {
        bg: isDark ? "rgba(129,140,248,0.16)" : "rgba(99,102,241,0.10)",
        border: isDark ? "rgba(129,140,248,0.40)" : "rgba(99,102,241,0.32)",
        icon: (
          <Alert02Icon
            size={14}
            color={isDark ? "#818cf8" : "#4f46e5"}
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

function DocumentApprovalStatusIconComponent({
  status,
  isDark,
  statusMeta,
  onPress,
}: DocumentApprovalStatusIconProps): React.ReactElement {
  const { t } = useTranslation();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const config = resolveStatusIconConfig(status, isDark);
  const canExpand = hasExpandableDocumentApprovalStatusLabel(statusMeta);

  const showTooltip = useCallback((): void => {
    if (canExpand) {
      setTooltipVisible(true);
    }
  }, [canExpand]);

  const hideTooltip = useCallback((): void => {
    setTooltipVisible(false);
  }, []);

  useEffect(() => {
    if (!tooltipVisible) return;
    const timer = setTimeout(hideTooltip, 2800);
    return () => clearTimeout(timer);
  }, [hideTooltip, tooltipVisible]);

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

  const tooltip = tooltipVisible ? (
    <View
      pointerEvents="none"
      style={[
        styles.tooltip,
        {
          backgroundColor: isDark ? "rgba(39, 39, 42, 0.97)" : "rgba(24, 24, 27, 0.94)",
          borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.1)",
        },
      ]}
    >
      <Text unstyled disableThemeColor style={styles.tooltipText}>
        {statusMeta.label}
      </Text>
    </View>
  ) : null;

  if (onPress) {
    return (
      <View style={[styles.wrap, tooltipVisible && styles.wrapActive]}>
        {tooltip}
        <Pressable
          onPress={onPress}
          onLongPress={showTooltip}
          onPressOut={hideTooltip}
          onHoverIn={Platform.OS === "web" && canExpand ? showTooltip : undefined}
          onHoverOut={Platform.OS === "web" ? hideTooltip : undefined}
          delayLongPress={320}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={statusMeta.label}
          accessibilityHint={canExpand ? t("common.statusBadgeHoldHint") : undefined}
        >
          {badge}
        </Pressable>
      </View>
    );
  }

  if (!canExpand) {
    return (
      <View accessibilityLabel={statusMeta.label} accessibilityRole="image">
        {badge}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, tooltipVisible && styles.wrapActive]}>
      {tooltip}
      <Pressable
        onLongPress={showTooltip}
        onPressOut={hideTooltip}
        onHoverIn={Platform.OS === "web" ? showTooltip : undefined}
        onHoverOut={Platform.OS === "web" ? hideTooltip : undefined}
        delayLongPress={320}
        hitSlop={6}
        accessibilityRole="image"
        accessibilityLabel={statusMeta.label}
        accessibilityHint={t("common.statusBadgeHoldHint")}
      >
        {badge}
      </Pressable>
    </View>
  );
}

export const DocumentApprovalStatusIcon = memo(DocumentApprovalStatusIconComponent);

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    flexShrink: 0,
    zIndex: 1,
  },
  wrapActive: {
    zIndex: 20,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltip: {
    position: "absolute",
    left: 0,
    bottom: "100%",
    marginBottom: 6,
    minWidth: 180,
    maxWidth: 260,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
});
