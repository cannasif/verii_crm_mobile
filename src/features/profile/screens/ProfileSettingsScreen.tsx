import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Controller } from "react-hook-form";
import {
  ArrowLeft01Icon,
  Camera01Icon,
  LockPasswordIcon,
  Logout01Icon,
  Store01Icon,
  UserIcon,
} from "hugeicons-react-native";

import { Text } from "../../../components/ui/text";
import { useKeyboardBottomInset } from "../../../hooks/useKeyboardBottomInset";
import { useUIStore } from "../../../store/ui";
import { GenderPickerField } from "../components/GenderPickerField";
import { useProfileSettingsScreen } from "../hooks/useProfileSettingsScreen";

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

function FormField({
  label,
  error,
  children,
  textColor,
  errorColor,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  textColor: string;
  errorColor: string;
}): React.ReactElement {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: textColor }]}>{label}</Text>
      {children}
      {error ? <Text style={[styles.fieldError, { color: errorColor }]}>{error}</Text> : null}
    </View>
  );
}

export function ProfileSettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const themeMode = useUIStore((s) => s.themeMode);
  const colors = useUIStore((s) => s.colors);
  const isDarkMode = themeMode === "dark";

  const {
    control,
    errors,
    isDirty,
    fullName,
    loginEmail,
    branchName,
    profileImageUrl,
    isLoadingDetail,
    isSaving,
    isUploadingPhoto,
    handleOpenChangePassword,
    handleLogout,
    handlePickProfileImage,
    onSubmit,
  } = useProfileSettingsScreen();

  const mainBg = isDarkMode ? "#0c0516" : "#FAFAFA";
  const gradientColors = (
    isDarkMode
      ? [`${colors.accent}1F`, "transparent", `${colors.accentSecondary}1F`]
      : [`${colors.accent}18`, colors.background, `${colors.accentSecondary}18`]
  ) as [string, string, ...string[]];
  const cardBg = isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
  const inputBg = isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)";
  const borderColor = isDarkMode ? colors.border : colors.cardBorder;
  const textColor = isDarkMode ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
  const brandColor = colors.accent;
  const errorColor = "#EF4444";

  const inputStyle = useMemo(
    () => [styles.input, { backgroundColor: inputBg, borderColor, color: textColor }],
    [inputBg, borderColor, textColor],
  );

  const scrollContentPaddingBottom =
    insets.bottom + 40 + (Platform.OS === "ios" ? keyboardInset : 0);

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
          <Text style={[styles.headerTitle, { color: textColor }]}>{t("settings.title")}</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: scrollContentPaddingBottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
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
            <Text style={[styles.profileMail, { color: mutedColor }]}>{loginEmail}</Text>

            {branchName ? (
              <View style={[styles.branchBadge, { backgroundColor: "rgba(236, 72, 153, 0.1)" }]}>
                <Store01Icon size={14} color={brandColor} variant="stroke" style={{ marginRight: 6 }} />
                <Text style={[styles.branchText, { color: brandColor }]}>{branchName}</Text>
              </View>
            ) : null}

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
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
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
                <LockPasswordIcon size={18} color={brandColor} variant="stroke" style={{ marginRight: 8 }} />
                <Text style={[styles.primaryButtonText, { color: brandColor }]}>
                  {t("settings.updatePasswordBtn")}
                </Text>
              </TouchableOpacity>
            </View>
          </MenuGroup>

          <Text style={[styles.groupTitle, { color: mutedColor }]}>{t("profileDetail.sectionTitle")}</Text>
          <MenuGroup cardBg={cardBg} borderColor={borderColor}>
            <View style={styles.inputContainer}>
              <Text style={[styles.sectionDescription, { color: mutedColor }]}>
                {t("profileDetail.sectionDescription")}
              </Text>

              {isLoadingDetail ? (
                <ActivityIndicator color={brandColor} style={{ marginVertical: 12 }} />
              ) : (
                <>
                  <View style={styles.rowFields}>
                    <View style={styles.halfField}>
                      <FormField
                        label={t("profileDetail.height")}
                        error={errors.height?.message}
                        textColor={textColor}
                        errorColor={errorColor}
                      >
                        <Controller
                          control={control}
                          name="height"
                          render={({ field: { value, onChange, onBlur } }) => (
                            <TextInput
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              keyboardType="numeric"
                              placeholder="175"
                              placeholderTextColor={mutedColor}
                              style={inputStyle}
                            />
                          )}
                        />
                      </FormField>
                    </View>
                    <View style={styles.halfField}>
                      <FormField
                        label={t("profileDetail.weight")}
                        error={errors.weight?.message}
                        textColor={textColor}
                        errorColor={errorColor}
                      >
                        <Controller
                          control={control}
                          name="weight"
                          render={({ field: { value, onChange, onBlur } }) => (
                            <TextInput
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              keyboardType="numeric"
                              placeholder="70"
                              placeholderTextColor={mutedColor}
                              style={inputStyle}
                            />
                          )}
                        />
                      </FormField>
                    </View>
                  </View>

                  <Controller
                    control={control}
                    name="gender"
                    render={({ field: { value, onChange } }) => (
                      <GenderPickerField
                        value={value ?? ""}
                        onChange={onChange}
                        error={errors.gender?.message}
                      />
                    )}
                  />

                  <FormField
                    label={t("profileDetail.phoneNumber")}
                    error={errors.phoneNumber?.message}
                    textColor={textColor}
                    errorColor={errorColor}
                  >
                    <Controller
                      control={control}
                      name="phoneNumber"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          value={value ?? ""}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="phone-pad"
                          placeholder="+90..."
                          placeholderTextColor={mutedColor}
                          style={inputStyle}
                        />
                      )}
                    />
                  </FormField>

                  <FormField
                    label={t("profileDetail.email")}
                    error={errors.email?.message}
                    textColor={textColor}
                    errorColor={errorColor}
                  >
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          value={value ?? ""}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholder="ornek@sirket.com"
                          placeholderTextColor={mutedColor}
                          style={inputStyle}
                        />
                      )}
                    />
                  </FormField>

                  <FormField
                    label={t("profileDetail.linkedinUrl")}
                    error={errors.linkedinUrl?.message}
                    textColor={textColor}
                    errorColor={errorColor}
                  >
                    <Controller
                      control={control}
                      name="linkedinUrl"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          value={value ?? ""}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          autoCapitalize="none"
                          keyboardType="url"
                          placeholder="https://linkedin.com/in/..."
                          placeholderTextColor={mutedColor}
                          style={inputStyle}
                        />
                      )}
                    />
                  </FormField>

                  <FormField
                    label={t("profileDetail.description")}
                    error={errors.description?.message}
                    textColor={textColor}
                    errorColor={errorColor}
                  >
                    <Controller
                      control={control}
                      name="description"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          value={value ?? ""}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                          placeholder={t("profileDetail.descriptionPlaceholder")}
                          placeholderTextColor={mutedColor}
                          style={[inputStyle, styles.textArea]}
                        />
                      )}
                    />
                  </FormField>

                  <TouchableOpacity
                    onPress={onSubmit}
                    disabled={isSaving || !isDirty}
                    activeOpacity={0.88}
                    style={{ opacity: isSaving || !isDirty ? 0.55 : 1 }}
                  >
                    <LinearGradient
                      colors={[colors.gradientPrimaryStart, colors.gradientPrimaryMiddle, colors.gradientPrimaryEnd]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.saveButton}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>{t("profileDetail.saveButton")}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
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
  profileSection: { alignItems: "center", marginBottom: 28, marginTop: 10 },
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
  avatarImage: { width: "100%", height: "100%" },
  profileName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  profileMail: { fontSize: 13, fontWeight: "500", marginBottom: 10 },
  branchBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  branchText: { fontSize: 12, fontWeight: "700" },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  uploadButtonText: { fontSize: 13, fontWeight: "600" },
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
  primaryButton: {
    flexDirection: "row",
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { fontWeight: "600", fontSize: 14 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "700" },
  fieldError: { fontSize: 12, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 96, paddingTop: 12 },
  rowFields: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  saveButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: "#DB2777",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 20,
    marginTop: 8,
  },
  logoutText: { fontSize: 14, fontWeight: "600" },
});
