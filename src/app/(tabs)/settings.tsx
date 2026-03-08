import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Text } from "../../components/ui/text";
import { useAuthStore } from "../../store/auth";
import { useUIStore } from "../../store/ui";
import { setLanguage, getCurrentLanguage } from "../../locales";
import { profileApi } from "../../features/profile";
import { useToast } from "../../hooks/useToast";

export default function SettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const clearAuth = useAuthStore((state) => state.clearAuth);
  const authUser = useAuthStore((state) => state.user);
  const { colors, themeMode, toggleTheme } = useUIStore();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isDarkMode = themeMode === "dark";

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
      if (!userId) throw new Error("Kullanıcı bilgisi bulunamadı");
      return profileApi.uploadProfilePicture(userId, uri);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", "detail", userId] });
      showSuccess("Profil resmi güncellendi");
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : "Profil resmi güncellenemedi");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      profileApi.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Şifre başarıyla değiştirildi");
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : "Şifre değiştirilemedi");
    },
  });

  const handleBack = (): void => {
    router.back();
  };

  const handleLanguageChange = async (lang: "tr" | "en"): Promise<void> => {
    await setLanguage(lang);
    setCurrentLang(lang);
  };

  const handleLogout = (): void => {
    Alert.alert(t("common.logout"), "", [
      { text: t("common.cancel"), style: "cancel" },
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
      showError("Galeri izni gerekli");
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

  const handleChangePassword = (): void => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError("Lütfen tüm şifre alanlarını doldurun");
      return;
    }

    if (newPassword.length < 6) {
      showError("Yeni şifre en az 6 karakter olmalı");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Yeni şifre ve tekrar şifresi eşleşmiyor");
      return;
    }

    changePasswordMutation.mutate();
  };

  const cardBackground = isDarkMode ? "rgba(20, 10, 30, 0.7)" : "#FFFFFF";

  const fullName = useMemo(() => {
    const apiName = myProfileQuery.data?.fullName?.trim();
    if (apiName) return apiName;
    return authUser?.name || "Kullanıcı";
  }, [myProfileQuery.data?.fullName, authUser?.name]);

  const email = myProfileQuery.data?.email || authUser?.email || "-";
  const profileImageUrl = userDetailQuery.data?.profilePictureUrl || undefined;

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: colors.header, paddingTop: insets.top }]}> 
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil Ayarları</Text>
          <View style={styles.backButton} />
        </View>

        <FlatListScrollView
          style={[styles.content, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 28 },
          ]}
        >
          <View
            style={[
              styles.profileCard,
              { backgroundColor: cardBackground, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.profileRow}>
              <View style={[styles.avatarWrap, { borderColor: colors.cardBorder }]}> 
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarFallback}>👤</Text>
                )}
              </View>

              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>{fullName}</Text>
                <Text style={[styles.profileMail, { color: colors.textMuted }]}>{email}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={handlePickProfileImage}
              disabled={uploadPictureMutation.isPending}
            >
              {uploadPictureMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Profil Resmi Yükle</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Şifre Değiştir</Text>
            <View style={[styles.optionCard, { backgroundColor: cardBackground, borderColor: colors.cardBorder }]}>
              <TextInput
                style={[styles.input, { borderColor: colors.cardBorder, color: colors.text }]}
                placeholder="Mevcut Şifre"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={[styles.input, { borderColor: colors.cardBorder, color: colors.text }]}
                placeholder="Yeni Şifre"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={[styles.input, { borderColor: colors.cardBorder, color: colors.text }]}
                placeholder="Yeni Şifre (Tekrar)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.accent }]}
                onPress={handleChangePassword}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Şifreyi Güncelle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.appearance")}</Text>
            <View style={[styles.optionCard, { backgroundColor: cardBackground, borderColor: colors.cardBorder }]}> 
              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <Text style={styles.optionIcon}>{isDarkMode ? "🌙" : "☀️"}</Text>
                  <Text style={[styles.optionText, { color: colors.text }]}>{t("settings.darkMode")}</Text>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: "#E5E7EB", true: colors.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("language.title")}</Text>
            <View style={[styles.languageOptions, { backgroundColor: cardBackground, borderColor: colors.cardBorder }]}> 
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.cardBorder },
                  currentLang === "tr" && { backgroundColor: colors.activeBackground },
                ]}
                onPress={() => handleLanguageChange("tr")}
              >
                <Text style={styles.languageFlag}>🇹🇷</Text>
                <Text
                  style={[
                    styles.languageText,
                    { color: colors.text },
                    currentLang === "tr" && { fontWeight: "600", color: colors.accent },
                  ]}
                >
                  {t("language.turkish")}
                </Text>
                {currentLang === "tr" && <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  { borderBottomWidth: 0 },
                  currentLang === "en" && { backgroundColor: colors.activeBackground },
                ]}
                onPress={() => handleLanguageChange("en")}
              >
                <Text style={styles.languageFlag}>🇬🇧</Text>
                <Text
                  style={[
                    styles.languageText,
                    { color: colors.text },
                    currentLang === "en" && { fontWeight: "600", color: colors.accent },
                  ]}
                >
                  {t("language.english")}
                </Text>
                {currentLang === "en" && <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "#FFFFFF",
                borderColor: isDarkMode ? "rgba(239, 68, 68, 0.3)" : "#FEE2E2",
              },
            ]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutText, { color: colors.error }]}>{t("common.logout")}</Text>
          </TouchableOpacity>
        </FlatListScrollView>
      </View>
    </>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  profileMail: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
  },
  languageOptions: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageText: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "700",
  },
  logoutButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
