import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { Customer360SimpleItemDto } from "../types";
import { SimpleItemRow } from "./SimpleItemRow";
import {
  Contact01Icon,
  Location01Icon,
  AnalyticsUpIcon,
  Invoice03Icon,
  ShoppingBag03Icon,
  Activity01Icon,
  InformationCircleIcon,
  ArrowRight01Icon,
  Note01Icon,
} from "hugeicons-react-native";

interface SectionCardProps {
  title: string;
  items: Customer360SimpleItemDto[];
  colors: Record<string, string>;
  noDataKey: string;
  formatDate: (date: string | null | undefined) => string;
  onItemPress?: (item: Customer360SimpleItemDto) => void;
}

function getSectionMeta(title: string, isDark: boolean) {
  const normalized = title.toLocaleLowerCase("tr-TR");

  if (normalized.includes("iletişim") || normalized.includes("contact")) {
    return {
      Icon: Contact01Icon,
      accent: "#22C7F2",
      iconBg: isDark ? "rgba(34,199,242,0.12)" : "rgba(34,199,242,0.08)",
      iconBorder: isDark ? "rgba(34,199,242,0.24)" : "rgba(34,199,242,0.14)",
      glow: isDark
        ? ["rgba(34,199,242,0.08)", "transparent"]
        : ["rgba(34,199,242,0.04)", "transparent"],
      tint: isDark ? "rgba(34,199,242,0.05)" : "rgba(34,199,242,0.03)",
    };
  }

  if (
    normalized.includes("teslimat") ||
    normalized.includes("adres") ||
    normalized.includes("shipping") ||
    normalized.includes("address")
  ) {
    return {
      Icon: Location01Icon,
      accent: "#10B981",
      iconBg: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
      iconBorder: isDark ? "rgba(16,185,129,0.24)" : "rgba(16,185,129,0.14)",
      glow: isDark
        ? ["rgba(16,185,129,0.08)", "transparent"]
        : ["rgba(16,185,129,0.04)", "transparent"],
      tint: isDark ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.03)",
    };
  }

  if (normalized.includes("talep") || normalized.includes("demand")) {
    return {
      Icon: AnalyticsUpIcon,
      accent: "#8B5CF6",
      iconBg: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)",
      iconBorder: isDark ? "rgba(139,92,246,0.24)" : "rgba(139,92,246,0.14)",
      glow: isDark
        ? ["rgba(139,92,246,0.08)", "transparent"]
        : ["rgba(139,92,246,0.04)", "transparent"],
      tint: isDark ? "rgba(139,92,246,0.05)" : "rgba(139,92,246,0.03)",
    };
  }

  if (normalized.includes("teklif") || normalized.includes("quotation")) {
    return {
      Icon: Invoice03Icon,
      accent: "#EC4899",
      iconBg: isDark ? "rgba(236,72,153,0.12)" : "rgba(236,72,153,0.08)",
      iconBorder: isDark ? "rgba(236,72,153,0.24)" : "rgba(236,72,153,0.14)",
      glow: isDark
        ? ["rgba(236,72,153,0.08)", "transparent"]
        : ["rgba(236,72,153,0.04)", "transparent"],
      tint: isDark ? "rgba(236,72,153,0.05)" : "rgba(236,72,153,0.03)",
    };
  }

  if (normalized.includes("sipariş") || normalized.includes("order")) {
    return {
      Icon: ShoppingBag03Icon,
      accent: "#F97316",
      iconBg: isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.08)",
      iconBorder: isDark ? "rgba(249,115,22,0.24)" : "rgba(249,115,22,0.14)",
      glow: isDark
        ? ["rgba(249,115,22,0.08)", "transparent"]
        : ["rgba(249,115,22,0.04)", "transparent"],
      tint: isDark ? "rgba(249,115,22,0.05)" : "rgba(249,115,22,0.03)",
    };
  }

  if (normalized.includes("aktivite") || normalized.includes("activity")) {
    return {
      Icon: Activity01Icon,
      accent: "#14B8A6",
      iconBg: isDark ? "rgba(20,184,166,0.12)" : "rgba(20,184,166,0.08)",
      iconBorder: isDark ? "rgba(20,184,166,0.24)" : "rgba(20,184,166,0.14)",
      glow: isDark
        ? ["rgba(20,184,166,0.08)", "transparent"]
        : ["rgba(20,184,166,0.04)", "transparent"],
      tint: isDark ? "rgba(20,184,166,0.05)" : "rgba(20,184,166,0.03)",
    };
  }

  return {
    Icon: InformationCircleIcon,
    accent: "#6366F1",
    iconBg: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
    iconBorder: isDark ? "rgba(99,102,241,0.24)" : "rgba(99,102,241,0.14)",
    glow: isDark
      ? ["rgba(99,102,241,0.08)", "transparent"]
      : ["rgba(99,102,241,0.04)", "transparent"],
    tint: isDark ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.03)",
  };
}

function isActivitySection(title: string): boolean {
  const normalized = title.toLocaleLowerCase("tr-TR");
  return normalized.includes("aktivite") || normalized.includes("activity");
}

function getActivityNote(item: Customer360SimpleItemDto): string | null {
  const raw = item as Customer360SimpleItemDto & {
    note?: string | null;
    notes?: string | null;
    description?: string | null;
    activityNote?: string | null;
  };

  const value =
    raw.activityNote?.trim() ||
    raw.note?.trim() ||
    raw.notes?.trim() ||
    raw.description?.trim() ||
    null;

  return value;
}

export function SectionCard({
  title,
  items,
  colors,
  noDataKey,
  formatDate,
  onItemPress,
}: SectionCardProps): React.ReactElement {
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const list = items ?? [];
  const isEmpty = list.length === 0;
  const scrollable = isActivitySection(title);
  const activitySection = isActivitySection(title);
  const clickable = typeof onItemPress === "function";

  const shellBg = isDark ? "rgba(20,10,28,0.70)" : "rgba(255,250,252,0.94)";
  const shellBorder = isDark ? "rgba(236,72,153,0.16)" : "rgba(219,39,119,0.12)";
  const innerBg = isDark ? "rgba(255,255,255,0.024)" : "rgba(255,255,255,0.82)";
  const innerBorder = isDark ? "rgba(255,255,255,0.05)" : "rgba(219,39,119,0.08)";
  const titleText = isDark ? "#E2E8F0" : "#475569";
  const mutedText = isDark ? "rgba(203,213,225,0.72)" : "#94A3B8";
  const subText = isDark ? "#CBD5E1" : "#64748B";
  const countBg = isDark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.95)";
  const countBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(219,39,119,0.10)";
  const separator = isDark ? "rgba(255,255,255,0.055)" : "rgba(148,163,184,0.12)";
  const rowHover = isDark ? "rgba(255,255,255,0.018)" : "rgba(219,39,119,0.028)";
  const noteBg = isDark ? "rgba(250,204,21,0.08)" : "rgba(255,249,219,0.90)";
  const noteBorder = isDark ? "rgba(250,204,21,0.14)" : "rgba(226,191,105,0.24)";

  const meta = useMemo(() => getSectionMeta(title, isDark), [title, isDark]);
  const Icon = meta.Icon;

  const RowWrapper = clickable ? TouchableOpacity : View;

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
          colors={meta.glow as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.headerTopTint, { backgroundColor: meta.tint }]} />

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: meta.iconBg,
                borderColor: meta.iconBorder,
              },
            ]}
          >
            <Icon size={15} color={meta.accent} variant="stroke" />
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
          <Text style={[styles.sectionSubTitle, { color: subText }]}>
            {list.length}
          </Text>
        </View>
      </View>

      {isEmpty ? (
        <View
          style={[
            styles.emptyWrap,
            {
              backgroundColor: innerBg,
              borderColor: innerBorder,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIconWrap,
              {
                backgroundColor: meta.iconBg,
                borderColor: meta.iconBorder,
              },
            ]}
          >
            <Icon size={14} color={meta.accent} variant="stroke" />
          </View>
          <Text style={[styles.noData, { color: mutedText }]}>{noDataKey}</Text>
        </View>
      ) : (
        <View
          style={[
            styles.listShell,
            scrollable ? styles.scrollableListShell : null,
            {
              backgroundColor: innerBg,
              borderColor: innerBorder,
            },
          ]}
        >
          {scrollable ? (
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              contentContainerStyle={styles.listContent}
            >
              {list.map((item, index) => {
                const note = activitySection ? getActivityNote(item) : null;

                return (
                  <View key={String(item.id)}>
                    <RowWrapper
                      {...(clickable
                        ? {
                            activeOpacity: 0.72,
                            onPress: () => onItemPress?.(item),
                          }
                        : {})}
                      style={[
                        styles.rowPressable,
                        clickable
                          ? {
                              backgroundColor: rowHover,
                            }
                          : null,
                      ]}
                    >
                      <SimpleItemRow item={item} colors={colors} formatDate={formatDate} />

                      {note ? (
                        <View
                          style={[
                            styles.notePreviewWrap,
                            {
                              backgroundColor: noteBg,
                              borderColor: noteBorder,
                            },
                          ]}
                        >
                          <View style={styles.notePreviewHeader}>
                            <Note01Icon size={12} color={meta.accent} variant="stroke" />
                            <Text style={[styles.notePreviewLabel, { color: mutedText }]}>
                              Not
                            </Text>
                          </View>
                          <Text style={[styles.notePreviewText, { color: subText }]} numberOfLines={2}>
                            {note}
                          </Text>
                        </View>
                      ) : null}

                      {clickable ? (
                        <View style={styles.chevronWrap}>
                          <ArrowRight01Icon size={14} color={mutedText} variant="stroke" />
                        </View>
                      ) : null}
                    </RowWrapper>

                    {index < list.length - 1 ? (
                      <View
                        style={[
                          styles.separator,
                          {
                            backgroundColor: separator,
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.listContent}>
              {list.map((item, index) => {
                const note = activitySection ? getActivityNote(item) : null;

                return (
                  <View key={String(item.id)}>
                    <RowWrapper
                      {...(clickable
                        ? {
                            activeOpacity: 0.72,
                            onPress: () => onItemPress?.(item),
                          }
                        : {})}
                      style={[
                        styles.rowPressable,
                        clickable
                          ? {
                              backgroundColor: rowHover,
                            }
                          : null,
                      ]}
                    >
                      <SimpleItemRow item={item} colors={colors} formatDate={formatDate} />

                      {note ? (
                        <View
                          style={[
                            styles.notePreviewWrap,
                            {
                              backgroundColor: noteBg,
                              borderColor: noteBorder,
                            },
                          ]}
                        >
                          <View style={styles.notePreviewHeader}>
                            <Note01Icon size={12} color={meta.accent} variant="stroke" />
                            <Text style={[styles.notePreviewLabel, { color: mutedText }]}>
                              Not
                            </Text>
                          </View>
                          <Text style={[styles.notePreviewText, { color: subText }]} numberOfLines={2}>
                            {note}
                          </Text>
                        </View>
                      ) : null}

                      {clickable ? (
                        <View style={styles.chevronWrap}>
                          <ArrowRight01Icon size={14} color={mutedText} variant="stroke" />
                        </View>
                      ) : null}
                    </RowWrapper>

                    {index < list.length - 1 ? (
                      <View
                        style={[
                          styles.separator,
                          {
                            backgroundColor: separator,
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 2,
    overflow: "hidden",
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTopTint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  countBadge: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionSubTitle: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 13,
  },
  listShell: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  scrollableListShell: {
    height: 320,
  },
  listContent: {
    paddingVertical: 4,
  },
  rowPressable: {
    position: "relative",
    borderRadius: 14,
    marginHorizontal: 6,
    marginVertical: 2,
    overflow: "hidden",
  },
  chevronWrap: {
    position: "absolute",
    right: 10,
    top: 16,
    opacity: 0.9,
  },
  separator: {
    height: 1,
    marginLeft: 18,
    marginRight: 18,
  },
  emptyWrap: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  noData: {
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 15,
    textAlign: "center",
  },
  notePreviewWrap: {
    marginTop: -2,
    marginLeft: 12,
    marginRight: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  notePreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  notePreviewLabel: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 12,
  },
  notePreviewText: {
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 15,
  },
});
