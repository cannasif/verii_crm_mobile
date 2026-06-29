import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { LayoutGridIcon, ListViewIcon } from "hugeicons-react-native";

import { ScreenHeader } from "../../../components/navigation";
import { normalizeSearchText } from "../../../lib/normalizeSearchText";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useErpCustomers } from "../hooks/useErpCustomers";
import { SearchInput, ErpCustomerCard } from "../components";
import type { CariDto } from "../types";

const { width } = Dimensions.get('window');
const GAP = 12;
const PADDING = 16;
const GRID_WIDTH = (width - (PADDING * 2) - GAP) / 2;

export function ErpCustomerListScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const isDark = themeMode === "dark";

  // --- TASARIM RENKLERİ ---
  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.12)'] 
    : ['rgba(255, 235, 240, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']) as [string, string, ...string[]];

  const theme = {
    textMute: isDark ? "#94a3b8" : colors.textMuted,
    primary: "#db2777",     
    activeSwitch: "#db2777",
    switchBg: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchText, setSearchText] = useState("");

  // 1. VERİ ÇEKME
  const { data: allCustomers = [], isPending, isError, refetch, isRefetching } = useErpCustomers();

  // 2. ARAMA FİLTRELEME (Performans için useMemo)
  const filteredCustomers = useMemo(() => {
    if (!searchText.trim()) return allCustomers;
    const searchLower = normalizeSearchText(searchText);
    return allCustomers.filter(customer => 
      normalizeSearchText(customer.cariIsim).includes(searchLower) ||
      normalizeSearchText(customer.cariKod).includes(searchLower)
    );
  }, [allCustomers, searchText]);

  // 3. RENDER ITEM
  const renderItem = useCallback(({ item, index }: { item: CariDto; index: number }) => {
    return (
      <View style={viewMode === 'grid' ? { width: GRID_WIDTH } : { width: '100%' }}>
        <ErpCustomerCard 
          customer={item} 
          viewMode={viewMode} // Card bileşeninin bu prop'u desteklediğini varsayıyoruz
          onPress={() => console.log(item.cariKod)} 
        />
      </View>
    );
  }, [viewMode]);

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* KATMAN 1: Arka Plan Geçişi */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <View style={{ flex: 1 }}>
        <ScreenHeader title={t("erpCustomer.title")} showBackButton />
        
        <View style={styles.content}>
          {/* KATMAN 2: Arama ve Görünüm Değiştirici */}
          <View style={styles.controlsArea}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <SearchInput value={searchText} onSearch={setSearchText} placeholder={t("erpCustomer.searchPlaceholder")} />
            </View>

            <View style={[styles.viewSwitcher, { backgroundColor: theme.switchBg }]}>
              <TouchableWithoutFeedback onPress={() => setViewMode('grid')}>
                <View style={[styles.switchBtn, viewMode === 'grid' && { backgroundColor: theme.activeSwitch }]}>
                   <LayoutGridIcon 
                    size={18} 
                    color={viewMode === 'grid' ? '#FFF' : theme.textMute} 
                    variant="stroke" 
                   />
                </View>
              </TouchableWithoutFeedback>
              
              <TouchableWithoutFeedback onPress={() => setViewMode('list')}>
                <View style={[styles.switchBtn, viewMode === 'list' && { backgroundColor: theme.activeSwitch }]}>
                   <ListViewIcon 
                    size={18} 
                    color={viewMode === 'list' ? '#FFF' : theme.textMute} 
                    variant="stroke" 
                   />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>

          {isPending ? (
            <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
          ) : isError ? (
            <View style={styles.center}>
              <Text>{t("common.error")}</Text>
              <TouchableOpacity onPress={() => refetch()}><Text style={{color: theme.primary, marginTop: 8}}>Yenile</Text></TouchableOpacity>
            </View>
          ) : (
            <FlatList
              key={viewMode} // Grid/List arası geçişte Layout'un yenilenmesi için önemli
              data={filteredCustomers}
              renderItem={renderItem}
              keyExtractor={(item, index) => `${item.cariKod}-${index}`}
              numColumns={viewMode === 'grid' ? 2 : 1}
              columnWrapperStyle={viewMode === 'grid' ? { gap: GAP, paddingHorizontal: PADDING } : undefined}
              contentContainerStyle={[
                styles.listContent, 
                { 
                    paddingBottom: insets.bottom + 100,
                    paddingHorizontal: viewMode === 'grid' ? 0 : PADDING // Grid'de padding columnWrapper'da
                }
              ]}
              
              // PERFORMANS (6.000 veri için)
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'} 
              
              onRefresh={refetch}
              refreshing={isRefetching}
              ListEmptyComponent={
                <View style={styles.center}>
                   <Text style={{ fontSize: 40 }}>👥</Text>
                   <Text style={{ color: theme.textMute, marginTop: 10 }}>{t("erpCustomer.noCustomers")}</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  controlsArea: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  viewSwitcher: {
    flexDirection: 'row', 
    padding: 4, 
    borderRadius: 12, 
    alignItems: 'center', 
    height: 48,
  },
  switchBtn: { 
    padding: 8, 
    borderRadius: 8, 
    height: 40, 
    width: 40, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  listContent: { 
    paddingTop: 8,
    gap: GAP 
  },
});
