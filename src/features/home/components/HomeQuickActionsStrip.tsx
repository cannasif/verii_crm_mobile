import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react-native";
import { useUIStore } from "../../../store/ui";
import type { Module } from "../types";
import { ModuleCard } from "./ModuleCard";

const CARD_GAP = 12;
const SCROLL_EDGE_EPS = 2;

interface HomeQuickActionsStripProps {
  items: readonly Module[];
  onOpenModule: (route: string) => void;
}

export function HomeQuickActionsStrip({
  items,
  onOpenModule,
}: HomeQuickActionsStripProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode, colors } = useUIStore();
  const isDark = themeMode === "dark";
  const scrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();

  const [scrollX, setScrollX] = useState(0);
  const [viewportW, setViewportW] = useState(0);
  const [contentW, setContentW] = useState(0);

  const scrollStep = useMemo(
    () => Math.max(160, Math.min(280, windowWidth * 0.45)),
    [windowWidth]
  );

  const atStart = scrollX <= SCROLL_EDGE_EPS;
  const atEnd =
    contentW > 0 && viewportW > 0 && scrollX + viewportW >= contentW - SCROLL_EDGE_EPS;
  const noOverflow = contentW > 0 && viewportW > 0 && contentW <= viewportW + SCROLL_EDGE_EPS;

  const arrowColor = isDark ? colors.textMuted : "#64748B";
  const arrowDisabledColor = isDark ? "rgba(148,163,184,0.35)" : "rgba(100,116,139,0.35)";

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  }, []);

  const scrollBy = useCallback(
    (dir: -1 | 1) => {
      const maxX = Math.max(0, contentW - viewportW);
      const next = Math.max(0, Math.min(maxX, scrollX + dir * scrollStep));
      scrollRef.current?.scrollTo({ x: next, animated: true });
    },
    [contentW, viewportW, scrollX, scrollStep]
  );

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: atStart || noOverflow }}
        accessibilityLabel={t("home.quickActionsScrollPrevious")}
        onPress={() => scrollBy(-1)}
        disabled={atStart || noOverflow}
        style={({ pressed }) => [styles.arrowHit, pressed && styles.arrowPressed]}
      >
        <ArrowLeft01Icon
          size={22}
          color={atStart || noOverflow ? arrowDisabledColor : arrowColor}
          variant="stroke"
          strokeWidth={2}
        />
      </Pressable>
      <ScrollView
        ref={scrollRef}
        horizontal
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setViewportW(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentW(w)}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {items.map((item, index) => (
          <View
            key={item.id}
            style={index < items.length - 1 ? styles.tileWrap : styles.tileWrapLast}
          >
            <ModuleCard item={item} onPress={onOpenModule} layout="strip" />
          </View>
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: atEnd || noOverflow }}
        accessibilityLabel={t("home.quickActionsScrollNext")}
        onPress={() => scrollBy(1)}
        disabled={atEnd || noOverflow}
        style={({ pressed }) => [styles.arrowHit, pressed && styles.arrowPressed]}
      >
        <ArrowRight01Icon
          size={22}
          color={atEnd || noOverflow ? arrowDisabledColor : arrowColor}
          variant="stroke"
          strokeWidth={2}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  arrowHit: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowPressed: {
    opacity: 0.75,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  tileWrap: {
    marginRight: CARD_GAP,
  },
  tileWrapLast: {
    marginRight: 0,
  },
});
