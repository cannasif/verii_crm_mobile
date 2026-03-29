import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { MenuCard } from "../components";

export function StockMenuScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode, menuViewType } = useUIStore();
  const insets = useSafeAreaInsets();

  const contentBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.5)" : colors.background;

  const handleStockListPress = useCallback(() => {
    router.push("/(tabs)/stock/list");
  }, [router]);

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: colors.header }]}>
        <ScreenHeader title={t("stockMenu.title")} showBackButton />
        <FlatListScrollView
          style={[styles.content, { backgroundColor: contentBackground }]}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={
              menuViewType === "grid"
                ? {
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    width: "100%",
                  }
                : { flexDirection: "column", gap: 0 }
            }
          >
            <MenuCard
              title={t("stockMenu.stockMovements")}
              description={t("stockMenu.stockMovementsDesc")}
              viewType={menuViewType}
              icon="📦"
              onPress={handleStockListPress}
            />
          </View>
        </FlatListScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentContainer: {
    padding: 20,
  },
});
