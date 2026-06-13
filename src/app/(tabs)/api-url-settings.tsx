import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft01Icon } from "hugeicons-react-native";

import { Text } from "../../components/ui/text";
import { GRADIENT } from "../../constants/theme";
import { useUIStore } from "../../store/ui";
import { useToast } from "../../hooks/useToast";
import {
  DEFAULT_API_BASE_URL,
  getApiBaseUrl,
  saveApiBaseUrl,
  testApiBaseUrl,
} from "../../constants/config";
import { apiClient } from "../../lib/axios";

function MenuGroup({
  children,
  cardBg,
  borderColor,
}: {
  children: React.ReactNode;
  cardBg: string;
  borderColor: string;
}): React.ReactElement {
  return (
    <View style={[styles.menuGroup, { backgroundColor: cardBg, borderColor }]}>
      {children}
    </View>
  );
}

export default function ApiUrlSettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useToast();
  const themeMode = useUIStore((s) => s.themeMode);
  const isDarkMode = themeMode === "dark";

  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const [lastSuccessfulApiUrl, setLastSuccessfulApiUrl] = useState(getApiBaseUrl());
  const [isTestingApiUrl, setIsTestingApiUrl] = useState(false);
  const [isSavingApiUrl, setIsSavingApiUrl] = useState(false);

  const mainBg = isDarkMode ? "#0c0516" : "#FAFAFA";
  const gradientColors = (
    isDarkMode
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];
  const cardBg = isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
  const inputBg = isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)";
  const borderColor = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(236, 72, 153, 0.25)";
  const textColor = isDarkMode ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
  const softBorder = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.22)";

  const canSaveApiUrl =
    !!lastSuccessfulApiUrl &&
    !isSavingApiUrl &&
    lastSuccessfulApiUrl.trim() === apiUrlInput.trim();

  const handleTestApiUrl = async (): Promise<void> => {
    setIsTestingApiUrl(true);
    try {
      const normalized = apiUrlInput.trim();
      await testApiBaseUrl(normalized);
      setLastSuccessfulApiUrl(normalized);
      showSuccess(t("settings.apiUrlTestSuccess"));
    } catch (error) {
      showError(error instanceof Error ? error.message : t("settings.apiUrlTestError"));
    } finally {
      setIsTestingApiUrl(false);
    }
  };

  const handleSaveApiUrl = async (): Promise<void> => {
    setIsSavingApiUrl(true);
    try {
      const normalized = await saveApiBaseUrl(lastSuccessfulApiUrl.trim());
      apiClient.defaults.baseURL = normalized;
      await queryClient.invalidateQueries();
      setApiUrlInput(normalized);
      setLastSuccessfulApiUrl(normalized);
      showSuccess(t("settings.apiUrlSaveSuccess"));
    } catch (error) {
      showError(error instanceof Error ? error.message : t("settings.apiUrlSaveError"));
    } finally {
      setIsSavingApiUrl(false);
    }
  };

  const handleResetApiUrl = (): void => {
    setApiUrlInput(DEFAULT_API_BASE_URL);
    setLastSuccessfulApiUrl("");
    showInfo(t("settings.apiUrlResetInfo"));
  };

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: cardBg, borderColor }]}
          >
            <ArrowLeft01Icon size={20} color={textColor} variant="stroke" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>{t("settings.apiUrlTitle")}</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.apiUrlTitle")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.inputContainer}>
              <Text style={[styles.sectionDescription, { color: mutedColor }]}>
                {t("settings.apiUrlDescription")}
              </Text>

              <TextInput
                value={apiUrlInput}
                onChangeText={setApiUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder={DEFAULT_API_BASE_URL}
                placeholderTextColor={mutedColor}
                style={[
                  styles.apiUrlInput,
                  {
                    backgroundColor: inputBg,
                    borderColor,
                    color: textColor,
                  },
                ]}
                returnKeyType="done"
                blurOnSubmit={false}
              />

              <Text style={[styles.sectionDescription, { color: mutedColor }]}>
                {t("settings.apiUrlCurrent")}: {getApiBaseUrl()}
              </Text>

              <View style={styles.apiActionRow}>
                <TouchableOpacity
                  style={[
                    styles.apiSecondaryButton,
                    {
                      backgroundColor: inputBg,
                      borderColor: softBorder,
                      opacity: isTestingApiUrl || isSavingApiUrl ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleTestApiUrl}
                  disabled={isTestingApiUrl || isSavingApiUrl}
                  activeOpacity={0.82}
                >
                  {isTestingApiUrl ? (
                    <ActivityIndicator size="small" color={textColor} />
                  ) : (
                    <Text style={[styles.apiSecondaryButtonText, { color: textColor }]}>
                      {t("settings.apiUrlTestButton")}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveApiUrl}
                  disabled={!canSaveApiUrl}
                  activeOpacity={0.88}
                  style={[styles.apiPrimaryButtonWrap, { opacity: canSaveApiUrl ? 1 : 0.45 }]}
                >
                  <LinearGradient
                    colors={[...GRADIENT.primary]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.apiPrimaryButton}
                  >
                    {isSavingApiUrl ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.apiPrimaryButtonText}>{t("settings.apiUrlSaveButton")}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleResetApiUrl} style={styles.apiResetButton}>
                <Text style={[styles.apiResetButtonText, { color: mutedColor }]}>
                  {t("settings.apiUrlResetButton")}
                </Text>
              </TouchableOpacity>
            </View>
          </MenuGroup>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  backButtonPlaceholder: { width: 38 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  content: { flex: 1, backgroundColor: "transparent" },
  contentContainer: { paddingHorizontal: 20, paddingTop: 10 },
  groupTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  inputContainer: { padding: 16, gap: 12 },
  sectionDescription: { fontSize: 13, lineHeight: 20 },
  apiUrlInput: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  apiActionRow: { flexDirection: "row", gap: 10 },
  apiSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  apiSecondaryButtonText: { fontSize: 14, fontWeight: "700" },
  apiPrimaryButtonWrap: {
    flex: 1,
  },
  apiPrimaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    shadowColor: "#DB2777",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  apiPrimaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  apiResetButton: { alignSelf: "flex-start", paddingVertical: 4 },
  apiResetButtonText: { fontSize: 12, fontWeight: "600" },
});
