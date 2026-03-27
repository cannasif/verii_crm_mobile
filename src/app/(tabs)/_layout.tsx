import React, { useEffect, useState } from "react";
import { View, StyleSheet, Keyboard, Platform } from "react-native";
import { Stack, usePathname } from "expo-router";
import { BottomNavBar } from "../../components/navigation";
import { useUIStore } from "../../store/ui";

export default function TabsLayout(): React.ReactElement {
  const pathname = usePathname();
  const hideNavBarByRoute =
    pathname === "/settings" || pathname === "/integrations-settings";

  const { colors } = useUIStore();
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