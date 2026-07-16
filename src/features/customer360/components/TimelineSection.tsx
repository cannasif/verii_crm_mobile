import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { Customer360TimelineItemDto } from "../types";
import { TimelineRow } from "./TimelineRow";
import { Activity01Icon } from "hugeicons-react-native";

interface TimelineSectionProps {
  title: string;
  timeline: Customer360TimelineItemDto[];
  colors: Record<string, string>;
  noDataKey: string;
  formatDateTime: (date: string) => string;
  getStatusLabel: (status: string | null | undefined) => string;
  formatAmount?: (value: number) => string;
  onItemPress?: (item: Customer360TimelineItemDto) => void;
}

export function TimelineSection({
  title,
  timeline,
  colors,
  noDataKey,
  formatDateTime,
  getStatusLabel,
  formatAmount,
  onItemPress,
}: TimelineSectionProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const sorted = useMemo(() => {
    const list = timeline ?? [];
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [timeline]);

  const shellBg = isDark ? "rgba(24,10,30,0.62)" : "rgba(255,247,250,0.78)";
  const shellBorder = isDark ? "rgba(236,72,153,0.14)" : "rgba(219,39,119,0.10)";
  const innerBg = isDark ? "rgba(255,255,255,0.022)" : "rgba(255,255,255,0.58)";
  const innerBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(219,39,119,0.07)";
  const titleText = isDark ? "#FFFFFF" : "#1F2937";
  const mutedText = isDark ? "rgba(255,255,255,0.56)" : "#6B7280";
  const countBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.78)";
  const countBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(219,39,119,0.10)";
  const accent = isDark ? "#EC4899" : "#DB2777";
  const accentBg = isDark ? "rgba(236,72,153,0.12)" : "rgba(236,72,153,0.10)";
  const accentBorder = isDark ? "rgba(236,72,153,0.24)" : "rgba(236,72,153,0.16)";
  const glow = isDark
    ? (["rgba(236,72,153,0.12)", "transparent"] as [string, string])
    : (["rgba(236,72,153,0.07)", "transparent"] as [string, string]);
  const separator = isDark ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.05)";

  const renderItem = useCallback(
    ({ item }: { item: Customer360TimelineItemDto }) => (
      <TimelineRow
        item={item}
        colors={colors}
        formatDateTime={formatDateTime}
        statusLabel={getStatusLabel(item.status)}
        formatAmount={formatAmount}
        onPress={onItemPress ? () => onItemPress(item) : undefined}
      />
    ),
    [colors, formatDateTime, getStatusLabel, formatAmount, onItemPress]
  );

  const keyExtractor = useCallback(
    (item: Customer360TimelineItemDto) => `${item.type ?? "unknown"}:${item.itemId}`,
    []
  );

  if (sorted.length === 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: shellBg,
            borderColor: shellBorder,
          },
        ]}
      >
        <View style={styles.glowLayer}>
          <LinearGradient
            colors={glow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: accentBg,
                  borderColor: accentBorder,
                },
              ]}
            >
              <Activity01Icon size={14} color={accent} variant="stroke" />
            </View>

            <Text style={[styles.sectionTitle, { color: titleText }]} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: countBg,
                borderColor: countBorder,
              },
            ]}
          >
            <Text style={[styles.sectionSubTitle, { color: mutedText }]}>0</Text>
          </View>
        </View>

        <View
          style={[
            styles.emptyWrap,
            {
              backgroundColor: innerBg,
              borderColor: innerBorder,
            },
          ]}
        >
          <Text style={[styles.noData, { color: mutedText }]}>{noDataKey}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: shellBg,
          borderColor: shellBorder,
        },
      ]}
    >
      <View style={styles.glowLayer}>
        <LinearGradient
          colors={glow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: accentBg,
                borderColor: accentBorder,
              },
            ]}
          >
            <Activity01Icon size={14} color={accent} variant="stroke" />
          </View>

          <Text style={[styles.sectionTitle, { color: titleText }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: countBg,
              borderColor: countBorder,
            },
          ]}
        >
          <Text style={[styles.sectionSubTitle, { color: mutedText }]}>
            {sorted.length}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.listShell,
          {
            backgroundColor: innerBg,
            borderColor: innerBorder,
          },
        ]}
      >
        <FlatList
          data={sorted}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                {
                  backgroundColor: separator,
                },
              ]}
            />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 2,
    overflow: "hidden",
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionSubTitle: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
  },
  listShell: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  separator: {
    height: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  emptyWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  noData: {
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 14,
    textAlign: "center",
  },
});
