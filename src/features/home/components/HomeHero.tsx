import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../../store/auth";
import { useUIStore } from "../../../store/ui";
import { SparklesIcon } from "hugeicons-react-native";

const formatName = (name?: string, fallback: string = "") => {
  if (!name) return fallback;
  return name
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
    .join(' ');
};

export function HomeHero(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const gradientColors = isDark
    ? [colors.header, colors.backgroundSecondary]
    : [colors.activeBackground, colors.backgroundSecondary];

  const borderColor = colors.cardBorder;

  const nameColor = colors.text;
  const greetingColor = colors.accent;

  return (
    <View style={styles.shadowWrapper}>
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor }]}
      >
        <View style={styles.contentWrap}>
          
          <View style={styles.greetingRow}>
            <SparklesIcon size={14} color={greetingColor} variant="stroke" />
            <Text style={[styles.greeting, { color: greetingColor }]}>
              {t("home.welcome", "Hoş Geldiniz")}
            </Text>
            <SparklesIcon size={14} color={greetingColor} variant="stroke" />
          </View>
          
          <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
            {formatName(user?.name, t("common.user", "Kullanıcı"))}
          </Text>
          
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    marginBottom: 16, 
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    borderRadius: 18, 
    borderWidth: 1,
    paddingVertical: 10, 
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: { 
    alignItems: "center",
    justifyContent: "center"
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2, 
    gap: 4, 
  },
  greeting: { 
    fontSize: 10, 
    fontWeight: "700", 
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  name: { 
    fontSize: 18, 
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  }
});
