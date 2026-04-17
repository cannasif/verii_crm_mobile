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
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAuthStore } from "../../../store/auth";
import { useActivity, useActivityLookups, useActivityTypes, useCreateActivity, useUpdateActivity } from "../hooks";
import { FormField, CustomerPicker, ContactPicker } from "../components";
import { useCustomerScopeAccess } from "../../customer/hooks";
import { createActivitySchema, type ActivityFormData } from "../schemas";
import { buildCreateActivityPayload, buildUpdateActivityPayload } from "../utils/buildCreateActivityPayload";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUS_NUMERIC,
  ACTIVITY_PRIORITY_NUMERIC,
  ReminderChannel,
  type ActivityTypeDto,
  type ActivityLookupDto,
  type ActivityDto,
  type ActivityImageDto,
} from "../types";
import type { CustomerDto } from "../../customer/types";
import type { ContactDto } from "../../contact/types";
import { activityImageApi } from "../api";
import { getApiBaseUrl } from "../../../constants/config";
import { formatSystemDate, formatSystemDateTime, getSystemDatePickerLocale } from "../../../lib/systemSettings";
import {
  Calendar03Icon,
  Clock01Icon,
  TaskDaily01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  ArrowDown01Icon,
  Tick02Icon,
  Notification03Icon,
  Image02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "hugeicons-react-native";

interface PickerOption {
  value: string;
  label: string;
}

type AndroidPickerStep = "start-date" | "start-time" | "end-date" | "end-time" | null;

export function ActivityFormScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    id,
    initialDate,
    initialStartDateTime,
    initialEndDateTime,
    customerId,
    customerName,
    customerCode,
    contactId,
    contactName,
    quickActivityMode,
    lockStartDate,
    autoFillSubject,
  } = useLocalSearchParams<{
    id: string;
    initialDate: string;
    initialStartDateTime: string;
    initialEndDateTime: string;
    customerId: string;
    customerName: string;
    customerCode: string;
    contactId: string;
    contactName: string;
    quickActivityMode: string;
    lockStartDate: string;
    autoFillSubject: string;
  }>();

  const { colors, themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const isEditMode = !!id;
  const isQuickActivityMode = quickActivityMode === "true";
  const isStartDateLocked = lockStartDate === "true" && !isEditMode;
  const shouldAutoFillSubject = autoFillSubject === "true" && !isEditMode;
  const activityId = id ? Number(id) : undefined;
  const isDark = themeMode === "dark";

  const mainBg = colors.background;
  const gradientColors = (isDark
    ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
    : ["rgba(255, 235, 240, 0.65)", "#FFFFFF", "rgba(255, 240, 225, 0.7)"]) as [
    string,
    string,
    ...string[]
  ];

  const shellBg = colors.card;
  const shellBgAlt = isDark ? "rgba(23,10,38,0.99)" : "rgba(255,255,255,0.98)";
  const shellBorder = colors.cardBorder;
  const innerBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const innerBorder = isDark ? "rgba(255,255,255,0.10)" : colors.border;
  const titleText = colors.text;
  const mutedText = colors.textSecondary;
  const softText = colors.textMuted;
  const accent = colors.accent;
  const accentSecondary = colors.accentSecondary;

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [paymentTypeModalOpen, setPaymentTypeModalOpen] = useState(false);
  const [meetingTypeModalOpen, setMeetingTypeModalOpen] = useState(false);
  const [topicPurposeModalOpen, setTopicPurposeModalOpen] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [startDateModalOpen, setStartDateModalOpen] = useState(false);
  const [endDateModalOpen, setEndDateModalOpen] = useState(false);
  const [isSubjectAutoManaged, setIsSubjectAutoManaged] = useState(true);
  const [androidPickerStep, setAndroidPickerStep] = useState<AndroidPickerStep>(null);
  const [activeTab, setActiveTab] = useState<"general" | "details">("general");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>();
  const [selectedContact, setSelectedContact] = useState<ContactDto | undefined>();
  const [activityImages, setActivityImages] = useState<ActivityImageDto[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [previewPickedAssets, setPreviewPickedAssets] = useState<ImagePicker.ImagePickerAsset[] | null>(null);
  const [pendingImageAssets, setPendingImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const user = useAuthStore((state) => state.user);
  const { data: existingActivity, isLoading: activityLoading } = useActivity(activityId);
  const { data: activityTypes, isLoading: typesLoading } = useActivityTypes();
  const { paymentTypes, meetingTypes, topicPurposes, shippings } = useActivityLookups();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();

  const toDefaultStartDateTime = useCallback((): string => {
    if (initialStartDateTime) return initialStartDateTime;

    const base = initialDate ? new Date(initialDate) : new Date();
    if (Number.isNaN(base.getTime())) {
      const fallback = new Date();
      fallback.setSeconds(0, 0);
      return fallback.toISOString();
    }

    if (initialDate) {
      const now = new Date();
      base.setHours(now.getHours(), now.getMinutes(), 0, 0);
    } else {
      base.setSeconds(0, 0);
    }

    return base.toISOString();
  }, [initialDate, initialStartDateTime]);

  const toDefaultEndDateTime = useCallback((): string => {
    if (initialEndDateTime) return initialEndDateTime;

    const start = new Date(toDefaultStartDateTime());
    if (Number.isNaN(start.getTime())) {
      const fallback = new Date();
      fallback.setHours(fallback.getHours() + 1, fallback.getMinutes(), 0, 0);
      return fallback.toISOString();
    }

    return new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  }, [initialEndDateTime, toDefaultStartDateTime]);

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
      paymentTypeId: undefined,
      activityMeetingTypeId: undefined,
      activityTopicPurposeId: undefined,
      activityShippingId: undefined,
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
  const watchAssignedUserId = watch("assignedUserId");
  const watchIsAllDay = watch("isAllDay");
  const watchReminders = watch("reminders") || [];
  const { data: isCustomerInAssignedScope } = useCustomerScopeAccess(
    watchCustomerId ?? undefined,
    watchAssignedUserId ?? user?.id
  );

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
    (
      activityType: ActivityDto["activityType"],
      activityTypeName?: string | null
    ): string => {
      if (typeof activityType === "string") return activityType;
      if (activityType && typeof activityType === "object" && typeof activityType.name === "string") {
        return activityType.name;
      }
      return activityTypeName ?? "";
    },
    []
  );

  const toAbsoluteImageUrl = useCallback((path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${getApiBaseUrl()}${normalized}`;
  }, []);

  const buildAutoSubject = useCallback((customerDisplayName?: string | null, startDateTime?: string | null) => {
    const safeCustomerName = customerDisplayName?.trim() || "";

    if (!safeCustomerName) return "";

    const subjectDate = startDateTime ? new Date(startDateTime) : new Date();

    const formattedDate = Number.isNaN(subjectDate.getTime()) ? formatSystemDate(new Date()) : formatSystemDate(subjectDate);

    return `${safeCustomerName} carisine ait ${formattedDate} tarihli aktivite`;
  }, []);

  useEffect(() => {
    if (existingActivity) {
      reset({
        subject: existingActivity.subject,
        description: existingActivity.description || "",
        activityType: normalizeActivityType(
          existingActivity.activityType,
          existingActivity.activityTypeName
        ),
        activityTypeId: existingActivity.activityTypeId,
        potentialCustomerId: existingActivity.potentialCustomerId,
        erpCustomerCode: existingActivity.erpCustomerCode || "",
        productCode: existingActivity.productCode || "",
        productName: existingActivity.productName || "",
        status: normalizeStatus(existingActivity.status),
        isCompleted:
          typeof existingActivity.isCompleted === "boolean"
            ? existingActivity.isCompleted
            : normalizeStatus(existingActivity.status) === "Completed",
        priority: normalizePriority(existingActivity.priority),
        paymentTypeId: existingActivity.paymentTypeId ?? undefined,
        activityMeetingTypeId: existingActivity.activityMeetingTypeId ?? undefined,
        activityTopicPurposeId: existingActivity.activityTopicPurposeId ?? undefined,
        activityShippingId: existingActivity.activityShippingId ?? undefined,
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
  }, [
    existingActivity,
    normalizeActivityType,
    normalizePriority,
    normalizeStatus,
    reset,
    toDefaultEndDateTime,
    toDefaultStartDateTime,
  ]);

  useEffect(() => {
    if (existingActivity || isEditMode) return;

    const initialCustomerId = customerId ? Number(customerId) : undefined;
    const initialContactId = contactId ? Number(contactId) : undefined;

    const startValue = toDefaultStartDateTime();
    const endValue = toDefaultEndDateTime();

    reset({
      subject: shouldAutoFillSubject ? buildAutoSubject(customerName, startValue) : "",
      description: "",
      activityType: "",
      activityTypeId: undefined,
      potentialCustomerId: initialCustomerId,
      erpCustomerCode: customerCode || "",
      productCode: "",
      productName: "",
      status: "Scheduled",
      isCompleted: false,
      priority: "Medium",
      paymentTypeId: undefined,
      activityMeetingTypeId: undefined,
      activityTopicPurposeId: undefined,
      activityShippingId: undefined,
      contactId: initialContactId,
      assignedUserId: user?.id,
      startDateTime: startValue,
      endDateTime: endValue,
      isAllDay: false,
      reminders: [],
    });

    setIsSubjectAutoManaged(shouldAutoFillSubject);

    setSelectedCustomer(
      initialCustomerId
        ? ({
            id: initialCustomerId,
            name: customerName || "",
            customerCode: customerCode || undefined,
          } as CustomerDto)
        : undefined
    );

    setSelectedContact(
      initialContactId
        ? ({
            id: initialContactId,
            fullName: contactName || "",
            customerId: initialCustomerId ?? 0,
          } as ContactDto)
        : undefined
    );
  }, [
    contactId,
    contactName,
    customerCode,
    customerId,
    customerName,
    existingActivity,
    isEditMode,
    reset,
    toDefaultEndDateTime,
    toDefaultStartDateTime,
    user?.id,
    shouldAutoFillSubject,
    buildAutoSubject,
  ]);

  useEffect(() => {
    if (!watchCustomerId || isCustomerInAssignedScope !== false) return;

    setSelectedCustomer(undefined);
    setSelectedContact(undefined);
    setValue("potentialCustomerId", undefined);
    setValue("erpCustomerCode", "");
    setValue("contactId", undefined);
  }, [isCustomerInAssignedScope, setValue, watchCustomerId]);

  useEffect(() => {
    if (isEditMode) return;
    if (!shouldAutoFillSubject) return;
    if (!isSubjectAutoManaged) return;

    const nextSubject = buildAutoSubject(selectedCustomer?.name || customerName, watchStartDateTime);
    setValue("subject", nextSubject);
  }, [
    isEditMode,
    shouldAutoFillSubject,
    isSubjectAutoManaged,
    selectedCustomer?.name,
    customerName,
    watchStartDateTime,
    buildAutoSubject,
    setValue,
  ]);

  useEffect(() => {
    if (!activityId) {
      setActivityImages([]);
      return;
    }

    let cancelled = false;
    setImagesLoading(true);

    activityImageApi
      .getByActivityId(activityId)
      .then((images) => {
        if (!cancelled) {
          setActivityImages(images);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message =
            error instanceof Error && error.message ? error.message : t("activity.imageLoadError");
          Alert.alert(t("common.error"), message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setImagesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activityId, t]);

  useEffect(() => {
    if (!watchIsAllDay || isEditMode) return;

    const start = new Date(watchStartDateTime || toDefaultStartDateTime());
    if (Number.isNaN(start.getTime())) return;

    const nextStart = new Date(start);
    nextStart.setHours(9, 0, 0, 0);
    const nextEnd = new Date(start);
    nextEnd.setHours(18, 0, 0, 0);

    setValue("startDateTime", nextStart.toISOString());
    setValue("endDateTime", nextEnd.toISOString());
  }, [isEditMode, setValue, toDefaultStartDateTime, watchIsAllDay, watchStartDateTime]);

  const handleTypeSelect = useCallback(
    (type: ActivityTypeDto) => {
      setValue("activityType", type.name);
      setValue("activityTypeId", type.id);
      setTypeModalOpen(false);
    },
    [setValue]
  );

  const handleStatusSelect = useCallback(
    (option: PickerOption) => {
      setValue("status", option.value);
      setValue("isCompleted", option.value === "Completed");
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

  const createLookupSelectHandler = useCallback(
    (
        field: "paymentTypeId" | "activityMeetingTypeId" | "activityTopicPurposeId" | "activityShippingId",
        close: () => void
      ) =>
      (item: ActivityLookupDto) => {
        setValue(field, item.id);
        close();
      },
    [setValue]
  );

  const handlePaymentTypeSelect = useMemo(
    () => createLookupSelectHandler("paymentTypeId", () => setPaymentTypeModalOpen(false)),
    [createLookupSelectHandler]
  );
  const handleMeetingTypeSelect = useMemo(
    () => createLookupSelectHandler("activityMeetingTypeId", () => setMeetingTypeModalOpen(false)),
    [createLookupSelectHandler]
  );
  const handleTopicPurposeSelect = useMemo(
    () => createLookupSelectHandler("activityTopicPurposeId", () => setTopicPurposeModalOpen(false)),
    [createLookupSelectHandler]
  );
  const handleShippingSelect = useMemo(
    () => createLookupSelectHandler("activityShippingId", () => setShippingModalOpen(false)),
    [createLookupSelectHandler]
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
    const next = new Date(watchStartDateTime);
    setTempStartDate(next);

    if (Platform.OS === "android") {
      setAndroidPickerStep("start-date");
    } else {
      setStartDateModalOpen(true);
    }
  }, [watchStartDateTime]);

  const handleOpenEndDateModal = useCallback(() => {
    const next = new Date(watchEndDateTime || watchStartDateTime);
    setTempEndDate(next);

    if (Platform.OS === "android") {
      setAndroidPickerStep("end-date");
    } else {
      setEndDateModalOpen(true);
    }
  }, [watchEndDateTime, watchStartDateTime]);

  const handleStartDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        if (event.type === "dismissed") {
          setAndroidPickerStep(null);
          return;
        }

        if (!selectedDate) {
          setAndroidPickerStep(null);
          return;
        }

        if (androidPickerStep === "start-date") {
          const next = new Date(tempStartDate);
          next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          setTempStartDate(next);
          setAndroidPickerStep("start-time");
          return;
        }

        if (androidPickerStep === "start-time") {
          const next = new Date(tempStartDate);
          next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
          setTempStartDate(next);
          setValue("startDateTime", next.toISOString());

          if (!watchEndDateTime) {
            const nextHour = new Date(next);
            nextHour.setHours(nextHour.getHours() + 1);
            setValue("endDateTime", nextHour.toISOString());
          }

          setAndroidPickerStep(null);
          return;
        }

        return;
      }

      if (selectedDate) {
        setTempStartDate(selectedDate);
      }
    },
    [androidPickerStep, tempStartDate, setValue, watchEndDateTime]
  );

  const handleEndDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        if (event.type === "dismissed") {
          setAndroidPickerStep(null);
          return;
        }

        if (!selectedDate) {
          setAndroidPickerStep(null);
          return;
        }

        if (androidPickerStep === "end-date") {
          const next = new Date(tempEndDate);
          next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          setTempEndDate(next);
          setAndroidPickerStep("end-time");
          return;
        }

        if (androidPickerStep === "end-time") {
          const next = new Date(tempEndDate);
          next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
          setTempEndDate(next);
          setValue("endDateTime", next.toISOString());
          setAndroidPickerStep(null);
          return;
        }

        return;
      }

      if (selectedDate) {
        setTempEndDate(selectedDate);
      }
    },
    [androidPickerStep, tempEndDate, setValue]
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
    return formatSystemDateTime(date);
  };

  const handleCancelImagePreview = useCallback(() => {
    setPreviewPickedAssets(null);
  }, []);

  const handleConfirmImagePreview = useCallback(() => {
    if (!previewPickedAssets?.length) return;
    setPendingImageAssets((prev) => [...prev, ...previewPickedAssets]);
    setPreviewPickedAssets(null);
    setActiveTab("details");
  }, [previewPickedAssets]);

  const removePendingImageAt = useCallback((index: number) => {
    setPendingImageAssets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePickFromGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(t("common.warning"), t("activity.imagePermissionRequired"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setPreviewPickedAssets(result.assets);
  }, [t]);

  const handlePickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(t("common.warning"), t("activity.imagePermissionRequired"));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setPreviewPickedAssets(result.assets);
  }, [t]);

  const handlePickAndUploadImages = useCallback(() => {
    if (!activityId) {
      Alert.alert(t("common.warning"), t("activity.imageSaveFirst"));
      return;
    }

    Alert.alert(
      t("activity.addImage"),
      t("customer.chooseImageSource"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("customer.fromGallery"),
          onPress: () => {
            void handlePickFromGallery();
          },
        },
        {
          text: t("customer.fromCamera"),
          onPress: () => {
            void handlePickFromCamera();
          },
        },
      ]
    );
  }, [activityId, t, handlePickFromGallery, handlePickFromCamera]);

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

        const payload =
          isEditMode && existingActivity
            ? buildUpdateActivityPayload(payloadInput, {
                ...options,
                existingAssignedUserId: existingActivity.assignedUserId,
              })
            : buildCreateActivityPayload(payloadInput, options);

        if (isEditMode && activityId) {
          await updateActivity.mutateAsync({ id: activityId, data: payload });

          if (pendingImageAssets.length > 0) {
            try {
              await activityImageApi.upload(
                activityId,
                pendingImageAssets.map((asset) => ({
                  uri: asset.uri,
                  description: t("activity.imageDefaultDescription"),
                }))
              );
              setPendingImageAssets([]);
              const fresh = await activityImageApi.getByActivityId(activityId);
              setActivityImages(fresh);
              void queryClient.invalidateQueries({ queryKey: ["activity", "images", activityId] });
            } catch (imgErr) {
              const message =
                imgErr instanceof Error && imgErr.message ? imgErr.message : t("activity.imageUploadError");
              Alert.alert(t("common.error"), message);
              return;
            }
          }

          Alert.alert("", t("activity.updateSuccess"));
          router.back();
          return;
        }

        const created = await createActivity.mutateAsync(payload);
        Alert.alert("", t("activity.createSuccess"));

        const createdId = created?.id;
        if (createdId) {
          router.replace(`/(tabs)/activities/${createdId}`);
        } else {
          router.back();
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : t("common.unknownError");
        Alert.alert(t("common.error"), message);
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
      watchActivityType,
      selectedCustomer?.name,
      selectedContact?.fullName,
      toDefaultEndDateTime,
      pendingImageAssets,
      queryClient,
    ]
  );

  const onInvalidSubmit = useCallback(() => {
    const shouldGoToDetailsTab = Boolean(
      errors.status ||
        errors.priority ||
        errors.paymentTypeId ||
        errors.activityMeetingTypeId ||
        errors.activityTopicPurposeId ||
        errors.activityShippingId
    );

    setActiveTab(shouldGoToDetailsTab ? "details" : "general");

    Alert.alert(
      t("common.warning"),
      t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun")
    );
  }, [t, errors]);

  const handleDeleteImage = useCallback(
    async (imageId: number) => {
      setDeletingImageId(imageId);
      try {
        await activityImageApi.delete(imageId);
        if (activityId) {
          const fresh = await activityImageApi.getByActivityId(activityId);
          setActivityImages(fresh);
          void queryClient.invalidateQueries({ queryKey: ["activity", "images", activityId] });
        } else {
          setActivityImages((prev) => prev.filter((item) => item.id !== imageId));
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : t("activity.imageDeleteError");
        Alert.alert(t("common.error"), message);
      } finally {
        setDeletingImageId(null);
      }
    },
    [activityId, queryClient, t]
  );

  const renderTypeItem = useCallback(
    ({ item }: { item: ActivityTypeDto }) => {
      const isSelected = watchActivityType === item.name;

      return (
        <TouchableOpacity
          style={[
            styles.pickerItem,
            { borderBottomColor: innerBorder },
            isSelected && { backgroundColor: `${accent}0E` },
          ]}
          onPress={() => handleTypeSelect(item)}
        >
          <Text style={[styles.pickerItemText, { color: titleText }]}>{item.name}</Text>
          {isSelected ? (
            <View
              style={[
                styles.checkIconWrap,
                { backgroundColor: `${accent}10`, borderColor: `${accent}18` },
              ]}
            >
              <Tick02Icon size={12} color={accent} variant="stroke" />
            </View>
          ) : null}
        </TouchableOpacity>
      );
    },
    [watchActivityType, innerBorder, accent, handleTypeSelect, titleText]
  );

  const renderPickerItem = useCallback(
    ({
      item,
      onSelect,
      selectedValue,
    }: {
      item: PickerOption;
      onSelect: (opt: PickerOption) => void;
      selectedValue: string | undefined | null;
    }) => {
      const isSelected = selectedValue === item.value;

      return (
        <TouchableOpacity
          style={[
            styles.pickerItem,
            { borderBottomColor: innerBorder },
            isSelected && { backgroundColor: `${accent}0E` },
          ]}
          onPress={() => onSelect(item)}
        >
          <Text style={[styles.pickerItemText, { color: titleText }]}>{item.label}</Text>
          {isSelected ? (
            <View
              style={[
                styles.checkIconWrap,
                { backgroundColor: `${accent}10`, borderColor: `${accent}18` },
              ]}
            >
              <Tick02Icon size={12} color={accent} variant="stroke" />
            </View>
          ) : null}
        </TouchableOpacity>
      );
    },
    [innerBorder, accent, titleText]
  );

  const selectedTypeName = useMemo(() => {
    if (!watchActivityType) return null;
    return activityTypes?.find((type) => type.name === watchActivityType)?.name || watchActivityType;
  }, [watchActivityType, activityTypes]);

  const selectedStatusLabel = useMemo(
    () => statusOptions.find((option) => option.value === watchStatus)?.label || t("activity.selectStatus"),
    [statusOptions, watchStatus, t]
  );

  const selectedPriorityLabel = useMemo(
    () =>
      priorityOptions.find((option) => option.value === watchPriority)?.label ||
      t("activity.selectPriority"),
    [priorityOptions, watchPriority, t]
  );

  const watchPaymentTypeId = watch("paymentTypeId");
  const watchMeetingTypeId = watch("activityMeetingTypeId");
  const watchTopicPurposeId = watch("activityTopicPurposeId");
  const watchShippingId = watch("activityShippingId");

  const selectedPaymentTypeLabel = useMemo(
    () => paymentTypes.find((item) => item.id === watchPaymentTypeId)?.name || t("activity.select"),
    [paymentTypes, watchPaymentTypeId, t]
  );
  const selectedMeetingTypeLabel = useMemo(
    () => meetingTypes.find((item) => item.id === watchMeetingTypeId)?.name || t("activity.select"),
    [meetingTypes, watchMeetingTypeId, t]
  );
  const selectedTopicPurposeLabel = useMemo(
    () => topicPurposes.find((item) => item.id === watchTopicPurposeId)?.name || t("activity.select"),
    [topicPurposes, watchTopicPurposeId, t]
  );
  const selectedShippingLabel = useMemo(
    () => shippings.find((item) => item.id === watchShippingId)?.name || t("activity.select"),
    [shippings, watchShippingId, t]
  );

  const selectedStatusMeta = useMemo(() => {
    const normalized = String(watchStatus || "").toLocaleLowerCase("tr-TR");

    if (normalized.includes("completed")) {
      return {
        color: "#10B981",
        bg: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.10)",
        Icon: CheckmarkCircle02Icon,
      };
    }

    if (normalized.includes("scheduled")) {
      return {
        color: "#F59E0B",
        bg: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.10)",
        Icon: Calendar03Icon,
      };
    }

    return {
      color: accent,
      bg: `${accent}12`,
      Icon: Alert02Icon,
    };
  }, [watchStatus, isDark, accent]);

  const selectedPriorityMeta = useMemo(() => {
    const normalized = String(watchPriority || "").toLocaleLowerCase("tr-TR");

    if (normalized.includes("high")) {
      return {
        color: "#EF4444",
        bg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.10)",
      };
    }

    if (normalized.includes("low")) {
      return {
        color: "#10B981",
        bg: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.10)",
      };
    }

    return {
      color: "#F59E0B",
      bg: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.10)",
    };
  }, [watchPriority, isDark]);

  const reminderPresets = useMemo(
    () => [
      { value: 15, label: "15 dk" },
      { value: 30, label: "30 dk" },
      { value: 60, label: "60 dk" },
      { value: 1440, label: t("activity.oneDayBefore") },
    ],
    [t]
  );

  const activityImagePreviewTheme = useMemo(
    () => ({
      cardBg: isDark ? "rgba(23,10,38,0.99)" : "rgba(255,255,255,0.98)",
      borderColor: innerBorder,
      title: titleText,
      text: mutedText,
      cancelBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.12)",
      cancelText: titleText,
      confirmBg: isDark ? "rgba(236,72,153,0.22)" : "rgba(236,72,153,0.12)",
      confirmBorder: `${accent}44`,
      confirmText: accent,
    }),
    [accent, innerBorder, isDark, mutedText, titleText]
  );

  const visibleServerImageCount = useMemo(
    () => activityImages.filter((img) => !!toAbsoluteImageUrl(img.imageUrl)).length,
    [activityImages, toAbsoluteImageUrl]
  );

  const getFieldBorderColor = useCallback(
    (fieldName: string, hasError?: boolean) => {
      if (hasError) return colors.error;
      if (focusedField === fieldName) return "#ec4899";

      return isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
    },
    [colors.error, focusedField, isDark]
  );

  const getFieldGlowStyle = useCallback(
    (fieldName: string) => {
      if (focusedField !== fieldName) return null;

      return {
        borderColor: "#ec4899",
        backgroundColor: isDark ? "rgba(236,72,153,0.10)" : "rgba(236,72,153,0.05)",
      };
    },
    [focusedField, isDark]
  );
  if (isEditMode && activityLoading) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <StatusBar style={isDark ? "light" : "dark"} />
  <KeyboardAvoidingView
    style={[styles.container, { backgroundColor: mainBg }]}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    enabled={Platform.OS === "ios"}
  >
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <ScreenHeader title={t("activity.edit")} showBackButton />
          <View style={styles.content}>
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingCard, { backgroundColor: shellBgAlt, borderColor: shellBorder }]}>
                <ActivityIndicator size="large" color={accent} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <ScreenHeader
          title={isEditMode ? t("activity.edit") : t("activity.create")}
          showBackButton
        />

        <FlatList
          style={styles.content}
          data={[0]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={() => (
            <View style={styles.screenStack}>
             <View
  style={[
    styles.tabBarCard,
    {
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)",
      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
    },
  ]}
>
  <TouchableOpacity
    style={[
      styles.tabPill,
      activeTab === "general"
        ? [
            styles.tabPillActive,
            
              {
                borderColor: "#ec4899",
                backgroundColor: isDark
                    ? "rgba(236,72,153,0.22)"
                    : "rgba(236,72,153,0.12)",
              },
          ]
        : styles.tabPillInactive,
    ]}
    onPress={() => setActiveTab("general")}
    activeOpacity={0.9}
  >
    <Text
      style={[
        styles.tabPillText,
        {
          color: activeTab === "general" ? "#ec4899" : mutedText,
        },
      ]}
    >
      {t("activity.basicInfo")}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.tabPill,
      activeTab === "details"
        ? [
            styles.tabPillActive,
            {
              borderColor: "#ec4899",
              backgroundColor: isDark ? "rgba(236,72,153,0.14)" : "rgba(236,72,153,0.08)",
            },
          ]
        : styles.tabPillInactive,
    ]}
    onPress={() => setActiveTab("details")}
    activeOpacity={0.9}
  >
    <Text
      style={[
        styles.tabPillText,
        {
          color: activeTab === "details" ? "#ec4899" : mutedText,
        },
      ]}
    >
      {t("activity.detail")}
    </Text>
  </TouchableOpacity>
</View>

              <View
                style={[
                  styles.formSection,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.92)",
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                  },
                  { display: activeTab === "general" ? "flex" : "none" },
                ]}
              >
                <Controller
                  control={control}
                  name="subject"
                  render={({ field: { onChange, value } }) => (
                    <FormField
                      label={t("activity.subject")}
                      value={value}
                      onChangeText={(text) => {
                        if (shouldAutoFillSubject && isSubjectAutoManaged) {
                          setIsSubjectAutoManaged(false);
                        }
                        onChange(text);
                      }}
                      error={errors.subject?.message}
                      required
                      maxLength={100}
                    />
                  )}
                />

                <View style={styles.fieldBlock}>
                  <CustomerPicker
                    label={t("activity.customer")}
                    value={watchCustomerId ?? undefined}
                    customerName={selectedCustomer?.name}
                    onChange={handleCustomerChange}
                    disabled={isQuickActivityMode}
                    contextUserId={watchAssignedUserId ?? user?.id}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <ContactPicker
                    label={t("activity.contact")}
                    value={watch("contactId") ?? undefined}
                    contactName={selectedContact?.fullName}
                    customerId={watchCustomerId ?? undefined}
                    onChange={handleContactChange}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: mutedText }]}>
                    {t("activity.activityType")} <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <TouchableOpacity
  style={[
    styles.pickerField,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("activityType", !!errors.activityType),
    },
    getFieldGlowStyle("activityType"),
  ]}
  onPressIn={() => setFocusedField("activityType")}
  onPressOut={() => setFocusedField(null)}
  onPress={() => setTypeModalOpen(true)}
  activeOpacity={0.82}
>
                    <View style={styles.fieldLeftWrap}>
                      <View
                        style={[
                          styles.fieldIconWrap,
                          { backgroundColor: `${accent}10`, borderColor: `${accent}18` },
                        ]}
                      >
                        <TaskDaily01Icon size={13} color={accent} variant="stroke" />
                      </View>
                      {typesLoading ? (
                        <ActivityIndicator size="small" color={accent} />
                      ) : (
                        <Text
                          style={[
                            styles.pickerFieldText,
                            { color: selectedTypeName ? titleText : mutedText },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedTypeName || t("activity.selectType")}
                        </Text>
                      )}
                    </View>
                    <ArrowDown01Icon size={15} color={softText} variant="stroke" />
                  </TouchableOpacity>
                  {errors.activityType ? (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.activityType.message}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.dateGrid}>
                  <View style={styles.dateCell}>
                    <Text style={[styles.label, { color: mutedText }]}>
                      {t("activity.activityDate")} <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <TouchableOpacity
  style={[
    styles.pickerField,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("startDateTime", !!errors.startDateTime),
      opacity: isStartDateLocked ? 0.55 : 1,
    },
    getFieldGlowStyle("startDateTime"),
  ]}
  onPressIn={isStartDateLocked ? undefined : () => setFocusedField("startDateTime")}
  onPressOut={() => setFocusedField(null)}
  onPress={isStartDateLocked ? undefined : handleOpenStartDateModal}
  disabled={isStartDateLocked}
  activeOpacity={isStartDateLocked ? 1 : 0.82}
>
                      <View style={styles.fieldLeftWrap}>
                        <View
                          style={[
                            styles.fieldIconWrap,
                            { backgroundColor: `${accent}10`, borderColor: `${accent}18` },
                          ]}
                        >
                          <Calendar03Icon size={13} color={accent} variant="stroke" />
                        </View>
                        <Text style={[styles.pickerFieldText, { color: titleText }]} numberOfLines={1}>
                          {formatDisplayDate(watchStartDateTime)}
                        </Text>
                      </View>
                      <Calendar03Icon
                        size={14}
                        color={isStartDateLocked ? mutedText : softText}
                        variant="stroke"
                      />
                    </TouchableOpacity>
                    {errors.startDateTime ? (
                      <Text style={[styles.errorText, { color: colors.error }]}>
                        {errors.startDateTime.message}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.dateCell}>
                    <Text style={[styles.label, { color: mutedText }]}>
                      {t("activity.endDate")} <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <TouchableOpacity
  style={[
    styles.pickerField,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("endDateTime", !!errors.endDateTime),
    },
    getFieldGlowStyle("endDateTime"),
  ]}
  onPressIn={() => setFocusedField("endDateTime")}
  onPressOut={() => setFocusedField(null)}
  onPress={handleOpenEndDateModal}
  activeOpacity={0.82}
>
                      <View style={styles.fieldLeftWrap}>
                        <View
                          style={[
                            styles.fieldIconWrap,
                            {
                              backgroundColor: `${accentSecondary}12`,
                              borderColor: `${accentSecondary}18`,
                            },
                          ]}
                        >
                          <Clock01Icon size={13} color={accentSecondary} variant="stroke" />
                        </View>
                        <Text style={[styles.pickerFieldText, { color: titleText }]} numberOfLines={1}>
                          {watchEndDateTime ? formatDisplayDate(watchEndDateTime) : "-"}
                        </Text>
                      </View>
                      <Clock01Icon size={14} color={softText} variant="stroke" />
                    </TouchableOpacity>
                    {errors.endDateTime ? (
                      <Text style={[styles.errorText, { color: colors.error }]}>
                        {errors.endDateTime.message}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
  style={[
    styles.toggleRow,
    {
      borderColor: getFieldBorderColor("isAllDay"),
      backgroundColor: innerBg,
    },
    getFieldGlowStyle("isAllDay"),
  ]}
  onPressIn={() => setFocusedField("isAllDay")}
  onPressOut={() => setFocusedField(null)}
  onPress={() => setValue("isAllDay", !watchIsAllDay)}
  activeOpacity={0.82}
>
                  <View style={styles.toggleLeft}>
                    <View
                      style={[
                        styles.fieldIconWrap,
                        { backgroundColor: `${accent}10`, borderColor: `${accent}18` },
                      ]}
                    >
                      <Calendar03Icon size={13} color={accent} variant="stroke" />
                    </View>
                    <Text style={[styles.toggleLabel, { color: titleText }]}>{t("activity.isAllDay")}</Text>
                  </View>
                  <View
                    style={[
                      styles.toggleIndicator,
                      {
                        backgroundColor: watchIsAllDay ? accent : "transparent",
                        borderColor: watchIsAllDay ? `${accent}40` : innerBorder,
                      },
                    ]}
                  >
                    {watchIsAllDay ? <Tick02Icon size={12} color="#FFFFFF" variant="stroke" /> : null}
                  </View>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.formSectionCompact,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.92)",
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                  },
                  { display: activeTab === "details" ? "flex" : "none" },
                ]}
              >
                <View style={styles.twoColumnRow}>
                  <View style={styles.twoColumnItem}>
                    <Text style={[styles.labelCompact, { color: mutedText }]}>
                      {t("activity.status")} <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <TouchableOpacity
  style={[
    styles.pickerFieldCompact,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("status", !!errors.status),
    },
    getFieldGlowStyle("status"),
  ]}
  onPressIn={() => setFocusedField("status")}
  onPressOut={() => setFocusedField(null)}
  onPress={() => setStatusModalOpen(true)}
  activeOpacity={0.82}
>
                      <View style={styles.fieldLeftWrap}>
                        <View
                          style={[
                            styles.fieldIconWrapCompact,
                            {
                              backgroundColor: selectedStatusMeta.bg,
                              borderColor: `${selectedStatusMeta.color}22`,
                            },
                          ]}
                        >
                          <selectedStatusMeta.Icon size={12} color={selectedStatusMeta.color} variant="stroke" />
                        </View>
                        <Text
                          style={[
                            styles.pickerFieldTextCompact,
                            { color: watchStatus ? titleText : mutedText },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedStatusLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={14} color={softText} variant="stroke" />
                    </TouchableOpacity>
                    {errors.status ? (
                      <Text style={[styles.errorText, { color: colors.error }]}>
                        {errors.status.message}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.twoColumnItem}>
                    <Text style={[styles.labelCompact, { color: mutedText }]}>
                      {t("activity.priority")}
                    </Text>
                    <TouchableOpacity
  style={[
    styles.pickerFieldCompact,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("priority"),
    },
    getFieldGlowStyle("priority"),
  ]}
  onPressIn={() => setFocusedField("priority")}
  onPressOut={() => setFocusedField(null)}
  onPress={() => setPriorityModalOpen(true)}
  activeOpacity={0.82}
>
                      <View style={styles.fieldLeftWrap}>
                        <View
                          style={[
                            styles.fieldIconWrapCompact,
                            {
                              backgroundColor: selectedPriorityMeta.bg,
                              borderColor: `${selectedPriorityMeta.color}22`,
                            },
                          ]}
                        >
                          <Alert02Icon size={12} color={selectedPriorityMeta.color} variant="stroke" />
                        </View>
                        <Text
                          style={[
                            styles.pickerFieldTextCompact,
                            { color: watchPriority ? titleText : mutedText },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedPriorityLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={14} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.formSectionCompact,
                  { backgroundColor: shellBg, borderColor: shellBorder },
                  { display: activeTab === "details" ? "flex" : "none" },
                ]}
              >
                <View style={styles.twoColumnRow}>
                  <View style={styles.twoColumnItem}>
                    <Text style={[styles.labelCompact, { color: mutedText }]}>
                      {t("activity.paymentType")}
                    </Text>
                    <TouchableOpacity
  style={[
    styles.pickerFieldCompact,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("paymentType"),
    },
    getFieldGlowStyle("paymentType"),
  ]}
  onPressIn={() => setFocusedField("paymentType")}
  onPressOut={() => setFocusedField(null)}
  onPress={() => setPaymentTypeModalOpen(true)}
  activeOpacity={0.82}
>
                      <View style={styles.fieldLeftWrap}>
                        <Text
                          style={[
                            styles.pickerFieldTextCompact,
                            { color: watchPaymentTypeId ? titleText : mutedText },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedPaymentTypeLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={14} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.twoColumnItem}>
                    <Text style={[styles.labelCompact, { color: mutedText }]}>
                      {t("activity.activityMeetingType")}
                    </Text>
                    <TouchableOpacity
  style={[
    styles.pickerFieldCompact,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("meetingType"),
    },
    getFieldGlowStyle("meetingType"),
  ]}
  onPressIn={() => setFocusedField("meetingType")}
  onPressOut={() => setFocusedField(null)}
  onPress={() => setMeetingTypeModalOpen(true)}
  activeOpacity={0.82}
>
                      <View style={styles.fieldLeftWrap}>
                        <Text
                          style={[
                            styles.pickerFieldTextCompact,
                            { color: watchMeetingTypeId ? titleText : mutedText },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedMeetingTypeLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={14} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.twoColumnRowLast}>
                  <View style={styles.twoColumnItem}>
                    <Text style={[styles.labelCompact, { color: mutedText }]}>
                      {t("activity.activityTopicPurpose")}
                    </Text>
                    <TouchableOpacity
  style={[
    styles.pickerFieldCompact,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("topicPurpose"),
    },
    getFieldGlowStyle("topicPurpose"),
  ]}
  onPressIn={() => setFocusedField("topicPurpose")}
  onPressOut={() => setFocusedField(null)}
  onPress={() => setTopicPurposeModalOpen(true)}
  activeOpacity={0.82}
>
                      <View style={styles.fieldLeftWrap}>
                        <Text
                          style={[
                            styles.pickerFieldTextCompact,
                            { color: watchTopicPurposeId ? titleText : mutedText },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedTopicPurposeLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={14} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.twoColumnItem}>
                    <Text style={[styles.labelCompact, { color: mutedText }]}>
                      {t("activity.activityShipping")}
                    </Text>
                    <TouchableOpacity
  style={[
    styles.pickerFieldCompact,
    {
      backgroundColor: innerBg,
      borderColor: getFieldBorderColor("shipping"),
    },
    getFieldGlowStyle("shipping"),
  ]}
  onPressIn={() => setFocusedField("shipping")}
  onPressOut={() => setFocusedField(null)}
  onPress={() => setShippingModalOpen(true)}
  activeOpacity={0.82}
>
                      <View style={styles.fieldLeftWrap}>
                        <Text
                          style={[
                            styles.pickerFieldTextCompact,
                            { color: watchShippingId ? titleText : mutedText },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedShippingLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={14} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.formSection,
                  { backgroundColor: shellBg, borderColor: shellBorder },
                  { display: activeTab === "details" ? "flex" : "none" },
                ]}
              >
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
              </View>

              <View
                style={[
                  styles.formSection,
                  { backgroundColor: shellBg, borderColor: shellBorder },
                  { display: activeTab === "details" ? "flex" : "none" },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionHeaderIcon,
                      { backgroundColor: `${accent}10`, borderColor: `${accent}18` },
                    ]}
                  >
                    <Notification03Icon size={14} color={accent} variant="stroke" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>{t("activity.reminders")}</Text>
                </View>

                <View style={styles.reminderPresetRow}>
                  {reminderPresets.map((preset) => {
                    const selected = watchReminders.includes(preset.value);

                    return (
                      <TouchableOpacity
                        key={String(preset.value)}
                        style={[
                          styles.reminderChip,
                          {
                            borderColor: selected ? `${accent}22` : innerBorder,
                            backgroundColor: selected ? `${accent}10` : innerBg,
                          },
                        ]}
                        onPress={() => handleToggleReminder(preset.value)}
                        activeOpacity={0.82}
                      >
                        {selected ? (
                          <View
                            style={[
                              styles.reminderCheck,
                              { backgroundColor: `${accent}12`, borderColor: `${accent}18` },
                            ]}
                          >
                            <Tick02Icon size={10} color={accent} variant="stroke" />
                          </View>
                        ) : null}
                        <Text
                          style={[
                            styles.reminderChipText,
                            { color: selected ? accent : mutedText },
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.formSection,
                  { backgroundColor: shellBg, borderColor: shellBorder },
                  { display: activeTab === "details" ? "flex" : "none" },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionHeaderIcon,
                      { backgroundColor: `${accent}10`, borderColor: `${accent}18` },
                    ]}
                  >
                    <Image02Icon size={14} color={accent} variant="stroke" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>{t("activity.images")}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.secondaryActionButton,
                    {
                      borderColor: innerBorder,
                      backgroundColor: innerBg,
                      opacity: !activityId || isSubmitting ? 0.7 : 1,
                    },
                  ]}
                  onPress={handlePickAndUploadImages}
                  disabled={!activityId || isSubmitting}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.secondaryActionButtonText, { color: titleText }]}>
                    {activityId ? t("activity.addImage") : t("activity.imageSaveFirst")}
                  </Text>
                </TouchableOpacity>

                {pendingImageAssets.length > 0 ? (
                  <Text style={[styles.activityPendingImagesHint, { color: mutedText }]}>
                    {t("activity.pendingImagesSaveHint")}
                  </Text>
                ) : null}

                {imagesLoading && visibleServerImageCount === 0 && pendingImageAssets.length === 0 ? (
                  <ActivityIndicator size="small" color={accent} style={styles.imageLoadingIndicator} />
                ) : visibleServerImageCount === 0 && pendingImageAssets.length === 0 ? (
                  <Text style={[styles.emptyHelperText, { color: mutedText }]}>{t("activity.noImages")}</Text>
                ) : (
                  <View style={styles.activityImageStripOuter}>
                    <View style={styles.activityImageStripScrollWrap}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.activityImageScrollContent}
                      >
                        {activityImages.map((image) => {
                          const imageUri = toAbsoluteImageUrl(image.imageUrl);
                          if (!imageUri) return null;
                          const caption =
                            image.imageDescription?.trim() || t("activity.imageDefaultDescription");
                          return (
                            <View
                              key={image.id}
                              style={[
                                styles.activityImageStripCard,
                                { backgroundColor: innerBg, borderColor: innerBorder },
                              ]}
                            >
                              <Image source={{ uri: imageUri }} style={styles.activityImageStripPhoto} resizeMode="cover" />
                              <Text style={[styles.activityImageStripCaption, { color: titleText }]} numberOfLines={2}>
                                {caption}
                              </Text>
                              <TouchableOpacity
                                style={[
                                  styles.activityImageStripRemoveBtn,
                                  { backgroundColor: isDark ? "rgba(15,23,42,0.78)" : "rgba(255,255,255,0.92)" },
                                ]}
                                onPress={() => handleDeleteImage(image.id)}
                                disabled={deletingImageId === image.id}
                              >
                                {deletingImageId === image.id ? (
                                  <ActivityIndicator size="small" color={accent} />
                                ) : (
                                  <Text style={[styles.activityImageStripRemoveText, { color: accent }]}>
                                    {t("common.delete")}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                        {pendingImageAssets.map((asset, idx) => (
                          <View
                            key={`pending-${idx}-${asset.uri}`}
                            style={[
                              styles.activityImageStripCard,
                              {
                                backgroundColor: innerBg,
                                borderColor: accent,
                                borderStyle: "dashed",
                              },
                            ]}
                          >
                            <View style={[styles.activityPendingBadge, { backgroundColor: `${accent}18` }]}>
                              <Text style={[styles.activityPendingBadgeText, { color: accent }]}>
                                {t("activity.pendingImageBadge")}
                              </Text>
                            </View>
                            <Image source={{ uri: asset.uri }} style={styles.activityImageStripPhoto} resizeMode="cover" />
                            <Text style={[styles.activityImageStripCaption, { color: mutedText }]} numberOfLines={2}>
                              {t("activity.pendingImageCaption")}
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.activityImageStripRemoveBtn,
                                { backgroundColor: isDark ? "rgba(15,23,42,0.78)" : "rgba(255,255,255,0.92)" },
                              ]}
                              onPress={() => removePendingImageAt(idx)}
                            >
                              <Text style={[styles.activityImageStripRemoveText, { color: accent }]}>
                                {t("activity.removePendingImage")}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                      {visibleServerImageCount + pendingImageAssets.length > 1 ? (
                        <>
                          <View style={[styles.activityImageStripHintChevron, styles.activityImageStripHintLeft]} pointerEvents="none">
                            <ArrowLeft01Icon size={18} color={mutedText} variant="stroke" strokeWidth={2} />
                          </View>
                          <View style={[styles.activityImageStripHintChevron, styles.activityImageStripHintRight]} pointerEvents="none">
                            <ArrowRight01Icon size={18} color={mutedText} variant="stroke" strokeWidth={2} />
                          </View>
                        </>
                      ) : null}
                    </View>
                    {visibleServerImageCount + pendingImageAssets.length > 1 ? (
                      <Text style={[styles.activityImageStripHintText, { color: mutedText }]} pointerEvents="none">
                        {t("customer.imageGallerySwipeHint")}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>

              <TouchableOpacity
  style={[
    styles.submitButtonWrap,
    { backgroundColor: shellBg, borderColor: shellBorder },
  ]}
  onPress={
    activeTab === "general"
      ? () => setActiveTab("details")
      : handleSubmit(onSubmit, onInvalidSubmit)
  }
  disabled={isSubmitting}
  activeOpacity={0.86}
>
  <LinearGradient
    colors={[accent, accentSecondary]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.submitButton}
  >
    {isSubmitting ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <Text style={styles.submitButtonText}>
        {activeTab === "general"
          ? t("common.continue", "Devam Et")
          : isEditMode
          ? t("common.update")
          : t("common.save")}
      </Text>
    )}
  </LinearGradient>
</TouchableOpacity>
            </View>
          )}
        />

        {Platform.OS === "android" &&
        (androidPickerStep === "start-date" || androidPickerStep === "start-time") ? (
          <DateTimePicker
            value={tempStartDate}
            mode={androidPickerStep === "start-date" ? "date" : "time"}
            display="default"
            onChange={handleStartDateChange}
            locale={getSystemDatePickerLocale()}
          />
        ) : null}

        {Platform.OS === "android" &&
        (androidPickerStep === "end-date" || androidPickerStep === "end-time") ? (
          <DateTimePicker
            value={tempEndDate}
            mode={androidPickerStep === "end-date" ? "date" : "time"}
            display="default"
            onChange={handleEndDateChange}
            locale={getSystemDatePickerLocale()}
          />
        ) : null}
      </View>

      <Modal
        visible={typeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setTypeModalOpen(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: shellBgAlt,
                borderColor: shellBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
            <View
  style={[
    styles.handle,
    {
      backgroundColor: isDark ? "rgba(255,255,255,0.24)" : "rgba(15,23,42,0.10)",
    },
  ]}
/>
              <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.selectType")}</Text>
            </View>
            {typesLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={accent} />
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
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setStatusModalOpen(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: shellBgAlt,
                borderColor: shellBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
            <View
  style={[
    styles.handle,
    { backgroundColor: isDark ? "#a1a1aa" : "rgba(15,23,42,0.18)" },
  ]}
/>
              <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.selectStatus")}</Text>
            </View>
            <FlatList
              data={statusOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) =>
                renderPickerItem({ item, onSelect: handleStatusSelect, selectedValue: watchStatus })
              }
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
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setPriorityModalOpen(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: shellBgAlt,
                borderColor: shellBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
              <View style={[styles.handle, { backgroundColor: innerBorder }]} />
              <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.selectPriority")}</Text>
            </View>
            <FlatList
              data={priorityOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) =>
                renderPickerItem({ item, onSelect: handlePrioritySelect, selectedValue: watchPriority })
              }
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={paymentTypeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentTypeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setPaymentTypeModalOpen(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: shellBgAlt,
                borderColor: shellBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
              <View style={[styles.handle, { backgroundColor: innerBorder }]} />
              <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.paymentType")}</Text>
            </View>
            <FlatList
              data={paymentTypes}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) =>
                renderPickerItem({
                  item: { value: String(item.id), label: item.name },
                  onSelect: () => handlePaymentTypeSelect(item),
                  selectedValue: watchPaymentTypeId ? String(watchPaymentTypeId) : undefined,
                })
              }
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={meetingTypeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMeetingTypeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setMeetingTypeModalOpen(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: shellBgAlt,
                borderColor: shellBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
              <View style={[styles.handle, { backgroundColor: innerBorder }]} />
              <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.activityMeetingType")}</Text>
            </View>
            <FlatList
              data={meetingTypes}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) =>
                renderPickerItem({
                  item: { value: String(item.id), label: item.name },
                  onSelect: () => handleMeetingTypeSelect(item),
                  selectedValue: watchMeetingTypeId ? String(watchMeetingTypeId) : undefined,
                })
              }
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={topicPurposeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTopicPurposeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setTopicPurposeModalOpen(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: shellBgAlt,
                borderColor: shellBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
              <View style={[styles.handle, { backgroundColor: innerBorder }]} />
              <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.activityTopicPurpose")}</Text>
            </View>
            <FlatList
              data={topicPurposes}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) =>
                renderPickerItem({
                  item: { value: String(item.id), label: item.name },
                  onSelect: () => handleTopicPurposeSelect(item),
                  selectedValue: watchTopicPurposeId ? String(watchTopicPurposeId) : undefined,
                })
              }
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={shippingModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setShippingModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShippingModalOpen(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: shellBgAlt,
                borderColor: shellBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
              <View style={[styles.handle, { backgroundColor: innerBorder }]} />
              <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.activityShipping")}</Text>
            </View>
            <FlatList
              data={shippings}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) =>
                renderPickerItem({
                  item: { value: String(item.id), label: item.name },
                  onSelect: () => handleShippingSelect(item),
                  selectedValue: watchShippingId ? String(watchShippingId) : undefined,
                })
              }
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {Platform.OS === "ios" ? (
        <>
          <Modal
            visible={startDateModalOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setStartDateModalOpen(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={styles.modalBackdrop} onPress={() => setStartDateModalOpen(false)} />
              <View
                style={[
                  styles.dateModalContent,
                  {
                    backgroundColor: shellBgAlt,
                    borderColor: shellBorder,
                    paddingBottom: insets.bottom + 16,
                  },
                ]}
              >
                <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
                  <View style={[styles.handle, { backgroundColor: innerBorder }]} />
                  <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.activityDate")}</Text>
                </View>
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={tempStartDate}
                    mode="datetime"
                    display="spinner"
                    onChange={handleStartDateChange}
                    textColor={titleText}
                    locale={getSystemDatePickerLocale()}
                  />
                </View>
                <View style={styles.dateModalActions}>
                  <TouchableOpacity
                    style={[
                      styles.dateModalButton,
                      { borderColor: innerBorder, backgroundColor: innerBg },
                    ]}
                    onPress={() => setStartDateModalOpen(false)}
                  >
                    <Text style={[styles.dateModalButtonText, { color: mutedText }]}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateModalButton, styles.dateModalButtonPrimary]}
                    onPress={handleConfirmStartDate}
                  >
                    <LinearGradient
                      colors={[accent, accentSecondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.dateModalButtonGradient}
                    >
                      <Text style={[styles.dateModalButtonText, { color: "#FFFFFF" }]}>
                        {t("common.confirm")}
                      </Text>
                    </LinearGradient>
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
              <TouchableOpacity style={styles.modalBackdrop} onPress={() => setEndDateModalOpen(false)} />
              <View
                style={[
                  styles.dateModalContent,
                  {
                    backgroundColor: shellBgAlt,
                    borderColor: shellBorder,
                    paddingBottom: insets.bottom + 16,
                  },
                ]}
              >
                <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
                  <View style={[styles.handle, { backgroundColor: innerBorder }]} />
                  <Text style={[styles.modalTitle, { color: titleText }]}>{t("activity.endDate")}</Text>
                </View>
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={tempEndDate}
                    mode="datetime"
                    display="spinner"
                    onChange={handleEndDateChange}
                    textColor={titleText}
                    locale={getSystemDatePickerLocale()}
                  />
                </View>
                <View style={styles.dateModalActions}>
                  <TouchableOpacity
                    style={[
                      styles.dateModalButton,
                      { borderColor: innerBorder, backgroundColor: innerBg },
                    ]}
                    onPress={() => setEndDateModalOpen(false)}
                  >
                    <Text style={[styles.dateModalButtonText, { color: mutedText }]}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateModalButton, styles.dateModalButtonPrimary]}
                    onPress={handleConfirmEndDate}
                  >
                    <LinearGradient
                      colors={[accent, accentSecondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.dateModalButtonGradient}
                    >
                      <Text style={[styles.dateModalButtonText, { color: "#FFFFFF" }]}>
                        {t("common.confirm")}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : null}

      <Modal
        visible={previewPickedAssets != null && previewPickedAssets.length > 0}
        transparent
        animationType="fade"
        onRequestClose={handleCancelImagePreview}
      >
        <View style={styles.activityPickPreviewOverlay}>
          <View
            style={[
              styles.activityPickPreviewCard,
              {
                backgroundColor: activityImagePreviewTheme.cardBg,
                borderColor: activityImagePreviewTheme.borderColor,
              },
            ]}
          >
            <Text style={[styles.activityPickPreviewTitle, { color: activityImagePreviewTheme.title }]}>
              {t("activity.imagePreviewTitle")}
            </Text>
            <Text style={[styles.activityPickPreviewSubtitle, { color: activityImagePreviewTheme.text }]}>
              {t("activity.confirmAddImages")}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.activityPickPreviewScroll}
              contentContainerStyle={styles.activityPickPreviewScrollContent}
            >
              {(previewPickedAssets ?? []).map((asset, idx) => (
                <Image
                  key={`pv-${idx}-${asset.uri}`}
                  source={{ uri: asset.uri }}
                  style={styles.activityPickPreviewThumb}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            <View style={styles.activityPickPreviewActions}>
              <TouchableOpacity
                style={[
                  styles.activityPickPreviewButton,
                  { backgroundColor: activityImagePreviewTheme.cancelBg },
                ]}
                onPress={handleCancelImagePreview}
                disabled={isSubmitting}
              >
                <Text style={[styles.activityPickPreviewButtonText, { color: activityImagePreviewTheme.cancelText }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.activityPickPreviewButton,
                  {
                    backgroundColor: activityImagePreviewTheme.confirmBg,
                    borderColor: activityImagePreviewTheme.confirmBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={handleConfirmImagePreview}
                disabled={isSubmitting}
              >
                <Text style={[styles.activityPickPreviewButtonText, { color: activityImagePreviewTheme.confirmText }]}>
                  {t("activity.addToPendingList")}
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
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  screenStack: {
    gap: 12,
  },
  tabBarCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 6,
    gap: 10,
  },
  tabPill: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tabPillActive: {
    borderWidth: 1.8,
    paddingHorizontal: 12,
  },
  tabPillInactive: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
  },
  loadingCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  formSection: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  formSectionCompact: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  fieldContainer: {
    marginBottom: 14,
  },
  fieldContainerLast: {
    marginBottom: 0,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldBlockLast: {
    marginBottom: 0,
  },

  label: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 6,
  },
  labelCompact: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 6,
  },

  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 8,
  },
  pickerFieldCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    minHeight: 46,
    gap: 8,
  },
  

  fieldLeftWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  fieldIconWrapCompact: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  pickerFieldText: {
    fontSize: 11.5,
    fontWeight: "500",
    flex: 1,
    lineHeight: 15,
  },
  pickerFieldTextCompact: {
    fontSize: 11.5,
    fontWeight: "500",
    flex: 1,
    lineHeight: 15,
  },

  errorText: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 14,
  },

  dateGrid: {
    gap: 12,
    marginBottom: 2,
  },
  dateCell: {
    flex: 1,
  },

  twoColumnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  twoColumnRowLast: {
    flexDirection: "row",
    gap: 10,
  },
  twoColumnItem: {
    flex: 1,
  },

  toggleRow: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 0,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  toggleLabel: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
  },
  toggleIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },

  reminderPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reminderChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reminderCheck: {
    width: 16,
    height: 16,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderChipText: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
  },

  secondaryActionButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  secondaryActionButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },

  imageLoadingIndicator: {
    marginTop: 16,
  },
  activityPendingImagesHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  emptyHelperText: {
    marginTop: 14,
    fontSize: 13,
  },
  activityImageStripOuter: {
    width: "100%",
    marginTop: 14,
  },
  activityImageStripScrollWrap: {
    position: "relative",
    width: "100%",
  },
  activityImageScrollContent: {
    gap: 12,
    paddingRight: 6,
    paddingVertical: 4,
  },
  activityImageStripCard: {
    width: 176,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  activityImageStripPhoto: {
    width: "100%",
    height: 128,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  activityImageStripCaption: {
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: "500",
  },
  activityImageStripRemoveBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  activityImageStripRemoveText: {
    fontSize: 11,
    fontWeight: "700",
  },
  activityPendingBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    zIndex: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activityPendingBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  activityImageStripHintChevron: {
    position: "absolute",
    top: 52,
    zIndex: 2,
    opacity: 0.85,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    borderRadius: 999,
    padding: 5,
  },
  activityImageStripHintLeft: {
    left: 2,
  },
  activityImageStripHintRight: {
    right: 2,
  },
  activityImageStripHintText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 15,
    paddingHorizontal: 8,
  },
  activityPickPreviewOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  activityPickPreviewCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  activityPickPreviewTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  activityPickPreviewSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 12,
  },
  activityPickPreviewScroll: {
    maxHeight: 200,
    marginBottom: 14,
  },
  activityPickPreviewScrollContent: {
    gap: 10,
    alignItems: "center",
  },
  activityPickPreviewThumb: {
    width: 120,
    height: 168,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  activityPickPreviewActions: {
    flexDirection: "row",
    gap: 12,
  },
  activityPickPreviewButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activityPickPreviewButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },

  submitButtonWrap: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 6,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalContent: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "62%",
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 18,
  },
  modalLoadingContainer: {
    padding: 36,
    alignItems: "center",
  },
  list: {
    flexGrow: 0,
  },
  pickerItem: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 16,
  },
  checkIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  dateModalContent: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  datePickerContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  dateModalActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
  },
  dateModalButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  dateModalButtonPrimary: {
    borderWidth: 0,
    padding: 0,
  },
  dateModalButtonGradient: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dateModalButtonText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
});
