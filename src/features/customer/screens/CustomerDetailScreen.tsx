import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenHeader } from "../../../components/navigation";
import { useUIStore } from "../../../store/ui"; 
import { useCustomer, useDeleteCustomer } from "../hooks";
import { CustomerDetailContent } from "../components/CustomerDetailContent";
import { Edit02Icon, Delete02Icon, AlertCircleIcon, RefreshIcon, Add01Icon } from "hugeicons-react-native";

export function CustomerDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { themeMode } = useUIStore(); 
  const insets = useSafeAreaInsets();

  const [isDeleting, setIsDeleting] = useState(false);

  const PRIMARY_COLOR = "#db2777";
  const ERROR_COLOR = "#ef4444";
  const MUTED_COLOR = themeMode === "dark" ? "#94a3b8" : "#64748B";

  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.12)'] 
    : ['rgba(255, 240, 225, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']) as [string, string, ...string[]];

  const headerBtnStyle = {
    bg: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    text: isDark ? "#FFFFFF" : "#111827",
  };

  const customerId = id ? Number(id) : undefined;
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId);
  const deleteCustomer = useDeleteCustomer();

  const handleEditPress = useCallback(() => {
    if (customer) {
      router.push(`/customers/edit/${customer.id}`);
    }
  }, [router, customer]);

  // YENİ EKLENEN FONKSİYON: 360 Sayfasına yönlendirme
  const handleCustomer360Press = useCallback(() => {
    if (customerId) {
      router.push(`/(tabs)/customers/360/${customerId}`);
    }
  }, [router, customerId]);

  const handleQuickQuotationPress = useCallback(() => {
    if (!customer) return;
    router.push({
      pathname: "/(tabs)/sales/quotations/quick/create",
      params: {
        customerId: String(customer.id ?? ""),
        customerName: customer.name ?? "",
        customerCode: customer.customerCode ?? "",
      },
    });
  }, [router, customer]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(t("common.confirm"), t("customer.deleteConfirm") || "Bu müşteriyi silmek istediğinize emin misiniz?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          if (!customerId) return;
          setIsDeleting(true);
          try {
            await deleteCustomer.mutateAsync(customerId);
            router.back();
          } catch {
            Alert.alert(t("common.error"), t("common.error"));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }, [t, customerId, deleteCustomer, router]);

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
      
      <View style={{ flex: 1 }}>
        <View style={{ zIndex: 10 }}>
            <ScreenHeader
              title={t("customer.detail")}
              showBackButton
              rightElement={
                customer ? (
                  <View style={styles.headerActions}>
                    <TouchableOpacity 
                        onPress={handleEditPress} 
                        style={[styles.headerButton, { backgroundColor: headerBtnStyle.bg }]}
                    >
                      <Edit02Icon size={20} color={headerBtnStyle.text} variant="stroke" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleQuickQuotationPress}
                      style={[styles.headerButton, { backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.12)" }]}
                    >
                      <Add01Icon size={20} color="#0ea5e9" variant="stroke" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={handleDeletePress}
                      style={[styles.headerButton, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2" }]} 
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={ERROR_COLOR} />
                      ) : (
                        <Delete02Icon size={20} color={ERROR_COLOR} variant="stroke" />
                      )}
                    </TouchableOpacity>
                  </View>
                ) : undefined
              }
            />
        </View>

        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            </View>
          ) : isError ? (
            <View style={styles.centerContainer}>
              <AlertCircleIcon size={48} color={MUTED_COLOR} variant="stroke" />
              <TouchableOpacity onPress={() => refetch()} style={[styles.retryButton, { backgroundColor: headerBtnStyle.bg }]}>
                <RefreshIcon size={16} color={headerBtnStyle.text} variant="stroke" />
              </TouchableOpacity>
            </View>
          ) : customer ? (
            <CustomerDetailContent
              customer={customer}
              insets={insets}
              t={t}
              on360Press={handleCustomer360Press} // YENİ EKLENEN PROP: TS hatasını çözen kahraman!
              onQuickQuotationPress={handleQuickQuotationPress}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12, 
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12, 
    alignItems: "center",
    justifyContent: "center",
  },
});
