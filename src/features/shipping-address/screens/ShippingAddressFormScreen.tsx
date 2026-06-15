import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useToastStore } from "../../../store/toast";
import { FormField, LocationPicker } from "../../customer";
import { useCountries, useCities, useDistricts } from "../../customer/hooks";
import { useShippingAddress, useCreateShippingAddress, useUpdateShippingAddress } from "../hooks";
import { createShippingAddressSchema, type ShippingAddressFormData } from "../schemas";
import type { CountryDto, CityDto, DistrictDto } from "../../customer";

import { 
  Location01Icon,
  ContactBookIcon,
  NoteIcon,
  ArrowRight01Icon
} from "hugeicons-react-native";

export function ShippingAddressFormScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.showToast);

  const isEditMode = !!id;
  const addressId = id ? Number(id) : undefined;

  const [activeTab, setActiveTab] = useState<"general" | "details">("general");
  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#0c0516" : "#FAFAFA"; 
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.08)', 'transparent', 'rgba(249, 115, 22, 0.08)'] 
    : ['rgba(255, 235, 240, 0.4)', '#FFFFFF', 'rgba(255, 240, 225, 0.4)']) as [string, string, ...string[]];

  const THEME = {
    bg: isDark ? "#020617" : "#F8FAFC",
    cardBg: isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF", 
    text: isDark ? "#FFFFFF" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    border: isDark ? "rgba(236, 72, 153, 0.15)" : "rgba(0,0,0,0.08)",
    primary: "#db2777",
    icon: isDark ? "#cbd5e1" : "#475569",
    inputBg: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
    shadow: isDark ? "#000000" : "#cbd5e1",
    error: "#ef4444"
  };

  const { data: existingAddress, isLoading: addressLoading } = useShippingAddress(addressId);
  const createAddress = useCreateShippingAddress();
  const updateAddress = useUpdateShippingAddress();

  const schema = useMemo(() => createShippingAddressSchema(), []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ShippingAddressFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      address: "",
      postalCode: "",
      contactPerson: "",
      phone: "",
      notes: "",
      customerId: undefined,
    },
  });

  const watchCountryId = watch("countryId");
  const watchCityId = watch("cityId");
  const watchDistrictId = watch("districtId");
  const { data: countries } = useCountries();
  const { data: cities } = useCities(watchCountryId);
  const { data: districts } = useDistricts(watchCityId);
  const [pendingCountryName, setPendingCountryName] = useState<string | null>(null);
  const [pendingCityName, setPendingCityName] = useState<string | null>(null);
  const [pendingDistrictName, setPendingDistrictName] = useState<string | null>(null);

  const normalizeLookupName = useCallback((value?: string | null): string => {
    if (!value) return "";
    return value
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9çğıöşü]+/g, "")
      .trim();
  }, []);

  const findLookupByName = useCallback(<T extends { id: number; name: string }>(
    items: T[] | undefined,
    name?: string | null
  ): T | undefined => {
    if (!items || items.length === 0 || !name) return undefined;
    const target = normalizeLookupName(name);
    if (!target) return undefined;
    return items.find((item) => {
      const normalized = normalizeLookupName(item.name);
      return normalized === target || normalized.includes(target) || target.includes(normalized);
    });
  }, [normalizeLookupName]);

  useEffect(() => {
    if (existingAddress) {
      reset({
        address: existingAddress.address,
        postalCode: existingAddress.postalCode || "",
        contactPerson: existingAddress.contactPerson || "",
        phone: existingAddress.phone || "",
        notes: existingAddress.notes || "",
        customerId: undefined,
        countryId: existingAddress.countryId,
        cityId: existingAddress.cityId,
        districtId: existingAddress.districtId,
      });
    }
  }, [existingAddress, reset]);

  const handleCountryChange = useCallback(
    (country: CountryDto | undefined) => {
      setValue("countryId", country?.id);
      setValue("cityId", undefined);
      setValue("districtId", undefined);
      setPendingCountryName(null);
      setPendingCityName(null);
      setPendingDistrictName(null);
    },
    [setValue]
  );

  const handleCityChange = useCallback(
    (city: CityDto | undefined) => {
      setValue("cityId", city?.id);
      setValue("districtId", undefined);
      setPendingCityName(null);
      setPendingDistrictName(null);
    },
    [setValue]
  );

  const handleDistrictChange = useCallback(
    (district: DistrictDto | undefined) => {
      setValue("districtId", district?.id);
      setPendingDistrictName(null);
    },
    [setValue]
  );

  useEffect(() => {
    if (!pendingCountryName) return;
    if (watchCountryId) return;
    const matchedCountry = findLookupByName(countries, pendingCountryName);
    if (!matchedCountry) return;
    setValue("countryId", matchedCountry.id);
    setPendingCountryName(null);
  }, [pendingCountryName, watchCountryId, countries, findLookupByName, setValue]);

  useEffect(() => {
    if (!pendingCityName) return;
    if (!watchCountryId) return;
    if (watchCityId) return;
    const matchedCity = findLookupByName(cities, pendingCityName);
    if (!matchedCity) return;
    setValue("cityId", matchedCity.id);
    setPendingCityName(null);
  }, [pendingCityName, watchCountryId, watchCityId, cities, findLookupByName, setValue]);

  useEffect(() => {
    if (!pendingDistrictName) return;
    if (!watchCityId) return;
    if (watchDistrictId) return;
    const matchedDistrict = findLookupByName(districts, pendingDistrictName);
    if (!matchedDistrict) return;
    setValue("districtId", matchedDistrict.id);
    setPendingDistrictName(null);
  }, [pendingDistrictName, watchCityId, watchDistrictId, districts, findLookupByName, setValue]);

  const onSubmit = useCallback(
    async (data: ShippingAddressFormData) => {
      try {
        if (isEditMode && addressId) {
          await updateAddress.mutateAsync({ id: addressId, data });
          Alert.alert("", t("shippingAddress.updateSuccess"));
        } else {
          await createAddress.mutateAsync(data);
          Alert.alert("", t("shippingAddress.createSuccess"));
        }
        router.back();
      } catch {
        Alert.alert(t("common.error"), t("common.error"));
      }
    },
    [isEditMode, addressId, createAddress, updateAddress, router, t]
  );

  const onError = useCallback((formErrors: any) => {
    showToast("error", "Lütfen kırmızı ile işaretlenmiş zorunlu alanları doldurun.");
    
    const generalFields = ["contactPerson", "phone"];
    const errorKeys = Object.keys(formErrors);
    const hasGeneralError = errorKeys.some(field => generalFields.includes(field));

    if (hasGeneralError) {
      setActiveTab("general");
    } else {
      setActiveTab("details");
    }

    setTimeout(() => {
      if (errorKeys.length > 0) {
        const focusableFields = ["address", "postalCode", "contactPerson", "phone", "notes"];
        const fieldToFocus = errorKeys.find(key => focusableFields.includes(key)) as keyof ShippingAddressFormData;
        if (fieldToFocus) {
          setFocus(fieldToFocus); 
        }
      }
    }, 300); 
  }, [showToast, setFocus]);

  const FormSection = useCallback(({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => {
    const hasChildren = React.Children.count(children) > 0;
    if (!hasChildren) return null;

    return (
      <View style={[styles.card, { backgroundColor: THEME.cardBg, borderColor: THEME.border }]}>
        <View style={styles.sectionHeader}>
          {icon && (
            <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.15)' : '#FFF1F2' }]}>
              {icon}
            </View>
          )}
          <Text style={[styles.sectionTitle, { color: THEME.text }]}>{title}</Text>
        </View>
        <View style={{ gap: 6 }}>{children}</View> 
      </View>
    );
  }, [THEME, isDark]);

  if (isEditMode && addressLoading) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScreenHeader title={t("shippingAddress.edit")} showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: isDark ? 'rgba(12, 5, 22, 0.8)' : 'rgba(255,255,255,0.8)', borderBottomWidth: 1, borderBottomColor: THEME.border }}>
          <ScreenHeader title={isEditMode ? t("shippingAddress.edit") : t("shippingAddress.create")} showBackButton />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            style={{ flex: 1, backgroundColor: 'transparent' }}
            contentContainerStyle={[styles.contentContainer, { flexGrow: 1, paddingBottom: insets.bottom + 85 }]}            
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.tabContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.tabButton, 
                  activeTab === "general" && [
                    styles.activeTabPremium, 
                    { 
                      backgroundColor: isDark ? 'rgba(219, 39, 119, 0.2)' : '#FFF0F7',
                      borderColor: isDark ? 'rgba(219, 39, 119, 0.4)' : 'rgba(219, 39, 119, 0.2)'
                    }
                  ]
                ]}
                onPress={() => setActiveTab("general")}
              >
                <Text style={[styles.tabText, activeTab === "general" ? { color: THEME.primary } : { color: THEME.textMute, fontWeight: '600' }]}>
                  İletişim
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.tabButton, 
                  activeTab === "details" && [
                    styles.activeTabPremium, 
                    { 
                      backgroundColor: isDark ? 'rgba(219, 39, 119, 0.2)' : '#FFF0F7',
                      borderColor: isDark ? 'rgba(219, 39, 119, 0.4)' : 'rgba(219, 39, 119, 0.2)'
                    }
                  ]
                ]}
                onPress={() => setActiveTab("details")}
              >
                <Text style={[styles.tabText, activeTab === "details" ? { color: THEME.primary } : { color: THEME.textMute, fontWeight: '600' }]}>
                  Adres & Notlar
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ display: activeTab === "general" ? "flex" : "none", gap: 10 }}>
              <FormSection title="İletişim" icon={<ContactBookIcon size={16} color={THEME.primary} variant="stroke" />}>
                <Controller
                  control={control}
                  name="contactPerson"
                  render={({ field: { onChange, value, ref } }) => (
                    <FormField
                      inputRef={ref}
                      label={t("shippingAddress.contactPerson")}
                      value={value || ""}
                      onChangeText={onChange}
                      maxLength={100}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, value, ref } }) => (
                    <FormField
                      inputRef={ref}
                      label={t("shippingAddress.phone")}
                      value={value || ""}
                      onChangeText={onChange}
                      keyboardType="phone-pad"
                      maxLength={20}
                    />
                  )}
                />
              </FormSection>
            </View>

            <View style={{ display: activeTab === "details" ? "flex" : "none", gap: 10 }}>
              <FormSection title="Adres Detayları" icon={<Location01Icon size={16} color={THEME.primary} variant="stroke" />}>
                <View style={styles.locationSection}>
                  <Text style={[styles.subSectionTitle, { color: THEME.textMute }]}>{t("lookup.location")}</Text>
                  <LocationPicker
                    countryId={watchCountryId}
                    cityId={watchCityId}
                    districtId={watch("districtId")}
                    onCountryChange={handleCountryChange}
                    onCityChange={handleCityChange}
                    onDistrictChange={handleDistrictChange}
                  />
                </View>

                <Controller
                  control={control}
                  name="address"
                  render={({ field: { onChange, value, ref } }) => (
                    <FormField
                      inputRef={ref}
                      label={t("shippingAddress.address")}
                      value={value}
                      onChangeText={onChange}
                      error={errors.address?.message}
                      required
                      multiline
                      numberOfLines={3}
                      maxLength={150}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="postalCode"
                  render={({ field: { onChange, value, ref } }) => (
                    <FormField
                      inputRef={ref}
                      label={t("shippingAddress.postalCode")}
                      value={value || ""}
                      onChangeText={onChange}
                      maxLength={20}
                    />
                  )}
                />
              </FormSection>

              <FormSection title="Notlar" icon={<NoteIcon size={16} color={THEME.primary} variant="stroke" />}>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field: { onChange, value, ref } }) => (
                    <FormField
                      inputRef={ref}
                      label={t("shippingAddress.notes")}
                      value={value || ""}
                      onChangeText={onChange}
                      multiline
                      numberOfLines={3}
                      maxLength={100}
                    />
                  )}
                />
              </FormSection>
            </View>

            <View style={styles.stickyFooter}>
              {activeTab === "general" ? (
                <View style={{ alignItems: 'flex-end', width: '100%' }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setActiveTab("details")} 
                    style={[styles.sleekNextButton, { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.15)' : '#FFF0F5' }]}
                  >
                    <Text style={[styles.sleekNextText, { color: THEME.primary }]}>Detaylara İlerle</Text>
                    <ArrowRight01Icon size={18} color={THEME.primary} variant="stroke" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={handleSubmit(onSubmit, onError)} 
                  disabled={isSubmitting}
                  style={[styles.submitButtonContainer, { shadowColor: THEME.primary }]}
                >
                  <LinearGradient
                    colors={['#f472b6', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {isEditMode ? t("common.update") : t("common.save")}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 10, paddingTop: 12, gap: 10 }, 
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  
  tabContainer: {
    flexDirection: 'row', marginHorizontal: 2, marginBottom: 6, borderRadius: 10,
    padding: 3, 
  },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  activeTabPremium: { },
  
  card: { borderRadius: 14, padding: 12, paddingBottom: 14, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, gap: 8 },
  sectionIcon: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2, textTransform: 'uppercase' },
  subSectionTitle: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
  
  fieldContainer: { marginBottom: 0 },
  error: { fontSize: 11, marginTop: 2, marginLeft: 4 },
  locationSection: { marginBottom: 8 },

  stickyFooter: { marginTop: 8, paddingTop: 8, paddingHorizontal: 4 },
  
  sleekNextButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  sleekNextText: { 
    fontSize: 14, 
    fontWeight: '600', 
  },

  submitButtonContainer: { 
    borderRadius: 12, 
    marginTop: 16,
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonGradient: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 48, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  submitButtonText: { 
    color: "#FFFFFF", 
    fontSize: 15, 
    fontWeight: "700", 
    letterSpacing: 0.8, 
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
});
