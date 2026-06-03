import React, { memo } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  CatalogSpecialCodeFilterPanel,
  type CatalogFilterDimension,
  type CatalogSpecialCodeOption,
  type CatalogSpecialCodeSelections,
} from "@/features/catalog";
import { useUIStore } from "@/store/ui";

interface StockListFilterCodeTabContentProps {
  facetOptions: Record<CatalogFilterDimension, CatalogSpecialCodeOption[]>;
  selections: CatalogSpecialCodeSelections;
  expandedSections: Record<CatalogFilterDimension, boolean>;
  filterSearch: string;
  loading: boolean;
  hasDraftSelection: boolean;
  onToggleSelection: (dimension: CatalogFilterDimension, value: string) => void;
  onToggleSection: (dimension: CatalogFilterDimension) => void;
  onFilterSearchChange: (value: string) => void;
}

export const StockListFilterCodeTabContent = memo(function StockListFilterCodeTabContent({
  facetOptions,
  selections,
  expandedSections,
  filterSearch,
  loading,
  hasDraftSelection,
  onToggleSelection,
  onToggleSection,
  onFilterSearchChange,
}: StockListFilterCodeTabContentProps) {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.035)" : colors.backgroundSecondary,
            borderColor: isDark ? "rgba(236, 72, 153, 0.24)" : colors.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={filterSearch}
          onChangeText={onFilterSearchChange}
          placeholder={t("stockPicker.specialCodesFilterSearchPlaceholder")}
          placeholderTextColor={colors.textMuted}
          underlineColorAndroid="transparent"
        />
      </View>

      <CatalogSpecialCodeFilterPanel
        facetOptions={facetOptions}
        selections={selections}
        expandedSections={expandedSections}
        filterSearch={filterSearch}
        loading={loading}
        hasDraftSelection={hasDraftSelection}
        onToggleSelection={onToggleSelection}
        onToggleSection={onToggleSection}
        onApply={() => undefined}
        onClear={() => undefined}
        hideActions
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
});
