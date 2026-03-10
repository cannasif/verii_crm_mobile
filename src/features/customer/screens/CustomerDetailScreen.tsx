import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import {
  useCustomer,
  useDeleteCustomer,
  useCustomerImages,
  useUploadCustomerImage,
  useUpdateCustomer,
} from "../hooks";
import { CustomerDetailContent } from "../components/CustomerDetailContent";
import {
  Edit02Icon,
  Delete02Icon,
  AlertCircleIcon,
  RefreshIcon,
} from "hugeicons-react-native";
import { useToastStore } from "../../../store/toast";

export function CustomerDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const PRIMARY_COLOR = "#db2777";
  const ERROR_COLOR = "#ef4444";
  const MUTED_COLOR = themeMode === "dark" ? "#94a3b8" : "#64748B";

  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (isDark
    ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
    : ["rgba(255, 240, 225, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]) as [
    string,
    string,
    ...string[]
  ];

  const headerBtnStyle = {
    bg: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    text: isDark ? "#FFFFFF" : "#111827",
  };

  const previewTheme = useMemo(
    () => ({
      overlay: "rgba(0,0,0,0.72)",
      cardBg: isDark ? "#111827" : "#FFFFFF",
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
      title: isDark ? "#FFFFFF" : "#0F172A",
      text: isDark ? "#cbd5e1" : "#475569",
      cancelBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
      cancelText: isDark ? "#FFFFFF" : "#0F172A",
      confirmBg: "#22c55e12",
      confirmBorder: "#22c55e40",
      confirmText: "#22c55e",
    }),
    [isDark]
  );

  const customerId = id ? Number(id) : undefined;

  const {
    data: customer,
    isLoading,
    isError,
    refetch,
  } = useCustomer(customerId);

  const {
    data: customerImages = [],
    isLoading: isImagesLoading,
    refetch: refetchImages,
  } = useCustomerImages(customerId);

  const deleteCustomer = useDeleteCustomer();
  const uploadCustomerImage = useUploadCustomerImage();
  const updateCustomer = useUpdateCustomer();
  const showToast = useToastStore((state) => state.showToast);

  const isUploadingImage = uploadCustomerImage.isPending;
  const isUpdatingLocation = updateCustomer.isPending || isLocating;

  const handleEditPress = useCallback(() => {
    if (customer) {
      router.push(`/customers/edit/${customer.id}`);
    }
  }, [router, customer]);

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
    Alert.alert(
      t("common.confirm"),
      t("customer.deleteConfirm") || "Bu müşteriyi silmek istediğinize emin misiniz?",
      [
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
      ]
    );
  }, [t, customerId, deleteCustomer, router]);

  const handleAddImagePress = useCallback(async () => {
    if (!customerId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t("common.error"),
        t("customer.imagePermissionRequired") || "Galeri izni verilmeden resim seçilemez."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const selectedImageUri = result.assets[0]?.uri;

    if (!selectedImageUri) {
      Alert.alert(
        t("common.error"),
        t("customer.invalidImage") || "Geçersiz görsel seçildi."
      );
      return;
    }

    setPreviewImageUri(selectedImageUri);
    setIsPreviewVisible(true);
  }, [customerId, t]);

  const handleCancelPreview = useCallback(() => {
    if (isUploadingImage) return;
    setIsPreviewVisible(false);
    setPreviewImageUri(null);
  }, [isUploadingImage]);

  const handleConfirmPreview = useCallback(async () => {
    if (!customerId || !previewImageUri) return;

    try {
      await uploadCustomerImage.mutateAsync({
        customerId,
        imageUri: previewImageUri,
        imageDescription: "",
      });

      setIsPreviewVisible(false);
      setPreviewImageUri(null);
      await refetchImages();
    } catch {}
  }, [customerId, previewImageUri, uploadCustomerImage, refetchImages]);

  const handleUpdateCustomerLocation = useCallback(async () => {
    if (!customerId || !customer) return;

    setIsLocating(true);
    showToast("info", "Konum alınıyor...");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        showToast("error", "Konum izni verilmedi. Lütfen ayarlardan konum iznini açın.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = Number(position.coords.latitude.toFixed(7));
      const longitude = Number(position.coords.longitude.toFixed(7));

      await updateCustomer.mutateAsync({
        id: customerId,
        data: {
          customerCode: customer.customerCode,
          name: customer.name,
          taxNumber: customer.taxNumber,
          taxOffice: customer.taxOffice,
          tcknNumber: customer.tcknNumber,
          address: customer.address,
          latitude,
          longitude,
          phone: customer.phone,
          phone2: customer.phone2,
          email: customer.email,
          website: customer.website,
          notes: customer.notes,
          countryId: customer.countryId,
          cityId: customer.cityId,
          districtId: customer.districtId,
          customerTypeId: customer.customerTypeId,
          salesRepCode: customer.salesRepCode,
          groupCode: customer.groupCode,
          creditLimit: customer.creditLimit,
          defaultShippingAddressId: customer.defaultShippingAddressId,
          branchCode: customer.branchCode ?? 0,
          businessUnitCode: customer.businessUnitCode ?? 0,
          isCompleted: customer.isCompleted ?? false,
        },
      });
      showToast("success", "Konum alındı ve müşteri kaydı güncellendi.");
    } catch {
      showToast("error", "Konum alınamadı veya müşteri konumu güncellenemedi.");
    } finally {
      setIsLocating(false);
    }
  }, [customerId, customer, updateCustomer, showToast]);

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
                    onPress={handleDeletePress}
                    style={[
                      styles.headerButton,
                      { backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2" },
                    ]}
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
              <TouchableOpacity
                onPress={() => refetch()}
                style={[styles.retryButton, { backgroundColor: headerBtnStyle.bg }]}
              >
                <RefreshIcon size={16} color={headerBtnStyle.text} variant="stroke" />
              </TouchableOpacity>
            </View>
          ) : customer ? (
            <CustomerDetailContent
              customer={customer}
              images={customerImages}
              isUploadingImage={isUploadingImage || isImagesLoading}
              insets={insets}
              t={t}
              on360Press={handleCustomer360Press}
              onQuickQuotationPress={handleQuickQuotationPress}
              onAddImagePress={handleAddImagePress}
              onUpdateLocationPress={handleUpdateCustomerLocation}
              isUpdatingLocation={isUpdatingLocation}
            />
          ) : null}
        </View>
      </View>

      <Modal
        visible={isPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelPreview}
      >
        <View style={[styles.previewOverlay, { backgroundColor: previewTheme.overlay }]}>
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: previewTheme.cardBg,
                borderColor: previewTheme.borderColor,
              },
            ]}
          >
            <Text style={[styles.previewTitle, { color: previewTheme.title }]}>
              {t("customer.imagePreview") || "Resim Önizleme"}
            </Text>

            <Text style={[styles.previewText, { color: previewTheme.text }]}>
              {t("customer.confirmAddImage") || "Bu resmi yüklemek istiyor musunuz?"}
            </Text>

            {previewImageUri ? (
              <Image source={{ uri: previewImageUri }} style={styles.previewImage} resizeMode="cover" />
            ) : null}

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.previewButton, { backgroundColor: previewTheme.cancelBg }]}
                onPress={handleCancelPreview}
                disabled={isUploadingImage}
              >
                <Text style={[styles.previewButtonText, { color: previewTheme.cancelText }]}>
                  {t("common.cancel") || "Vazgeç"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.previewButton,
                  {
                    backgroundColor: previewTheme.confirmBg,
                    borderColor: previewTheme.confirmBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={handleConfirmPreview}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color={previewTheme.confirmText} />
                ) : (
                  <Text style={[styles.previewButtonText, { color: previewTheme.confirmText }]}>
                    {t("common.upload") || "Yükle"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  previewOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  previewCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  previewText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 14,
  },
  previewImage: {
    width: "100%",
    height: 320,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
  },
  previewButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
