import React, { memo, useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Text } from "../ui/text";
import { useTranslation } from "react-i18next";

interface ErpCleanupInfoLineProps {
  text: string;
  isDark: boolean;
  textStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

function ErpCleanupInfoLineComponent({
  text,
  isDark,
  textStyle,
  numberOfLines = 2,
}: ErpCleanupInfoLineProps): React.ReactElement {
  const { t } = useTranslation();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const displayText = `${t("common.erpCleanupPrefix")} ${text}`;

  const showTooltip = useCallback((): void => {
    setTooltipVisible(true);
  }, []);

  const hideTooltip = useCallback((): void => {
    setTooltipVisible(false);
  }, []);

  useEffect(() => {
    if (!tooltipVisible) return;
    const timer = setTimeout(hideTooltip, 3200);
    return () => clearTimeout(timer);
  }, [hideTooltip, tooltipVisible]);

  const color = isDark ? "#FBBF24" : "#B45309";

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
            {displayText}
          </Text>
        </View>
      ) : null}
      <Pressable
        onLongPress={showTooltip}
        onPressOut={hideTooltip}
        onHoverIn={Platform.OS === "web" ? showTooltip : undefined}
        onHoverOut={Platform.OS === "web" ? hideTooltip : undefined}
        delayLongPress={320}
        hitSlop={4}
        accessibilityRole="text"
        accessibilityLabel={displayText}
        accessibilityHint={t("common.statusBadgeHoldHint")}
      >
        <Text style={[styles.line, textStyle, { color }]} numberOfLines={numberOfLines}>
          {displayText}
        </Text>
      </Pressable>
    </View>
  );
}

export const ErpCleanupInfoLine = memo(ErpCleanupInfoLineComponent);

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 1,
  },
  wrapActive: {
    zIndex: 20,
  },
  line: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
  },
  tooltip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "100%",
    marginBottom: 6,
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
