import React, { useCallback } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import type { PlaceCategoryId } from "../types/rota-types";

const CATEGORIES: { id: PlaceCategoryId; labelKey: string }[] = [
  { id: "all", labelKey: "rota.categoryAll" },
  { id: "industrial", labelKey: "rota.categoryIndustrial" },
  { id: "shop", labelKey: "rota.categoryShop" },
  { id: "office", labelKey: "rota.categoryOffice" },
  { id: "amenity", labelKey: "rota.categoryAmenity" },
];

interface CategoryFilterProps {
  selectedCategory: PlaceCategoryId | null;
  onSelectCategory: (id: PlaceCategoryId | null) => void;
  t: (key: string) => string;
}

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  t,
}: CategoryFilterProps): React.ReactElement {
  const { themeMode, colors } = useUIStore();
  const isDark = themeMode === "dark";
  const activeBg = "#ec4899";
  const inactiveBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const renderItem = useCallback(
    (id: PlaceCategoryId, labelKey: string) => {
      const isSelected = selectedCategory === id;
      return (
        <TouchableOpacity
          key={id}
          style={[
            styles.chip,
            { backgroundColor: isSelected ? activeBg : inactiveBg },
          ]}
          onPress={() => onSelectCategory(id)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.chipText,
              { color: isSelected ? "#fff" : colors.text },
            ]}
            numberOfLines={1}
          >
            {t(labelKey)}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedCategory, onSelectCategory, colors.text, activeBg, inactiveBg, t]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map(({ id, labelKey }) => renderItem(id, labelKey))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
