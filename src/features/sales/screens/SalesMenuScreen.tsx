import React, { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { MenuCard } from "../../customer/components";
import { Text } from "../../../components/ui/text";

import { 
  PlusSignIcon, 
  Files01Icon,
  HourglassIcon,
  Invoice01Icon,
  ShoppingBag01Icon,
  NoteIcon,
  ChartLineData01Icon,
  ArrowRight01Icon,
  FlashIcon,
} from "hugeicons-react-native";

export function SalesMenuScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  
  const { colors, themeMode, menuViewType } = useUIStore() as any;
  const menuLayoutStyle = useMemo(
    () =>
      menuViewType === "grid"
        ? {
            flexDirection: "row" as const,
            flexWrap: "wrap" as const,
            justifyContent: "space-between" as const,
            width: "100%" as const,
          }
        : { flexDirection: "column" as const, gap: 0 },
    [menuViewType]
  );
  const insets = useSafeAreaInsets();
  const isDark = themeMode === "dark";

  const THEME_PINK = "#ec4899";
  const arrowColor = isDark ? "#64748B" : "#9CA3AF";
  
  const sectionTitleColor = isDark ? "#94A3B8" : "#6B7280";
  const mainBg = isDark ? "#0c0516" : "#FFFFFF";

  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.12)']
    : ['rgba(255, 235, 240, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']) as [string, string, ...string[]];

  const handleCreateQuotationPress = useCallback(() => router.push("/(tabs)/sales/quotations/create"), [router]);
  const handleQuotationListPress = useCallback(() => router.push("/(tabs)/sales/quotations"), [router]);
  const handleWaitingApprovalsPress = useCallback(() => router.push("/(tabs)/sales/quotations/waiting-approvals"), [router]);

  const handleCreateQuickQuotationPress = useCallback(() => router.push("/(tabs)/sales/quotations/quick/create"), [router]);
  const handleQuickQuotationListPress = useCallback(() => router.push("/(tabs)/sales/quotations/quick/list"), [router]);

  const handleCreateDemandPress = useCallback(() => router.push("/(tabs)/sales/demands/create"), [router]);
  const handleDemandListPress = useCallback(() => router.push("/(tabs)/sales/demands"), [router]);
  const handleDemandWaitingApprovalsPress = useCallback(() => router.push("/(tabs)/sales/demands/waiting-approvals"), [router]);

  const handleCreateOrderPress = useCallback(() => router.push("/(tabs)/sales/orders/create"), [router]);
  const handleOrderListPress = useCallback(() => router.push("/(tabs)/sales/orders"), [router]);
  const handleOrderWaitingApprovalsPress = useCallback(() => router.push("/(tabs)/sales/orders/waiting-approvals"), [router]);

  const handleSalesKpiPress = useCallback(() => router.push("/(tabs)/sales/sales-kpi"), [router]);

  const renderIcon = (IconComponent: any) => (
    <IconComponent 
      size={24} 
      color={THEME_PINK} 
      variant="stroke" 
      strokeWidth={1.5} 
    />
  );

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
        <ScreenHeader title={t("modules.sales")} showBackButton />
        
        <FlatListScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer, 
            { paddingBottom: insets.bottom + 100 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          
          {/* --- BÖLÜM: TEKLİFLER (QUOTATIONS) --- */}
          <Text style={[styles.sectionTitle, styles.sectionTitleFirst, { color: sectionTitleColor }]}>
            {t("sales.quotations")}
          </Text>

          <View style={menuLayoutStyle}>
          <MenuCard
            title={t("sales.createQuotation")}
            description={t("sales.createQuotationDesc")}
            viewType={menuViewType}
            icon={renderIcon(PlusSignIcon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleCreateQuotationPress}
          />
          <MenuCard
            title={t("sales.quotationList")}
            description={t("sales.quotationListDesc")}
            viewType={menuViewType}
            icon={renderIcon(Invoice01Icon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleQuotationListPress}
          />
          <MenuCard
            title={t("sales.waitingApprovals")}
            description={t("sales.waitingApprovalsDesc")}
            viewType={menuViewType}
            icon={renderIcon(HourglassIcon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleWaitingApprovalsPress}
          />
          <MenuCard
            title={t("sales.createQuickQuotation") || "Hızlı Teklif Oluştur"}
            description={t("sales.createQuickQuotationDesc") || "Pratik şablonlarla hızlıca teklif hazırlayın"}
            viewType={menuViewType}
            icon={renderIcon(PlusSignIcon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleCreateQuickQuotationPress}
          />
          <MenuCard
            title={t("sales.quickQuotationList") || "Hızlı Teklif Listesi"}
            description={t("sales.quickQuotationListDesc") || "Oluşturduğunuz hızlı teklifleri yönetin"}
            viewType={menuViewType}
            icon={renderIcon(Files01Icon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleQuickQuotationListPress}
          />
          </View>

          {/* --- BÖLÜM: SİPARİŞLER (ORDERS) --- */}
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>{t("sales.orders")}</Text>

          <View style={menuLayoutStyle}>
          <MenuCard
            title={t("sales.createOrder")}
            description={t("sales.createOrderDesc")}
            viewType={menuViewType}
            icon={renderIcon(PlusSignIcon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleCreateOrderPress}
          />
          <MenuCard
            title={t("sales.orderList")}
            description={t("sales.orderListDesc")}
            viewType={menuViewType}
            icon={renderIcon(ShoppingBag01Icon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleOrderListPress}
          />
          <MenuCard
            title={t("sales.orderWaitingApprovals")}
            description={t("sales.orderWaitingApprovalsDesc")}
            viewType={menuViewType}
            icon={renderIcon(HourglassIcon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleOrderWaitingApprovalsPress}
          />
          </View>

          {/* --- BÖLÜM: TALEPLER (DEMANDS) --- */}
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>{t("sales.demands")}</Text>

          <View style={menuLayoutStyle}>
          <MenuCard
            title={t("sales.createDemand")}
            description={t("sales.createDemandDesc")}
            viewType={menuViewType}
            icon={renderIcon(PlusSignIcon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleCreateDemandPress}
          />
          <MenuCard
            title={t("sales.demandList")}
            description={t("sales.demandListDesc")}
            viewType={menuViewType}
            icon={renderIcon(NoteIcon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleDemandListPress}
          />
          <MenuCard
            title={t("sales.demandWaitingApprovals")}
            description={t("sales.demandWaitingApprovalsDesc")}
            viewType={menuViewType}
            icon={renderIcon(HourglassIcon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleDemandWaitingApprovalsPress}
          />
          </View>

          {/* --- KPI / RAPORLAR --- */}
           <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>{t("sidebar.reports")}</Text>
          <View style={menuLayoutStyle}>
          <MenuCard
            title={t("salesman360.title")}
            description={t("salesman360.subtitle")}
            viewType={menuViewType}
            icon={renderIcon(ChartLineData01Icon)}
            rightIcon={<ArrowRight01Icon size={20} color={arrowColor} />}
            onPress={handleSalesKpiPress}
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
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
});