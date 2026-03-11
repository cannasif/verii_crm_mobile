import "../lib/suppressConsoleErrors";
import React, { useEffect } from "react";
import { LogBox, View, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import { I18nextProvider } from "react-i18next";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GluestackUIProvider } from "../components/ui/gluestack-ui-provider";
import { ToastContainer } from "../components/Toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { queryClient } from "../lib/queryClient";
import { useAuthStore } from "../store/auth";
import { useUIStore } from "../store/ui";
import { Sidebar } from "../components/navigation/Sidebar";
import { AppHeader } from "../components/navigation/AppHeader";
import i18n, { initLanguage } from "../locales";
import { initializeApiClient } from "../lib/axios";
import "../../global.css";

function RootStack({
  isAuthScreen,
}: {
  isDark: boolean;
  isAuthScreen: boolean;
}): React.ReactElement {
  const { colors } = useUIStore();
  return (
    <View style={[rootStyles.container, { backgroundColor: colors.background }]}>
      {!isAuthScreen && <AppHeader />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: colors.background },
        }}
      />
    </View>
  );
}

const rootStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

LogBox.ignoreLogs([
  /key.*spread|spread.*JSX/i,
  /React keys must be passed directly/i,
  /SafeAreaView.*deprecated/i,
  /Path|Circle/i,
]);

export default function RootLayout(): React.ReactElement {
  const hydrate = useAuthStore((state) => state.hydrate);
  const pathname = usePathname();
  const themeMode = useUIStore((state) => state.themeMode);

  useEffect(() => {
    hydrate();
    initLanguage();
    initializeApiClient().catch((error) => {
      console.warn("API base URL initialize failed", error);
    });
  }, [hydrate]);

  const isAuthScreen = pathname.includes("/(auth)") || pathname === "/login";
  const isDark = themeMode === "dark";

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <GluestackUIProvider>
            <I18nextProvider i18n={i18n}>
              <RootStack isDark={isDark} isAuthScreen={isAuthScreen} />
              <Sidebar />
              <ToastContainer />
            </I18nextProvider>
          </GluestackUIProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
