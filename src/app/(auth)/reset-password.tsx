import React, { useEffect, useMemo, useState } from "react";
import { View, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LockKeyIcon, ArrowLeft01Icon, ViewIcon, ViewOffIcon } from "hugeicons-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../components/ui/text";
import {
  createResetPasswordSchema,
  type ResetPasswordFormData,
  useResetPassword,
} from "../../features/auth";
import { useToast } from "../../hooks/useToast";

const COLORS = {
  bg: "#0f0518",
  card: "#130b1b",
  border: "rgba(255,255,255,0.08)",
  placeholder: "#64748b",
  text: "#ffffff",
  muted: "#94a3b8",
};

export default function ResetPasswordScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const schema = useMemo(() => createResetPasswordSchema(), []);
  const resetPasswordMutation = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(schema) as Resolver<ResetPasswordFormData>,
    defaultValues: {
      token: typeof token === "string" ? token : "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (typeof token === "string" && token.length > 0) {
      setValue("token", token);
      return;
    }
    showError(t("auth.resetPassword.invalidToken"));
  }, [setValue, showError, t, token]);

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(
      {
        token: data.token,
        newPassword: data.newPassword.trim(),
      },
      {
        onSuccess: (message) => {
          showSuccess(message || t("auth.resetPassword.success"));
          router.replace("/(auth)/login");
        },
        onError: (error) => {
          showError(error instanceof Error ? error.message : t("auth.resetPassword.error"));
        },
      }
    );
  };

  const onInvalidSubmit = () => {
    showError(t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun"));
  };

  const renderPasswordField = (
    name: "newPassword" | "confirmPassword",
    placeholder: string,
    visible: boolean,
    toggle: () => void
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View>
          <View style={[styles.inputWrapper, errors[name] && styles.inputError]}>
            <LockKeyIcon size={18} color={COLORS.muted} />
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={COLORS.placeholder}
              secureTextEntry={!visible}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            <TouchableOpacity onPress={toggle}>
              {visible ? <ViewOffIcon size={18} color={COLORS.muted} /> : <ViewIcon size={18} color={COLORS.muted} />}
            </TouchableOpacity>
          </View>
          {errors[name] ? <Text style={styles.errorText}>{errors[name]?.message}</Text> : null}
        </View>
      )}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft01Icon size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("auth.resetPassword.title")}</Text>
        <View style={styles.iconSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("auth.resetPassword.title")}</Text>
          <Text style={styles.description}>{t("auth.resetPassword.description")}</Text>

          {renderPasswordField("newPassword", t("auth.resetPassword.newPasswordPlaceholder"), showPassword, () => setShowPassword((prev) => !prev))}
          {renderPasswordField("confirmPassword", t("auth.resetPassword.confirmPasswordPlaceholder"), showConfirmPassword, () => setShowConfirmPassword((prev) => !prev))}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit, onInvalidSubmit)}
            disabled={resetPasswordMutation.isPending || typeof token !== "string" || token.length === 0}
            activeOpacity={0.85}
            style={styles.submitWrap}
          >
            <LinearGradient colors={["#ec4899", "#f97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitButton}>
              {resetPasswordMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t("auth.resetPassword.submitButton")}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.04)" },
  iconSpacer: { width: 40, height: 40 },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  content: { flex: 1, justifyContent: "center" },
  card: { backgroundColor: COLORS.card, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", padding: 24, gap: 16 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: "700" },
  description: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: "#15111D", minHeight: 54 },
  input: { flex: 1, color: COLORS.text, fontSize: 14 },
  inputError: { borderColor: "#ef4444" },
  errorText: { color: "#f87171", fontSize: 12, marginTop: 6, marginLeft: 4 },
  submitWrap: { marginTop: 4 },
  submitButton: { minHeight: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 1 },
});
