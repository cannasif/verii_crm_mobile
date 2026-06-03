import React, { memo, useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextLayoutEventData,
  type TextStyle,
  View,
} from "react-native";
import { Text } from "@/components/ui/text";
import type { StockNameTooltipPlacement } from "./types";
import { stockBrowseStyles as styles } from "./stockBrowseStyles";

export const StockNameWithTooltip = memo(function StockNameWithTooltip({
  name,
  textColor,
  isDark,
  nameStyle,
  onTooltipOpenChange,
  tooltipPlacement = "above",
}: {
  name: string;
  textColor: string;
  isDark: boolean;
  nameStyle: StyleProp<TextStyle>;
  onTooltipOpenChange?: (open: boolean) => void;
  tooltipPlacement?: StockNameTooltipPlacement;
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const showTooltip = useCallback(() => {
    if (isTruncated) {
      setTooltipVisible(true);
    }
  }, [isTruncated]);

  const hideTooltip = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  useEffect(() => {
    onTooltipOpenChange?.(tooltipVisible);
  }, [onTooltipOpenChange, tooltipVisible]);

  useEffect(() => {
    if (!tooltipVisible) return;
    const timer = setTimeout(hideTooltip, 2800);
    return () => clearTimeout(timer);
  }, [hideTooltip, tooltipVisible]);

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const line = event.nativeEvent.lines[0];
      if (!line) {
        setIsTruncated(false);
        return;
      }
      setIsTruncated(line.text !== name);
    },
    [name]
  );

  const tooltipPositionStyle =
    tooltipPlacement === "below" ? styles.stockNameTooltipBelow : styles.stockNameTooltipAbove;

  return (
    <View style={[styles.stockNameWrap, tooltipVisible && styles.stockNameWrapActive]}>
      {tooltipVisible ? (
        <View
          pointerEvents="none"
          style={[
            styles.stockNameTooltip,
            tooltipPositionStyle,
            {
              backgroundColor: isDark ? "rgba(39, 39, 42, 0.97)" : "rgba(24, 24, 27, 0.94)",
              borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.1)",
            },
          ]}
        >
          <Text unstyled disableThemeColor style={styles.stockNameTooltipText}>
            {name}
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
      >
        <Text
          unstyled
          disableThemeColor
          style={[nameStyle, { color: textColor }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          onTextLayout={handleTextLayout}
          accessibilityLabel={name}
        >
          {name}
        </Text>
      </Pressable>
    </View>
  );
});
