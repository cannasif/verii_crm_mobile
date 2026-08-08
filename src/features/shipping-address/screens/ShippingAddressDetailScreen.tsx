import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  Platform
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useShippingAddress } from "../hooks/useShippingAddress";
import { useDeleteShippingAddress } from "../hooks/useShippingAddressMutation";

import {
  MapsSquare02Icon,
  Edit02Icon,
  Delete02Icon,
  Building01Icon,
  UserCircleIcon,
  Call02Icon,
  Notebook01Icon,
  Tick02Icon,
  Mailbox01Icon,
  ArrowRight01Icon
} from "hugeicons-react-native";

export function ShippingAddressDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const [isDeleting, setIsDeleting] = useState(false);

  const isDark = themeMode === "dark";
  const primaryColor = "#db2777"; 

  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.08)', 'transparent', 'rgba(249, 115, 22, 0.05)'] 
    : ['rgba(219, 39, 119, 0.05)', 'transparent', 'rgba(255, 240, 225, 0.3)']) as [string, string, ...string[]];

  const addressId = id ? Number(id) : undefined;
  const { data: address, isLoading, isError, refetch } = useShippingAddress(addressId);
  const deleteAddress = useDeleteShippingAddress();

  const handleEditPress = useCallback(() => {
    if (address) {
      router.push(`/(tabs)/customers/shipping/edit/${address.id}`);
    }
  }, [router, address]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(t("common.confirm"), t("shippingAddress.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          if (!addressId) return;
          setIsDeleting(true);
          try {
            await deleteAddress.mutateAsync(addressId);
            router.back();
          } catch {
            Alert.alert(t("common.error"), t("common.error"));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }, [t, addressId, deleteAddress, router]);

  const locationParts: string[] = [];
  if (address?.countryName) locationParts.push(address.countryName);
  if (address?.cityName) locationParts.push(address.cityName);
  if (address?.districtName) locationParts.push(address.districtName);
  const location = locationParts.join(", ");

  const openMap = useCallback(() => {
    if (!address?.address) return;
    const fullAddress = `${address.address}, ${location}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${fullAddress}`,
      android: `geo:0,0?q=${fullAddress}`,
      default: `https://www.google.com/maps/search/?api=1&query=${fullAddress}`,
    });
    
    Linking.canOpenURL(url!).then(supported => {
      if (supported) {
        Linking.openURL(url!);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${fullAddress}`);
      }
    });
  }, [address, location]);

  const callPhone = useCallback(() => {
    if (!address?.phone) return;
    Linking.openURL(`tel:${address.phone}`).catch(() => {
      Alert.alert(t("common.error"), "Arama başlatılamadı.");
    });
  }, [address, t]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.container, { backgroundColor: isDark ? "#0c0516" : "#FAFAFA" }]}>
        
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </View>

        <ScreenHeader
          title={t("shippingAddress.detail")}
          showBackButton
          rightElement={
            address ? (
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  onPress={handleEditPress} 
                  activeOpacity={0.7}
                  style={[
                    styles.headerButton, 
                    { 
                     
                      backgroundColor: isDark ? '#1a1625' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(219, 39, 119, 0.4)' : 'rgba(219, 39, 119, 0.2)',
                    
                      shadowColor: primaryColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 4
                    }
                  ]}
                >
                  <Edit02Icon size={20} color={primaryColor} variant="stroke" />
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />

        <FlatListScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          ) : isError ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{t("common.error")}</Text>
              <TouchableOpacity onPress={() => refetch()} style={[styles.retryButton, { backgroundColor: primaryColor }]}>
                <Text style={styles.retryText}>{t("common.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : address ? (
            <>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={openMap}
                style={[
                  styles.mainCard, 
                  { 
                    backgroundColor: isDark ? '#1a1625' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(219, 39, 119, 0.3)' : 'rgba(219, 39, 119, 0.15)'
                  }
                ]}
              >
                <View style={styles.mainCardHeader}>
                  <View style={styles.locationWrap}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(219, 39, 119, 0.1)' }]}>
                      <MapsSquare02Icon size={24} color={primaryColor} variant="stroke" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={2}>
                        {location || "Konum Belirtilmemiş"}
                      </Text>
                    </View>
                  </View>
                  
                  {address.isActive && (
                    <View style={styles.activeBadge}>
                      <Tick02Icon size={14} color="#10B981" variant="stroke" />
                      <Text style={styles.activeBadgeText}>{t("shippingAddress.isActive") || "AKTİF"}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.dashedDivider, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />

                <View style={styles.addressBody}>
                  <Text style={[styles.addressDetailText, { color: colors.textSecondary }]}>
                    {address.address}
                  </Text>
                  
                  <View style={styles.mapLinkWrap}>
                    <Text style={[styles.mapLinkText, { color: primaryColor }]}>Haritada Gör</Text>
                    <ArrowRight01Icon size={14} color={primaryColor} variant="stroke" />
                  </View>
                </View>
              </TouchableOpacity>

              {address.customerName && (
                <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <View style={styles.sectionHeader}>
                    <Building01Icon size={20} color={colors.text} variant="stroke" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("shippingAddress.customer")}
                    </Text>
                  </View>
                  <View style={[styles.customerBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC' }]}>
                    <Text style={[styles.customerName, { color: colors.textSecondary }]}>
                      {address.customerName}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.contactCardsWrapper}>
                
                {address.contactPerson && (
                  <View style={[styles.contactCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <View style={[styles.contactIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                      <UserCircleIcon size={20} color={colors.textMuted} variant="stroke" />
                    </View>
                    <View style={styles.contactInfoWrap}>
                      <Text style={[styles.contactLabel, { color: colors.textMuted }]}>{t("shippingAddress.contactPerson") || "Yetkili Kişi"}</Text>
                      <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1}>{address.contactPerson}</Text>
                    </View>
                  </View>
                )}

                {address.phone && (
                  <TouchableOpacity 
                    activeOpacity={0.6} 
                    onPress={callPhone}
                    style={[styles.contactCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                  >
                    <View style={[styles.contactIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                      <Call02Icon size={20} color="#10B981" variant="stroke" />
                    </View>
                    <View style={styles.contactInfoWrap}>
                      <Text style={[styles.contactLabel, { color: colors.textMuted }]}>{t("shippingAddress.phone") || "Telefon"}</Text>
                      <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1}>{address.phone}</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {address.postalCode && (
                  <View style={[styles.contactCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <View style={[styles.contactIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                      <Mailbox01Icon size={20} color={colors.textMuted} variant="stroke" />
                    </View>
                    <View style={styles.contactInfoWrap}>
                      <Text style={[styles.contactLabel, { color: colors.textMuted }]}>{t("shippingAddress.postalCode") || "Posta Kodu"}</Text>
                      <Text style={[styles.contactValue, { color: colors.text }]} numberOfLines={1}>{address.postalCode}</Text>
                    </View>
                  </View>
                )}

              </View>

              {address.notes && (
                <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <View style={styles.sectionHeader}>
                    <Notebook01Icon size={20} color={colors.text} variant="stroke" />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("shippingAddress.notes")}
                    </Text>
                  </View>
                  <View style={[styles.noteBox, { backgroundColor: 'rgba(219, 39, 119, 0.05)' }]}>
                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>{address.notes}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handleDeletePress}
                style={[styles.bottomDeleteButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Delete02Icon size={20} color="#EF4444" variant="stroke" />
                    <Text style={styles.bottomDeleteText}>{t("common.delete") || "Adresi Sil"}</Text>
                  </>
                )}
              </TouchableOpacity>

            </>
          ) : null}
        </FlatListScrollView>
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
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    fontWeight: '600'
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "700",
    color: '#FFF'
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mainCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#db2777",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  mainCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  locationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  dashedDivider: {
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    marginVertical: 16,
  },
  addressBody: {
    paddingLeft: 4,
  },
  addressDetailText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
    marginBottom: 16,
  },
  mapLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  customerBox: {
    padding: 16,
    borderRadius: 12,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  contactCardsWrapper: {
    gap: 12,
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  contactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactInfoWrap: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  noteBox: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#db2777',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  bottomDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 20,
    gap: 8,
  },
  bottomDeleteText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: '700',
  },
});
