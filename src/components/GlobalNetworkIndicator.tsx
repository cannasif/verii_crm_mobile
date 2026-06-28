import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from "react-native";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "./ui/text";
import { useUIStore } from "../store/ui";

const SHOW_DELAY_MS = 180;
const HIDE_DELAY_MS = 220;

export function GlobalNetworkIndicator(): React.ReactElement | null {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const colors = useUIStore((state) => state.colors);
  const activeNetworkRequestCount = useUIStore((state) => state.activeNetworkRequestCount);
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const isBusy = isFetching > 0 || isMutating > 0 || activeNetworkRequestCount > 0;

  useEffect(() => {
    const timeoutId = setTimeout(() => setVisible(isBusy), isBusy ? SHOW_DELAY_MS : HIDE_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [isBusy]);

  useEffect(() => {
    if (!visible) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, visible]);

  if (!visible) {
    return null;
  }

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 420],
  });

  return (
    <View pointerEvents="none" style={[styles.host, { paddingTop: Math.max(insets.top, 6) }]}>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.accent,
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            shadowColor: "#000000",
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {t("common.loading", "Yükleniyor...")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 2000,
    alignItems: "center",
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    overflow: "hidden",
  },
  progressBar: {
    width: 180,
    height: 2,
    borderRadius: 999,
  },
  pill: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
