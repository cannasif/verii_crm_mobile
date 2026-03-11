import React, { useMemo, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  LockPasswordIcon,
  ArrowLeft01Icon,
  ViewIcon,
  ViewOffIcon,
} from "hugeicons-react-native";
import { Text } from "../../components/ui/text";
import {
  createChangePasswordSchema,
  type ChangePasswordFormData,
  useChangePassword,
} from "../../features/auth";
import { useToast } from "../../hooks/useToast";
import { useUIStore } from "../../store/ui";

const COLORS = {
  darkBg: "#0c0516",
  lightBg: "#FFFFFF",
  darkCard: "rgba(19, 11, 27, 0.72)",
  lightCard: "rgba(255,255,255,0.82)",
  darkBorder: "rgba(255,255,255,0.08)",
  lightBorder: "rgba(15, 23, 42, 0.08)",
  darkText: "#ffffff",
  lightText: "#0f172a",
  darkMuted: "#94a3b8",
  lightMuted: "#64748b",
  darkPlaceholder: "#64748b",
  lightPlaceholder: "#94a3b8",
  accent: "#ec4899",
  accentSoft: "rgba(236,72,153,0.14)",
  error: "#ef4444",
  errorSoft: "#f87171",
  darkInput: "rgba(255,255,255,0.04)",
  lightInput: "rgba(255,255,255,0.7)",
};

export default function ChangePasswordScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const changePasswordMutation = useChangePassword();
  const { themeMode } = useUIStore();
  const isDark = themeMode === "dark";

  const schema = useMemo(() => createChangePasswordSchema(), [i18n.language]);

  const [visibility, setVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const newPasswordRef = useRef<RNTextInput | null>(null);
  const confirmPasswordRef = useRef<RNTextInput | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(schema) as Resolver<ChangePasswordFormData>,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mainBg = isDark ? COLORS.darkBg : COLORS.lightBg;
  const cardBg = isDark ? COLORS.darkCard : COLORS.lightCard;
  const borderColor = isDark ? COLORS.darkBorder : COLORS.lightBorder;
  const textColor = isDark ? COLORS.darkText : COLORS.lightText;
  const mutedColor = isDark ? COLORS.darkMuted : COLORS.lightMuted;
  const placeholderColor = isDark ? COLORS.darkPlaceholder : COLORS.lightPlaceholder;
  const inputBg = isDark ? COLORS.darkInput : COLORS.lightInput;

  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.14)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.72)", "#FFFFFF", "rgba(255, 240, 225, 0.72)"]
  ) as [string, string, ...string[]];

  const onSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          reset();
          showSuccess(t("auth.changePassword.success"));
          router.back();
        },
        onError: (error) => {
          showError(error instanceof Error ? error.message : t("auth.changePassword.error"));
        },
      }
    );
  };

  const onInvalidSubmit = () => {
    showError(t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun"));
  };

  const toggleVisibility = (name: keyof typeof visibility) => {
    setVisibility((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const renderPasswordField = (
    name: "currentPassword" | "newPassword" | "confirmPassword",
    placeholder: string,
    options?: {
      inputRef?: React.RefObject<RNTextInput | null>;
      returnKeyType?: "next" | "done";
      onSubmitEditing?: () => void;
      textContentType?: "password" | "newPassword";
    }
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.fieldBlock}>
          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: errors[name] ? COLORS.error : borderColor,
                backgroundColor: inputBg,
              },
            ]}
          >
            <View
              style={[
                styles.leadingIconWrap,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(15,23,42,0.05)",
                },
              ]}
            >
              <LockPasswordIcon size={18} color={mutedColor} />
            </View>

            <TextInput
              ref={options?.inputRef ?? undefined}
              style={[styles.input, { color: textColor }]}
              placeholder={placeholder}
              placeholderTextColor={placeholderColor}
              secureTextEntry={!visibility[name]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={options?.textContentType}
              importantForAutofill="yes"
              returnKeyType={options?.returnKeyType ?? "done"}
              onSubmitEditing={options?.onSubmitEditing}
              selectionColor={COLORS.accent}
            />

            <TouchableOpacity
              onPress={() => toggleVisibility(name)}
              activeOpacity={0.8}
              style={[
                styles.trailingButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(15,23,42,0.05)",
                },
              ]}
            >
              {visibility[name] ? (
                <ViewOffIcon size={18} color={mutedColor} />
              ) : (
                <ViewIcon size={18} color={mutedColor} />
              )}
            </TouchableOpacity>
          </View>

          {errors[name] ? (
            <Text style={[styles.errorText, { color: COLORS.errorSoft }]}>
              {errors[name]?.message}
            </Text>
          ) : null}
        </View>
      )}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 14,
              paddingBottom: Math.max(insets.bottom + 96, 120),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  borderColor,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(255,255,255,0.72)",
                },
              ]}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <ArrowLeft01Icon size={20} color={textColor} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: textColor }]}>
              {t("auth.changePassword.title")}
            </Text>

            <View style={styles.iconSpacer} />
          </View>

          <View style={styles.cardWrap}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: cardBg,
                  borderColor,
                  shadowColor: isDark ? "#000000" : "#f472b6",
                },
              ]}
            >
              <View style={styles.titleBlock}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: COLORS.accentSoft,
                      borderColor: "rgba(236,72,153,0.18)",
                    },
                  ]}
                >
                  <LockPasswordIcon size={16} color={COLORS.accent} />
                  <Text style={[styles.badgeText, { color: COLORS.accent }]}>
                    {t("auth.changePassword.title")}
                  </Text>
                </View>

                <Text style={[styles.title, { color: textColor }]}>
                  {t("auth.changePassword.title")}
                </Text>

                <Text style={[styles.description, { color: mutedColor }]}>
                  {t("auth.changePassword.description")}
                </Text>
              </View>

              <View style={styles.form}>
                {renderPasswordField(
                  "currentPassword",
                  t("auth.changePassword.currentPasswordPlaceholder"),
                  {
                    returnKeyType: "next",
                    onSubmitEditing: () => newPasswordRef.current?.focus(),
                    textContentType: "password",
                  }
                )}

                {renderPasswordField(
                  "newPassword",
                  t("auth.changePassword.newPasswordPlaceholder"),
                  {
                    inputRef: newPasswordRef,
                    returnKeyType: "next",
                    onSubmitEditing: () => confirmPasswordRef.current?.focus(),
                    textContentType: "newPassword",
                  }
                )}

                {renderPasswordField(
                  "confirmPassword",
                  t("auth.changePassword.confirmPasswordPlaceholder"),
                  {
                    inputRef: confirmPasswordRef,
                    returnKeyType: "done",
                    onSubmitEditing: handleSubmit(onSubmit, onInvalidSubmit),
                    textContentType: "newPassword",
                  }
                )}

                <TouchableOpacity
                  onPress={handleSubmit(onSubmit, onInvalidSubmit)}
                  disabled={changePasswordMutation.isPending}
                  activeOpacity={0.88}
                  style={[
                    styles.submitButton,
                    {
                      opacity: changePasswordMutation.isPending ? 0.72 : 1,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#ec4899", "#f97316"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitGradient}
                  >
                    {changePasswordMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitText}>
                        {t("auth.changePassword.submitButton")}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconSpacer: {
    width: 42,
    height: 42,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardWrap: {
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    gap: 22,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  },
  titleBlock: {
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  form: {
    gap: 14,
    marginTop: 4,
  },
  fieldBlock: {
    gap: 6,
  },
  inputWrapper: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 10,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leadingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trailingButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 18,
    overflow: "hidden",
  },
  submitGradient: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  submitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
