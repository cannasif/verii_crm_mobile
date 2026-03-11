import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAuthStore } from "../../../store/auth";
import { useActivity, useActivityTypes, useCreateActivity, useUpdateActivity } from "../hooks";
import { FormField, CustomerPicker, ContactPicker } from "../components";
import { createActivitySchema, type ActivityFormData } from "../schemas";
import { buildCreateActivityPayload, buildUpdateActivityPayload } from "../utils/buildCreateActivityPayload";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUS_NUMERIC,
  ACTIVITY_PRIORITY_NUMERIC,
  ReminderChannel,
  type ActivityTypeDto,
  type ActivityDto,
} from "../types";
import type { CustomerDto } from "../../customer/types";
import type { ContactDto } from "../../contact/types";

interface PickerOption {
  value: string;
  label: string;
}

export function ActivityFormScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, initialDate, initialStartDateTime, initialEndDateTime } = useLocalSearchParams<{
    id: string;
    initialDate: string;
    initialStartDateTime: string;
    initialEndDateTime: string;
  }>();
  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const isEditMode = !!id;
  const activityId = id ? Number(id) : undefined;

  const toDefaultStartDateTime = useCallback((): string => {
    if (initialStartDateTime) return initialStartDateTime;
    if (initialDate) return initialDate;
    return new Date().toISOString();
  }, [initialDate, initialStartDateTime]);

  const toDefaultEndDateTime = useCallback((): string => {
    if (initialEndDateTime) return initialEndDateTime;
    const start = new Date(toDefaultStartDateTime());
    if (Number.isNaN(start.getTime())) return new Date().toISOString();
    start.setHours(start.getHours() + 1);
    return start.toISOString();
  }, [initialEndDateTime, toDefaultStartDateTime]);

  const contentBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.5)" : colors.background;

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [startDateModalOpen, setStartDateModalOpen] = useState(false);
  const [endDateModalOpen, setEndDateModalOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>();
  const [selectedContact, setSelectedContact] = useState<ContactDto | undefined>();

  const user = useAuthStore((state) => state.user);
  const { data: existingActivity, isLoading: activityLoading } = useActivity(activityId);
  const { data: activityTypes, isLoading: typesLoading } = useActivityTypes();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();

  const schema = useMemo(() => createActivitySchema(), []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: "",
      description: "",
      activityType: "",
      status: "Scheduled",
      isCompleted: false,
      priority: "Medium",
      assignedUserId: user?.id,
      startDateTime: toDefaultStartDateTime(),
      endDateTime: toDefaultEndDateTime(),
      isAllDay: false,
      reminders: [],
    },
  });

  const watchActivityType = watch("activityType");
  const watchStatus = watch("status");
  const watchPriority = watch("priority");
  const watchStartDateTime = watch("startDateTime");
  const watchEndDateTime = watch("endDateTime");
  const watchCustomerId = watch("potentialCustomerId");
  const watchIsAllDay = watch("isAllDay");
  const watchReminders = watch("reminders") || [];

  const statusOptions: PickerOption[] = useMemo(
    () =>
      ACTIVITY_STATUSES.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
      })),
    [t]
  );

  const priorityOptions: PickerOption[] = useMemo(
    () =>
      ACTIVITY_PRIORITIES.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
      })),
    [t]
  );

  const normalizeStatus = useCallback((value: ActivityDto["status"]): string => {
    if (typeof value === "number") return ACTIVITY_STATUS_NUMERIC[value] || "Scheduled";
    return value ? String(value) : "Scheduled";
  }, []);

  const normalizePriority = useCallback((value?: ActivityDto["priority"]): string => {
    if (typeof value === "number") return ACTIVITY_PRIORITY_NUMERIC[value] || "Medium";
    return value ? String(value) : "Medium";
  }, []);

  const normalizeActivityType = useCallback(
    (activityType: ActivityDto["activityType"]): string => {
      if (typeof activityType === "string") return activityType;
      if (activityType && typeof activityType === "object" && typeof activityType.name === "string") {
        return activityType.name;
      }
      return "";
    },
    []
  );

  useEffect(() => {
    if (existingActivity) {
      reset({
        subject: existingActivity.subject,
        description: existingActivity.description || "",
        activityType: normalizeActivityType(existingActivity.activityType),
        potentialCustomerId: existingActivity.potentialCustomerId,
        erpCustomerCode: existingActivity.erpCustomerCode || "",
        productCode: existingActivity.productCode || "",
        productName: existingActivity.productName || "",
        status: normalizeStatus(existingActivity.status),
        isCompleted: existingActivity.isCompleted,
        priority: normalizePriority(existingActivity.priority),
        contactId: existingActivity.contactId,
        assignedUserId: existingActivity.assignedUserId,
        startDateTime: existingActivity.startDateTime || existingActivity.activityDate || toDefaultStartDateTime(),
        endDateTime: existingActivity.endDateTime || toDefaultEndDateTime(),
        isAllDay: existingActivity.isAllDay ?? false,
        reminders: (existingActivity.reminders || []).map((reminder) => reminder.offsetMinutes),
      });

      if (existingActivity.potentialCustomer) {
        setSelectedCustomer({
          id: existingActivity.potentialCustomer.id,
          name: existingActivity.potentialCustomer.name,
          branchCode: 0,
          businessUnitCode: 0,
          createdDate: "",
          isDeleted: false,
        });
      }

      if (existingActivity.contact) {
        setSelectedContact({
          id: existingActivity.contact.id,
          fullName: existingActivity.contact.fullName ?? "",
          customerId: 0,
          titleId: 0,
          createdDate: "",
          isDeleted: false,
        } as unknown as ContactDto);
      }
    }
  }, [existingActivity, normalizeActivityType, normalizePriority, normalizeStatus, reset, toDefaultEndDateTime, toDefaultStartDateTime]);

  const handleTypeSelect = useCallback(
    (type: ActivityTypeDto) => {
      setValue("activityType", type.name);
      setTypeModalOpen(false);
    },
    [setValue]
  );

  const handleStatusSelect = useCallback(
    (option: PickerOption) => {
      setValue("status", option.value);
      if (option.value === "Completed") {
        setValue("isCompleted", true);
      } else {
        setValue("isCompleted", false);
      }
      setStatusModalOpen(false);
    },
    [setValue]
  );

  const handlePrioritySelect = useCallback(
    (option: PickerOption) => {
      setValue("priority", option.value);
      setPriorityModalOpen(false);
    },
    [setValue]
  );

  const handleCustomerChange = useCallback(
    (customer: CustomerDto | undefined) => {
      setSelectedCustomer(customer);
      setValue("potentialCustomerId", customer?.id);
      setSelectedContact(undefined);
      setValue("contactId", undefined);
    },
    [setValue]
  );

  const handleContactChange = useCallback(
    (contact: ContactDto | undefined) => {
      setSelectedContact(contact);
      setValue("contactId", contact?.id);
    },
    [setValue]
  );

  const handleOpenStartDateModal = useCallback(() => {
    setTempStartDate(new Date(watchStartDateTime));
    setStartDateModalOpen(true);
  }, [watchStartDateTime]);

  const handleOpenEndDateModal = useCallback(() => {
    setTempEndDate(new Date(watchEndDateTime || watchStartDateTime));
    setEndDateModalOpen(true);
  }, [watchEndDateTime, watchStartDateTime]);

  const handleStartDateChange = useCallback(
    (_: DateTimePickerEvent, selectedDate?: Date) => {
      if (selectedDate) {
        setTempStartDate(selectedDate);
        if (Platform.OS === "android") {
          setValue("startDateTime", selectedDate.toISOString());
          setStartDateModalOpen(false);
        }
      }
    },
    [setValue]
  );

  const handleEndDateChange = useCallback(
    (_: DateTimePickerEvent, selectedDate?: Date) => {
      if (selectedDate) {
        setTempEndDate(selectedDate);
        if (Platform.OS === "android") {
          setValue("endDateTime", selectedDate.toISOString());
          setEndDateModalOpen(false);
        }
      }
    },
    [setValue]
  );

  const handleConfirmStartDate = useCallback(() => {
    setValue("startDateTime", tempStartDate.toISOString());
    if (!watchEndDateTime) {
      const nextHour = new Date(tempStartDate);
      nextHour.setHours(nextHour.getHours() + 1);
      setValue("endDateTime", nextHour.toISOString());
    }
    setStartDateModalOpen(false);
  }, [tempStartDate, watchEndDateTime, setValue]);

  const handleConfirmEndDate = useCallback(() => {
    setValue("endDateTime", tempEndDate.toISOString());
    setEndDateModalOpen(false);
  }, [tempEndDate, setValue]);

  const handleToggleReminder = useCallback(
    (offsetMinutes: number) => {
      const exists = watchReminders.includes(offsetMinutes);
      if (exists) {
        setValue(
          "reminders",
          watchReminders.filter((value) => value !== offsetMinutes)
        );
        return;
      }
      setValue("reminders", [...watchReminders, offsetMinutes].sort((a, b) => a - b));
    },
    [watchReminders, setValue]
  );

  const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const onSubmit = useCallback(
    async (data: ActivityFormData) => {
      try {
        const options = {
          activityTypes: activityTypes ?? [],
          assignedUserIdFallback: user?.id,
        };
        const payloadInput = {
          ...data,
          activityTypeName: watchActivityType || data.activityType,
          potentialCustomerName: selectedCustomer?.name,
          contactName: selectedContact?.fullName,
          endDateTime: data.endDateTime || toDefaultEndDateTime(),
          reminders: (data.reminders || []).map((offsetMinutes) => ({
            offsetMinutes,
            channel: ReminderChannel.InApp,
          })),
        };

        const payload = isEditMode && existingActivity
          ? buildUpdateActivityPayload(payloadInput, {
              ...options,
              existingAssignedUserId: existingActivity.assignedUserId,
            })
          : buildCreateActivityPayload(payloadInput, options);

        if (isEditMode && activityId) {
          await updateActivity.mutateAsync({ id: activityId, data: payload });
          Alert.alert("", t("activity.updateSuccess"));
        } else {
          await createActivity.mutateAsync(payload);
          Alert.alert("", t("activity.createSuccess"));
        }
        router.back();
      } catch {
        Alert.alert(t("common.error"), t("common.unknownError"));
      }
    },
    [
      isEditMode,
      activityId,
      existingActivity,
      activityTypes,
      user?.id,
      createActivity,
      updateActivity,
      router,
      t,
    ]
  );

  const onInvalidSubmit = useCallback(() => {
    Alert.alert(
      t("common.warning"),
      t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun")
    );
  }, [t]);

  const renderTypeItem = useCallback(
    ({ item }: { item: ActivityTypeDto }) => {
      const isSelected = watchActivityType === item.name;
      return (
        <TouchableOpacity
          style={[
            styles.pickerItem,
            { borderBottomColor: colors.border },
            isSelected && { backgroundColor: colors.activeBackground },
          ]}
          onPress={() => handleTypeSelect(item)}
        >
          <Text style={[styles.pickerItemText, { color: colors.text }]}>{item.name}</Text>
          {isSelected && <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [watchActivityType, colors, handleTypeSelect]
  );

  const renderPickerItem = useCallback(
    ({ item, onSelect, selectedValue }: { item: PickerOption; onSelect: (opt: PickerOption) => void; selectedValue: string | undefined | null }) => {
      const isSelected = selectedValue === item.value;
      return (
        <TouchableOpacity
          style={[
            styles.pickerItem,
            { borderBottomColor: colors.border },
            isSelected && { backgroundColor: colors.activeBackground },
          ]}
          onPress={() => onSelect(item)}
        >
          <Text style={[styles.pickerItemText, { color: colors.text }]}>{item.label}</Text>
          {isSelected && <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [colors]
  );

  const selectedTypeName = useMemo(() => {
    if (!watchActivityType) return null;
    return activityTypes?.find((t) => t.name === watchActivityType)?.name || watchActivityType;
  }, [watchActivityType, activityTypes]);

  if (isEditMode && activityLoading) {
    return (
      <>
        <StatusBar style="light" />
        <View style={[styles.container, { backgroundColor: colors.header }]}>
          <ScreenHeader title={t("activity.edit")} showBackButton />
          <View style={[styles.content, { backgroundColor: contentBackground }]}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: colors.header }]}>
        <ScreenHeader
          title={isEditMode ? t("activity.edit") : t("activity.create")}
          showBackButton
        />
        <FlatList
          style={[styles.content, { backgroundColor: contentBackground }]}
          data={[0]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={() => (
            <>
          <Controller
            control={control}
            name="subject"
            render={({ field: { onChange, value } }) => (
              <FormField
                label={t("activity.subject")}
                value={value}
                onChangeText={onChange}
                error={errors.subject?.message}
                required
                maxLength={100}
              />
            )}
          />

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("activity.activityType")} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerField,
                { backgroundColor: colors.backgroundSecondary, borderColor: errors.activityType ? colors.error : colors.border },
              ]}
              onPress={() => setTypeModalOpen(true)}
            >
              {typesLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text
                  style={[
                    styles.pickerFieldText,
                    { color: selectedTypeName ? colors.text : colors.textMuted },
                  ]}
                >
                  {selectedTypeName || t("activity.selectType")}
                </Text>
              )}
              <Text style={[styles.arrow, { color: colors.textMuted }]}>▼</Text>
            </TouchableOpacity>
            {errors.activityType && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.activityType.message}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("activity.activityDate")} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerField,
                { backgroundColor: colors.backgroundSecondary, borderColor: errors.startDateTime ? colors.error : colors.border },
              ]}
              onPress={handleOpenStartDateModal}
            >
              <Text style={[styles.pickerFieldText, { color: colors.text }]}>
                {formatDisplayDate(watchStartDateTime)}
              </Text>
              <Text style={[styles.arrow, { color: colors.textMuted }]}>📅</Text>
            </TouchableOpacity>
            {errors.startDateTime && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.startDateTime.message}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("activity.endDate")} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerField,
                { backgroundColor: colors.backgroundSecondary, borderColor: errors.endDateTime ? colors.error : colors.border },
              ]}
              onPress={handleOpenEndDateModal}
            >
              <Text style={[styles.pickerFieldText, { color: colors.text }]}>
                {watchEndDateTime ? formatDisplayDate(watchEndDateTime) : "-"}
              </Text>
              <Text style={[styles.arrow, { color: colors.textMuted }]}>🕒</Text>
            </TouchableOpacity>
            {errors.endDateTime && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.endDateTime.message}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setValue("isAllDay", !watchIsAllDay)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleLabel, { color: colors.text }]}>{t("activity.isAllDay")}</Text>
            <View
              style={[
                styles.toggleIndicator,
                { backgroundColor: watchIsAllDay ? colors.accent : colors.border },
              ]}
            >
              <Text style={styles.toggleIndicatorText}>{watchIsAllDay ? "✓" : ""}</Text>
            </View>
          </TouchableOpacity>

          <CustomerPicker
            label={t("activity.customer")}
            value={watchCustomerId ?? undefined}
            customerName={selectedCustomer?.name}
            onChange={handleCustomerChange}
          />

          <ContactPicker
            label={t("activity.contact")}
            value={watch("contactId") ?? undefined}
            contactName={selectedContact?.fullName}
            customerId={watchCustomerId ?? undefined}
            onChange={handleContactChange}
          />

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("activity.status")} <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerField,
                { backgroundColor: colors.backgroundSecondary, borderColor: errors.status ? colors.error : colors.border },
              ]}
              onPress={() => setStatusModalOpen(true)}
            >
              <Text
                style={[
                  styles.pickerFieldText,
                  { color: watchStatus ? colors.text : colors.textMuted },
                ]}
              >
                {watchStatus
                  ? statusOptions.find((o) => o.value === watchStatus)?.label
                  : t("activity.selectStatus")}
              </Text>
              <Text style={[styles.arrow, { color: colors.textMuted }]}>▼</Text>
            </TouchableOpacity>
            {errors.status && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.status.message}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("activity.priority")}
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerField,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
              ]}
              onPress={() => setPriorityModalOpen(true)}
            >
              <Text
                style={[
                  styles.pickerFieldText,
                  { color: watchPriority ? colors.text : colors.textMuted },
                ]}
              >
                {watchPriority
                  ? priorityOptions.find((o) => o.value === watchPriority)?.label
                  : t("activity.selectPriority")}
              </Text>
              <Text style={[styles.arrow, { color: colors.textMuted }]}>▼</Text>
            </TouchableOpacity>
          </View>

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <FormField
                label={t("activity.description")}
                value={value || ""}
                onChangeText={onChange}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            )}
          />

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("activity.reminders")}</Text>
            <View style={styles.reminderPresetRow}>
              {[15, 30, 60, 1440].map((offset) => {
                const selected = watchReminders.includes(offset);
                const label = offset >= 1440 ? t("activity.oneDayBefore") : `${offset} dk`;
                return (
                  <TouchableOpacity
                    key={String(offset)}
                    style={[
                      styles.reminderChip,
                      {
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.activeBackground : colors.backgroundSecondary,
                      },
                    ]}
                    onPress={() => handleToggleReminder(offset)}
                  >
                    <Text style={[styles.reminderChipText, { color: selected ? colors.accent : colors.textSecondary }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.accent }]}
            onPress={handleSubmit(onSubmit, onInvalidSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? t("common.update") : t("common.save")}
              </Text>
            )}
          </TouchableOpacity>
            </>
          )}
        />
      </View>

      <Modal
        visible={typeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setTypeModalOpen(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("activity.selectType")}
              </Text>
            </View>
            {typesLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <FlatList
                data={activityTypes}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderTypeItem}
                style={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={statusModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setStatusModalOpen(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("activity.selectStatus")}
              </Text>
            </View>
            <FlatList
              data={statusOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => renderPickerItem({ item, onSelect: handleStatusSelect, selectedValue: watchStatus })}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={priorityModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPriorityModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setPriorityModalOpen(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("activity.selectPriority")}
              </Text>
            </View>
            <FlatList
              data={priorityOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => renderPickerItem({ item, onSelect: handlePrioritySelect, selectedValue: watchPriority })}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={startDateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setStartDateModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setStartDateModalOpen(false)}
          />
          <View
            style={[
              styles.dateModalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("activity.activityDate")}
              </Text>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempStartDate}
                mode="datetime"
                display="spinner"
                onChange={handleStartDateChange}
                textColor={colors.text}
                locale="tr-TR"
              />
            </View>
            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={[styles.dateModalButton, { borderColor: colors.border }]}
                onPress={() => setStartDateModalOpen(false)}
              >
                <Text style={[styles.dateModalButtonText, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateModalButton, styles.dateModalButtonPrimary, { backgroundColor: colors.accent }]}
                onPress={handleConfirmStartDate}
              >
                <Text style={[styles.dateModalButtonText, { color: "#FFFFFF" }]}>
                  {t("common.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={endDateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEndDateModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setEndDateModalOpen(false)}
          />
          <View
            style={[
              styles.dateModalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("activity.endDate")}
              </Text>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempEndDate}
                mode="datetime"
                display="spinner"
                onChange={handleEndDateChange}
                textColor={colors.text}
                locale="tr-TR"
              />
            </View>
            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={[styles.dateModalButton, { borderColor: colors.border }]}
                onPress={() => setEndDateModalOpen(false)}
              >
                <Text style={[styles.dateModalButtonText, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateModalButton, styles.dateModalButtonPrimary, { backgroundColor: colors.accent }]}
                onPress={handleConfirmEndDate}
              >
                <Text style={[styles.dateModalButtonText, { color: "#FFFFFF" }]}>
                  {t("common.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  pickerFieldText: {
    fontSize: 15,
    flex: 1,
  },
  arrow: {
    fontSize: 10,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  toggleRow: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  toggleIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleIndicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  reminderPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reminderChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reminderChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  list: {
    flexGrow: 0,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "600",
  },
  dateModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  datePickerContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  dateModalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  dateModalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dateModalButtonPrimary: {
    borderWidth: 0,
  },
  dateModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
