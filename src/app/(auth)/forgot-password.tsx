import React, { useMemo } from "react";
import { View, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail02Icon, ArrowLeft01Icon } from "hugeicons-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../components/ui/text";
import {
  createForgotPasswordSchema,
  type ForgotPasswordFormData,
  useForgotPassword,
} from "../../features/auth";
import { useToast } from "../../hooks/useToast";

const COLORS = {
  bg: "#0f0518",
  card: "#130b1b",
  border: "rgba(255,255,255,0.08)",
  placeholder: "#64748b",
  accent: "#ec4899",
  text: "#ffffff",
  muted: "#94a3b8",
};

export default function ForgotPasswordScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const schema = useMemo(() => createForgotPasswordSchema(), []);
  const forgotPasswordMutation = useForgotPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(schema) as Resolver<ForgotPasswordFormData>,
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(
      { email: data.email.trim() },
      {
        onSuccess: (message) => {
          showSuccess(message || t("auth.forgotPassword.success"));
          router.back();
        },
        onError: (error) => {
          showError(error instanceof Error ? error.message : t("auth.forgotPassword.error"));
        },
      }
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft01Icon size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("auth.forgotPassword.title")}</Text>
        <View style={styles.iconSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("auth.forgotPassword.title")}</Text>
          <Text style={styles.description}>{t("auth.forgotPassword.description")}</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                  <Mail02Icon size={18} color={COLORS.muted} />
                  <TextInput
                    style={styles.input}
                    placeholder={t("auth.forgotPassword.emailPlaceholder")}
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}
              </View>
            )}
          />

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={forgotPasswordMutation.isPending}
            activeOpacity={0.85}
            style={styles.submitWrap}
          >
            <LinearGradient colors={["#ec4899", "#f97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitButton}>
              {forgotPasswordMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t("auth.forgotPassword.submitButton")}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{t("auth.forgotPassword.backToLogin")}</Text>
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
  secondaryButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.03)" },
  secondaryText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
});
