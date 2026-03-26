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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAuthStore } from "../../../store/auth";
import { useActivity, useActivityLookups, useActivityTypes, useCreateActivity, useUpdateActivity } from "../hooks";
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
  type ActivityLookupDto,
  type ActivityDto,
  type ActivityImageDto,
} from "../types";
import type { CustomerDto } from "../../customer/types";
import type { ContactDto } from "../../contact/types";
import { activityImageApi } from "../api";
import { getApiBaseUrl } from "../../../constants/config";
import {
  Calendar03Icon,
  Clock01Icon,
  TaskDaily01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  ArrowDown01Icon,
  Tick02Icon,
  Notification03Icon,
} from "hugeicons-react-native";

interface PickerOption {
  value: string;
  label: string;
}

type AndroidPickerStep = "start-date" | "start-time" | "end-date" | "end-time" | null;

export function ActivityFormScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
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

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (isDark
    ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
    : ["rgba(255, 235, 240, 0.65)", "#FFFFFF", "rgba(255, 240, 225, 0.7)"]) as [
    string,
    string,
    ...string[]
  ];

  const shellBg = isDark ? "rgba(19,11,27,0.74)" : "rgba(255,245,248,0.88)";
  const shellBgAlt = isDark ? "rgba(18,8,25,0.80)" : "rgba(255,250,252,0.92)";
  const shellBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(219,39,119,0.08)";
  const innerBg = isDark ? "rgba(255,255,255,0.028)" : "rgba(255,255,255,0.86)";
  const innerBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const titleText = isDark ? "#FFFFFF" : "#1F2937";
  const mutedText = isDark ? "rgba(255,255,255,0.58)" : "#6B7280";
  const softText = isDark ? "rgba(255,255,255,0.42)" : "#94A3B8";
  const accent = isDark ? "#EC4899" : "#DB2777";
  const accentSecondary = isDark ? "#F97316" : "#F59E0B";

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

  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>();
  const [selectedContact, setSelectedContact] = useState<ContactDto | undefined>();
  const [activityImages, setActivityImages] = useState<ActivityImageDto[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

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

    const formattedDate = Number.isNaN(subjectDate.getTime())
      ? new Date().toLocaleDateString("tr-TR")
      : subjectDate.toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

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
    (field: "paymentTypeId" | "activityMeetingTypeId" | "activityTopicPurposeId" | "activityShippingId", close: () => void) =>
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
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const uploadPickedAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      if (!activityId) {
        Alert.alert(t("common.warning"), t("activity.imageSaveFirst"));
        return;
      }

      if (!assets.length) return;

      setImagesUploading(true);
      try {
        const uploaded = await activityImageApi.upload(
          activityId,
          assets.map((asset) => ({
            uri: asset.uri,
            description: t("activity.imageDefaultDescription"),
          }))
        );

        setActivityImages((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const next = [...prev];
          uploaded.forEach((item) => {
            if (!existingIds.has(item.id)) {
              next.push(item);
            }
          });
          return next;
        });

        Alert.alert("", t("activity.imageUploadSuccess"));
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : t("activity.imageUploadError");
        Alert.alert(t("common.error"), message);
      } finally {
        setImagesUploading(false);
      }
    },
    [activityId, t]
  );

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

    await uploadPickedAssets(result.assets);
  }, [t, uploadPickedAssets]);

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

    await uploadPickedAssets(result.assets);
  }, [t, uploadPickedAssets]);

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
          Alert.alert("", t("activity.updateSuccess"));
        } else {
          await createActivity.mutateAsync(payload);
          Alert.alert("", t("activity.createSuccess"));
        }

        router.back();
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
    ]
  );

  const onInvalidSubmit = useCallback(() => {
    Alert.alert(
      t("common.warning"),
      t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun")
    );
  }, [t]);

  const handleDeleteImage = useCallback(
    async (imageId: number) => {
      setDeletingImageId(imageId);
      try {
        await activityImageApi.delete(imageId);
        setActivityImages((prev) => prev.filter((item) => item.id !== imageId));
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : t("activity.imageDeleteError");
        Alert.alert(t("common.error"), message);
      } finally {
        setDeletingImageId(null);
      }
    },
    [t]
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

  if (isEditMode && activityLoading) {
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
          <ScreenHeader title={t("activity.edit")} showBackButton />
          <View style={styles.content}>
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingCard, { backgroundColor: shellBgAlt, borderColor: shellBorder }]}>
                <ActivityIndicator size="large" color={accent} />
              </View>
            </View>
          </View>
        </View>
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
              <View style={[styles.formSection, { backgroundColor: shellBg, borderColor: shellBorder }]}>
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

                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: mutedText }]}>
                    {t("activity.activityType")} <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerField,
                      {
                        backgroundColor: innerBg,
                        borderColor: errors.activityType ? colors.error : innerBorder,
                      },
                    ]}
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
                          borderColor: errors.startDateTime ? colors.error : innerBorder,
                          opacity: isStartDateLocked ? 0.55 : 1,
                        },
                      ]}
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
                          borderColor: errors.endDateTime ? colors.error : innerBorder,
                        },
                      ]}
                      onPress={handleOpenEndDateModal}
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
                      borderColor: innerBorder,
                      backgroundColor: innerBg,
                    },
                  ]}
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

                <View style={styles.dateGrid}>
                  <View style={styles.dateCell}>
                    <Text style={[styles.label, { color: mutedText }]}>{t("activity.paymentType")}</Text>
                    <TouchableOpacity
                      style={[styles.pickerField, { backgroundColor: innerBg, borderColor: innerBorder }]}
                      onPress={() => setPaymentTypeModalOpen(true)}
                    >
                      <View style={styles.fieldLeftWrap}>
                        <Text style={[styles.pickerFieldText, { color: watchPaymentTypeId ? titleText : mutedText }]} numberOfLines={1}>
                          {selectedPaymentTypeLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={15} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateCell}>
                    <Text style={[styles.label, { color: mutedText }]}>{t("activity.activityMeetingType")}</Text>
                    <TouchableOpacity
                      style={[styles.pickerField, { backgroundColor: innerBg, borderColor: innerBorder }]}
                      onPress={() => setMeetingTypeModalOpen(true)}
                    >
                      <View style={styles.fieldLeftWrap}>
                        <Text style={[styles.pickerFieldText, { color: watchMeetingTypeId ? titleText : mutedText }]} numberOfLines={1}>
                          {selectedMeetingTypeLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={15} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.dateGrid}>
                  <View style={styles.dateCell}>
                    <Text style={[styles.label, { color: mutedText }]}>{t("activity.activityTopicPurpose")}</Text>
                    <TouchableOpacity
                      style={[styles.pickerField, { backgroundColor: innerBg, borderColor: innerBorder }]}
                      onPress={() => setTopicPurposeModalOpen(true)}
                    >
                      <View style={styles.fieldLeftWrap}>
                        <Text style={[styles.pickerFieldText, { color: watchTopicPurposeId ? titleText : mutedText }]} numberOfLines={1}>
                          {selectedTopicPurposeLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={15} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateCell}>
                    <Text style={[styles.label, { color: mutedText }]}>{t("activity.activityShipping")}</Text>
                    <TouchableOpacity
                      style={[styles.pickerField, { backgroundColor: innerBg, borderColor: innerBorder }]}
                      onPress={() => setShippingModalOpen(true)}
                    >
                      <View style={styles.fieldLeftWrap}>
                        <Text style={[styles.pickerFieldText, { color: watchShippingId ? titleText : mutedText }]} numberOfLines={1}>
                          {selectedShippingLabel}
                        </Text>
                      </View>
                      <ArrowDown01Icon size={15} color={softText} variant="stroke" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <CustomerPicker
                    label={t("activity.customer")}
                    value={watchCustomerId ?? undefined}
                    customerName={selectedCustomer?.name}
                    onChange={handleCustomerChange}
                    disabled={isQuickActivityMode}
                  />
                </View>

                <View style={styles.fieldBlockLast}>
                  <ContactPicker
                    label={t("activity.contact")}
                    value={watch("contactId") ?? undefined}
                    contactName={selectedContact?.fullName}
                    customerId={watchCustomerId ?? undefined}
                    onChange={handleContactChange}
                  />
                </View>
              </View>

              <View style={[styles.formSection, { backgroundColor: shellBg, borderColor: shellBorder }]}>
                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: mutedText }]}>
                    {t("activity.status")} <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerField,
                      {
                        backgroundColor: innerBg,
                        borderColor: errors.status ? colors.error : innerBorder,
                      },
                    ]}
                    onPress={() => setStatusModalOpen(true)}
                  >
                    <View style={styles.fieldLeftWrap}>
                      <View
                        style={[
                          styles.fieldIconWrap,
                          {
                            backgroundColor: selectedStatusMeta.bg,
                            borderColor: `${selectedStatusMeta.color}22`,
                          },
                        ]}
                      >
                        <selectedStatusMeta.Icon size={13} color={selectedStatusMeta.color} variant="stroke" />
                      </View>
                      <Text
                        style={[
                          styles.pickerFieldText,
                          { color: watchStatus ? titleText : mutedText },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedStatusLabel}
                      </Text>
                    </View>
                    <ArrowDown01Icon size={15} color={softText} variant="stroke" />
                  </TouchableOpacity>
                  {errors.status ? (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.status.message}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.fieldContainerLast}>
                  <Text style={[styles.label, { color: mutedText }]}>{t("activity.priority")}</Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerField,
                      {
                        backgroundColor: innerBg,
                        borderColor: innerBorder,
                      },
                    ]}
                    onPress={() => setPriorityModalOpen(true)}
                  >
                    <View style={styles.fieldLeftWrap}>
                      <View
                        style={[
                          styles.fieldIconWrap,
                          {
                            backgroundColor: selectedPriorityMeta.bg,
                            borderColor: `${selectedPriorityMeta.color}22`,
                          },
                        ]}
                      >
                        <Alert02Icon size={13} color={selectedPriorityMeta.color} variant="stroke" />
                      </View>
                      <Text
                        style={[
                          styles.pickerFieldText,
                          { color: watchPriority ? titleText : mutedText },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedPriorityLabel}
                      </Text>
                    </View>
                    <ArrowDown01Icon size={15} color={softText} variant="stroke" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.formSection, { backgroundColor: shellBg, borderColor: shellBorder }]}>
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

              <View style={[styles.formSection, { backgroundColor: shellBg, borderColor: shellBorder }]}>
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

              <View style={[styles.formSection, { backgroundColor: shellBg, borderColor: shellBorder }]}>
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionHeaderIcon,
                      { backgroundColor: `${accent}10`, borderColor: `${accent}18` },
                    ]}
                  >
                    <TaskDaily01Icon size={14} color={accent} variant="stroke" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>{t("activity.images")}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.secondaryActionButton,
                    {
                      borderColor: innerBorder,
                      backgroundColor: innerBg,
                      opacity: !activityId || imagesUploading ? 0.7 : 1,
                    },
                  ]}
                  onPress={handlePickAndUploadImages}
                  disabled={!activityId || imagesUploading}
                  activeOpacity={0.82}
                >
                  {imagesUploading ? (
                    <ActivityIndicator size="small" color={accent} />
                  ) : (
                    <Text style={[styles.secondaryActionButtonText, { color: titleText }]}>
                      {activityId ? t("activity.addImage") : t("activity.imageSaveFirst")}
                    </Text>
                  )}
                </TouchableOpacity>

                {imagesLoading ? (
                  <ActivityIndicator size="small" color={accent} style={styles.imageLoadingIndicator} />
                ) : activityImages.length === 0 ? (
                  <Text style={[styles.emptyHelperText, { color: mutedText }]}>{t("activity.noImages")}</Text>
                ) : (
                  <View style={styles.imageGrid}>
                    {activityImages.map((image) => {
                      const imageUri = toAbsoluteImageUrl(image.imageUrl);
                      if (!imageUri) return null;

                      return (
                        <View
                          key={image.id}
                          style={[
                            styles.imageCard,
                            { backgroundColor: innerBg, borderColor: innerBorder },
                          ]}
                        >
                          <Image source={{ uri: imageUri }} style={styles.activityImage} resizeMode="cover" />
                          <TouchableOpacity
                            style={[
                              styles.deleteImageButton,
                              { backgroundColor: isDark ? "rgba(15,23,42,0.78)" : "rgba(255,255,255,0.92)" },
                            ]}
                            onPress={() => handleDeleteImage(image.id)}
                            disabled={deletingImageId === image.id}
                          >
                            {deletingImageId === image.id ? (
                              <ActivityIndicator size="small" color={accent} />
                            ) : (
                              <Text style={[styles.deleteImageButtonText, { color: accent }]}>Sil</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButtonWrap,
                  { backgroundColor: shellBg, borderColor: shellBorder },
                ]}
                onPress={handleSubmit(onSubmit, onInvalidSubmit)}
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
                      {isEditMode ? t("common.update") : t("common.save")}
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
            locale="tr-TR"
          />
        ) : null}

        {Platform.OS === "android" &&
        (androidPickerStep === "end-date" || androidPickerStep === "end-time") ? (
          <DateTimePicker
            value={tempEndDate}
            mode={androidPickerStep === "end-date" ? "date" : "time"}
            display="default"
            onChange={handleEndDateChange}
            locale="tr-TR"
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
              <View style={[styles.handle, { backgroundColor: innerBorder }]} />
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
              <View style={[styles.handle, { backgroundColor: innerBorder }]} />
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
          <View style={[styles.modalContent, { backgroundColor: shellBgAlt, borderColor: shellBorder, paddingBottom: insets.bottom + 16 }]}>
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
          <View style={[styles.modalContent, { backgroundColor: shellBgAlt, borderColor: shellBorder, paddingBottom: insets.bottom + 16 }]}>
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
          <View style={[styles.modalContent, { backgroundColor: shellBgAlt, borderColor: shellBorder, paddingBottom: insets.bottom + 16 }]}>
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
          <View style={[styles.modalContent, { backgroundColor: shellBgAlt, borderColor: shellBorder, paddingBottom: insets.bottom + 16 }]}>
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
                    locale="tr-TR"
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
                    locale="tr-TR"
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
    gap: 14,
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
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  fieldContainer: {
    marginBottom: 18,
  },
  fieldContainerLast: {
    marginBottom: 0,
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldBlockLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: "400",
    marginBottom: 8,
  },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    minHeight: 54,
    gap: 8,
  },
  fieldLeftWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  fieldIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  pickerFieldText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 14,
  },
  dateGrid: {
    gap: 16,
    marginBottom: 4,
  },
  dateCell: {
    flex: 1,
  },
  toggleRow: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 18,
    paddingHorizontal: 14,
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
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontWeight: "500",
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
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  imageLoadingIndicator: {
    marginTop: 16,
  },
  emptyHelperText: {
    marginTop: 14,
    fontSize: 13,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  imageCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  activityImage: {
    width: "100%",
    height: "100%",
  },
  deleteImageButton: {
    position: "absolute",
    right: 10,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deleteImageButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  submitButtonWrap: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 6,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 18,
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
