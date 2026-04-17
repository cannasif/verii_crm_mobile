import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  InteractionManager,
  Image,
  TextInput,
  Keyboard,
  Dimensions,
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
import { useAuthStore } from "../../../store/auth";
import { useToastStore } from "../../../store/toast";
import {
  useCustomer,
  useCreateCustomer,
  useCreateCustomerFromMobile,
  useCountries,
  useCities,
  useDistricts,
  useUpdateCustomer,
  useDeleteCustomer,
  useCustomerTypes,
  useBusinessCardScan,
  useBusinessCardPotentialMatches,
  useQrCustomerScan
} from "../hooks";
import { useCustomerShippingAddresses } from "../../shipping-address/hooks/useShippingAddresses";
import { BusinessCardReviewModal, FormField, LocationPicker, PremiumPicker } from "../components";
import { createCustomerSchema, type CustomerFormData } from "../schemas";
import type { CountryDto, CityDto, DistrictDto } from "../types";
import type { BusinessCardOcrResult } from "../types/businessCard";
import { trackBusinessCardTelemetry } from "../services/businessCardTelemetryService";
import { translateBusinessCardToTurkish } from "../services/businessCardTranslationService";
import { 
  Camera01Icon, 
  Image01Icon, 
  ArrowDown01Icon, 
  CheckmarkCircle02Icon, 
  UserCircleIcon,
  ContactBookIcon,
  Location01Icon,
  Invoice01Icon,
  NoteIcon,
  Briefcase01Icon,
  ArrowRight01Icon
} from "hugeicons-react-native";

type FormSectionProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  theme: {
    cardBg: string;
    border: string;
    shadow: string;
    text: string;
    primary: string;
  };
  isDark: boolean;
};

function assignRef<T>(...refs: Array<React.Ref<T> | null | undefined>) {
  return (node: T | null) => {
    refs.forEach((r) => {
      if (r == null) return;
      if (typeof r === "function") (r as (instance: T | null) => void)(node);
      else (r as React.MutableRefObject<T | null>).current = node;
    });
  };
}

function keyboardTabForward(onAdvance: () => void) {
  return (e: { nativeEvent: { key: string; shiftKey?: boolean } }) => {
    if (e.nativeEvent.key === "Tab" && !e.nativeEvent.shiftKey) {
      onAdvance();
    }
  };
}

function FormSection({ title, icon, children, theme, isDark }: FormSectionProps): React.ReactElement | null {
  const hasChildren = React.Children.count(children) > 0;
  if (!hasChildren) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.3 : 0.04,
          shadowRadius: isDark ? 8 : 4,
          elevation: isDark ? 0 : 2,
        },
      ]}
    >
      <View
        style={[
          styles.sectionHeader,
          { borderBottomColor: theme.border, borderBottomWidth: 1, paddingBottom: 6 },
        ]}
      >
        {icon ? (
          <View style={[styles.sectionIcon, { backgroundColor: isDark ? "rgba(219, 39, 119, 0.15)" : "#FFF1F2" }]}>
            {icon}
          </View>
        ) : null}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

export function CustomerFormScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, autoScan } = useLocalSearchParams<{ id?: string; autoScan?: string }>();
  const { colors, themeMode, uppercaseCompanyNameAfterScan } = useUIStore();
  const { branch, user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.showToast);

  const isEditMode = !!id;
  const customerId = id ? Number(id) : undefined;
  const isDark = themeMode === "dark";

  const mainBg = isDark ? "#0c0516" : "#F8FAFC"; 
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.15)', 'transparent', 'rgba(249, 115, 22, 0.15)'] 
    : ['rgba(255, 235, 240, 0.8)', '#FFFFFF', 'rgba(255, 240, 225, 0.8)']) as [string, string, ...string[]];

  const formConfig = {
    showCustomerCode: false,
    showBusinessCardScan: true,
    showCustomerType: true,
    showShippingAddress: false,
    showSalesRep: false,
    showGroupCode: true,
    showCreditLimit: false,
    showBranchCode: false,
    showBusinessUnit: false,
    showPhone: true,
    showPhone2: true,
    showEmail: true,
    showWebsite: true,
    showAddress: true,
    showLocation: true,
    showTaxNumber: false,
    showTaxOffice: false,
    showTCKN: false,
    showNotes: true,
  };

  const THEME = {
    bg: isDark ? "#020617" : "#F8FAFC",
    cardBg: isDark ? "rgba(15, 23, 42, 0.80)" : "#FFFFFF", 
    text: isDark ? "#F8FAFC" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    border: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)",
    primary: "#db2777",
    icon: isDark ? "#cbd5e1" : "#475569",
    inputBg: isDark ? "rgba(0,0,0,0.3)" : "#F8FAFC",
    shadow: isDark ? "#000000" : "#64748b",
  };

  const [activeTab, setActiveTab] = useState<"general" | "details">("general");

  const [shippingAddressModalOpen, setShippingAddressModalOpen] = useState(false);
  const [scannedOriginalImageUri, setScannedOriginalImageUri] = useState<string | null>(null);
  const [scannedPreviewUri, setScannedPreviewUri] = useState<string | null>(null);
  const [scannedContactName, setScannedContactName] = useState<string | null>(null);
  const [scannedTitle, setScannedTitle] = useState<string | null>(null);
  const [ocrCountryName, setOcrCountryName] = useState<string | null>(null);
  const [ocrCityName, setOcrCityName] = useState<string | null>(null);
  const [ocrDistrictName, setOcrDistrictName] = useState<string | null>(null);
  const [pendingBusinessCardResult, setPendingBusinessCardResult] = useState<BusinessCardOcrResult | null>(null);
  const [pendingReviewSource, setPendingReviewSource] = useState<"businessCard" | "qr">("businessCard");
  const [isBusinessCardReviewOpen, setIsBusinessCardReviewOpen] = useState(false);
  const [isTranslatingBusinessCard, setIsTranslatingBusinessCard] = useState(false);
  const [isPotentialMatchSearchEnabled, setIsPotentialMatchSearchEnabled] = useState(false);

  const { data: existingCustomer, isLoading: customerLoading } = useCustomer(customerId);
  const { data: customerTypes } = useCustomerTypes();
  const { data: customerShippingAddresses = [] } = useCustomerShippingAddresses(customerId);
  const createCustomer = useCreateCustomer();
  const createCustomerFromMobile = useCreateCustomerFromMobile();
  const updateCustomer = useUpdateCustomer();
  const { scanBusinessCard, pickBusinessCardFromGallery, retryBusinessCardExtraction, isScanning, error: scanError } = useBusinessCardScan();
  const { scanQrFromCamera, pickQrFromGallery, isScanningQr, qrError } = useQrCustomerScan();
  const potentialMatchesQuery = useBusinessCardPotentialMatches(
    pendingBusinessCardResult,
    isBusinessCardReviewOpen && isPotentialMatchSearchEnabled
  );

  const schema = useMemo(() => createCustomerSchema(), []);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      customerCode: "",
      taxNumber: "",
      taxOffice: "",
      tcknNumber: "",
      address: "",
      phone: "",
      phone2: "",
      email: "",
      website: "",
      notes: "",
      salesRepCode: "",
      groupCode: "",
      creditLimit: 0,
      defaultShippingAddressId: null,
      branchCode: branch?.code ? Number(branch.code) : 1,
      businessUnitCode: 1,
    },
  });

  const watchCountryId = watch("countryId");
  const watchCityId = watch("cityId");
  const watchDistrictId = watch("districtId");
  const watchDefaultShippingAddressId = watch("defaultShippingAddressId");
  const { data: countries } = useCountries();
  const { data: cities } = useCities(watchCountryId);
  const { data: districts } = useDistricts(watchCityId);

  const selectedShippingAddress = customerShippingAddresses.find((address) => address.id === watchDefaultShippingAddressId);
  const isMountedRef = useRef(true);
  const applyingScanRef = useRef<string | null>(null);
  const lastAppliedScanRef = useRef<string | null>(null);

  const nameInputRef = useRef<TextInput | null>(null);
  const phoneInputRef = useRef<TextInput | null>(null);
  const phone2InputRef = useRef<TextInput | null>(null);
  const emailInputRef = useRef<TextInput | null>(null);
  const websiteInputRef = useRef<TextInput | null>(null);
  const salesRepInputRef = useRef<TextInput | null>(null);
  const groupCodeInputRef = useRef<TextInput | null>(null);
  const addressInputRef = useRef<TextInput | null>(null);
  const notesInputRef = useRef<TextInput | null>(null);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffsetYRef = useRef(0);
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
    });
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        keyboardHeightRef.current = 0;
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollInputIntoView = useCallback(
    (inputRef: React.RefObject<TextInput | null>) => {
      const run = () => {
        const input = inputRef.current;
        const sv = scrollViewRef.current;
        if (!input || !sv) return;
        const windowH = Dimensions.get("window").height;
        const kb =
          keyboardHeightRef.current > 0
            ? keyboardHeightRef.current
            : Math.round(windowH * 0.36);
        const margin = 20;
        const safeBottom = windowH - kb - insets.bottom - margin;
        input.measureInWindow((_, y, __, h) => {
          const bottom = y + h;
          if (bottom > safeBottom) {
            const delta = bottom - safeBottom + 12;
            sv.scrollTo({ y: scrollOffsetYRef.current + delta, animated: true });
          }
        });
      };
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => setTimeout(run, 16));
      });
    },
    [insets.bottom]
  );

  const focusFirstDetailsField = useCallback((): React.RefObject<TextInput | null> | null => {
    if (formConfig.showSalesRep) {
      salesRepInputRef.current?.focus();
      return salesRepInputRef;
    }
    if (formConfig.showGroupCode) {
      groupCodeInputRef.current?.focus();
      return groupCodeInputRef;
    }
    if (formConfig.showAddress) {
      addressInputRef.current?.focus();
      return addressInputRef;
    }
    if (formConfig.showNotes) {
      notesInputRef.current?.focus();
      return notesInputRef;
    }
    return null;
  }, []);

  const goToDetailsTabAndFocus = useCallback(() => {
    setActiveTab("details");
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        const targetRef = focusFirstDetailsField();
        if (targetRef) {
          setTimeout(() => {
            targetRef.current?.focus();
            scrollInputIntoView(targetRef);
          }, 48);
          setTimeout(() => scrollInputIntoView(targetRef), 320);
        }
      }, 110);
    });
  }, [focusFirstDetailsField, scrollInputIntoView]);

  const focusAfterName = useCallback(() => {
    if (formConfig.showPhone) phoneInputRef.current?.focus();
    else if (formConfig.showPhone2) phone2InputRef.current?.focus();
    else if (formConfig.showEmail) emailInputRef.current?.focus();
    else if (formConfig.showWebsite) websiteInputRef.current?.focus();
    else goToDetailsTabAndFocus();
  }, [goToDetailsTabAndFocus]);

  const focusAfterPhone = useCallback(() => {
    if (formConfig.showPhone2) phone2InputRef.current?.focus();
    else if (formConfig.showEmail) emailInputRef.current?.focus();
    else if (formConfig.showWebsite) websiteInputRef.current?.focus();
    else goToDetailsTabAndFocus();
  }, [goToDetailsTabAndFocus]);

  const focusAfterPhone2 = useCallback(() => {
    if (formConfig.showEmail) emailInputRef.current?.focus();
    else if (formConfig.showWebsite) websiteInputRef.current?.focus();
    else goToDetailsTabAndFocus();
  }, [goToDetailsTabAndFocus]);

  const focusAfterEmail = useCallback(() => {
    if (formConfig.showWebsite) websiteInputRef.current?.focus();
    else goToDetailsTabAndFocus();
  }, [goToDetailsTabAndFocus]);

  const focusAfterSalesRep = useCallback(() => {
    if (formConfig.showGroupCode) groupCodeInputRef.current?.focus();
    else if (formConfig.showAddress) addressInputRef.current?.focus();
    else if (formConfig.showNotes) notesInputRef.current?.focus();
  }, []);

  const focusAfterGroupCode = useCallback(() => {
    if (formConfig.showAddress) addressInputRef.current?.focus();
    else if (formConfig.showNotes) notesInputRef.current?.focus();
  }, []);

  const addressTabToNotes = useCallback(() => {
    if (formConfig.showNotes) notesInputRef.current?.focus();
  }, []);

  const customerTypeOptions = useMemo(() => {
    if (!customerTypes) return [];
    return customerTypes.map(ct => ({
        label: ct.name,
        value: ct.id
    }));
  }, [customerTypes]);

  useEffect(() => {
    if (existingCustomer) {
      reset({
        name: existingCustomer.name,
        customerCode: existingCustomer.customerCode || "",
        taxNumber: existingCustomer.taxNumber || "",
        taxOffice: existingCustomer.taxOffice || "",
        tcknNumber: existingCustomer.tcknNumber || "",
        address: existingCustomer.address || "",
        phone: existingCustomer.phone || "",
        phone2: existingCustomer.phone2 || "",
        email: existingCustomer.email || "",
        website: existingCustomer.website || "",
        notes: existingCustomer.notes || "",
        countryId: existingCustomer.countryId ?? undefined,
        cityId: existingCustomer.cityId ?? undefined,
        districtId: existingCustomer.districtId ?? undefined,
        customerTypeId: existingCustomer.customerTypeId ?? undefined,
        salesRepCode: existingCustomer.salesRepCode || "",
        groupCode: existingCustomer.groupCode || "",
        creditLimit: existingCustomer.creditLimit,
        defaultShippingAddressId: existingCustomer.defaultShippingAddressId ?? null,
        branchCode: existingCustomer.branchCode,
        businessUnitCode: existingCustomer.businessUnitCode,
      });
    }
  }, [existingCustomer, reset]);

  const handleCountryChange = useCallback((country: CountryDto | undefined) => {
    setValue("countryId", country?.id);
    setValue("cityId", undefined);
    setValue("districtId", undefined);
  }, [setValue]);

  const handleCityChange = useCallback((city: CityDto | undefined) => {
    setValue("cityId", city?.id);
    setValue("districtId", undefined);
  }, [setValue]);

  const handleDistrictChange = useCallback((district: DistrictDto | undefined) => {
    setValue("districtId", district?.id);
  }, [setValue]);

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

  const handleShippingAddressSelect = useCallback((shippingAddressId: number) => {
    setValue("defaultShippingAddressId", shippingAddressId);
    setShippingAddressModalOpen(false);
  }, [setValue]);

  const toNumber = useCallback((v: number | undefined): number => {
    if (v === undefined || v === null) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }, []);

  const toNumberOptional = useCallback((v: number | undefined): number | undefined => {
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }, []);

  const onSubmit = useCallback(async (data: CustomerFormData) => {
    try {
      const splitContactName = (fullName: string | null): { firstName?: string; middleName?: string; lastName?: string } => {
        if (!fullName || !fullName.trim()) return {};
        const tokens = fullName
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (tokens.length === 0) return {};
        if (tokens.length === 1) {
          return { firstName: tokens[0], lastName: tokens[0] };
        }
        const firstName = tokens[0];
        const lastName = tokens[tokens.length - 1];
        const middleName = tokens.length > 2 ? tokens.slice(1, -1).join(" ") : undefined;
        return { firstName, middleName, lastName };
      };

      const base = {
        name: data.name,
        customerCode: data.customerCode || undefined,
        customerTypeId: data.customerTypeId,
        defaultShippingAddressId: data.defaultShippingAddressId ?? undefined,
        salesRepCode: data.salesRepCode || undefined,
        groupCode: data.groupCode || undefined,
        creditLimit: toNumberOptional(data.creditLimit),
        branchCode: toNumber(data.branchCode) || 1,
        businessUnitCode: toNumber(data.businessUnitCode) || 1,
        phone: data.phone || undefined,
        phone2: data.phone2 || undefined,
        email: data.email?.trim() ? data.email : undefined,
        website: data.website || undefined,
        address: data.address || undefined,
        taxNumber: data.taxNumber || undefined,
        taxOffice: data.taxOffice || undefined,
        tcknNumber: data.tcknNumber || undefined,
        notes: data.notes || undefined,
        countryId: data.countryId,
        cityId: data.cityId,
        districtId: data.districtId,
      };
      if (isEditMode && customerId) {
        const updatePayload = { ...base, completedDate: existingCustomer?.completionDate };
        await updateCustomer.mutateAsync({ id: customerId, data: updatePayload });
        Alert.alert("", t("customer.updateSuccess"));
      } else {
        const shouldUseMobileOcrFlow = Boolean(scannedOriginalImageUri);

        if (shouldUseMobileOcrFlow) {
          const contactNameParts = splitContactName(scannedContactName);
          const mobileCreateResult = await createCustomerFromMobile.mutateAsync({
            name: base.name,
            contactName: scannedContactName || undefined,
            contactFirstName: contactNameParts.firstName,
            contactMiddleName: contactNameParts.middleName,
            contactLastName: contactNameParts.lastName,
            title: scannedTitle || undefined,
            email: base.email,
            phone: base.phone,
            phone2: base.phone2,
            address: base.address,
            website: base.website,
            notes: base.notes,
            countryId: base.countryId,
            cityId: base.cityId,
            districtId: base.districtId,
            customerTypeId: base.customerTypeId,
            salesRepCode: base.salesRepCode,
            groupCode: base.groupCode,
            creditLimit: base.creditLimit,
            branchCode: base.branchCode,
            businessUnitCode: base.businessUnitCode,
            imageUri: scannedOriginalImageUri || undefined,
            imageDescription: scannedOriginalImageUri ? "Kartvizit görseli" : undefined,
          });

          if (mobileCreateResult.imageUploaded === false && mobileCreateResult.imageUploadError) {
            Alert.alert("Uyarı", mobileCreateResult.imageUploadError);
          }
        } else {
          await createCustomer.mutateAsync({
            name: base.name,
            customerCode: base.customerCode,
            taxNumber: base.taxNumber,
            taxOffice: base.taxOffice,
            tcknNumber: base.tcknNumber,
            address: base.address,
            phone: base.phone,
            phone2: base.phone2,
            email: base.email,
            website: base.website,
            notes: base.notes,
            countryId: base.countryId,
            cityId: base.cityId,
            districtId: base.districtId,
            customerTypeId: base.customerTypeId,
            salesRepCode: base.salesRepCode,
            groupCode: base.groupCode,
            creditLimit: base.creditLimit,
            defaultShippingAddressId: base.defaultShippingAddressId,
            branchCode: base.branchCode,
            businessUnitCode: base.businessUnitCode,
          });
        }

        Alert.alert("", t("customer.createSuccess"));
      }
      if (isEditMode) {
        router.back();
      } else {
        router.replace("/(tabs)/customers/list");
      }
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : t("common.error");
      Alert.alert(t("common.error"), message);
    }
  }, [
    isEditMode,
    customerId,
    existingCustomer?.completionDate,
    createCustomer,
    createCustomerFromMobile,
    updateCustomer,
    router,
    t,
    toNumber,
    toNumberOptional,
    scannedOriginalImageUri,
    scannedContactName,
    scannedTitle
  ]);

  const onError = useCallback((formErrors: any) => {
    showToast("error", "Lütfen kırmızı ile işaretlenmiş zorunlu alanları doldurun.");
    const generalFields = ["name", "customerTypeId", "countryId", "cityId", "districtId"];
    const hasGeneralError = Object.keys(formErrors).some(field => generalFields.includes(field));
    if (hasGeneralError) {
      setActiveTab("general");
    } else {
      setActiveTab("details");
    }
  }, [showToast]);

  useEffect(() => {
    if (scanError) Alert.alert(t("customer.scanCard"), scanError);
  }, [scanError, t]);

  useEffect(() => {
    if (!ocrCountryName) return;
    if (watchCountryId) return;
    const matchedCountry = findLookupByName(countries, ocrCountryName);
    if (matchedCountry) {
      handleCountryChange(matchedCountry);
      setOcrCountryName(null);
    }
  }, [ocrCountryName, watchCountryId, countries, findLookupByName, handleCountryChange]);

  useEffect(() => {
    if (!ocrCityName) return;
    if (!watchCountryId) return;
    if (watchCityId) return;
    const matchedCity = findLookupByName(cities, ocrCityName);
    if (matchedCity) {
      handleCityChange(matchedCity);
      setOcrCityName(null);
    }
  }, [ocrCityName, watchCountryId, watchCityId, cities, findLookupByName, handleCityChange]);

  useEffect(() => {
    if (!ocrDistrictName) return;
    if (!watchCityId) return;
    if (watchDistrictId) return;
    const matchedDistrict = findLookupByName(districts, ocrDistrictName);
    if (matchedDistrict) {
      handleDistrictChange(matchedDistrict);
      setOcrDistrictName(null);
    }
  }, [ocrDistrictName, watchCityId, watchDistrictId, districts, findLookupByName, handleDistrictChange]);

  const buildScanApplyKey = useCallback((data: BusinessCardOcrResult): string => {
    return [
      data.imageUri ?? "",
      data.customerName ?? "",
      data.contactNameAndSurname ?? "",
      data.title ?? "",
      data.phone1 ?? "",
      data.email ?? "",
    ].join("|");
  }, []);

  const applyBusinessCardResult = useCallback((data: BusinessCardOcrResult) => {
    if (!isMountedRef.current) return;
    const startedAt = Date.now();
    console.log("[BusinessCardReview] apply_to_form_start", {
      apply_to_form_start: startedAt,
      imageUri: data.imageUri ?? null,
    });

    const current = getValues();
    const mergedName = data.customerName ?? current.name;
    const nameForForm =
      typeof mergedName === "string" && uppercaseCompanyNameAfterScan
        ? mergedName.toLocaleUpperCase("tr-TR")
        : mergedName;
    reset(
      {
        ...current,
        name: nameForForm,
        email: data.email ?? current.email,
        phone: data.phone1 ?? current.phone,
        phone2: data.phone2 ?? current.phone2,
        address: data.address ?? current.address,
        website: data.website ?? current.website,
        notes: data.notes ?? current.notes,
      },
      { keepDefaultValues: true }
    );

    if (data.previewUri) setScannedPreviewUri(data.previewUri);
    if (data.contactNameAndSurname) setScannedContactName(data.contactNameAndSurname);
    if (data.title) setScannedTitle(data.title);
    if (data.countryName) setOcrCountryName(data.countryName);
    if (data.cityName) setOcrCityName(data.cityName);
    if (data.districtName) setOcrDistrictName(data.districtName);
    if (data.imageUri) setScannedOriginalImageUri(data.imageUri);

    console.log("[BusinessCardReview] apply_to_form_end", {
      apply_to_form_end: Date.now(),
      durationMs: Date.now() - startedAt,
      imageUri: data.imageUri ?? null,
    });
  }, [getValues, reset, uppercaseCompanyNameAfterScan]);

  const openBusinessCardReview = useCallback((result: BusinessCardOcrResult | null) => {
    if (!result) return;
    setPendingReviewSource("businessCard");
    setPendingBusinessCardResult(result);
    setIsBusinessCardReviewOpen(true);
    console.log("[BusinessCardReview] review_state_set", {
      review_state_set: Date.now(),
      source: "businessCard",
      imageUri: result.imageUri ?? null,
    });
  }, []);

  const openQrReview = useCallback((result: BusinessCardOcrResult | null) => {
    if (!result) return;
    setPendingReviewSource("qr");
    setPendingBusinessCardResult(result);
    setIsBusinessCardReviewOpen(true);
    console.log("[BusinessCardReview] review_state_set", {
      review_state_set: Date.now(),
      source: "qr",
      imageUri: result.imageUri ?? null,
    });
  }, []);

  const handleScanBusinessCard = useCallback(async () => {
    const result = await scanBusinessCard();
    openBusinessCardReview(result);
  }, [scanBusinessCard, openBusinessCardReview]);

  const handlePickBusinessCardFromGallery = useCallback(async () => {
    const result = await pickBusinessCardFromGallery();
    openBusinessCardReview(result);
  }, [pickBusinessCardFromGallery, openBusinessCardReview]);

  const handleScanQr = useCallback(async () => {
    const result = await scanQrFromCamera();
    openQrReview(result);
  }, [openQrReview, scanQrFromCamera]);

  const handlePickQrFromGallery = useCallback(async () => {
    const result = await pickQrFromGallery();
    openQrReview(result);
  }, [openQrReview, pickQrFromGallery]);

  const [hasAutoScanned, setHasAutoScanned] = useState(false);

  useEffect(() => {
    if (autoScan === "true" && !hasAutoScanned) {
      setHasAutoScanned(true); 
      setTimeout(() => {
        handleScanBusinessCard();
      }, 500);
    }
  }, [autoScan, hasAutoScanned, handleScanBusinessCard]);

  const handleCancelBusinessCardReview = useCallback(() => {
    setIsBusinessCardReviewOpen(false);
    setPendingBusinessCardResult(null);
  }, []);

  const handleConfirmBusinessCardReview = useCallback((confirmedResult?: BusinessCardOcrResult) => {
    const resultToApply = confirmedResult ?? pendingBusinessCardResult;
    if (resultToApply) {
      void trackBusinessCardTelemetry({
        type: "review_confirmed",
        details: { overallConfidence: resultToApply.review?.overallConfidence ?? null },
      });
    }
    setIsBusinessCardReviewOpen(false);
    setPendingBusinessCardResult(null);
    if (!resultToApply) return;

    const applyKey = buildScanApplyKey(resultToApply);
    if (applyingScanRef.current === applyKey || lastAppliedScanRef.current === applyKey) {
      return;
    }

    applyingScanRef.current = applyKey;
    InteractionManager.runAfterInteractions(() => {
      if (!isMountedRef.current) {
        applyingScanRef.current = null;
        return;
      }
      applyBusinessCardResult(resultToApply);
      lastAppliedScanRef.current = applyKey;
      applyingScanRef.current = null;
    });
  }, [pendingBusinessCardResult, buildScanApplyKey, applyBusinessCardResult]);

  const handleRetryBusinessCardReview = useCallback(async () => {
    if (pendingReviewSource === "qr") {
      setIsBusinessCardReviewOpen(false);
      setPendingBusinessCardResult(null);
      return;
    }
    if (!pendingBusinessCardResult?.imageUri) {
      Alert.alert(t("customer.scanCard"), t("customer.retryImageMissing"));
      return;
    }
    void trackBusinessCardTelemetry({
      type: "review_retry",
      details: { overallConfidence: pendingBusinessCardResult.review?.overallConfidence ?? null },
    });
    const retriedResult = await retryBusinessCardExtraction(pendingBusinessCardResult.imageUri);
    if (retriedResult) {
      setPendingBusinessCardResult(retriedResult);
    }
  }, [pendingBusinessCardResult, pendingReviewSource, retryBusinessCardExtraction, t]);

  const handleTranslateBusinessCardReview = useCallback(async () => {
    if (!pendingBusinessCardResult) return;
    setIsTranslatingBusinessCard(true);
    try {
      const translated = await translateBusinessCardToTurkish(pendingBusinessCardResult);
      setPendingBusinessCardResult(translated);
      void trackBusinessCardTelemetry({
        type: "review_confirmed",
        details: {
          translationApplied: translated.translationMeta?.translated ?? false,
          translationChangedFields: translated.translationMeta?.changedFields.join(",") ?? "",
        },
      });
    } finally {
      setIsTranslatingBusinessCard(false);
    }
  }, [pendingBusinessCardResult]);

  useEffect(() => {
    if (!isBusinessCardReviewOpen || !pendingBusinessCardResult || pendingReviewSource !== "businessCard") {
      setIsPotentialMatchSearchEnabled(false);
      return;
    }

    setIsPotentialMatchSearchEnabled(false);
    const startedAt = Date.now();
    const task = InteractionManager.runAfterInteractions(() => {
      const timeoutId = setTimeout(() => {
        console.log("[BusinessCardReview] potentialMatchesEnabled", {
          delayMs: Date.now() - startedAt,
        });
        setIsPotentialMatchSearchEnabled(true);
      }, 1200);

      return () => clearTimeout(timeoutId);
    });

    return () => {
      task.cancel();
      setIsPotentialMatchSearchEnabled(false);
    };
  }, [isBusinessCardReviewOpen, pendingBusinessCardResult, pendingReviewSource]);

  if (isEditMode && customerLoading) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.container, { backgroundColor: mainBg }]}>
          <ScreenHeader title={t("customer.edit")} showBackButton />
          <View style={[styles.content, { backgroundColor: 'transparent' }]}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          </View>
        </View>
      </>
    );
  }

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
        <View style={{ 
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255,255,255,0.9)', 
            borderBottomWidth: 1, 
            borderBottomColor: THEME.border 
        }}>
          <ScreenHeader title={isEditMode ? t("customer.edit") : t("customer.create")} showBackButton />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            contentContainerStyle={[styles.contentContainer, { flexGrow: 1, paddingBottom: insets.bottom + 200 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => {
              scrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            <View style={[
              styles.tabContainer, 
              { 
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF', 
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' 
              }
            ]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.tabButton, 
                  activeTab === "general" && [
                    styles.activeTabPremium,
                    { 
                      borderColor: THEME.primary, 
                      backgroundColor: isDark ? 'rgba(219, 39, 119, 0.15)' : 'rgba(219, 39, 119, 0.05)' 
                    }
                  ]
                ]}
                onPress={() => setActiveTab("general")}
              >
                <Text style={[styles.tabText, activeTab === "general" ? { color: THEME.primary } : { color: THEME.textMute }]}>
                  Genel Bilgiler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.tabButton, 
                  activeTab === "details" && [
                    styles.activeTabPremium,
                    { 
                      borderColor: THEME.primary, 
                      backgroundColor: isDark ? 'rgba(219, 39, 119, 0.15)' : 'rgba(219, 39, 119, 0.05)'
                    }
                  ]
                ]}
                onPress={() => setActiveTab("details")}
              >
                <Text style={[styles.tabText, activeTab === "details" ? { color: THEME.primary } : { color: THEME.textMute }]}>
                  Detaylar & Adres
                </Text>
              </TouchableOpacity>
            </View>
        
            {activeTab === "general" ? (
            <View style={{ gap: 10 }}>
              {(!isEditMode && formConfig.showBusinessCardScan) && (
                <>
                <View style={[styles.scannerContainer, { borderColor: THEME.primary, backgroundColor: `${THEME.primary}08` }]}>
                  <View style={styles.scannerContent}>
                    
                    <View style={styles.scannerLeft}>
                      <Camera01Icon size={20} color={THEME.primary} variant="stroke" />
                      <View>
                        <Text style={[styles.scannerTitle, { color: THEME.text }]}>Kartvizit Tara</Text>
                        <Text style={[styles.scannerSubtitle, { color: THEME.textMute }]}>Otomatik doldur</Text>
                      </View>
                    </View>

                    <View style={styles.scannerButtonsRow}>
                      <TouchableOpacity style={[styles.scannerIconButton, { borderColor: THEME.primary, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF' }]} onPress={handleScanBusinessCard} disabled={isScanning || isScanningQr}>
                        {isScanning ? <ActivityIndicator size="small" color={THEME.primary} /> : <Camera01Icon size={16} color={THEME.primary} />}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.scannerIconButton, { borderColor: THEME.primary, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF' }]} onPress={handlePickBusinessCardFromGallery} disabled={isScanning || isScanningQr}>
                        {isScanning ? <ActivityIndicator size="small" color={THEME.primary} /> : <Image01Icon size={16} color={THEME.primary} />}
                      </TouchableOpacity>
                    </View>

                  </View>

                  {scannedOriginalImageUri ? (
                    <View style={[styles.previewContainer, { borderColor: THEME.border, backgroundColor: isDark ? "rgba(15,23,42,0.6)" : "#FFFFFF" }]}>
                      {scannedPreviewUri ? (
                        <Image source={{ uri: scannedPreviewUri }} style={styles.previewImage} resizeMode="cover" />
                      ) : null}
                      <View style={styles.previewTextContainer}>
                        <Text style={[styles.previewTitle, { color: THEME.text }]}>Görsel hazır</Text>
                        <Text style={[styles.previewSubtitle, { color: THEME.textMute }]}>Kartvizit görseli kayıt ve gelişmiş arama için saklanıyor.</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setScannedOriginalImageUri(null);
                          setScannedPreviewUri(null);
                        }}
                        style={[styles.previewRemoveBtn, { backgroundColor: THEME.primary + '15' }]}
                      >
                        <Text style={[styles.previewRemoveText, { color: THEME.primary }]}>SİL</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.scannerContainer, { borderColor: THEME.border, backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "#FFFFFF" }]}>
                  <View style={styles.scannerContent}>
                    <View style={styles.scannerLeft}>
                      <ContactBookIcon size={20} color={THEME.text} variant="stroke" />
                      <View>
                        <Text style={[styles.scannerTitle, { color: THEME.text }]}>{t("customer.qrImportTitle")}</Text>
                        <Text style={[styles.scannerSubtitle, { color: THEME.textMute }]}>{t("customer.qrImportSubtitle")}</Text>
                      </View>
                    </View>

                    <View style={styles.scannerButtonsRow}>
                      <TouchableOpacity style={[styles.scannerIconButton, { borderColor: THEME.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF' }]} onPress={handleScanQr} disabled={isScanning || isScanningQr}>
                        {isScanningQr ? <ActivityIndicator size="small" color={THEME.primary} /> : <Camera01Icon size={16} color={THEME.text} />}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.scannerIconButton, { borderColor: THEME.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF' }]} onPress={handlePickQrFromGallery} disabled={isScanning || isScanningQr}>
                        {isScanningQr ? <ActivityIndicator size="small" color={THEME.primary} /> : <Image01Icon size={16} color={THEME.text} />}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                </>
              )}

              <FormSection title="Genel Bilgiler" icon={<UserCircleIcon size={16} color={THEME.primary} variant="stroke" />} theme={THEME} isDark={isDark}>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, value, ref } }) => (
                    <FormField
                      inputRef={assignRef(ref, nameInputRef)}
                      label={t("customer.name")}
                      value={value}
                      onChangeText={onChange}
                      error={errors.name?.message}
                      required
                      maxLength={250}
                      returnKeyType="next"
                      onSubmitEditing={focusAfterName}
                      onKeyPress={keyboardTabForward(focusAfterName)}
                      onInputFocus={() => scrollInputIntoView(nameInputRef)}
                    />
                  )}
                />

                {(formConfig.showCustomerCode || formConfig.showCustomerType) && (
                  <View style={styles.row}>
                      {formConfig.showCustomerCode && (
                        <View style={styles.flex1}>
                          <Controller
                            control={control}
                            name="customerCode"
                            render={({ field: { value, ref } }) => (
                              <View style={{ opacity: 0.6 }}>
                                <FormField inputRef={ref} label={t("customer.customerCode")} value={value || ""} onChangeText={() => {}} maxLength={100} editable={false} />
                              </View>
                            )}
                          />
                        </View>
                      )}
                      {formConfig.showCustomerType && (
                        <View style={styles.flex1}>
                          <Controller
                            control={control}
                            name="customerTypeId"
                            render={({ field: { onChange, value } }) => (
                                <PremiumPicker label={t("customer.customerType")} items={customerTypeOptions} value={value} onValueChange={onChange} placeholder={t("lookup.selectCustomerType")} error={errors.customerTypeId?.message} />
                            )}
                          />
                        </View>
                      )}
                  </View>
                )}
              </FormSection>

              {(formConfig.showPhone || formConfig.showPhone2 || formConfig.showEmail || formConfig.showWebsite) && (
                <FormSection title="İletişim Bilgileri" icon={<ContactBookIcon size={16} color={THEME.primary} variant="stroke" />} theme={THEME} isDark={isDark}>
                  {(formConfig.showPhone || formConfig.showPhone2) && (
                      <View style={styles.row}>
                          {formConfig.showPhone && (
                          <View style={styles.flex1}>
                              <Controller
                                control={control}
                                name="phone"
                                render={({ field: { onChange, value, ref } }) => (
                                  <FormField
                                    inputRef={assignRef(ref, phoneInputRef)}
                                    label={t("customer.phone")}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    keyboardType="phone-pad"
                                    maxLength={100}
                                    returnKeyType="next"
                                    onSubmitEditing={focusAfterPhone}
                                    onKeyPress={keyboardTabForward(focusAfterPhone)}
                                    onInputFocus={() => scrollInputIntoView(phoneInputRef)}
                                  />
                                )}
                              />
                          </View>
                          )}
                          {formConfig.showPhone2 && (
                          <View style={styles.flex1}>
                              <Controller
                                control={control}
                                name="phone2"
                                render={({ field: { onChange, value, ref } }) => (
                                  <FormField
                                    inputRef={assignRef(ref, phone2InputRef)}
                                    label={t("customer.phone2")}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    keyboardType="phone-pad"
                                    maxLength={100}
                                    returnKeyType="next"
                                    onSubmitEditing={focusAfterPhone2}
                                    onKeyPress={keyboardTabForward(focusAfterPhone2)}
                                    onInputFocus={() => scrollInputIntoView(phone2InputRef)}
                                  />
                                )}
                              />
                          </View>
                          )}
                      </View>
                  )}

                  {(formConfig.showEmail || formConfig.showWebsite) && (
                      <View style={styles.row}>
                          {formConfig.showEmail && (
                          <View style={styles.flex1}>
                              <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, value, ref } }) => (
                                  <FormField
                                    inputRef={assignRef(ref, emailInputRef)}
                                    label={t("customer.email")}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    error={errors.email?.message}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    maxLength={100}
                                    returnKeyType="next"
                                    onSubmitEditing={focusAfterEmail}
                                    onKeyPress={keyboardTabForward(focusAfterEmail)}
                                    onInputFocus={() => scrollInputIntoView(emailInputRef)}
                                  />
                                )}
                              />
                          </View>
                          )}
                          {formConfig.showWebsite && (
                          <View style={styles.flex1}>
                              <Controller
                                control={control}
                                name="website"
                                render={({ field: { onChange, value, ref } }) => (
                                  <FormField
                                    inputRef={assignRef(ref, websiteInputRef)}
                                    label={t("customer.website")}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    autoCapitalize="none"
                                    maxLength={100}
                                    returnKeyType="next"
                                    onSubmitEditing={goToDetailsTabAndFocus}
                                    onKeyPress={keyboardTabForward(goToDetailsTabAndFocus)}
                                    onInputFocus={() => scrollInputIntoView(websiteInputRef)}
                                  />
                                )}
                              />
                          </View>
                          )}
                      </View>
                  )}
                </FormSection>
              )}
            </View>
            ) : null}

            {activeTab === "details" ? (
            <View style={{ gap: 10 }}>
              {(formConfig.showSalesRep || formConfig.showGroupCode || formConfig.showCreditLimit || formConfig.showBranchCode || formConfig.showBusinessUnit) && (
                <FormSection title="Ticari Detaylar" icon={<Briefcase01Icon size={16} color={THEME.primary} variant="stroke" />} theme={THEME} isDark={isDark}>
                  
                  {(formConfig.showSalesRep || formConfig.showGroupCode) && (
                      <View style={styles.row}>
                          {formConfig.showSalesRep && (
                          <View style={styles.flex1}>
                              <Controller
                                control={control}
                                name="salesRepCode"
                                render={({ field: { onChange, value, ref } }) => (
                                  <FormField
                                    inputRef={assignRef(ref, salesRepInputRef)}
                                    label={t("customer.salesRepCode")}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    maxLength={50}
                                    returnKeyType="next"
                                    onSubmitEditing={focusAfterSalesRep}
                                    onKeyPress={keyboardTabForward(focusAfterSalesRep)}
                                    onInputFocus={() => scrollInputIntoView(salesRepInputRef)}
                                  />
                                )}
                              />
                          </View>
                          )}
                          {formConfig.showGroupCode && (
                          <View style={styles.flex1}>
                              <Controller
                                control={control}
                                name="groupCode"
                                render={({ field: { onChange, value, ref } }) => (
                                  <FormField
                                    inputRef={assignRef(ref, groupCodeInputRef)}
                                    label={t("customer.groupCode")}
                                    value={value || ""}
                                    onChangeText={onChange}
                                    maxLength={50}
                                    returnKeyType="next"
                                    onSubmitEditing={focusAfterGroupCode}
                                    onKeyPress={keyboardTabForward(focusAfterGroupCode)}
                                    onInputFocus={() => scrollInputIntoView(groupCodeInputRef)}
                                  />
                                )}
                              />
                          </View>
                          )}
                      </View>
                  )}

                  {(formConfig.showBranchCode || formConfig.showBusinessUnit) && (
                      <View style={styles.row}>
                          {formConfig.showBranchCode && (
                          <View style={styles.flex1}>
                              <Controller control={control} name="branchCode" render={({ field: { onChange, value, ref } }) => <FormField inputRef={ref} label={t("customer.branchCode")} value={value !== undefined && value !== null ? String(value) : ""} onChangeText={(text) => onChange(text ? Number(text) : 0)} keyboardType="numeric" />} />
                          </View>
                          )}
                          {formConfig.showBusinessUnit && (
                          <View style={styles.flex1}>
                              <Controller control={control} name="businessUnitCode" render={({ field: { onChange, value, ref } }) => <FormField inputRef={ref} label={t("customer.businessUnitCode")} value={value !== undefined && value !== null ? String(value) : ""} onChangeText={(text) => onChange(text ? Number(text) : 0)} keyboardType="numeric" />} />
                          </View>
                          )}
                      </View>
                  )}

                  {formConfig.showCreditLimit && (
                    <Controller control={control} name="creditLimit" render={({ field: { onChange, value, ref } }) => <FormField inputRef={ref} label={t("customer.creditLimit")} value={value !== undefined && value !== null ? String(value) : ""} onChangeText={(text) => onChange(text ? Number(text) : undefined)} keyboardType="numeric" />} />
                  )}
                </FormSection>
              )}

              {(formConfig.showAddress || formConfig.showLocation || formConfig.showShippingAddress) && (
                <FormSection title="Adres Bilgileri" icon={<Location01Icon size={16} color={THEME.primary} variant="stroke" />} theme={THEME} isDark={isDark}>
                  {formConfig.showLocation && (
                    <View style={styles.locationSection}>
                      <Text style={[styles.subSectionTitle, { color: THEME.textMute }]}>{t("lookup.location")}</Text>
                      <LocationPicker countryId={watchCountryId} cityId={watchCityId} districtId={watch("districtId")} onCountryChange={handleCountryChange} onCityChange={handleCityChange} onDistrictChange={handleDistrictChange} />
                    </View>
                  )}

                  {formConfig.showAddress && (
                    <Controller
                      control={control}
                      name="address"
                      render={({ field: { onChange, value, ref } }) => (
                        <FormField
                          inputRef={assignRef(ref, addressInputRef)}
                          label={t("customer.address")}
                          value={value || ""}
                          onChangeText={onChange}
                          multiline
                          numberOfLines={2}
                          maxLength={500}
                          onKeyPress={keyboardTabForward(addressTabToNotes)}
                          onInputFocus={() => scrollInputIntoView(addressInputRef)}
                        />
                      )}
                    />
                  )}

                  {formConfig.showShippingAddress && (
                    <View style={styles.fieldContainer}>
                      <Text style={[styles.label, { color: THEME.textMute }]}>{t("customer.defaultShippingAddress")}</Text>
                      <TouchableOpacity style={[styles.pickerField, { backgroundColor: THEME.inputBg, borderColor: THEME.border }]} onPress={() => setShippingAddressModalOpen(true)} disabled={!isEditMode || !customerId}>
                        <Text style={[styles.pickerFieldText, { color: selectedShippingAddress ? THEME.text : THEME.textMute }]}>
                          {selectedShippingAddress?.address || t("customer.defaultShippingAddressPlaceholder")}
                        </Text>
                        <ArrowDown01Icon size={14} color={THEME.textMute} />
                      </TouchableOpacity>
                    </View>
                  )}
                </FormSection>
              )}

              {(formConfig.showTaxNumber || formConfig.showTaxOffice || formConfig.showTCKN) && (
                <FormSection title="Yasal Bilgiler" icon={<Invoice01Icon size={16} color={THEME.primary} variant="stroke" />} theme={THEME} isDark={isDark}>
                  {(formConfig.showTaxOffice || formConfig.showTaxNumber) && (
                      <View style={styles.row}>
                          {formConfig.showTaxOffice && (
                          <View style={styles.flex1}>
                              <Controller control={control} name="taxOffice" render={({ field: { onChange, value, ref } }) => <FormField inputRef={ref} label={t("customer.taxOffice")} value={value || ""} onChangeText={onChange} maxLength={100} />} />
                          </View>
                          )}
                          {formConfig.showTaxNumber && (
                          <View style={styles.flex1}>
                              <Controller control={control} name="taxNumber" render={({ field: { onChange, value, ref } }) => <FormField inputRef={ref} label={t("customer.taxNumber")} value={value || ""} onChangeText={onChange} keyboardType="numeric" maxLength={15} />} />
                          </View>
                          )}
                      </View>
                  )}

                  {formConfig.showTCKN && (
                    <Controller control={control} name="tcknNumber" render={({ field: { onChange, value, ref } }) => <FormField inputRef={ref} label={t("customer.tcknNumber")} value={value || ""} onChangeText={onChange} keyboardType="numeric" maxLength={11} />} />
                  )}
                </FormSection>
              )}

              {formConfig.showNotes && (
                <FormSection title="Notlar" icon={<NoteIcon size={16} color={THEME.primary} variant="stroke" />} theme={THEME} isDark={isDark}>
                  <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, value, ref } }) => (
                      <FormField
                        inputRef={assignRef(ref, notesInputRef)}
                        label={t("customer.notes")}
                        value={value || ""}
                        onChangeText={onChange}
                        multiline
                        numberOfLines={2}
                        maxLength={250}
                        returnKeyType="default"
                        blurOnSubmit={false}
                        onInputFocus={() => scrollInputIntoView(notesInputRef)}
                      />
                    )}
                  />
                </FormSection>
              )}
            </View>
            ) : null}

        
            {activeTab === "general" ? (
              <View style={{ alignItems: 'flex-end', marginTop: 10, marginBottom: 20, paddingRight: 4 }}>
                <TouchableOpacity 
                  activeOpacity={0.6}
                  onPress={() => setActiveTab("details")} 
                  style={[
                    styles.sleekNextButton, 
                    { 
                      borderColor: THEME.primary, 
                      backgroundColor: isDark ? 'rgba(219, 39, 119, 0.15)' : '#FFF0F5', 
                      shadowColor: THEME.primary 
                    }
                  ]}
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
                style={[styles.submitButtonContainer, { shadowColor: THEME.primary, marginTop: 16 }]}
              >
                <LinearGradient
                  colors={['#f472b6', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
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

          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={shippingAddressModalOpen} transparent animationType="slide" onRequestClose={() => setShippingAddressModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShippingAddressModalOpen(false)} />
          <View style={[styles.modalContent, { backgroundColor: THEME.cardBg, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
              <View style={[styles.handle, { backgroundColor: THEME.border }]} />
              <Text style={[styles.modalTitle, { color: THEME.text }]}>{t("customer.defaultShippingAddress")}</Text>
            </View>
            <FlatList
              data={customerShippingAddresses}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const isSelected = watchDefaultShippingAddressId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, { borderBottomColor: THEME.border }, isSelected && { backgroundColor: isDark ? "rgba(219, 39, 119, 0.1)" : colors.activeBackground }]}
                    onPress={() => handleShippingAddressSelect(item.id)}
                  >
                    <Text style={[styles.pickerItemText, { color: THEME.text }]}>{item.address}</Text>
                    {isSelected && <CheckmarkCircle02Icon size={18} color={THEME.primary} variant="stroke" />}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={{ padding: 20 }}>
                  <Text style={{ color: THEME.textMute }}>{t("customer.noShippingAddress")}</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <BusinessCardReviewModal
        visible={isBusinessCardReviewOpen}
        result={pendingBusinessCardResult}
        isScanning={isScanning || isScanningQr}
        isTranslating={isTranslatingBusinessCard}
        isDark={isDark}
        theme={THEME}
        potentialMatches={potentialMatchesQuery.data ?? []}
        allowRetry={pendingReviewSource === "businessCard"}
        onCancel={handleCancelBusinessCardReview}
        onRetry={handleRetryBusinessCardReview}
        onConfirm={handleConfirmBusinessCardReview}
        onTranslate={handleTranslateBusinessCardReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentContainer: { padding: 10, gap: 5 }, 
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  ocrReviewContent: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  ocrReviewTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  ocrReviewSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 12, 
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 32,
    padding: 2, 
    borderWidth: 1.5, 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6, 
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1.5, 
    borderColor: 'transparent', 
  },
  tabText: {
    fontSize: 11, 
    fontWeight: '700',
    letterSpacing: 0.5, 
    textTransform: 'uppercase',
  },
  activeTabPremium: {
    shadowColor: '#ff0073ff',
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    borderRadius: 12, 
    padding: 12, 
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, 
    gap: 8, 
  },
  sectionIcon: {
    width: 28, 
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14, 
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subSectionTitle: {
    fontSize: 11, 
    fontWeight: "600",
    marginBottom: 4, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  row: {
    flexDirection: 'row',
    gap: 10, 
  },
  flex1: {
    flex: 1,
  },

  scannerContainer: {
    borderRadius: 10, 
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 8, 
    marginBottom: 0,
  },
  scannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
  },
  scannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scannerTitle: {
    fontSize: 13, 
    fontWeight: "700",
  },
  scannerSubtitle: {
    fontSize: 10, 
    marginTop: 1,
  },
  scannerButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  scannerIconButton: {
    width: 32, 
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    marginTop: 8, 
    borderRadius: 8, 
    borderWidth: 1,
    padding: 6, 
    flexDirection: "row",
    alignItems: "center",
    gap: 8, 
  },
  previewImage: {
    width: 72,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  previewTextContainer: { flex: 1, justifyContent: 'center' },
  previewTitle: { fontSize: 11, fontWeight: "600" }, 
  previewSubtitle: { fontSize: 10, lineHeight: 14 },
  previewRemoveBtn: {
    borderRadius: 6,
    paddingHorizontal: 8, 
    paddingVertical: 6,
  },
  previewRemoveText: { fontSize: 10, fontWeight: "700" }, 
  
  fieldContainer: { marginBottom: 0 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  pickerField: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    minHeight: 48 
  },
  pickerFieldText: { fontSize: 13, flex: 1 },
  locationSection: { marginTop: 0 },
  
  submitButtonContainer: {
    marginTop: 4,
    marginBottom: 20,
    borderRadius: 12, 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44, 
    borderRadius: 12, 
    gap: 10,
  },
  submitButtonText: { 
    color: "#FFFFFF", 
    fontSize: 14, 
    fontWeight: "700", 
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  sleekNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10, 
    paddingHorizontal: 22, 
    borderRadius: 24, 
    borderWidth: 1.5, 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3, 
  },
  sleekNextText: {
    fontSize: 14, 
    fontWeight: '700',
    letterSpacing: 0.6, 
  },
  sleekIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)" }, 
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "75%" },
  modalHeader: { alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, marginBottom: 8, opacity: 0.4 },
  modalTitle: { fontSize: 15, fontWeight: "700" },
  list: { flexGrow: 0 },
  pickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 13, fontWeight: "500", flex: 1 },
});
