import React, { memo, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";
import { normalizeSearchText } from "@/lib/normalizeSearchText";
import {
  CATALOG_FILTER_DIMENSIONS,
  optionMatchesFilterSearch,
  type CatalogFilterDimension,
  type CatalogSpecialCodeOption,
  type CatalogSpecialCodeSelections,
} from "../utils/catalog-special-code-filter";

interface DimensionSectionModel {
  dimension: CatalogFilterDimension;
  expanded: boolean;
  selectedCount: number;
  options: CatalogSpecialCodeOption[];
  emptyVariant: "none" | "loading" | "noOptions" | "noMatch";
}

interface CatalogSpecialCodeFilterPanelProps {
  facetOptions: Record<CatalogFilterDimension, CatalogSpecialCodeOption[]>;
  selections: CatalogSpecialCodeSelections;
  expandedSections: Record<CatalogFilterDimension, boolean>;
  filterSearch: string;
  loading: boolean;
  hasDraftSelection: boolean;
  onToggleSelection: (dimension: CatalogFilterDimension, value: string) => void;
  onToggleSection: (dimension: CatalogFilterDimension) => void;
  onApply: () => void;
  onClear: () => void;
  hideActions?: boolean;
}

const FilterOptionRow = memo(function FilterOptionRow({
  label,
  checked,
  onPress,
  colors,
  isDark,
  dividerColor,
  isLast,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useUIStore.getState>["colors"];
  isDark: boolean;
  dividerColor: string;
  isLast: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <View
        style={[
          styles.optionRow,
          {
            borderBottomColor: isLast ? "transparent" : dividerColor,
            backgroundColor: checked ? colors.accent + (isDark ? "16" : "0A") : "transparent",
          },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: checked ? colors.accent : isDark ? "rgba(255,255,255,0.35)" : colors.border,
              backgroundColor: checked ? colors.accent : "transparent",
            },
          ]}
        >
          {checked ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
        </View>
        <Text
          unstyled
          disableThemeColor
          style={[styles.optionLabel, { color: checked ? colors.accent : colors.text }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
});

const DimensionSectionCard = memo(function DimensionSectionCard({
  section,
  selections,
  colors,
  isDark,
  cardBorder,
  bodyDivider,
  onToggleSection,
  onToggleSelection,
  t,
}: {
  section: DimensionSectionModel;
  selections: CatalogSpecialCodeSelections;
  colors: ReturnType<typeof useUIStore.getState>["colors"];
  isDark: boolean;
  cardBorder: string;
  bodyDivider: string;
  onToggleSection: (dimension: CatalogFilterDimension) => void;
  onToggleSelection: (dimension: CatalogFilterDimension, value: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const cardSurface = isDark ? "rgba(255, 255, 255, 0.05)" : colors.card;
  const headerSurface = section.expanded
    ? isDark
      ? "rgba(255, 255, 255, 0.07)"
      : colors.backgroundSecondary
    : cardSurface;

  const renderOption = useCallback(
    ({ item, index }: { item: CatalogSpecialCodeOption; index: number }) => (
      <FilterOptionRow
        label={item.label}
        checked={selections[section.dimension].includes(item.value)}
        onPress={() => onToggleSelection(section.dimension, item.value)}
        colors={colors}
        isDark={isDark}
        dividerColor={bodyDivider}
        isLast={index === section.options.length - 1}
      />
    ),
    [bodyDivider, colors, isDark, onToggleSelection, section.dimension, section.options.length, selections]
  );

  const keyExtractor = useCallback((item: CatalogSpecialCodeOption) => item.value, []);

  return (
    <View style={[styles.sectionCard, { borderColor: cardBorder, backgroundColor: cardSurface }]}>
      <Pressable
        onPress={() => onToggleSection(section.dimension)}
        style={({ pressed }) => [styles.sectionHeaderPressable, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.sectionHeader,
            {
              backgroundColor: headerSurface,
              borderBottomColor: section.expanded ? bodyDivider : "transparent",
              borderBottomWidth: section.expanded ? StyleSheet.hairlineWidth : 0,
            },
          ]}
        >
          <Text unstyled disableThemeColor style={[styles.sectionTitle, { color: colors.accent }]} numberOfLines={1}>
            {t(`stockPicker.specialCodesLevels.${section.dimension}`)}
          </Text>
          <View style={styles.sectionHeaderTrailing}>
            {section.selectedCount > 0 ? (
              <View style={[styles.selectionPill, { backgroundColor: colors.accent + (isDark ? "28" : "18") }]}>
                <Text unstyled disableThemeColor style={[styles.selectionPillText, { color: colors.accent }]}>
                  {t("stockPicker.specialCodesSelectedCount", { count: section.selectedCount })}
                </Text>
              </View>
            ) : null}
            <Ionicons
              name={section.expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textMuted}
            />
          </View>
        </View>
      </Pressable>

      {section.expanded ? (
        <View style={styles.sectionBody}>
          {section.emptyVariant === "loading" ? (
            <View style={styles.statusWrap}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {t("stockPicker.specialCodesLoadingOptions")}
              </Text>
            </View>
          ) : section.emptyVariant === "noOptions" ? (
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              {t("stockPicker.specialCodesNoOptions")}
            </Text>
          ) : section.emptyVariant === "noMatch" ? (
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              {t("stockPicker.specialCodesSearchEmpty")}
            </Text>
          ) : (
            <FlatList
              data={section.options}
              keyExtractor={keyExtractor}
              renderItem={renderOption}
              scrollEnabled={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      ) : null}
    </View>
  );
});

function CatalogSpecialCodeFilterPanelBase({
  facetOptions,
  selections,
  expandedSections,
  filterSearch,
  loading,
  hasDraftSelection,
  onToggleSelection,
  onToggleSection,
  onApply,
  onClear,
  hideActions = false,
}: CatalogSpecialCodeFilterPanelProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const { t } = useTranslation();

  const borderColor = isDark ? "rgba(255, 255, 255, 0.14)" : colors.border;
  const borderSoft = isDark ? "rgba(255, 255, 255, 0.12)" : colors.cardBorder;
  const bodyDivider = isDark ? "rgba(255, 255, 255, 0.1)" : colors.border;
  const shellSurface = isDark ? "rgba(255, 255, 255, 0.07)" : colors.card;
  const confirmSurface = colors.accent + (isDark ? "2E" : "18");
  const confirmBorder = colors.accent + (isDark ? "55" : "40");

  const normalizedQuery = useMemo(() => normalizeSearchText(filterSearch), [filterSearch]);

  const sections = useMemo<DimensionSectionModel[]>(() => {
    return CATALOG_FILTER_DIMENSIONS.map((dimension, index) => {
      const options = facetOptions[dimension] ?? [];
      const selectedCount = selections[dimension].length;
      const filteredOptions = normalizedQuery
        ? options.filter((option) => optionMatchesFilterSearch(option, normalizedQuery))
        : options;
      const autoExpand = normalizedQuery.length > 0 && filteredOptions.length > 0;
      const expanded = expandedSections[dimension] || autoExpand;

      let emptyVariant: DimensionSectionModel["emptyVariant"] = "none";
      if (expanded) {
        if (loading && index === 0 && options.length === 0) {
          emptyVariant = "loading";
        } else if (options.length === 0) {
          emptyVariant = "noOptions";
        } else if (filteredOptions.length === 0) {
          emptyVariant = "noMatch";
        }
      }

      return {
        dimension,
        expanded,
        selectedCount,
        options: filteredOptions,
        emptyVariant,
      };
    });
  }, [expandedSections, facetOptions, loading, normalizedQuery, selections]);

  const renderSection = useCallback(
    ({ item }: { item: DimensionSectionModel }) => (
      <View style={styles.sectionCardWrap}>
        <DimensionSectionCard
          section={item}
          selections={selections}
          colors={colors}
          isDark={isDark}
          cardBorder={borderColor}
          bodyDivider={bodyDivider}
          onToggleSection={onToggleSection}
          onToggleSelection={onToggleSelection}
          t={t}
        />
      </View>
    ),
    [bodyDivider, borderColor, colors, isDark, onToggleSection, onToggleSelection, selections, t]
  );

  const keyExtractor = useCallback((item: DimensionSectionModel) => item.dimension, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={keyExtractor}
        renderItem={renderSection}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {hideActions ? null : (
        <View
          style={[
            styles.actionShell,
            {
              backgroundColor: shellSurface,
              borderColor,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                borderColor: borderSoft,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : colors.backgroundSecondary,
              },
              !hasDraftSelection && styles.actionDisabled,
            ]}
            onPress={onClear}
            disabled={!hasDraftSelection}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="backup-restore" size={16} color={colors.textMuted} />
            <Text unstyled disableThemeColor style={[styles.actionButtonText, { color: colors.textSecondary }]}>
              {t("stockPicker.specialCodesClear")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.confirmButton,
              {
                backgroundColor: confirmSurface,
                borderColor: confirmBorder,
              },
              !hasDraftSelection && styles.actionDisabled,
            ]}
            onPress={onApply}
            disabled={!hasDraftSelection}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={16} color={colors.accent} />
            <Text unstyled disableThemeColor style={[styles.confirmButtonText, { color: colors.accent }]}>
              {t("stockPicker.specialCodesApply")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export const CatalogSpecialCodeFilterPanel = memo(CatalogSpecialCodeFilterPanelBase);

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  sectionCardWrap: { width: "100%", marginBottom: 10 },
  sectionCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionHeaderPressable: { width: "100%" },
  sectionHeader: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sectionTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    lineHeight: 16,
  },
  sectionHeaderTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  selectionPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 0,
  },
  selectionPillText: { fontSize: 10, fontWeight: "700", lineHeight: 12 },
  sectionBody: { width: "100%" },
  optionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusText: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: "500",
  },
  actionShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionButton: {
    flex: 1,
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  actionButtonText: { fontSize: 12, fontWeight: "600" },
  confirmButton: { borderWidth: StyleSheet.hairlineWidth },
  confirmButtonText: { fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.88 },
  actionDisabled: { opacity: 0.4 },
});
