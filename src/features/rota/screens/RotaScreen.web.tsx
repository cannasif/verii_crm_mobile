import React from "react";
import { StyleSheet, View, Text as RNText } from "react-native";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { Location01Icon } from "hugeicons-react-native";
import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";

export function RotaScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode, colors } = useUIStore();
  const isDark = themeMode === "dark";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader title={t("rota.title")} showBackButton />
      <View style={styles.centered}>
        <Location01Icon size={48} color={colors.textMuted} />
        <RNText style={[styles.title, { color: colors.text }]}>
          {t("rota.title")}
        </RNText>
        <RNText style={[styles.message, { color: colors.textSecondary }]}>
          {t(
            "rota.webUnavailable",
            "Rota haritasi mobil uygulamada kullanilabilir. Web onizlemede harita modulu yuklenmez."
          )}
        </RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    maxWidth: 420,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
