import React, { useCallback, useState } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Text } from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui";
import { useContact, useDeleteContact } from "../hooks";
import { ContactDetailContent } from "../components/ContactDetailContent";

import { Edit02Icon, AlertCircleIcon, RefreshIcon } from "hugeicons-react-native";

export function ContactDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const [isDeleting, setIsDeleting] = useState(false);

  // --- TEMA VE RENK PALETİ ---
  const isDark = themeMode === "dark";
  const PRIMARY_COLOR = "#db2777";
  const ERROR_COLOR = "#ef4444";
  
  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.05)'] 
    : ['rgba(255, 240, 225, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']) as [string, string, ...string[]];

  const theme = {
    text: isDark ? "#FFFFFF" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(219, 39, 119, 0.1)',
    iconColor: isDark ? "#64748B" : "#94a3b8",
    btnBg: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
  };

  const contactId = id ? Number(id) : undefined;
  const { data: contact, isLoading, isError, refetch } = useContact(contactId);
  const deleteContact = useDeleteContact();

  const handleEditPress = useCallback(() => {
    if (contact) {
      router.push(`/customers/contacts/edit/${contact.id}`);
    }
  }, [router, contact]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(t("common.confirm"), t("contact.deleteConfirm") || "Bu kişiyi silmek istediğinize emin misiniz?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          if (!contactId) return;
          setIsDeleting(true);
          try {
            await deleteContact.mutateAsync(contactId);
            router.back();
          } catch {
            Alert.alert(t("common.error"), t("common.error"));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }, [t, contactId, deleteContact, router]);

  const handleQuickActivityPress = useCallback(() => {
    if (!contact) return;

    const start = new Date();
    start.setSeconds(0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    router.push({
      pathname: "/(tabs)/activities/create",
      params: {
        customerId: String(contact.customerId ?? ""),
        customerName: contact.customerName ?? "",
        contactId: String(contact.id ?? ""),
        contactName: contact.fullName ?? "",
        initialStartDateTime: start.toISOString(),
        initialEndDateTime: end.toISOString(),
      },
    });
  }, [contact, router]);

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <View style={{ flex: 1, zIndex: 10 }}>
        <ScreenHeader
          title={t("contact.detail")}
          showBackButton
          rightElement={
            contact ? (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleEditPress} style={[styles.headerButton, { backgroundColor: theme.btnBg }]}>
                  <Edit02Icon size={20} color={theme.text} variant="stroke" />
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />
        
        <FlatListScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            </View>
          ) : isError ? (
            <View style={styles.centerContainer}>
              <AlertCircleIcon size={48} color={theme.textMute} variant="stroke" />
              <Text style={{ color: theme.textMute, marginTop: 8, marginBottom: 16 }}>Bilgiler yüklenemedi.</Text>
              <TouchableOpacity onPress={() => refetch()} style={[styles.retryButton, { backgroundColor: theme.btnBg }]}>
                <RefreshIcon size={16} color={theme.text} variant="stroke" />
                <Text style={[styles.retryText, { color: theme.text }]}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : contact ? (
            <ContactDetailContent 
               contact={contact}
               theme={theme}
               t={t}
               isDark={isDark}
               isDeleting={isDeleting}
               onDeletePress={handleDeletePress}
               onQuickActivityPress={handleQuickActivityPress}
               primaryColor={PRIMARY_COLOR}
               errorColor={ERROR_COLOR}
            />
          ) : null}
        </FlatListScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { padding: 16 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 15, fontWeight: "600" },
  headerActions: { flexDirection: "row", gap: 12, alignItems: 'center' },
  headerButton: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }
});
