import React, { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Platform, InteractionManager } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../ui/text";
import { useUIStore } from "../../store/ui";
import { ArrowLeft02Icon, Menu01Icon } from "hugeicons-react-native";

interface ScreenHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightElement?: React.ReactNode;
  homeRoute?: string;
  menuRootRoutes?: string[];
}

export function ScreenHeader({
  title,
  showBackButton = true,
  rightElement,
  homeRoute = "/",
  menuRootRoutes = [
    "/customers",
    "/stocks",
    "/activities",
    "/quotations",
    "/erp",
    "/reports",
    "/settings",
  ],
}: ScreenHeaderProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const backNavigationLockRef = useRef(false);
  const backNavigationUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { themeMode, colors, openSidebar } = useUIStore();
  const isDark = themeMode === "dark";

  const gradientColors = isDark
    ? ["#232032", "#12101F"]
    : ["#FFFFFF", "#F1F5F9"];

  const textColor = colors.text;
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.06)";
  const iconColor = isDark ? "#E2E8F0" : "#1E293B";

  const isMenuRootPage = menuRootRoutes.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/index`);
  });

  useEffect(() => {
    return () => {
      if (backNavigationUnlockTimerRef.current) {
        clearTimeout(backNavigationUnlockTimerRef.current);
      }
    };
  }, []);

  const handleLeftAction = useCallback(() => {
    if (backNavigationLockRef.current) return;

    backNavigationLockRef.current = true;

    if (backNavigationUnlockTimerRef.current) {
      clearTimeout(backNavigationUnlockTimerRef.current);
    }

    backNavigationUnlockTimerRef.current = setTimeout(() => {
      backNavigationLockRef.current = false;
    }, 450);

    const executeNavigation = () => {
      if (!showBackButton) {
        openSidebar();
        return;
      }

      if (router.canGoBack() && !isMenuRootPage) {
        router.back();
        return;
      }

      router.replace(homeRoute);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        InteractionManager.runAfterInteractions(executeNavigation);
      });
    });
  }, [showBackButton, openSidebar, router, isMenuRootPage, homeRoute]);

  return (
    <LinearGradient
      colors={gradientColors as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[
        styles.container,
        {
          height: 48 + insets.top,
          paddingTop: insets.top,
          marginTop: -insets.top,
          borderBottomColor: borderColor,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={handleLeftAction}
          style={({ pressed }) => [
            styles.leftActionBox,
            {
              borderRightColor: borderColor,
              borderRightWidth: 1,
              backgroundColor: pressed
                ? isDark
                  ? "rgba(219, 39, 119, 0.14)"
                  : "rgba(219, 39, 119, 0.08)"
                : "transparent",
            },
          ]}
        >
          {({ pressed }) =>
            showBackButton ? (
              <ArrowLeft02Icon 
  size={28}
  color={pressed ? "#db2777" : iconColor} 
  strokeWidth={3.5}
  style={{ marginTop: 8 ,marginLeft: 4} }
/>
            ) : (
              <Menu01Icon
                size={32}
                color={pressed ? "#db2777" : iconColor}
                strokeWidth={4}
              />
            )
          }
        </Pressable>

        <View style={styles.centerBox}>
          <Text
            style={[styles.title, { color: textColor }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        <View
          style={[
            styles.sideBox,
            {
              borderLeftColor: borderColor,
              borderLeftWidth: rightElement ? 1 : 0,
            },
          ]}
        >
          {rightElement}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderBottomWidth: 1,
    zIndex: 999,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  row: {
    flexDirection: "row",
    height: 48,
    alignItems: "stretch",
  },
leftActionBox: {
  width: 64,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 2,
},
  sideBox: {
    minWidth: 56,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.35,
    fontFamily: Platform.select({
      ios: "System",
      android: "sans-serif-medium",
    }),
  },
});
