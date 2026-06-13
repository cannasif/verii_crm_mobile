import React, { useEffect, useState } from "react";
import { View, StyleSheet, Keyboard, Platform } from "react-native";
import { Stack, usePathname } from "expo-router";
import { BottomNavBar } from "../../components/navigation";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { PermissionDeniedState } from "../../features/access-control/components/PermissionDeniedState";
import { hasAnyPermission, hasPermission } from "../../features/access-control/utils/hasPermission";
import { getMobileRoutePermissionRule } from "../../features/access-control/utils/mobileRoutePermissions";

export default function TabsLayout(): React.ReactElement {
  const pathname = usePathname();
  const hideNavBarByRoute =
    pathname === "/settings" ||
    pathname === "/app-settings" ||
    pathname === "/api-url-settings" ||
    pathname === "/integrations-settings" ||
    pathname === "/access-control-simulator";

  const { colors } = useUIStore();
  const permissions = useAuthStore((state) => state.permissions);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const hideNavBar = hideNavBarByRoute || keyboardVisible;
  const routePermissionRule = getMobileRoutePermissionRule(pathname);
  const hasLoadedPermissions = !isAuthenticated || !!permissions;
  const hasRouteAccess =
    !routePermissionRule ||
    (routePermissionRule.mode === "all"
      ? routePermissionRule.requiredCodes.every((code) => hasPermission(permissions, code))
      : hasAnyPermission(permissions, routePermissionRule.requiredCodes));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isHydrated && hasLoadedPermissions && !hasRouteAccess ? (
        <PermissionDeniedState />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { flex: 1, backgroundColor: colors.background },
          }}
        />
      )}
      {!hideNavBar && <BottomNavBar />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
