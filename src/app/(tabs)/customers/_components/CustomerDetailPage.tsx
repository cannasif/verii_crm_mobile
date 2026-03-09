import React, { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../../components/navigation";
import { Text } from "../../../../components/ui/text";
import { useUIStore } from "../../../../store/ui";
import {
  useCustomer,
  useDeleteCustomer,
  useCustomerImages,
  useUploadCustomerImage,
  CustomerDetailContent,
} from "../../../../features/customer";
import {
  useCustomerContacts,
  ContactCard,
  type ContactDto,
} from "../../../../features/contact";
import {
  useCustomerShippingAddresses,
  ShippingAddressCard,
  type ShippingAddressDto,
} from "../../../../features/shipping-address";
import { 
  Edit02Icon, 
  Delete02Icon, 
  Add01Icon 
} from "hugeicons-react-native"; 
import { LinearGradient } from "expo-linear-gradient";

type TabType = "detail" | "contacts" | "addresses";

interface ThemeColors {
  bg: string;
  primary: string;
  text: string;
  textMute: string;
  borderColor: string;
  glassBtn: string;
  danger: string;
  tabActiveBg: string;
  pillBorder: string; 
}

interface TabBarProps {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
  theme: ThemeColors; 
  t: (key: string) => string;
  contactsCount: number;
  addressesCount: number;
}

function TabBar({
  activeTab,
  onTabPress,
  theme,
  t,
  contactsCount,
  addressesCount,
}: TabBarProps): React.ReactElement {
  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: "detail", label: t("customer.tabDetail") },
    { key: "contacts", label: t("customer.tabContacts"), count: contactsCount },
    { key: "addresses", label: t("customer.tabShippingAddresses"), count: addressesCount },
  ];

  return (
    <View style={[styles.tabBar, { borderBottomColor: theme.borderColor }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              isActive && { borderBottomColor: theme.primary, borderBottomWidth: 3 },
            ]}
            onPress={() => onTabPress(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { 
                  color: isActive ? theme.text : theme.textMute, 
                  fontWeight: isActive ? "700" : "500" 
                },
              ]}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: isActive ? theme.primary : theme.glassBtn }]}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CustomerDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const isDark = themeMode === "dark";

  const THEME: ThemeColors = {
    bg: isDark ? "#1a0b2e" : colors.background, 
    primary: "#db2777", 
    text: isDark ? "#FFFFFF" : colors.text,
    textMute: isDark ? "#94a3b8" : colors.textMuted,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border,
    glassBtn: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    danger: "#ef4444",
    tabActiveBg: isDark ? "rgba(219, 39, 119, 0.1)" : "rgba(219, 39, 119, 0.05)",
    pillBorder: isDark ? "rgba(239, 68, 68, 0.3)" : colors.border,
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("detail");

  const customerId = id ? Number(id) : undefined;
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId);
  const { data: customerImages = [] } = useCustomerImages(customerId);
  const deleteCustomer = useDeleteCustomer();
  const uploadCustomerImage = useUploadCustomerImage();
  const { data: contacts = [], isLoading: isLoadingContacts } = useCustomerContacts(customerId);
  const { data: addresses = [], isLoading: isLoadingAddresses } = useCustomerShippingAddresses(customerId);

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
    Alert.alert(t("common.confirm"), t("customer.deleteConfirm"), [
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

  const handleContactPress = useCallback((contact: ContactDto) => {
      router.push(`/customers/contacts/${contact.id}`);
    }, [router]);

  const handleAddressPress = useCallback((address: ShippingAddressDto) => {
      router.push(`/(tabs)/customers/shipping/${address.id}`);
    }, [router]);

  const handleAddContactPress = useCallback(() => {
    if (customerId != null) {
      router.push({
        pathname: "/customers/contacts/create",
        params: { customerId: String(customerId) },
      });
    } else {
      router.push("/customers/contacts/create");
    }
  }, [router, customerId]);

  const handleAddAddressPress = useCallback(() => {
    router.push({
      pathname: "/(tabs)/customers/shipping/create",
      params: { customerId: customerId?.toString() },
    });
  }, [router, customerId]);

  const handleAddImagePress = useCallback(async () => {
    if (!customerId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("common.error"), t("customer.imagePermissionError"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    try {
      await uploadCustomerImage.mutateAsync({
        customerId,
        imageUri: result.assets[0].uri,
        imageDescription: `${customer?.name ?? t("customer.detail")} ${t("customer.imageDefaultDescription")}`,
      });
    } catch {
    }
  }, [customerId, customer?.name, t, uploadCustomerImage]);

  const renderContactItem = useCallback(({ item }: { item: ContactDto }) => (
      <ContactCard contact={item} onPress={() => handleContactPress(item)} />
    ), [handleContactPress]);

  const renderAddressItem = useCallback(({ item }: { item: ShippingAddressDto }) => (
      <ShippingAddressCard address={item} onPress={() => handleAddressPress(item)} />
    ), [handleAddressPress]);

  const keyExtractorContact = useCallback((item: ContactDto) => String(item.id), []);
  const keyExtractorAddress = useCallback((item: ShippingAddressDto) => String(item.id), []);

  const renderContactsContent = (): React.ReactElement => (
    <View style={styles.tabContent}>
      {isLoadingContacts ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: THEME.textMute }]}>
            {t("contact.noContacts")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={keyExtractorContact}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={[
          styles.fab, 
          { 
            backgroundColor: THEME.primary,
            bottom: Math.max(insets.bottom, 20) + 80, 
            shadowColor: THEME.primary 
          }
        ]}
        onPress={handleAddContactPress} 
      >
        <Add01Icon size={28} color="#FFFFFF" variant="stroke" />
      </TouchableOpacity>
    </View>
  );

  const renderAddressesContent = (): React.ReactElement => (
    <View style={styles.tabContent}>
      {isLoadingAddresses ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: THEME.textMute }]}>
            {t("shippingAddress.noAddresses")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          renderItem={renderAddressItem}
          keyExtractor={keyExtractorAddress}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
      <TouchableOpacity
        style={[
          styles.fab, 
          { 
            backgroundColor: THEME.primary,
            bottom: Math.max(insets.bottom, 20) + 80, 
            shadowColor: THEME.primary 
          }
        ]}
        onPress={handleAddAddressPress} 
      >
        <Add01Icon size={28} color="#FFFFFF" variant="stroke" />
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = (): React.ReactElement => {
    switch (activeTab) {
      case "contacts":
        return renderContactsContent();
      case "addresses":
        return renderAddressesContent();
      default:
        return (
          <CustomerDetailContent
            customer={customer!}
            images={customerImages}
            isUploadingImage={uploadCustomerImage.isPending}
            insets={insets}
            t={t}
            on360Press={handleCustomer360Press} 
            onQuickQuotationPress={handleQuickQuotationPress}
            onAddImagePress={handleAddImagePress}
          />
        );
    }
  };

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor="transparent" translucent />
      
      <View style={styles.container}>
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient 
            colors={isDark 
              ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.05)'] 
              : ['rgba(255, 240, 225, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={StyleSheet.absoluteFill} 
          />
        </View>

        <View style={{ flex: 1, zIndex: 10 }}>

          <View style={{ borderBottomWidth: 1, borderBottomColor: THEME.borderColor }}>
            <ScreenHeader
              title={t("customer.detail")}
              showBackButton
              rightElement={
                customer ? (
                  <View style={[
                    styles.actionPill, 
                    { 
                      backgroundColor: THEME.glassBtn, 
                      borderColor: THEME.pillBorder
                    }
                  ]}>
  
                    <TouchableOpacity onPress={handleEditPress} style={styles.pillButton}>
                      <Edit02Icon size={18} color={THEME.text} variant="stroke" />
                    </TouchableOpacity>

                  


                    <TouchableOpacity
                      onPress={handleDeletePress}
                      style={[
                        styles.pillButton, 
                        { 
                          backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                          borderLeftWidth: 1, 
                          borderLeftColor: THEME.pillBorder
                        }
                      ]}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={THEME.danger} />
                      ) : (
                        <Delete02Icon size={18} color={THEME.danger} variant="stroke" />
                      )}
                    </TouchableOpacity>
                  </View>
                ) : undefined
              }
            />
          </View>


          <View style={[styles.content, { backgroundColor: 'transparent' }]}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.primary} />
              </View>
            ) : isError ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: THEME.danger }]}>{t("common.error")}</Text>
                <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
                  <Text style={[styles.retryText, { color: THEME.primary }]}>{t("common.retry")}</Text>
                </TouchableOpacity>
              </View>
            ) : customer ? (
              <>
                <TabBar
                  activeTab={activeTab}
                  onTabPress={setActiveTab}
                  theme={THEME}
                  t={t}
                  contactsCount={contacts.length}
                  addressesCount={addresses.length}
                />
 
                {renderTabContent()}
              </>
            ) : null}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabContent: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
 fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 20, 
    alignItems: "center",
    justifyContent: "center",
    elevation: 0, 
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8, 
    marginRight:50, 
  },
  headerButton: {
    width: 38, 
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonText: {
    fontSize: 14, 
    color: "#FFF",
    fontWeight: "600"
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5, 
    borderRadius: 20, 
    height: 38, 
    marginRight: 50, 
    overflow: "hidden", 
  },
  pillButton: {
    width: 45, 
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  pillDivider: {
    width: 1,
    height: 18, 
    opacity: 0.5, 
  },
});

export default CustomerDetailPage;
