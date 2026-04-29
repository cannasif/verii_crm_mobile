import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";

export function PermissionDeniedState(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useUIStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
        ]}
      >
        <Text style={[styles.badge, { color: colors.accent }]}>
          {t("permissions.title")}
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("permissions.accessDeniedTitle")}
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {t("permissions.accessDeniedMessage")}
        </Text>

        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={[
            styles.button,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        >
          <Text style={styles.buttonText}>{t("permissions.goHome")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  badge: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    alignSelf: "flex-start",
    minWidth: 160,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
