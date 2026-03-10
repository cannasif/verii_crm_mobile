import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";
import { BottomNavBar } from "../../components/navigation";
import { useUIStore } from "../../store/ui";

export default function TabsLayout(): React.ReactElement {
  const pathname = usePathname();
  const hideNavBar = pathname === "/settings" || pathname === "/integrations-settings";
  const { colors } = useUIStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: colors.background },
        }}
      />
      {!hideNavBar && <BottomNavBar />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
