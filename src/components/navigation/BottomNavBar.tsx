import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, Pressable, Modal, Animated, Easing, Text as RNText, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../ui/text";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { hasAnyPermission } from "../../features/access-control/utils/hasPermission";
import Svg, { Path } from "react-native-svg";
import {
  PackageIcon,
  UserGroupIcon,
  Money03Icon,
  Calendar03Icon,
  Camera01Icon,        
  UserAdd01Icon,        
  Home03Icon,           
  NoteAddIcon,   
  CalendarAdd01Icon,
  Invoice01Icon,
  ShoppingBag01Icon,
  NoteIcon,
  ArrowRight01Icon,
  HugeiconsProps,
} from "hugeicons-react-native";

interface NavItem {
  key: string;
  icon: React.FC<HugeiconsProps>;
  route: string;
  permissionCodes?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { key: "stock", icon: PackageIcon, route: "/(tabs)/stock", permissionCodes: ["stock.stocks.view"] },
  { key: "customers", icon: UserGroupIcon, route: "/(tabs)/customers", permissionCodes: ["customers.customer-management.view", "customers.contact-management.view", "customers.customer-type-management.view", "customers.erp-customers.view", "definitions.shipping-address-management.view"] },
  { key: "sales", icon: Money03Icon, route: "/(tabs)/sales", permissionCodes: ["sales.quotations.view", "sales.orders.view", "sales.demands.view"] },
  { key: "activities", icon: Calendar03Icon, route: "/(tabs)/activities", permissionCodes: ["activity.activity-management.view", "activity.daily-tasks.view"] },
];

export function BottomNavBar(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, themeMode } = useUIStore();
  const permissions = useAuthStore((state) => state.permissions);

  const { width, height } = useWindowDimensions();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSalesActionSheetOpen, setIsSalesActionSheetOpen] = useState(false);

  const fabRotation = useRef(new Animated.Value(0)).current;

  const isDark = themeMode === "dark";

  const THEME = {
    bg: colors.navBar,
    iconBg: isDark ? "#1E122D" : "#FFFFFF", 
    iconBorder: colors.cardBorder,
    navTopBorder: colors.navBarBorder,
    backdropBg: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.3)",

    active: colors.accent,
    fabGradient: [colors.gradientPrimaryStart, colors.gradientPrimaryMiddle, colors.gradientPrimaryEnd] as const,
    fabShadow: colors.accent,
    fabRing: colors.activeBackground,

    inactive: colors.textMuted,
    sheetBg: isDark ? "#160B24" : "#FFFFFF",
    sheetBorder: colors.border,
    text: colors.text,
    textMute: colors.textSecondary,
  };

  const isActive = (route: string): boolean => {
    return pathname === route || pathname.startsWith(route.replace("/(tabs)", ""));
  };

  const visibleNavItems = React.useMemo(
    () =>
      NAV_ITEMS.filter((item) =>
        !item.permissionCodes || item.permissionCodes.length === 0
          ? true
          : hasAnyPermission(permissions, item.permissionCodes),
      ),
    [permissions],
  );

  const canCreateCustomer = hasAnyPermission(permissions, ["customers.customer-management.view"]);
  const canOpenSalesActions = hasAnyPermission(permissions, [
    "sales.quotations.create",
    "sales.orders.create",
    "sales.demands.create",
  ]);
  const canCreateActivity = hasAnyPermission(permissions, ["activity.activity-management.create"]);
  const visibleRadialActionCount = [
    canCreateCustomer,
    canCreateCustomer,
    canOpenSalesActions,
    canCreateActivity,
  ].filter(Boolean).length;

  const handlePress = (route: string): void => {
    setIsMenuOpen(false);
    
    if (route === "/customers/create?autoScan=true") {
       router.push(route as never);
    } else {
       router.replace(route as never);
    }
  };

  const handleSalesActionPress = (route: string): void => {
    setIsSalesActionSheetOpen(false);
    setIsMenuOpen(false);
    router.push(route as never);
  };

  const NAV_HEIGHT = 65;
  const safeBottom = Math.max(insets.bottom, Platform.OS === "android" ? 15 : 0);
  
  const center = width / 2;
  const holeWidth = 56; 
  const depth = 46;     

  const navPath = `M 0 0 L ${center - holeWidth} 0 C ${center - 28} 0, ${center - 34} ${depth}, ${center} ${depth} C ${center + 34} ${depth}, ${center + 28} 0, ${center + holeWidth} 0 L ${width} 0`;
  const fillPath = `${navPath} L ${width} ${NAV_HEIGHT + safeBottom} L 0 ${NAV_HEIGHT + safeBottom} Z`;

  useEffect(() => {
    Animated.timing(fabRotation, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, fabRotation]);

  const logoRotate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <View 
      style={[
        styles.wrapper, 
        { height: isMenuOpen ? height : NAV_HEIGHT + safeBottom + 35, width }
      ]} 
      pointerEvents="box-none"
    >
      
      {isMenuOpen && visibleRadialActionCount > 0 && (
        <Pressable
          style={[styles.backdrop, { backgroundColor: THEME.backdropBg }]}
          onPress={() => setIsMenuOpen(false)}
        />
      )}

      {isMenuOpen && visibleRadialActionCount > 0 && (
        <View style={[styles.radialWrapper, { bottom: safeBottom + 70, left: (width - 290) / 2 }]} pointerEvents="box-none">
          {canCreateCustomer ? (
          <View style={[styles.iconPos, { left: 15, top: 70 }]} pointerEvents="box-none">
            <Pressable style={({ pressed }) => [styles.btnBase, pressed && styles.btnPressed]} onPress={() => handlePress("/customers/create?autoScan=true")}>
              <View style={[styles.miniCircle, { backgroundColor: THEME.iconBg, borderColor: THEME.iconBorder }]}>
                <Camera01Icon size={24} color={THEME.active} variant="stroke" strokeWidth={1.8} />
              </View>
            </Pressable>
          </View>
          ) : null}

          {canCreateCustomer ? (
          <View style={[styles.iconPos, { left: 55, top: 25 }]} pointerEvents="box-none">
            <Pressable style={({ pressed }) => [styles.btnBase, pressed && styles.btnPressed]} onPress={() => handlePress("/customers/create")}>
              <View style={[styles.miniCircle, { backgroundColor: THEME.iconBg, borderColor: THEME.iconBorder }]}>
                <UserAdd01Icon size={24} color={THEME.active} variant="stroke" strokeWidth={1.8} />
              </View>
            </Pressable>
          </View>
          ) : null}

          <View style={[styles.iconPos, { left: 117, top: 0 }]} pointerEvents="box-none">
            <Pressable style={({ pressed }) => [styles.btnBase, pressed && styles.btnPressed]} onPress={() => handlePress("/(tabs)")}>
              <View style={[styles.miniCircle, { backgroundColor: THEME.iconBg, borderColor: THEME.iconBorder, width: 56, height: 56 }]}>
                <Home03Icon size={28} color={THEME.active} variant="stroke" strokeWidth={1.8} />
              </View>
            </Pressable>
          </View>

          {canOpenSalesActions ? (
          <View style={[styles.iconPos, { left: 185, top: 25 }]} pointerEvents="box-none">
            <Pressable style={({ pressed }) => [styles.btnBase, pressed && styles.btnPressed]} onPress={() => setIsSalesActionSheetOpen(true)}>
              <View style={[styles.miniCircle, { backgroundColor: THEME.iconBg, borderColor: THEME.iconBorder }]}>
                <NoteAddIcon size={24} color={THEME.active} variant="stroke" strokeWidth={1.8} />
              </View>
            </Pressable>
          </View>
          ) : null}

          {canCreateActivity ? (
          <View style={[styles.iconPos, { left: 225, top: 70 }]} pointerEvents="box-none">
            <Pressable style={({ pressed }) => [styles.btnBase, pressed && styles.btnPressed]} onPress={() => handlePress("/(tabs)/activities/create")}>
              <View style={[styles.miniCircle, { backgroundColor: THEME.iconBg, borderColor: THEME.iconBorder }]}>
                <CalendarAdd01Icon size={24} color={THEME.active} variant="stroke" strokeWidth={1.8} />
              </View>
            </Pressable>
          </View>
          ) : null}

        </View>
      )}

      <View style={[styles.navContainer, { height: NAV_HEIGHT + safeBottom, width }]} pointerEvents="box-none">
        <Svg width={width} height={NAV_HEIGHT + safeBottom} style={styles.svgBackground}>
          <Path d={fillPath} fill={THEME.bg} />
          <Path
            d={navPath}
            stroke={THEME.navTopBorder}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="butt"
            strokeLinejoin="round"
          />
        </Svg>

        <View style={[styles.tabsContent, { paddingBottom: safeBottom }]} pointerEvents="box-none">
          
          <View style={styles.tabsGroup}>
            {visibleNavItems.slice(0, 2).map((item) => {
              const active = isActive(item.route);
              return (
                <TouchableOpacity key={item.key} style={styles.navTab} activeOpacity={0.6} onPress={() => handlePress(item.route)}>
                  {active && <View style={[styles.activeBar, { backgroundColor: THEME.active }]} />}
                  <item.icon size={26} color={active ? THEME.active : THEME.inactive} strokeWidth={1.5} variant="stroke" />
                  <RNText style={[
                    styles.tabLabel, 
                    { 
                      color: active ? THEME.active : THEME.inactive, 
                      fontWeight: active ? "600" : "500"
                    }
                  ]}>
                    {t(`nav.${item.key}`)}
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.centerHoleSpace} />

          <View style={styles.tabsGroup}>
            {visibleNavItems.slice(2, 4).map((item) => {
              const active = isActive(item.route);
              return (
                <TouchableOpacity key={item.key} style={styles.navTab} activeOpacity={0.6} onPress={() => handlePress(item.route)}>
                  {active && <View style={[styles.activeBar, { backgroundColor: THEME.active }]} />}
                  <item.icon size={26} color={active ? THEME.active : THEME.inactive} strokeWidth={1.5} variant="stroke" />
                  <RNText style={[
                    styles.tabLabel, 
                    { 
                      color: active ? THEME.active : THEME.inactive, 
                      fontWeight: active ? "600" : "400" 
                    }
                  ]}>
                    {t(`nav.${item.key}`)}
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </View>

        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.mainFab,
          {
            shadowColor: THEME.fabShadow,
            bottom: safeBottom + 28,
            left: (width - 58) / 2,
            borderColor: THEME.fabRing,
          },
        ]}
        onPress={() => {
          if (visibleRadialActionCount === 0) {
            return;
          }
          setIsMenuOpen(!isMenuOpen);
        }}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[...THEME.fabGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Animated.Image
            source={require("../../../assets/v3logo.png")}
            style={[styles.fabLogo, { transform: [{ rotate: logoRotate }] }]}
          />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={isSalesActionSheetOpen && canOpenSalesActions} transparent animationType="slide" onRequestClose={() => setIsSalesActionSheetOpen(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSalesActionSheetOpen(false)} />
          <View style={[styles.sheetContent, { backgroundColor: THEME.sheetBg, paddingBottom: safeBottom + 20 }]}>
            
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetHandle, { backgroundColor: THEME.sheetBorder }]} />
              <Text style={[styles.sheetTitle, { color: THEME.text }]}>{t("salesActionSheet.title")}</Text>
              <Text style={[styles.sheetSubtitle, { color: THEME.textMute }]}>{t("salesActionSheet.subtitle")}</Text>
            </View>

            <View style={styles.sheetOptions}>
              {hasAnyPermission(permissions, ["sales.quotations.create"]) ? (
              <TouchableOpacity style={[styles.sheetOptionBtn, { borderBottomColor: THEME.sheetBorder }]} onPress={() => handleSalesActionPress("/(tabs)/sales/quotations/create")} activeOpacity={0.7}>
                <View style={[styles.sheetIconBox, { backgroundColor: colors.activeBackground }]}>
                  <Invoice01Icon size={24} color={THEME.active} variant="stroke" strokeWidth={1.8} />
                </View>
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={[styles.sheetOptionTitle, { color: THEME.text }]}>{t("salesActionSheet.quotationTitle")}</Text>
                  <Text style={[styles.sheetOptionDesc, { color: THEME.textMute }]}>{t("salesActionSheet.quotationDescription")}</Text>
                </View>
                <ArrowRight01Icon size={20} color={THEME.textMute} strokeWidth={1.5} />
              </TouchableOpacity>
              ) : null}

              {hasAnyPermission(permissions, ["sales.orders.create"]) ? (
              <TouchableOpacity style={[styles.sheetOptionBtn, { borderBottomColor: THEME.sheetBorder }]} onPress={() => handleSalesActionPress("/(tabs)/sales/orders/create")} activeOpacity={0.7}>
                <View style={[styles.sheetIconBox, { backgroundColor: colors.activeBackground }]}>
                  <ShoppingBag01Icon size={24} color={THEME.active} variant="stroke" strokeWidth={1.8} />
                </View>
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={[styles.sheetOptionTitle, { color: THEME.text }]}>{t("salesActionSheet.orderTitle")}</Text>
                  <Text style={[styles.sheetOptionDesc, { color: THEME.textMute }]}>{t("salesActionSheet.orderDescription")}</Text>
                </View>
                <ArrowRight01Icon size={20} color={THEME.textMute} strokeWidth={1.5} />
              </TouchableOpacity>
              ) : null}

              {hasAnyPermission(permissions, ["sales.demands.create"]) ? (
              <TouchableOpacity style={[styles.sheetOptionBtn, { borderBottomColor: "transparent" }]} onPress={() => handleSalesActionPress("/(tabs)/sales/demands/create")} activeOpacity={0.7}>
                <View style={[styles.sheetIconBox, { backgroundColor: colors.activeBackground }]}>
                  <NoteIcon size={24} color={THEME.active} variant="stroke" strokeWidth={1.8} />
                </View>
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={[styles.sheetOptionTitle, { color: THEME.text }]}>{t("salesActionSheet.demandTitle")}</Text>
                  <Text style={[styles.sheetOptionDesc, { color: THEME.textMute }]}>{t("salesActionSheet.demandDescription")}</Text>
                </View>
                <ArrowRight01Icon size={20} color={THEME.textMute} strokeWidth={1.5} />
              </TouchableOpacity>
              ) : null}
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: "absolute",
    top: -9999,
    bottom: 0, 
    left: 0,
    right: 0,
    zIndex: 1, 
  },
  navContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    zIndex: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  svgBackground: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  tabsContent: {
    flexDirection: "row",
    width: "100%",
    height: "100%",
    alignItems: "center",
    paddingHorizontal: 5, 
  },
  tabsGroup: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  activeBar: {
    position: "absolute",
    top: 0, 
    width: 24,
    height: 2.5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tabLabel: {
    fontSize: 10, 
    marginTop: 4, 
    letterSpacing: 0.5, 
  },
  centerHoleSpace: {
    width: 90, 
  },
  mainFab: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 25,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    zIndex: 1001,
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
  },
  fabLogo: {
    width: 94,
    height: 94,
    resizeMode: "contain",
  },

  radialWrapper: {
    position: "absolute",
    width: 290,
    height: 145, 
    zIndex: 5, 
    elevation: 5,
  },
  iconPos: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 50,  
    height: 50,
  },
  btnBase: {
    alignItems: "center",
    justifyContent: "center",
  },
  miniCircle: {
    width: 50, 
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#db2777",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9, 
  },

  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
  },
  sheetOptions: {
    flexDirection: "column",
  },
  sheetOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  sheetOptionTextWrap: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  sheetOptionDesc: {
    fontSize: 12,
  }
});
