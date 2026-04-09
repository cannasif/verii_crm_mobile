import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  UserIcon,
  Camera01Icon,
  Moon02Icon,
  Sun01Icon,
  Logout01Icon,
  LockPasswordIcon,
  Mail01Icon,
} from "hugeicons-react-native";

import { Text } from "../../components/ui/text";
import { useAuthStore } from "../../store/auth";
import { useUIStore } from "../../store/ui";
import { setLanguage, getCurrentLanguage } from "../../locales";
import { profileApi } from "../../features/profile";
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

export default function SettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useToast();

  const clearAuth = useAuthStore((state) => state.clearAuth);
  const authUser = useAuthStore((state) => state.user);
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const uppercaseCompanyNameAfterScan = useUIStore((s) => s.uppercaseCompanyNameAfterScan);
  const setUppercaseCompanyNameAfterScan = useUIStore((s) => s.setUppercaseCompanyNameAfterScan);

  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const [lastSuccessfulApiUrl, setLastSuccessfulApiUrl] = useState(getApiBaseUrl());
  const [isTestingApiUrl, setIsTestingApiUrl] = useState(false);
  const [isSavingApiUrl, setIsSavingApiUrl] = useState(false);

  const isDarkMode = themeMode === "dark";

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
  const brandColor = isDarkMode ? "#EC4899" : "#DB2777";
  const errorColor = "#EF4444";

  const SUPPORTED_LANGUAGES = [
    { id: "tr", label: t("language.turkish", "Türkçe"), flag: "🇹🇷" },
    { id: "en", label: t("language.english", "English"), flag: "🇬🇧" },
    { id: "de", label: t("language.german", "Deutsch"), flag: "🇩🇪" },
  ];

  const myProfileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => profileApi.getMyProfile(),
  });

  const userId = myProfileQuery.data?.id ?? authUser?.id;

  const userDetailQuery = useQuery({
    queryKey: ["profile", "detail", userId],
    queryFn: () => profileApi.getUserDetailByUserId(userId as number),
    enabled: typeof userId === "number" && userId > 0,
  });

  const uploadPictureMutation = useMutation({
    mutationFn: async (uri: string) => {
      if (!userId) throw new Error(t("settings.errorNoUser"));
      return profileApi.uploadProfilePicture(userId, uri);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", "detail", userId] });
      showSuccess(t("settings.successPhoto"));
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : t("settings.errorPhoto"));
    },
  });

  const handleBack = (): void => {
    router.back();
  };

  const handleOpenChangePassword = (): void => {
    router.push("/(auth)/change-password");
  };

  const handleOpenIntegrationSettings = (): void => {
    router.push("/integrations-settings");
  };

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

  const handleLanguageChange = async (lang: "tr" | "en" | "de"): Promise<void> => {
    await setLanguage(lang);
    setCurrentLang(lang);
  };

  const handleLogout = (): void => {
    Alert.alert(t("common.logout"), "", [
      { text: t("profile.cancel", "İptal"), style: "cancel" },
      {
        text: t("common.logout"),
        style: "destructive",
        onPress: () => {
          clearAuth();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handlePickProfileImage = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError(t("settings.errorGallery"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;
    uploadPictureMutation.mutate(result.assets[0].uri);
  };

  const fullName = useMemo(() => {
    const apiName = myProfileQuery.data?.fullName?.trim();
    if (apiName) return apiName;
    return authUser?.name || t("settings.defaultUser");
  }, [myProfileQuery.data?.fullName, authUser?.name, t]);

  const email = myProfileQuery.data?.email || authUser?.email || "-";
  const profileImageUrl = userDetailQuery.data?.profilePictureUrl || undefined;

  const canSaveApiUrl =
    !!lastSuccessfulApiUrl &&
    !isSavingApiUrl &&
    lastSuccessfulApiUrl.trim() === apiUrlInput.trim();

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
            onPress={handleBack}
            style={[styles.backButton, { backgroundColor: cardBg, borderColor }]}
          >
            <ArrowLeft01Icon size={20} color={textColor} variant="stroke" />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: textColor }]}>{t("settings.title")}</Text>

          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <View style={styles.profileSection}>
            <View style={[styles.avatarBorder, { borderColor }]}>
              <View style={[styles.avatarInner, { backgroundColor: cardBg }]}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <UserIcon size={32} color={brandColor} variant="stroke" />
                )}
              </View>
            </View>

            <Text style={[styles.profileName, { color: textColor }]}>{fullName}</Text>
            <Text style={[styles.profileMail, { color: mutedColor }]}>{email}</Text>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                {
                  backgroundColor: isDarkMode ? "rgba(236, 72, 153, 0.08)" : "rgba(219, 39, 119, 0.08)",
                  borderColor: isDarkMode ? "rgba(236, 72, 153, 0.2)" : "rgba(219, 39, 119, 0.3)",
                  borderWidth: 1,
                },
              ]}
              onPress={handlePickProfileImage}
              disabled={uploadPictureMutation.isPending}
            >
              {uploadPictureMutation.isPending ? (
                <ActivityIndicator color={brandColor} size="small" />
              ) : (
                <>
                  <Camera01Icon size={16} color={brandColor} variant="stroke" style={{ marginRight: 8 }} />
                  <Text style={[styles.uploadButtonText, { color: brandColor }]}>
                    {t("settings.uploadPhoto")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.changePassword")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.inputContainer}>
              <Text style={[styles.sectionDescription, { color: mutedColor }]}>
                {t("settings.changePasswordDescription")}
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: isDarkMode ? "rgba(236, 72, 153, 0.1)" : "rgba(219, 39, 119, 0.1)",
                    borderColor: isDarkMode ? "rgba(236, 72, 153, 0.3)" : "rgba(219, 39, 119, 0.3)",
                    borderWidth: 1,
                  },
                ]}
                onPress={handleOpenChangePassword}
              >
                <>
                  <LockPasswordIcon size={18} color={brandColor} variant="stroke" style={{ marginRight: 8 }} />
                  <Text style={[styles.primaryButtonText, { color: brandColor }]}>
                    {t("settings.updatePasswordBtn")}
                  </Text>
                </>
              </TouchableOpacity>
            </View>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.appearance")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.menuRow}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                {isDarkMode ? (
                  <Sun01Icon size={18} color="#F59E0B" variant="stroke" />
                ) : (
                  <Moon02Icon size={18} color="#F59E0B" variant="stroke" />
                )}
              </View>

              <Text style={[styles.menuText, { color: textColor }]}>
                {isDarkMode ? t("settings.lightMode") : t("settings.darkMode")}
              </Text>

              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E2E8F0", true: "#10B981" }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.preferences")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextCol}>
                <Text style={[styles.preferenceTitle, { color: textColor }]}>
                  {t("settings.uppercaseCompanyAfterScan")}
                </Text>
                <Text style={[styles.preferenceHint, { color: mutedColor }]}>
                  {t("settings.uppercaseCompanyAfterScanHint")}
                </Text>
              </View>
              <Switch
                value={uppercaseCompanyNameAfterScan}
                onValueChange={setUppercaseCompanyNameAfterScan}
                trackColor={{ false: "#E2E8F0", true: "#10B981" }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }] }}
              />
            </View>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("language.title")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.langScrollContainer}
              keyboardShouldPersistTaps="handled"
            >
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = currentLang === lang.id;

                return (
                  <TouchableOpacity
                    key={lang.id}
                    onPress={() => handleLanguageChange(lang.id as "tr" | "en" | "de")}
                    style={[
                      styles.langPill,
                      {
                        backgroundColor: isActive
                          ? isDarkMode
                            ? "rgba(236, 72, 153, 0.1)"
                            : "rgba(219, 39, 119, 0.1)"
                          : inputBg,
                        borderColor: isActive
                          ? isDarkMode
                            ? "rgba(236, 72, 153, 0.3)"
                            : "rgba(219, 39, 119, 0.3)"
                          : borderColor,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 16, marginRight: 6 }}>{lang.flag}</Text>
                    <Text
                      style={{
                        color: isActive ? brandColor : mutedColor,
                        fontWeight: isActive ? "600" : "500",
                        fontSize: 13,
                      }}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.integrationSettings")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <TouchableOpacity style={styles.menuRow} onPress={handleOpenIntegrationSettings}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                <Mail01Icon size={18} color="#10B981" variant="stroke" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: textColor }]}>{t("settings.integrationSettings")}</Text>
                <Text style={[styles.sectionDescription, { color: mutedColor, marginTop: -2 }]}>
                  {t("settings.integrationSettingsDescription")}
                </Text>
              </View>

              <ArrowRight01Icon size={18} color={mutedColor} />
            </TouchableOpacity>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("settings.apiUrlTitle")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.inputContainer}>
              <Text style={[styles.menuText, { color: textColor, flex: 0 }]}>
                {t("settings.apiUrlTitle")}
              </Text>

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
                      borderColor,
                      opacity: isTestingApiUrl || isSavingApiUrl ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleTestApiUrl}
                  disabled={isTestingApiUrl || isSavingApiUrl}
                >
                  {isTestingApiUrl ? (
                    <ActivityIndicator size="small" color={brandColor} />
                  ) : (
                    <Text style={[styles.apiSecondaryButtonText, { color: brandColor }]}>
                      {t("settings.apiUrlTestButton")}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.apiPrimaryButton,
                    {
                      backgroundColor: brandColor,
                      opacity: canSaveApiUrl ? 1 : 0.45,
                    },
                  ]}
                  onPress={handleSaveApiUrl}
                  disabled={!canSaveApiUrl}
                >
                  {isSavingApiUrl ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.apiPrimaryButtonText}>{t("settings.apiUrlSaveButton")}</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleResetApiUrl} style={styles.apiResetButton}>
                <Text style={[styles.apiResetButtonText, { color: mutedColor }]}>
                  {t("settings.apiUrlResetButton")}
                </Text>
              </TouchableOpacity>
            </View>
          </MenuGroup>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.08)",
                borderColor: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.25)",
                borderWidth: 1,
              },
            ]}
            onPress={handleLogout}
          >
            <Logout01Icon size={18} color={errorColor} variant="stroke" style={{ marginRight: 8 }} />
            <Text style={[styles.logoutText, { color: errorColor }]}>{t("common.logout")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 0,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  backButtonPlaceholder: {
    width: 38,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 28,
    marginTop: 10,
  },
  avatarBorder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileMail: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
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
  inputContainer: {
    padding: 16,
    gap: 12,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  apiUrlInput: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  apiActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  apiSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  apiSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  apiPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  apiPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  apiResetButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  apiResetButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryButton: {
    flexDirection: "row",
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  preferenceTextCol: {
    flex: 1,
    marginRight: 6,
    paddingRight: 4,
  },
  preferenceTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  preferenceHint: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 3,
    lineHeight: 15,
  },
  langScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 20,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
  },
});