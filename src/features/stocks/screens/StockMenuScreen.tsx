import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { MenuCard } from "../components";

import { 
  PackageIcon, 
  ArrowRight01Icon 
} from "hugeicons-react-native";

export function StockMenuScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode, menuViewType } = useUIStore();
  const insets = useSafeAreaInsets();

  const handleStockListPress = useCallback(() => {
    router.push("/(tabs)/stock/list");
  }, [router]);

  const moduleColor = colors.accentSecondary || "#f97316";

  const mainBg = themeMode === "dark" ? "#0c0516" : "#FFFFFF";

  const gradientColors = (themeMode === "dark"
    ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.12)']
    : ['rgba(255, 235, 240, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']) as [string, string, ...string[]];

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />

      {/* AMBIENT GRADIENT KATMANI */}
      <View style={StyleSheet.absoluteFill}>
          <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
          />
      </View>

      <View style={{ flex: 1 }}>
        <ScreenHeader 
          title={t("stockMenu.title")} 
          showBackButton 
        />
        
        <FlatListScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer, 
            { paddingBottom: insets.bottom + 40 }
          ]}
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
              icon={
                <PackageIcon
                  size={24}
                  color={moduleColor}
                  variant="stroke"
                  strokeWidth={1.5}
                />
              }
              rightIcon={
                <ArrowRight01Icon
                  size={24}
                  color={colors.textMuted}
                  variant="stroke"
                />
              }
              onPress={handleStockListPress}
            />
          </View>
        </FlatListScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 10,
  },
});