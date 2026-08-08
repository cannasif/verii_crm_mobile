import React, { useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft01Icon,
  Mail01Icon,
  Logout01Icon,
} from "hugeicons-react-native";

import { FlatListScrollView } from "@/components/FlatListScrollView";
import { Text } from "../../components/ui/text";
import { useUIStore } from "../../store/ui";
import { useToast } from "../../hooks/useToast";
import { integrationApi, integrationQueryKeys } from "../../features/integration";

export default function IntegrationsSettingsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useToast();
  const { themeMode } = useUIStore();

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const gradientColors = (isDark
    ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
    : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]) as [string, string, ...string[]];
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(236, 72, 153, 0.25)";
  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";

  const googleStatusQuery = useQuery({
    queryKey: integrationQueryKeys.status("google"),
    queryFn: integrationApi.getGoogleStatus,
  });

  const outlookStatusQuery = useQuery({
    queryKey: integrationQueryKeys.status("outlook"),
    queryFn: integrationApi.getOutlookStatus,
  });

  const refreshStatuses = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: integrationQueryKeys.status("google") }),
      queryClient.invalidateQueries({ queryKey: integrationQueryKeys.status("outlook") }),
    ]);
  }, [queryClient]);

  const connectGoogleMutation = useMutation({
    mutationFn: integrationApi.getGoogleAuthorizeUrl,
    onSuccess: async (result) => {
      if (!result.url) {
        showError(t("settings.integrationGoogleConnectError"));
        return;
      }
      showInfo(t("settings.integrationRedirectInfo"));
      await Linking.openURL(result.url);
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : t("settings.integrationGoogleConnectError"));
    },
  });

  const connectOutlookMutation = useMutation({
    mutationFn: integrationApi.getOutlookAuthorizeUrl,
    onSuccess: async (result) => {
      if (!result.url) {
        showError(t("settings.integrationOutlookConnectError"));
        return;
      }
      showInfo(t("settings.integrationRedirectInfo"));
      await Linking.openURL(result.url);
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : t("settings.integrationOutlookConnectError"));
    },
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: integrationApi.disconnectGoogle,
    onSuccess: async () => {
      showSuccess(t("settings.integrationGoogleDisconnected"));
      await refreshStatuses();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : t("settings.integrationGoogleDisconnectError"));
    },
  });

  const disconnectOutlookMutation = useMutation({
    mutationFn: integrationApi.disconnectOutlook,
    onSuccess: async () => {
      showSuccess(t("settings.integrationOutlookDisconnected"));
      await refreshStatuses();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : t("settings.integrationOutlookDisconnectError"));
    },
  });

  const isLoadingAny = useMemo(
    () =>
      googleStatusQuery.isLoading ||
      outlookStatusQuery.isLoading ||
      connectGoogleMutation.isPending ||
      connectOutlookMutation.isPending ||
      disconnectGoogleMutation.isPending ||
      disconnectOutlookMutation.isPending,
    [
      googleStatusQuery.isLoading,
      outlookStatusQuery.isLoading,
      connectGoogleMutation.isPending,
      connectOutlookMutation.isPending,
      disconnectGoogleMutation.isPending,
      disconnectOutlookMutation.isPending,
    ]
  );

  const confirmDisconnect = useCallback((provider: "google" | "outlook") => {
    Alert.alert(
      t("settings.integrationDisconnectTitle"),
      provider === "google"
        ? t("settings.integrationGoogleDisconnectConfirm")
        : t("settings.integrationOutlookDisconnectConfirm"),
      [
        { text: t("profile.cancel", "İptal"), style: "cancel" },
        {
          text: t("settings.integrationDisconnectButton"),
          style: "destructive",
          onPress: () => {
            if (provider === "google") {
              disconnectGoogleMutation.mutate();
            } else {
              disconnectOutlookMutation.mutate();
            }
          },
        },
      ]
    );
  }, [disconnectGoogleMutation, disconnectOutlookMutation, t]);

  const renderStatus = (isConnected?: boolean): string =>
    isConnected ? t("settings.integrationStatusConnected") : t("settings.integrationStatusDisconnected");

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: cardBg, borderColor }]}
          >
            <ArrowLeft01Icon size={20} color={textColor} variant="stroke" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>{t("settings.integrationSettings")}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <FlatListScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.description, { color: mutedColor }]}>
            {t("settings.integrationSettingsDescription")}
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Mail01Icon size={20} color="#4285F4" variant="stroke" />
                <Text style={[styles.cardTitle, { color: textColor }]}>Google</Text>
              </View>
              {googleStatusQuery.isLoading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <Text style={[styles.statusText, { color: googleStatusQuery.data?.isConnected ? "#10B981" : mutedColor }]}>
                  {renderStatus(googleStatusQuery.data?.isConnected)}
                </Text>
              )}
            </View>

            {!!googleStatusQuery.data?.googleEmail && (
              <Text style={[styles.emailText, { color: mutedColor }]}>{googleStatusQuery.data.googleEmail}</Text>
            )}

            <View>
              <TouchableOpacity
                style={[styles.primaryAction, { borderColor: "rgba(66, 133, 244, 0.35)", backgroundColor: "rgba(66, 133, 244, 0.12)" }]}
                onPress={() => connectGoogleMutation.mutate()}
                disabled={connectGoogleMutation.isPending}
              >
                {connectGoogleMutation.isPending ? (
                  <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                  <Text style={[styles.primaryActionText, { color: "#4285F4" }]}>{t("settings.integrationConnectButton")}</Text>
                )}
              </TouchableOpacity>
            </View>

            {googleStatusQuery.data?.isConnected && (
              <TouchableOpacity style={styles.disconnectRow} onPress={() => confirmDisconnect("google")}>
                <Logout01Icon size={14} color="#EF4444" variant="stroke" />
                <Text style={styles.disconnectText}>{t("settings.integrationDisconnectButton")}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Mail01Icon size={20} color="#0078D4" variant="stroke" />
                <Text style={[styles.cardTitle, { color: textColor }]}>Outlook</Text>
              </View>
              {outlookStatusQuery.isLoading ? (
                <ActivityIndicator size="small" color="#0078D4" />
              ) : (
                <Text style={[styles.statusText, { color: outlookStatusQuery.data?.isConnected ? "#10B981" : mutedColor }]}>
                  {renderStatus(outlookStatusQuery.data?.isConnected)}
                </Text>
              )}
            </View>

            {!!outlookStatusQuery.data?.outlookEmail && (
              <Text style={[styles.emailText, { color: mutedColor }]}>{outlookStatusQuery.data.outlookEmail}</Text>
            )}

            <View>
              <TouchableOpacity
                style={[styles.primaryAction, { borderColor: "rgba(0, 120, 212, 0.35)", backgroundColor: "rgba(0, 120, 212, 0.12)" }]}
                onPress={() => connectOutlookMutation.mutate()}
                disabled={connectOutlookMutation.isPending}
              >
                {connectOutlookMutation.isPending ? (
                  <ActivityIndicator size="small" color="#0078D4" />
                ) : (
                  <Text style={[styles.primaryActionText, { color: "#0078D4" }]}>{t("settings.integrationConnectButton")}</Text>
                )}
              </TouchableOpacity>
            </View>

            {outlookStatusQuery.data?.isConnected && (
              <TouchableOpacity style={styles.disconnectRow} onPress={() => confirmDisconnect("outlook")}>
                <Logout01Icon size={14} color="#EF4444" variant="stroke" />
                <Text style={styles.disconnectText}>{t("settings.integrationDisconnectButton")}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoadingAny && (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={isDark ? "#EC4899" : "#DB2777"} />
            </View>
          )}
        </FlatListScrollView>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerPlaceholder: {
    width: 38,
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emailText: {
    fontSize: 12,
    fontWeight: "500",
  },
  primaryAction: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  disconnectRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  disconnectText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  footerLoading: {
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
