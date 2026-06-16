import React, { memo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Add01Icon } from "hugeicons-react-native";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";
import { useTranslation } from "react-i18next";
import type { SalesDocumentLineTranslationPrefix } from "./types";

export interface SalesDocumentLinesSectionHeaderProps {
  lineCount: number;
  canAddLine: boolean;
  isReadonly?: boolean;
  translationPrefix: SalesDocumentLineTranslationPrefix;
  onAddLine: () => void;
}

function SalesDocumentLinesSectionHeaderComponent({
  lineCount,
  canAddLine,
  isReadonly = false,
  translationPrefix,
  onAddLine,
}: SalesDocumentLinesSectionHeaderProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";
  const accent = colors.accent;
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";

  return (
    <View style={[styles.header, { borderBottomColor: borderColor }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t(`${translationPrefix}.lines`)}</Text>
        {lineCount > 0 ? (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: isDark ? "rgba(236,72,153,0.14)" : "rgba(236,72,153,0.10)",
                borderColor: isDark ? "rgba(236,72,153,0.28)" : "rgba(219,39,119,0.18)",
              },
            ]}
          >
            <Text style={[styles.countText, { color: accent }]}>{lineCount}</Text>
          </View>
        ) : null}
      </View>

      {!isReadonly ? (
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: accent },
            !canAddLine && styles.addButtonDisabled,
          ]}
          onPress={onAddLine}
          disabled={!canAddLine}
          activeOpacity={0.88}
        >
          <Add01Icon size={14} color="#FFFFFF" variant="stroke" strokeWidth={2.2} />
          <Text style={styles.addButtonText}>{t(`${translationPrefix}.addLine`)}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const SalesDocumentLinesSectionHeader = memo(SalesDocumentLinesSectionHeaderComponent);

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addButtonDisabled: {
    opacity: 0.55,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
});
