import React, { memo, useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import { Text } from "../ui/text";
import { useTranslation } from "react-i18next";
import {
  hasExpandableDocumentApprovalStatusLabel,
  type DocumentApprovalStatusMeta,
} from "../../lib/documentApprovalStatus";

interface DocumentApprovalStatusBadgeProps {
  meta: DocumentApprovalStatusMeta;
  isDark: boolean;
  onPress?: (e: GestureResponderEvent) => void;
}

function DocumentApprovalStatusBadgeComponent({
  meta,
  isDark,
  onPress,
}: DocumentApprovalStatusBadgeProps): React.ReactElement {
  const { t } = useTranslation();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const canExpand = hasExpandableDocumentApprovalStatusLabel(meta);

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

  const pillStyle = [
    styles.statusPill,
    {
      backgroundColor: meta.backgroundColor,
      borderColor: meta.borderColor,
    },
  ];

  const content = (
    <>
      <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.statusText, { color: meta.color }]} numberOfLines={1}>
        {meta.shortLabel}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <View style={[styles.wrap, tooltipVisible && styles.wrapActive]}>
        {tooltipVisible ? (
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
              {meta.label}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={onPress}
          onLongPress={showTooltip}
          onPressOut={hideTooltip}
          onHoverIn={Platform.OS === "web" && canExpand ? showTooltip : undefined}
          onHoverOut={Platform.OS === "web" ? hideTooltip : undefined}
          delayLongPress={320}
          hitSlop={6}
          style={pillStyle}
          accessibilityRole="button"
          accessibilityLabel={meta.label}
          accessibilityHint={canExpand ? t("common.statusBadgeHoldHint") : undefined}
        >
          {content}
        </Pressable>
      </View>
    );
  }

  if (!canExpand) {
    return (
      <View style={pillStyle} accessibilityLabel={meta.label}>
        {content}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, tooltipVisible && styles.wrapActive]}>
      {tooltipVisible ? (
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
            {meta.label}
          </Text>
        </View>
      ) : null}
      <Pressable
        onLongPress={showTooltip}
        onPressOut={hideTooltip}
        onHoverIn={Platform.OS === "web" ? showTooltip : undefined}
        onHoverOut={Platform.OS === "web" ? hideTooltip : undefined}
        delayLongPress={320}
        hitSlop={6}
        style={pillStyle}
        accessibilityRole="text"
        accessibilityLabel={meta.label}
        accessibilityHint={t("common.statusBadgeHoldHint")}
      >
        {content}
      </Pressable>
    </View>
  );
}

export const DocumentApprovalStatusBadge = memo(DocumentApprovalStatusBadgeComponent);

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    flexShrink: 0,
    zIndex: 1,
  },
  wrapActive: {
    zIndex: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
    flexShrink: 0,
    maxWidth: 132,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    flexShrink: 0,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 9,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  tooltip: {
    position: "absolute",
    right: 0,
    bottom: "100%",
    marginBottom: 6,
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
