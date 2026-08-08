import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { FormField, CustomerPicker, useTitles, useCustomer } from "../../customer";
import { useContact } from "../hooks/useContact";
import { useCreateContact, useUpdateContact } from "../hooks/useContactMutation";
import { createContactSchema, type ContactFormData } from "../schemas/contact-schema";
import { SALUTATION_TYPE } from "../types/contact";
import type { CustomerDto, TitleDto } from "../../customer";

import { 
  UserCircleIcon,
  ContactBookIcon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  NoteIcon
} from "hugeicons-react-native";

const SALUTATION_OPTIONS: { value: number; labelKey: string }[] = [
  { value: SALUTATION_TYPE.None, labelKey: "contact.salutationNone" },
  { value: SALUTATION_TYPE.Mr, labelKey: "contact.salutationMr" },
  { value: SALUTATION_TYPE.Mrs, labelKey: "contact.salutationMrs" },
  { value: SALUTATION_TYPE.Ms, labelKey: "contact.salutationMs" },
  { value: SALUTATION_TYPE.Dr, labelKey: "contact.salutationDr" },
];

export function ContactFormScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; customerId?: string }>();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.showToast);

  const id = params.id;
  const isEditMode = !!id;
  const contactId = id ? Number(id) : undefined;
  const paramCustomerId = params.customerId ? Number(params.customerId) : undefined;
  const isCreateWithCustomer = !isEditMode && paramCustomerId != null && !Number.isNaN(paramCustomerId);

  const [activeTab, setActiveTab] = useState<"general" | "details">("general");
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [salutationModalOpen, setSalutationModalOpen] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | undefined>();

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#0c0516" : "#FAFAFA"; 
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.08)', 'transparent', 'rgba(249, 115, 22, 0.08)'] 
    : ['rgba(255, 235, 240, 0.4)', '#FFFFFF', 'rgba(255, 240, 225, 0.4)']) as [string, string, ...string[]];

  const THEME = {
    bg: isDark ? "#020617" : "#F8FAFC",
    cardBg: isDark ? "rgba(255,255,255,0.02)" : "#FFFFFF", 
    modalBg: isDark ? "#0c0516" : "#FFFFFF", 
    text: isDark ? "#FFFFFF" : "#0F172A",
    textMute: isDark ? "#94a3b8" : "#64748B",
    border: isDark ? "rgba(236, 72, 153, 0.15)" : "rgba(0,0,0,0.08)",
    primary: "#db2777",
    icon: isDark ? "#cbd5e1" : "#475569",
    inputBg: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
    shadow: isDark ? "#000000" : "#cbd5e1",
    error: "#ef4444"
  };

  const { data: existingContact, isLoading: contactLoading } = useContact(contactId);
  const { data: preselectedCustomer } = useCustomer(isCreateWithCustomer ? paramCustomerId : undefined);
  const { data: titles } = useTitles();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  const schema = useMemo(() => createContactSchema(), []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      salutation: SALUTATION_TYPE.None,
      firstName: "",
      middleName: "",
      lastName: "",
      fullName: "",
      email: "",
      phone: "",
      mobile: "",
      notes: "",
      customerId: 0,
      titleId: null,
    },
  });

  const watchTitleId = watch("titleId");
  const watchCustomerId = watch("customerId");
  const watchSalutation = watch("salutation");

  const selectedTitle = titles?.find((tit) => tit.id === watchTitleId);
  const selectedSalutationLabel =
    SALUTATION_OPTIONS.find((o) => o.value === watchSalutation)?.labelKey ?? "contact.salutationNone";

  useEffect(() => {
    if (existingContact) {
      reset({
        salutation: existingContact.salutation ?? SALUTATION_TYPE.None,
        firstName: existingContact.firstName ?? "",
        middleName: existingContact.middleName ?? "",
        lastName: existingContact.lastName ?? "",
        fullName: existingContact.fullName ?? "",
        email: existingContact.email ?? "",
        phone: existingContact.phone ?? "",
        mobile: existingContact.mobile ?? "",
        notes: existingContact.notes ?? "",
        customerId: existingContact.customerId,
        titleId: existingContact.titleId ?? null,
      });
      setSelectedCustomerName(existingContact.customerName);
    }
  }, [existingContact, reset]);

  useEffect(() => {
    if (isCreateWithCustomer && paramCustomerId != null) {
      setValue("customerId", paramCustomerId);
      if (preselectedCustomer?.name) {
        setSelectedCustomerName(preselectedCustomer.name);
      }
    }
  }, [isCreateWithCustomer, paramCustomerId, preselectedCustomer?.name, setValue]);

  const handleCustomerChange = useCallback(
    (customer: CustomerDto | undefined) => {
      setValue("customerId", customer?.id || 0);
      setSelectedCustomerName(customer?.name);
    },
    [setValue]
  );

  const handleTitleSelect = useCallback(
    (title: TitleDto) => {
      setValue("titleId", title.id);
      setTitleModalOpen(false);
    },
    [setValue]
  );

  const handleSalutationSelect = useCallback(
    (value: number) => {
      setValue("salutation", value);
      setSalutationModalOpen(false);
    },
    [setValue]
  );

  const buildPayload = useCallback((data: ContactFormData) => {
    const fullName = [data.firstName, data.middleName, data.lastName]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" ");
    return {
      salutation: data.salutation,
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() ? data.middleName.trim() : undefined,
      lastName: data.lastName.trim(),
      fullName: fullName || undefined,
      email: data.email?.trim() ? data.email.trim() : undefined,
      phone: data.phone?.trim() ? data.phone.trim() : undefined,
      mobile: data.mobile?.trim() ? data.mobile.trim() : undefined,
      notes: data.notes?.trim() ? data.notes.trim() : undefined,
      customerId: data.customerId,
      titleId: data.titleId === 0 || data.titleId === undefined ? null : data.titleId,
    };
  }, []);

  const onSubmit = useCallback(
    async (data: ContactFormData) => {
      try {
        const payload = buildPayload(data);

        if (isEditMode && contactId) {
          await updateContact.mutateAsync({ id: contactId, data: payload });
          Alert.alert("", t("contact.updateSuccess"));
        } else {
          await createContact.mutateAsync(payload);
          Alert.alert("", t("contact.createSuccess"));
        }
        router.back();
      } catch (error) {
        const message = error instanceof Error && error.message ? error.message : t("common.error");
        Alert.alert(t("common.error"), message);
      }
    },
    [isEditMode, contactId, buildPayload, createContact, updateContact, router, t]
  );

  const onError = useCallback((formErrors: any) => {
    showToast("error", "Lütfen kırmızı ile işaretlenmiş zorunlu alanları doldurun.");
    
    const generalFields = ["firstName", "lastName", "customerId", "titleId", "salutation"];
    const errorKeys = Object.keys(formErrors);
    const hasGeneralError = errorKeys.some(field => generalFields.includes(field));

    if (hasGeneralError) {
      setActiveTab("general");
    } else {
      setActiveTab("details");
    }

    setTimeout(() => {
      if (errorKeys.length > 0) {
        const focusableFields = ["firstName", "lastName", "email", "phone", "mobile", "notes"];
        const fieldToFocus = errorKeys.find(key => focusableFields.includes(key)) as keyof ContactFormData;

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

  if (isEditMode && contactLoading) {
    return (
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScreenHeader title={t("contact.edit")} showBackButton />
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
          <ScreenHeader title={isEditMode ? t("contact.edit") : t("contact.create")} showBackButton />
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
                  Kişi Bilgileri
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
                  Detaylar & İletişim
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ display: activeTab === "general" ? "flex" : "none", gap: 10 }}>
              
              <FormSection title="Kişi Bilgileri" icon={<UserCircleIcon size={16} color={THEME.primary} variant="stroke" />}>
                
                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: THEME.textMute }]}>
                    {t("contact.salutation")}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pickerField, { backgroundColor: THEME.inputBg, borderColor: THEME.border }]}
                    onPress={() => setSalutationModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerFieldText, { color: THEME.text }]}>
                      {t(selectedSalutationLabel)}
                    </Text>
                    <ArrowDown01Icon size={16} color={THEME.textMute} />
                  </TouchableOpacity>
                </View>

                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Controller control={control} name="firstName" render={({ field: { onChange, value, ref } }) => (
                      <FormField inputRef={ref} label={t("contact.firstName")} value={value} onChangeText={onChange} error={errors.firstName?.message} required maxLength={100} />
                    )} />
                  </View>
                  <View style={styles.flex1}>
                    <Controller control={control} name="lastName" render={({ field: { onChange, value, ref } }) => (
                      <FormField inputRef={ref} label={t("contact.lastName")} value={value} onChangeText={onChange} error={errors.lastName?.message} required maxLength={100} />
                    )} />
                  </View>
                </View>

                <Controller control={control} name="middleName" render={({ field: { onChange, value, ref } }) => (
                  <FormField inputRef={ref} label={t("contact.middleName")} value={value ?? ""} onChangeText={onChange} maxLength={100} />
                )} />

              </FormSection>

              <FormSection title="Firma ve Ünvan" icon={<Briefcase01Icon size={16} color={THEME.primary} variant="stroke" />}>
                
                <View style={styles.fieldContainer}>
                  <CustomerPicker value={watchCustomerId || undefined} customerName={selectedCustomerName} onChange={handleCustomerChange} label={t("contact.customer")} />
                  {errors.customerId && <Text style={[styles.error, { color: THEME.error }]}>{errors.customerId.message}</Text>}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: THEME.textMute }]}>{t("contact.titleField")}</Text>
                  <TouchableOpacity
                    style={[styles.pickerField, { backgroundColor: THEME.inputBg, borderColor: errors.titleId ? THEME.error : THEME.border }]}
                    onPress={() => setTitleModalOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerFieldText, { color: selectedTitle ? THEME.text : THEME.textMute }]}>
                      {selectedTitle?.titleName ?? t("lookup.selectTitle")}
                    </Text>
                    <ArrowDown01Icon size={16} color={THEME.textMute} />
                  </TouchableOpacity>
                  {errors.titleId && <Text style={[styles.error, { color: THEME.error }]}>{errors.titleId.message}</Text>}
                </View>

              </FormSection>

            </View>

            <View style={{ display: activeTab === "details" ? "flex" : "none", gap: 10 }}>
              
              <FormSection title="İletişim" icon={<ContactBookIcon size={16} color={THEME.primary} variant="stroke" />}>
                
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Controller control={control} name="phone" render={({ field: { onChange, value, ref } }) => (
                      <FormField inputRef={ref} label={t("contact.phone")} value={value ?? ""} onChangeText={onChange} keyboardType="phone-pad" maxLength={20} />
                    )} />
                  </View>
                  <View style={styles.flex1}>
                    <Controller control={control} name="mobile" render={({ field: { onChange, value, ref } }) => (
                      <FormField inputRef={ref} label={t("contact.mobile")} value={value ?? ""} onChangeText={onChange} keyboardType="phone-pad" maxLength={20} />
                    )} />
                  </View>
                </View>

                <Controller control={control} name="email" render={({ field: { onChange, value, ref } }) => (
                  <FormField inputRef={ref} label={t("contact.email")} value={value ?? ""} onChangeText={onChange} error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" maxLength={100} />
                )} />

              </FormSection>

              <FormSection title="Notlar" icon={<NoteIcon size={16} color={THEME.primary} variant="stroke" />}>
                <Controller control={control} name="notes" render={({ field: { onChange, value, ref } }) => (
                  <FormField inputRef={ref} label={t("contact.notes")} value={value ?? ""} onChangeText={onChange} multiline numberOfLines={3} maxLength={250} />
                )} />
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
      
      {/* --- SALUTATION MODAL --- */}
      <Modal visible={salutationModalOpen} transparent animationType="slide" onRequestClose={() => setSalutationModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSalutationModalOpen(false)} />
          <View style={[styles.modalContent, { 
            backgroundColor: THEME.modalBg, 
            paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 32,
            borderTopColor: isDark ? 'rgba(236, 72, 153, 0.4)' : THEME.border, 
            borderTopWidth: 1 
          }]}>
            <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
              <View style={[styles.handle, { backgroundColor: THEME.border }]} />
              <Text style={[styles.modalTitle, { color: THEME.text }]}>{t("contact.salutation")}</Text>
            </View>
            <FlatList
              data={SALUTATION_OPTIONS}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => {
                const isSelected = watchSalutation === item.value;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, { borderBottomColor: THEME.border }, isSelected && { backgroundColor: isDark ? "rgba(219, 39, 119, 0.1)" : "rgba(219, 39, 119, 0.05)" }]}
                    onPress={() => handleSalutationSelect(item.value)}
                  >
                    <Text style={[styles.pickerItemText, { color: THEME.text }]}>{t(item.labelKey)}</Text>
                    {isSelected && <CheckmarkCircle02Icon size={20} color={THEME.primary} variant="stroke" />}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
            />
          </View>
        </View>
      </Modal>

      {/* --- TITLE MODAL --- */}
      <Modal visible={titleModalOpen} transparent animationType="slide" onRequestClose={() => setTitleModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setTitleModalOpen(false)} />
          <View style={[styles.modalContent, { 
            backgroundColor: THEME.modalBg, 
            paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 32, 
            borderTopColor: isDark ? 'rgba(236, 72, 153, 0.4)' : THEME.border, 
            borderTopWidth: 1 
          }]}>
            <View style={[styles.modalHeader, { borderBottomColor: THEME.border }]}>
              <View style={[styles.handle, { backgroundColor: THEME.border }]} />
              <Text style={[styles.modalTitle, { color: THEME.text }]}>{t("lookup.selectTitle")}</Text>
            </View>
            <FlatList
              data={titles ?? []}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const isSelected = watchTitleId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, { borderBottomColor: THEME.border }, isSelected && { backgroundColor: isDark ? "rgba(219, 39, 119, 0.1)" : "rgba(219, 39, 119, 0.05)" }]}
                    onPress={() => handleTitleSelect(item)}
                  >
                    <Text style={[styles.pickerItemText, { color: THEME.text }]}>{item.titleName}</Text>
                    {isSelected && <CheckmarkCircle02Icon size={20} color={THEME.primary} variant="stroke" />}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: THEME.border }, (watchTitleId === null || watchTitleId === 0) && { backgroundColor: isDark ? "rgba(219, 39, 119, 0.1)" : "rgba(219, 39, 119, 0.05)" }]}
                  onPress={() => { setValue("titleId", null); setTitleModalOpen(false); }}
                >
                  <Text style={[styles.pickerItemText, { color: THEME.text }]}>{t("contact.titleNone")}</Text>
                  {(watchTitleId === null || watchTitleId === 0) && <CheckmarkCircle02Icon size={20} color={THEME.primary} variant="stroke" />}
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

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
  
  row: { flexDirection: 'row', gap: 8 }, 
  flex1: { flex: 1 },

  fieldContainer: { marginBottom: 0 },
  label: { fontSize: 11, fontWeight: "600", marginBottom: 3, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerField: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 40 },
  pickerFieldText: { fontSize: 13, flex: 1, fontWeight: '500' },
  error: { fontSize: 11, marginTop: 2, marginLeft: 4 },

  stickyFooter: { marginTop: 8, paddingTop: 8, paddingHorizontal: 4 },
  
  submitButtonContainer: { 
    borderRadius: 12, 
    marginTop: 16,
    shadowOffset: { width: 0, height: 0 }, 
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 0,
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
  sleekNextButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 12,
    borderWidth: 1,
  },
  sleekNextText: { 
    fontSize: 14, 
    fontWeight: '600', 
  },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.6)" }, 
  modalContent: { 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: "80%", 
    minHeight: "45%", 
  },
  modalHeader: { alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, marginBottom: 10, opacity: 0.3 },
  modalTitle: { fontSize: 15, fontWeight: "700" },
  list: { flexGrow: 0 },
  pickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 14, flex: 1, fontWeight: '500' },
});
