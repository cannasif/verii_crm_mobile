import React, { useMemo, useState } from "react";
import { View, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LockPasswordIcon, ArrowLeft01Icon, ViewIcon, ViewOffIcon } from "hugeicons-react-native";
import { Text } from "../../components/ui/text";
import {
  createChangePasswordSchema,
  type ChangePasswordFormData,
  useChangePassword,
} from "../../features/auth";
import { useToast } from "../../hooks/useToast";

const COLORS = {
  bg: "#0f0518",
  card: "#130b1b",
  border: "rgba(255,255,255,0.08)",
  placeholder: "#64748b",
  text: "#ffffff",
  muted: "#94a3b8",
  accent: "#ec4899",
};

export default function ChangePasswordScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const changePasswordMutation = useChangePassword();
  const schema = useMemo(() => createChangePasswordSchema(), []);
  const [visibility, setVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

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

  const onSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword.trim(),
        newPassword: data.newPassword.trim(),
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

  const renderPasswordField = (
    name: "currentPassword" | "newPassword" | "confirmPassword",
    placeholder: string
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View>
          <View style={[styles.inputWrapper, errors[name] && styles.inputError]}>
            <LockPasswordIcon size={18} color={COLORS.muted} />
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={COLORS.placeholder}
              secureTextEntry={!visibility[name]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            <TouchableOpacity onPress={() => setVisibility((prev) => ({ ...prev, [name]: !prev[name] }))}>
              {visibility[name] ? <ViewOffIcon size={18} color={COLORS.muted} /> : <ViewIcon size={18} color={COLORS.muted} />}
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
        <Text style={styles.headerTitle}>{t("auth.changePassword.title")}</Text>
        <View style={styles.iconSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("auth.changePassword.title")}</Text>
          <Text style={styles.description}>{t("auth.changePassword.description")}</Text>

          {renderPasswordField("currentPassword", t("auth.changePassword.currentPasswordPlaceholder"))}
          {renderPasswordField("newPassword", t("auth.changePassword.newPasswordPlaceholder"))}
          {renderPasswordField("confirmPassword", t("auth.changePassword.confirmPasswordPlaceholder"))}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={changePasswordMutation.isPending}
            activeOpacity={0.85}
            style={[styles.submitButton, changePasswordMutation.isPending && styles.submitButtonDisabled]}
          >
            {changePasswordMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{t("auth.changePassword.submitButton")}</Text>
            )}
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
  submitButton: { minHeight: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.accent, marginTop: 4 },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.8 },
});
