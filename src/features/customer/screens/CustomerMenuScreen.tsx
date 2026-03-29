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
  UserGroupIcon,
  Building02Icon,
  UserCircleIcon,
  Location01Icon,
  Task01Icon,
  ArrowRight01Icon 
} from "hugeicons-react-native";

export function CustomerMenuScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  
  const { colors, themeMode, menuViewType } = useUIStore() as any;
  const insets = useSafeAreaInsets();
  const isDark = themeMode === "dark";

  const THEME_PINK = "#ec4899";
  const arrowColor = isDark ? "#64748B" : "#9CA3AF";

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.12)']
    : ['rgba(255, 235, 240, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']) as [string, string, ...string[]];

  const handleCustomersPress = useCallback(() => {
    router.push("/(tabs)/customers/list");
  }, [router]);

  const handleContactsPress = useCallback(() => {
    router.push("/customers/contacts");
  }, [router]);

  const handleShippingPress = useCallback(() => {
    router.push("/(tabs)/customers/shipping");
  }, [router]);

  const handleTitlesPress = useCallback(() => {
    router.push("/(tabs)/customers/titles");
  }, [router]);

  const handleErpCustomersPress = useCallback(() => {
    router.push("/(tabs)/customers/erp");
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={StyleSheet.absoluteFill}>
          <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
          />
      </View>
      
      <View style={{ flex: 1 }}>
        <ScreenHeader title={t("customerMenu.title")} showBackButton />
        
        <FlatListScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer, 
            { paddingBottom: insets.bottom + 100 }
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
            title={t("customerMenu.customers")}
            description={t("customerMenu.customersDesc")}
            viewType={menuViewType}
            icon={
              <UserGroupIcon 
                size={24} 
                color={THEME_PINK} 
                variant="stroke" 
                strokeWidth={1.5}
              />
            }
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} variant="stroke" strokeWidth={2} />}
            onPress={handleCustomersPress}
          />

          <MenuCard
            title={t("customerMenu.erpCustomers")}
            description={t("customerMenu.erpCustomersDesc")}
            viewType={menuViewType}
            icon={
              <Building02Icon 
                size={24} 
                color={THEME_PINK} 
                variant="stroke" 
                strokeWidth={1.5}
              />
            }
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} variant="stroke" strokeWidth={2} />}
            onPress={handleErpCustomersPress}
          />

          <MenuCard
            title={t("customerMenu.contacts")}
            description={t("customerMenu.contactsDesc")}
            viewType={menuViewType}
            icon={
              <UserCircleIcon 
                size={24} 
                color={THEME_PINK} 
                variant="stroke" 
                strokeWidth={1.5}
              />
            }
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} variant="stroke" strokeWidth={2} />}
            onPress={handleContactsPress}
          />

          <MenuCard
            title={t("customerMenu.shippingAddresses")}
            description={t("customerMenu.shippingAddressesDesc")}
            viewType={menuViewType}
            icon={
              <Location01Icon 
                size={24} 
                color={THEME_PINK} 
                variant="stroke" 
                strokeWidth={1.5}
              />
            }
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} variant="stroke" strokeWidth={2} />}
            onPress={handleShippingPress}
          />

          <MenuCard
            title={t("customerMenu.titles")}
            description={t("customerMenu.titlesDesc")}
            viewType={menuViewType}
            icon={
              <Task01Icon 
                size={24} 
                color={THEME_PINK} 
                variant="stroke" 
                strokeWidth={1.5}
              />
            }
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} variant="stroke" strokeWidth={2} />}
            onPress={handleTitlesPress}
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