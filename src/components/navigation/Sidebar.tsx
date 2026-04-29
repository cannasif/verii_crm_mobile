import React, { useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Pressable, 
  Dimensions, 
  Platform,
  Image,
  Animated,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BlurView } from "expo-blur"; 
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../ui/text";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { hasAnyPermission } from "../../features/access-control/utils/hasPermission";

import { 
  Cancel01Icon,
  ArrowRight01Icon,
  DashboardSquare01Icon, 
  Settings01Icon,        
  UserGroupIcon,         
  ContactIcon,           
  TruckIcon,           
  LicenseIcon,           
  Globe02Icon,           
  ShoppingCart01Icon,    
  Invoice01Icon,         
  Note01Icon,            
  PackageIcon,           
  Calendar03Icon,        
  TaskDaily01Icon        
} from "hugeicons-react-native";

const LOCAL_LOGO = require("../../../assets/veriicrmlogo.png");

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.8;

const ACTIVE_COLOR = "#fb923c"; 
const ACTIVE_BG_COLOR = "rgba(251, 146, 60, 0.12)"; 

export function Sidebar(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  const { colors, isSidebarOpen, closeSidebar, themeMode } = useUIStore();
  const permissions = useAuthStore((state) => state.permissions);

  const isAuthScreen = pathname.includes("/(auth)") || pathname === "/login";

  const translateX = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;

  const TEXT_COLOR = themeMode === "dark" ? "#FFFFFF" : colors.text;
  const TEXT_SECONDARY_COLOR = themeMode === "dark" ? "#E2E8F0" : colors.textSecondary;
  const HEADER_COLOR = themeMode === "dark" ? "#f472b6" : "#be185d";

  const MENU_ITEMS = [
    { key: "home", title: t("nav.home"), icon: DashboardSquare01Icon, route: "/(tabs)", permissionCodes: ["dashboard.view"] },
    { key: "cust_header", title: t("customerMenu.title"), isHeader: true },
    { key: "customers", title: t("customerMenu.customers"), icon: UserGroupIcon, route: "/customers", permissionCodes: ["customers.customer-management.view"] },
    { key: "contacts", title: t("customerMenu.contacts"), icon: ContactIcon, route: "/customers/contacts", permissionCodes: ["customers.contact-management.view"] },
    { key: "shipping", title: t("customerMenu.shippingAddresses"), icon: TruckIcon, route: "/customers/shipping", permissionCodes: ["definitions.shipping-address-management.view"] },
    { key: "titles", title: t("customerMenu.titles"), icon: LicenseIcon, route: "/customers/titles", permissionCodes: ["customers.customer-type-management.view"] },
    { key: "erp", title: t("customerMenu.erpCustomers"), icon: Globe02Icon, route: "/customers/erp", permissionCodes: ["customers.erp-customers.view"] },
    { key: "sales_header", title: t("modules.sales"), isHeader: true },
    { key: "orders", title: t("sales.orderList"), icon: ShoppingCart01Icon, route: "/sales/orders", permissionCodes: ["sales.orders.view"] },
    { key: "quotations", title: t("sales.quotationList"), icon: Invoice01Icon, route: "/sales/quotations", permissionCodes: ["sales.quotations.view"] },
    { key: "demands", title: t("sales.demandList"), icon: Note01Icon, route: "/sales/demands", permissionCodes: ["sales.demands.view"] },
    { key: "stock_header", title: t("stockMenu.title"), isHeader: true },
    { key: "stocks", title: t("stockMenu.stockMovements"), icon: PackageIcon, route: "/stock", permissionCodes: ["stock.stocks.view"] },
    { key: "act_header", title: t("activityMenu.title"), isHeader: true },
    { key: "activities", title: t("activityMenu.activities"), icon: Calendar03Icon, route: "/activities/list", permissionCodes: ["activity.activity-management.view"] },
    { key: "dailytasks", title: t("activityMenu.dailyTasks"), icon: TaskDaily01Icon, route: "/activities/daily-tasks", permissionCodes: ["activity.daily-tasks.view"] },
    { key: "settings_header", title: t("common.settings"), isHeader: true },
    { key: "settings", title: t("common.settings"), icon: Settings01Icon, route: "/settings" },
  ];

  const visibleMenuItems = React.useMemo(() => {
    const isVisible = (item: (typeof MENU_ITEMS)[number]): boolean => {
      if (item.isHeader) return true;
      if (!item.permissionCodes || item.permissionCodes.length === 0) return true;
      return hasAnyPermission(permissions, item.permissionCodes);
    };

    return MENU_ITEMS.filter((item, index) => {
      if (!item.isHeader) {
        return isVisible(item);
      }

      for (let cursor = index + 1; cursor < MENU_ITEMS.length; cursor += 1) {
        const nextItem = MENU_ITEMS[cursor];
        if (nextItem.isHeader) break;
        if (isVisible(nextItem)) return true;
      }

      return false;
    });
  }, [MENU_ITEMS, permissions]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isSidebarOpen ? 0 : -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isSidebarOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, isSidebarOpen, translateX]);

  const handleNavigation = (route: string) => {
    closeSidebar();
    setTimeout(() => {
      router.push(route as never);
    }, 150);
  };

  const animatedStyle = {
    transform: [{ translateX }],
  };

  const backdropStyle = {
    opacity: backdropOpacity,
  };

  if (!isSidebarOpen) return <View />;
  if (isAuthScreen) return <View />;

  return (
    <Modal
      transparent
      visible={isSidebarOpen}
      animationType="none"
      onRequestClose={closeSidebar}
      statusBarTranslucent={true} 
    >
      <View style={styles.container}>
        {/* Backdrop (Arka Plan) */}
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar}>
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <BlurView
              intensity={Platform.OS === "android" ? 50 : 20}
              tint={themeMode === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Pressable>

        {/* Sidebar Container */}
        <Animated.View
          style={[
            styles.sidebar,
            {
              width: SIDEBAR_WIDTH,
              backgroundColor: colors.background,
              borderRightColor: colors.border,
              
              // --- DÜZELTME BURADA ---
              top: insets.top, // 1. Üstten bildirim çubuğu kadar boşluk bırak
              bottom: 0,       // 2. Aşağıya kadar full uzat
              
              // İçerik için sadece alt güvenli alan (Home bar vb.)
              paddingBottom: insets.bottom, 
            },
            animatedStyle,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image 
                source={LOCAL_LOGO} 
                style={styles.logo}
                resizeMode="contain" 
              />
            </View>
            
            <TouchableOpacity
              onPress={closeSidebar}
              style={[styles.closeButton, { backgroundColor: colors.card }]}
            >
              <Cancel01Icon size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={['transparent', colors.border || 'rgba(255,255,255,0.2)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.separator}
          />

          {/* Menü İçeriği */}
          <FlatListScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {visibleMenuItems.map((item, index) => {
              if (item.isHeader) {
                return (
                  <Text
                    key={`header-${index}`}
                    style={[styles.menuHeader, { color: HEADER_COLOR }]}
                  >
                    {item.title}
                  </Text>
                );
              }
              
              const isActive = pathname === item.route;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => item.route && handleNavigation(item.route)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    (pressed || isActive) && { backgroundColor: ACTIVE_BG_COLOR },
                  ]}
                >
                  {({ pressed }) => (
                    <View style={styles.menuItemInner}>
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: (pressed || isActive) ? "transparent" : colors.card }
                        ]}
                      >
                        {item.icon && (
                          <item.icon
                            size={20}
                            color={(pressed || isActive) ? ACTIVE_COLOR : TEXT_COLOR}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.menuItemText,
                          { 
                            color: (pressed || isActive) ? ACTIVE_COLOR : TEXT_COLOR,
                            fontWeight: (pressed || isActive) ? "700" : "500"
                          }
                        ]}
                      >
                        {item.title}
                      </Text>
                      <ArrowRight01Icon
                        size={16}
                        color={(pressed || isActive) ? ACTIVE_COLOR : TEXT_SECONDARY_COLOR}
                        style={{ opacity: (pressed || isActive) ? 1 : 0.8 }}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </FlatListScrollView>

          <LinearGradient
            colors={['transparent', colors.border || 'rgba(255,255,255,0.2)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.separator, { marginTop: 0, marginBottom: 0 }]}
          />

          <View style={styles.footer}>
            <Text style={[styles.companyText, { color: colors.text }]}>
              V3RII COMPANY
            </Text>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute', // Mutlak pozisyon önemli
    left: 0,
    // top ve bottom değerleri inline style ile dinamik veriliyor
    
    borderRightWidth: 1,
    borderTopRightRadius: 24, 
    borderBottomRightRadius: 24, // Altta da radius istiyorsan kalsın, yoksa 0 yapabilirsin
    
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 20,
    
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 75,  
    paddingRight: 16, 
    paddingTop: 10,   
    paddingBottom: 4, 
    height: 80,       
  },
  logoWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "center", 
    alignItems: "center",     
    marginRight: 40, 
  },
  logo: {
    width: 225,  
    height: 125,  
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  separator: {
    height: 1,
    width: "80%", 
    alignSelf: "center",
    marginVertical: 15, 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuHeader: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 20, 
    marginBottom: 6,
    marginLeft: 12,
    letterSpacing: 1,
  },
  menuItem: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  companyText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
    opacity: 0.5,
  },
});
