import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { createClientId } from "@/lib/create-client-id";
import { getValidRelatedProductGroup } from "@/lib/relatedProductGroup";
import { resolveDocumentSerialCustomerTypeId } from "@/lib/resolve-document-serial-customer-type-id";
import {
  resolveExchangeRateByCurrency as findExchangeRateByCurrency,
  buildEffectiveExchangeRates,
} from "@/lib/resolve-exchange-rate";
import { flattenDocumentLinesForBulk } from "@/lib/flattenDocumentLinesForBulk";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  UserIcon,
  ArrowRight01Icon,
  MoneyExchange01Icon,
  Note01Icon,
  Edit02Icon,
  Delete02Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Clock04Icon,
  FileEditIcon,
  Tick02Icon,
  SentIcon,
  Pdf01Icon,
  FloppyDiskIcon,
} from "hugeicons-react-native";
import { listContentBottomPadding, stickyActionBarBottomPadding } from "../../../constants/layout";
import { ScreenHeader } from "../../../components/navigation";
import { CustomerCancellationReasonModal } from "../../../components/CustomerCancellationReasonModal";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { PermissionDeniedState } from "../../access-control/components/PermissionDeniedState";
import { isForbiddenError } from "../../access-control/utils/isForbiddenError";
import { useAuthStore } from "../../../store/auth";
import { useToastStore } from "../../../store/toast";
import { FormField } from "../../activity/components";
import { useCustomer, useCustomerScopeAccess } from "../../customer/hooks";
import { useCustomerShippingAddresses } from "../../shipping-address/hooks";
import { stockApi } from "../../stocks/api";
import { quotationApi } from "../api";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida/hooks/useWindoDefinitionOptions";
import {
  useQuotationDetail,
  useStartApprovalFlow,
  useWaitingApprovals,
  useApproveAction,
  useRejectAction,
  useExchangeRate,
  useCurrencyOptions,
  usePaymentTypes,
  useRelatedUsers,
  useDocumentSerialTypeList,
  useSalesTypeList,
  usePriceRuleOfQuotation,
  useUserDiscountLimitsBySalesperson,
  useUpdateExchangeRateInQuotation,
  useDeleteQuotationLine,
  useCreateQuotationLines,
  useUpdateQuotationLines,
  useQuotationNotes,
  useUpdateQuotationNotes,
  useUpdateQuotationBulk,
  useCancelQuotationByCustomer,
} from "../hooks";
import {
  ExchangeRateDialog,
  PickerModal,
  DocumentSerialTypePicker,
  OfferTypePicker,
  QuotationLineForm,
  QuotationApprovalFlowTab,
  QuotationReportTab,
  QuotationPreviewPdfDialog,
  RejectModal,
  QuotationNotesModal,
  notesFromDto,
  notesToPutPayload,
  notesToDto,
  validateNotesMaxLength,
} from "../components";

function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}
import { CustomerSelectDialog, type CustomerSelectionResult } from "../../customer";
import type { CustomerDto } from "../../customer/types";
import { createQuotationSchema, type CreateQuotationSchema } from "../schemas";
import type {
  QuotationLineFormState,
  QuotationExchangeRateFormState,
  ExchangeRateDto,
  StockGetDto,
  ApprovalActionGetDto,
} from "../types";
import {
  APPROVAL_HAVENOT_STARTED,
  APPROVAL_WAITING,
  APPROVAL_APPROVED,
  APPROVAL_REJECTED,
  APPROVAL_CLOSED,
  APPROVAL_CUSTOMER_CANCELLED,
  PricingRuleType,
  normalizeOfferType,
} from "../types";
import type { StockRelationDto } from "../../stocks/types";
import {
  mapDetailHeaderToForm,
  mapDetailLinesToFormState,
  mapDetailRatesToFormState,
  mapExchangeRateFormStateToUpdateDtos,
  parseLineId,
  mapQuotationLineFormStateToCreateDto,
  mapQuotationLineFormStateToUpdateDto,
  totalsFromDetailLines,
} from "../utils";
import { calculateLineTotals, calculateTotals } from "../utils";
import { resolveLineListCurrencyLabel, resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
import { buildQuotationPreviewPdfInput } from "../utils/buildQuotationPreviewPdfInput";
import { resolveQuotationCustomerLabelForPdf } from "../utils/resolveQuotationCustomerLabelForPdf";
import { getApiBaseUrl } from "../../../constants/config";
import { useDocumentDetailDirtyState } from "../../../hooks/useDocumentDetailDirtyState";

function resolveMobileImageUri(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("file://")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${getApiBaseUrl()}${path}`;
  }
  return path;
}

async function finalizeCreatedQuotationLineImages(
  quotationId: number,
  draftLines: QuotationLineFormState[],
  createdLines: Awaited<ReturnType<typeof quotationApi.createQuotationLines>>
): Promise<void> {
  for (let index = 0; index < draftLines.length; index += 1) {
    const draftLine = draftLines[index];
    const createdLine = createdLines[index];

    if (!draftLine.pendingImageUri || !createdLine?.id) continue;

    const uploaded = await quotationApi.uploadReportAsset(draftLine.pendingImageUri, {
      assetScope: "quotation-line",
      quotationId,
      quotationLineId: createdLine.id,
      productCode: draftLine.productCode || createdLine.productCode || undefined,
    });

    await quotationApi.updateQuotationLines([
      {
        ...createdLine,
        productCode: createdLine.productCode ?? draftLine.productCode ?? "",
        productName: createdLine.productName ?? draftLine.productName ?? "",
        imagePath: uploaded.relativeUrl,
      },
    ]);
  }
}

function formatQtyTr(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  if (Math.abs(v - Math.round(v)) < 1e-6) return Math.round(v).toLocaleString("tr-TR");
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function formatMoneyTr(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatRateTr(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  if (Math.abs(v - Math.round(v)) < 1e-6) return Math.round(v).toLocaleString("tr-TR");
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

type StatusKind = "draft" | "pending" | "approved" | "rejected" | "cancelled";

function resolveStatusKind(status: number | null | undefined): StatusKind | null {
  if (status === APPROVAL_HAVENOT_STARTED) return "draft";
  if (status === APPROVAL_WAITING) return "pending";
  if (status === APPROVAL_APPROVED) return "approved";
  if (status === APPROVAL_REJECTED) return "rejected";
  if (status === APPROVAL_CUSTOMER_CANCELLED) return "cancelled";
  return null;
}

interface StatusBadgeProps {
  kind: StatusKind | null;
  isDark: boolean;
}

function StatusBadge({ kind, isDark }: StatusBadgeProps): React.ReactElement | null {
  if (kind == null) return null;

  const palette = (() => {
    switch (kind) {
      case "approved":
        return {
          bg: isDark ? "rgba(52,211,153,0.16)" : "rgba(16,185,129,0.12)",
          border: isDark ? "rgba(52,211,153,0.40)" : "rgba(16,185,129,0.32)",
          icon: <CheckmarkCircle02Icon size={18} color={isDark ? "#34d399" : "#059669"} variant="stroke" strokeWidth={2.2} />,
        };
      case "rejected":
        return {
          bg: isDark ? "rgba(244,114,182,0.16)" : "rgba(219,39,119,0.10)",
          border: isDark ? "rgba(244,114,182,0.40)" : "rgba(219,39,119,0.32)",
          icon: <Cancel01Icon size={16} color={isDark ? "#f472b6" : "#DB2777"} variant="stroke" strokeWidth={2.4} />,
        };
      case "cancelled":
        return {
          bg: isDark ? "rgba(244,114,182,0.16)" : "rgba(244,63,94,0.10)",
          border: isDark ? "rgba(244,114,182,0.40)" : "rgba(244,63,94,0.32)",
          icon: <Cancel01Icon size={16} color={isDark ? "#f472b6" : "#be123c"} variant="stroke" strokeWidth={2.4} />,
        };
      case "pending":
        return {
          bg: isDark ? "rgba(251,191,36,0.16)" : "rgba(245,158,11,0.12)",
          border: isDark ? "rgba(251,191,36,0.40)" : "rgba(245,158,11,0.34)",
          icon: <Clock04Icon size={18} color={isDark ? "#fbbf24" : "#D97706"} variant="stroke" strokeWidth={2.2} />,
        };
      default:
        return {
          bg: isDark ? "rgba(148,163,184,0.14)" : "rgba(148,163,184,0.16)",
          border: isDark ? "rgba(148,163,184,0.34)" : "rgba(148,163,184,0.34)",
          icon: <FileEditIcon size={16} color={isDark ? "#94A3B8" : "#475569"} variant="stroke" strokeWidth={2.2} />,
        };
    }
  })();

  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      {palette.icon}
    </View>
  );
}

export function QuotationDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const { user, branch } = useAuthStore();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiOptions } = useWindoDefinitionOptions();

  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (
    isDark
      ? ["rgba(236,72,153,0.12)", "transparent", "rgba(249,115,22,0.12)"]
      : ["rgba(255,235,240,0.6)", "#FFFFFF", "rgba(255,240,225,0.6)"]
  ) as [string, string, ...string[]];

  const shellBg = colors.card;
  const shellBgAlt = isDark ? "rgba(23,10,38,0.99)" : "rgba(255,255,255,0.98)";
  const sectionOutline = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)";
  const innerBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const innerBorder = isDark ? "rgba(255,255,255,0.10)" : colors.border;
  const titleText = colors.text;
  const mutedText = colors.textSecondary;
  const softText = colors.textMuted;
  const accent = colors.accent;
  const tabSurface = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)";
  const tabSurfaceBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";
  const tabActiveBg = isDark ? "rgba(236,72,153,0.22)" : "rgba(236,72,153,0.12)";

  const quotationId = id != null && id !== "" ? Number(id) : undefined;
  const isFocused = useIsFocused();
  const {
    header,
    lines: linesData,
    exchangeRates: ratesData,
    isLoading: detailLoading,
    isError: detailError,
    error: detailErrorObj,
    refetch,
  } = useQuotationDetail(isFocused ? quotationId : undefined);

  const { data: notesData } = useQuotationNotes(isFocused ? quotationId : undefined);
  const updateQuotationNotesMutation = useUpdateQuotationNotes();
  const updateQuotationBulk = useUpdateQuotationBulk();

  const formInitRef = useRef(false);
  const linesInitRef = useRef(false);
  const ratesInitRef = useRef(false);
  const notesInitRef = useRef(false);
  const erpRatesFilledRef = useRef(false);
  const activeQuotationIdRef = useRef<number | undefined>(quotationId);

  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);
  const [erpRatesForQuotation, setErpRatesForQuotation] = useState<ExchangeRateDto[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>();
  const [deliveryDateModalOpen, setDeliveryDateModalOpen] = useState(false);
  const [offerDateModalOpen, setOfferDateModalOpen] = useState(false);
  const [tempDeliveryDate, setTempDeliveryDate] = useState(new Date());
  const [tempOfferDate, setTempOfferDate] = useState(new Date());
  const [exchangeRateDialogVisible, setExchangeRateDialogVisible] = useState(false);
  const [paymentTypeModalVisible, setPaymentTypeModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [shippingAddressModalVisible, setShippingAddressModalVisible] = useState(false);
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [representativeModalVisible, setRepresentativeModalVisible] = useState(false);
  const [koliBaskiModalVisible, setKoliBaskiModalVisible] = useState(false);
  const [lineFormVisible, setLineFormVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<QuotationLineFormState | null>(null);
  const [pendingStockForRelated, setPendingStockForRelated] = useState<
    (StockGetDto & { parentRelations: StockRelationDto[] }) | null
  >(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [customerCancellationVisible, setCustomerCancellationVisible] = useState(false);
  const [selectedApprovalForReject, setSelectedApprovalForReject] = useState<ApprovalActionGetDto | null>(null);
  const [deleteLineDialogVisible, setDeleteLineDialogVisible] = useState(false);
  const [deleteLineId, setDeleteLineId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "approval" | "report">("detail");
  const [notes, setNotes] = useState<string[]>(Array(15).fill(""));
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [previewPdfVisible, setPreviewPdfVisible] = useState(false);

  const schema = useMemo(() => createQuotationSchema(), []);

  const {
    control,
    setValue,
    watch,
    reset,
    clearErrors,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateQuotationSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      quotation: {
        offerType: "YURTICI",
        currency: "",
        offerDate: new Date().toISOString().split("T")[0],
        deliveryDate: addDaysToDateOnly(new Date().toISOString().split("T")[0], 21),
        representativeId: user?.id ?? null,
        koliBaskiDefinitionId: null,
      },
    },
  });

  const watchedCurrency = watch("quotation.currency");
  const watchedCustomerId = watch("quotation.potentialCustomerId");
  const watchedErpCustomerCode = watch("quotation.erpCustomerCode");
  const watchedRepresentativeId = watch("quotation.representativeId");
  const watchedOfferDate = watch("quotation.offerDate");
  const watchedDeliveryDate = watch("quotation.deliveryDate");
  const watchedOfferNo = watch("quotation.offerNo");
  const watchedGeneralDiscountRate = watch("quotation.generalDiscountRate");
  const watchedGeneralDiscountAmount = watch("quotation.generalDiscountAmount");
  const formSnapshot = watch();

  useEffect(() => {
    if (activeQuotationIdRef.current === quotationId) return;

    activeQuotationIdRef.current = quotationId;
    formInitRef.current = false;
    linesInitRef.current = false;
    ratesInitRef.current = false;
    notesInitRef.current = false;
    erpRatesFilledRef.current = false;

    setLines([]);
    setExchangeRates([]);
    setErpRatesForQuotation([]);
    setSelectedCustomer(undefined);
    setEditingLine(null);
    setLineFormVisible(false);
    setActiveTab("detail");
    reset({
      quotation: {
        offerType: "YURTICI",
        currency: "",
        offerDate: new Date().toISOString().split("T")[0],
        deliveryDate: addDaysToDateOnly(new Date().toISOString().split("T")[0], 21),
        representativeId: user?.id ?? null,
      },
    });
  }, [quotationId, reset, user?.id]);
  const offerDateSyncInitializedRef = useRef(false);

  useEffect(() => {
    if (!watchedOfferDate) return;
    if (!offerDateSyncInitializedRef.current) {
      offerDateSyncInitializedRef.current = true;
      return;
    }
    const nextDeliveryDate = addDaysToDateOnly(watchedOfferDate, 21);
    if (watch("quotation.deliveryDate") !== nextDeliveryDate) {
      setValue("quotation.deliveryDate", nextDeliveryDate, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [watchedOfferDate, setValue, watch]);

  const { data: customer } = useCustomer(watchedCustomerId ?? undefined);
  const { data: isCustomerInRepresentativeScope } = useCustomerScopeAccess(
    watchedCustomerId ?? undefined,
    watchedRepresentativeId ?? undefined
  );
  const { data: shippingAddresses } = useCustomerShippingAddresses(watchedCustomerId ?? undefined);
  const exchangeRateParams = useMemo(
    () => ({ tarih: new Date().toISOString().split("T")[0], fiyatTipi: 1 as const }),
    []
  );
  const { data: exchangeRatesData, isLoading: isLoadingErpRates } = useExchangeRate(exchangeRateParams);
  const { data: currencyOptions } = useCurrencyOptions(exchangeRateParams);
  const { data: paymentTypes } = usePaymentTypes();
  const { data: documentSerialTypeList = [] } = useDocumentSerialTypeList();
  const { data: relatedUsers = [] } = useRelatedUsers(user?.id);
  const { data: salesTypeList = [] } = useSalesTypeList({
    offerType: header?.offerType ?? watch("quotation.offerType") ?? undefined,
  });

  const customerTypeId = useMemo(() => {
    return resolveDocumentSerialCustomerTypeId({
      erpCustomerCode: watchedErpCustomerCode,
      selectedCustomerId: watchedCustomerId,
      customerTypeId: customer?.customerTypeId,
    });
  }, [watchedErpCustomerCode, watchedCustomerId, customer?.customerTypeId]);

  const customerCode = useMemo(() => {
    if (customer?.customerCode) return customer.customerCode;
    if (watchedErpCustomerCode) return watchedErpCustomerCode;
    return undefined;
  }, [customer, watchedErpCustomerCode]);

  const builtInReportMetaFields = useMemo(() => {
    if (!header) return [];

    const raw = header as unknown as Record<string, unknown>;
    const representativeOption = relatedUsers.find((item) => item.userId === header.representativeId);
    const offerTypeLabel =
      header.offerType === "YURTDISI" ? "Yurt Dışı" : "Yurt İçi";
    const representativeName =
      header.representativeName ||
      `${representativeOption?.firstName ?? ""} ${representativeOption?.lastName ?? ""}`.trim();
    const paymentTypeName =
      header.paymentTypeName ||
      paymentTypes?.find((item) => item.id === header.paymentTypeId)?.name ||
      "";
    const documentSerialTypeName =
      header.documentSerialTypeName ||
      documentSerialTypeList.find((item) => item.id === header.documentSerialTypeId)?.name ||
      "";
    const salesTypeName =
      (raw.salesTypeDefinitionName as string | null | undefined) ||
      salesTypeList.find((item) => item.id === (raw.salesTypeDefinitionId as number | undefined))?.name ||
      "";

    return [
      { label: "ERP Müşteri Kodu", value: header.erpCustomerCode ?? null },
      { label: "Teklif Tipi", value: offerTypeLabel },
      { label: "Teklif Tarihi", value: header.offerDate ? header.offerDate.split("T")[0] : null },
      { label: "Teslim Tarihi", value: header.deliveryDate ? header.deliveryDate.split("T")[0] : null },
      { label: "Geçerlilik Tarihi", value: (raw.validUntil as string | null | undefined)?.split("T")[0] ?? null },
      { label: "Ödeme Tipi", value: paymentTypeName || null },
      { label: "Temsilci", value: representativeName || null },
      { label: "Sevk Adresi", value: header.shippingAddressText ?? null },
      { label: "Seri No", value: documentSerialTypeName || null },
      { label: "Teslim Şekli", value: salesTypeName || null },
      { label: "Proje Kodu", value: (raw.erpProjectCode as string | null | undefined) ?? null },
      { label: "Açıklama", value: header.description ?? null },
    ];
  }, [header, relatedUsers, paymentTypes, documentSerialTypeList, salesTypeList]);

  const reportHeaderRaw = header as unknown as Record<string, unknown> | undefined;
  const reportValidUntil = (reportHeaderRaw?.validUntil as string | null | undefined) ?? null;
  const reportSalesTypeName =
    (reportHeaderRaw?.salesTypeDefinitionName as string | null | undefined) ?? null;
  const reportProjectCode = (reportHeaderRaw?.erpProjectCode as string | null | undefined) ?? null;

  const effectiveRatesForLines = useMemo(() => {
    return erpRatesForQuotation.map((erp) => {
      const override = exchangeRates.find(
        (r) => r.currency === String(erp.dovizTipi) || r.dovizTipi === erp.dovizTipi
      );
      return {
        dovizTipi: erp.dovizTipi,
        kurDegeri: override?.exchangeRate ?? erp.kurDegeri,
      };
    });
  }, [erpRatesForQuotation, exchangeRates]);

  const { data: pricingRules } = usePriceRuleOfQuotation({
    customerCode,
    salesmenId: watchedRepresentativeId || undefined,
    quotationDate: watchedOfferDate || undefined,
  });

  const { data: userDiscountLimits } = useUserDiscountLimitsBySalesperson(
    watchedRepresentativeId || undefined
  );

  const apiTotals = useMemo(() => totalsFromDetailLines(linesData), [linesData]);
  const totals = useMemo(() => calculateTotals(lines), [lines]);
  const visibleMainLines = useMemo(
    () => lines.filter((line) => !line.relatedProductKey || line.isMainRelatedProduct === true),
    [lines]
  );
  const lineListCurrencyLabel = useMemo(
    () => resolveLineListCurrencyLabel(watchedCurrency, currencyOptions ?? null),
    [watchedCurrency, currencyOptions]
  );

  const isDetailHydrated = Boolean(
    header &&
    !detailLoading &&
    notesData !== undefined &&
    formInitRef.current &&
    linesInitRef.current &&
    ratesInitRef.current &&
    notesInitRef.current
  );

  const { hasUnsavedChanges, markSaved, syncBaseline } = useDocumentDetailDirtyState({
    resetKey: quotationId,
    isHydrated: isDetailHydrated,
    formSnapshot,
    lines,
    exchangeRates,
    notes,
  });

  const selectedCurrencyLabel = useMemo(() => {
    if (!watchedCurrency) return t("quotation.select");

    const normalizedCurrency = String(watchedCurrency).trim();
    const option = currencyOptions?.find(
      (c) =>
        String(c.code).trim() === normalizedCurrency ||
        String(c.dovizTipi).trim() === normalizedCurrency
    );

    return option?.dovizIsmi ?? normalizedCurrency;
  }, [currencyOptions, t, watchedCurrency]);

  const startApproval = useStartApprovalFlow();
  const cancelByCustomer = useCancelQuotationByCustomer();
  const { data: waitingApprovalsData } = useWaitingApprovals();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();
  const updateExchangeRateInQuotation = useUpdateExchangeRateInQuotation();
  const deleteQuotationLineMutation = useDeleteQuotationLine();
  const createQuotationLinesMutation = useCreateQuotationLines();
  const updateQuotationLinesMutation = useUpdateQuotationLines();

  useEffect(() => {
    if (exchangeRatesData?.length && !erpRatesFilledRef.current) {
      setErpRatesForQuotation(exchangeRatesData);
      erpRatesFilledRef.current = true;
    }
  }, [exchangeRatesData]);

  useEffect(() => {
    if (!header || formInitRef.current) return;
    reset({ quotation: mapDetailHeaderToForm(header) });
    formInitRef.current = true;
  }, [header, reset]);

  useEffect(() => {
    if (!watchedCurrency || !currencyOptions?.length) return;

    const normalizedCurrency = String(watchedCurrency).trim();
    const option = currencyOptions.find(
      (c) =>
        String(c.code).trim() === normalizedCurrency ||
        String(c.dovizTipi).trim() === normalizedCurrency
    );

    if (option && option.code !== watchedCurrency) {
      setValue("quotation.currency", option.code, { shouldDirty: false, shouldValidate: false });
    }
  }, [currencyOptions, setValue, watchedCurrency]);

  useEffect(() => {
    if (linesInitRef.current) return;
    if (header == null) return;
    setLines(linesData.length > 0 ? mapDetailLinesToFormState(linesData) : []);
    linesInitRef.current = true;
  }, [header, linesData]);

  useEffect(() => {
    if (!linesInitRef.current || header == null) return;
    setLines(linesData.length > 0 ? mapDetailLinesToFormState(linesData) : []);
  }, [linesData, header]);

  useEffect(() => {
    if (ratesInitRef.current) return;
    if (header == null || !currencyOptions?.length) return;
    const mapped =
      ratesData.length > 0 ? mapDetailRatesToFormState(ratesData, currencyOptions) : [];
    setExchangeRates(mapped);
    ratesInitRef.current = true;
  }, [header, ratesData, currencyOptions]);

  useEffect(() => {
    if (customer) setSelectedCustomer(customer);
  }, [customer]);

  useEffect(() => {
    if (!watchedCustomerId || isCustomerInRepresentativeScope !== false) return;

    setSelectedCustomer(undefined);
    setValue("quotation.potentialCustomerId", null);
    setValue("quotation.erpCustomerCode", null);
    setValue("quotation.shippingAddressId", null);
  }, [isCustomerInRepresentativeScope, setValue, watchedCustomerId]);

  useEffect(() => {
    if (deliveryDateModalOpen && watchedDeliveryDate) {
      setTempDeliveryDate(new Date(watchedDeliveryDate + "T12:00:00"));
    }
  }, [deliveryDateModalOpen, watchedDeliveryDate]);

  useEffect(() => {
    if (offerDateModalOpen && watchedOfferDate) {
      setTempOfferDate(new Date(watchedOfferDate + "T12:00:00"));
    }
  }, [offerDateModalOpen, watchedOfferDate]);

  useEffect(() => {
    if (lines.length > 0) clearErrors("root");
  }, [lines.length, clearErrors]);

  useEffect(() => {
    if (!notesData) return;
    setNotes(notesFromDto(notesData));
    notesInitRef.current = true;
  }, [notesData]);

  const applyCurrencyChange = useCallback(
    (newCurrency: string) => {
      const oldCurrency = watchedCurrency || "";
      if (!oldCurrency || oldCurrency === newCurrency) {
        setValue("quotation.currency", newCurrency);
        return;
      }

      const oldRate = findExchangeRateByCurrency(
        oldCurrency,
        exchangeRates,
        erpRatesForQuotation,
        currencyOptions
      );
      const newRate = findExchangeRateByCurrency(
        newCurrency,
        exchangeRates,
        erpRatesForQuotation,
        currencyOptions
      );

      if (oldRate == null || newRate == null || newRate <= 0) {
        setValue("quotation.currency", newCurrency);
        setLines((prev) => prev);
        return;
      }

      const conversionRatio = oldRate / newRate;
      setLines((prev) =>
        prev.map((line) => {
          const updated = {
            ...line,
            unitPrice: line.unitPrice * conversionRatio,
          };
          return calculateLineTotals(updated);
        })
      );
      setValue("quotation.currency", newCurrency);
    },
    [watchedCurrency, exchangeRates, erpRatesForQuotation, currencyOptions, setValue]
  );

  const handleCurrencySelect = useCallback(
    (newCurrency: string) => {
      if (lines.length === 0) {
        setValue("quotation.currency", newCurrency);
        setCurrencyModalVisible(false);
        return;
      }

      Alert.alert(
        t("quotation.currencyChangeTitle"),
        t("quotation.currencyChangeMessage"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
            onPress: () => setCurrencyModalVisible(false),
          },
          {
            text: t("common.confirm"),
            onPress: () => {
              applyCurrencyChange(newCurrency);
              setCurrencyModalVisible(false);
            },
          },
        ]
      );
    },
    [applyCurrencyChange, lines.length, setValue, t]
  );

  const handleSaveNotes = useCallback(
    (savedNotes: string[]) => {
      if (!quotationId) return;
      const payload = notesToPutPayload(savedNotes);
      updateQuotationNotesMutation.mutate(
        { quotationId, data: { notes: payload } },
        {
          onSuccess: () => {
            setNotes(savedNotes);
            setNotesModalVisible(false);
            queueMicrotask(() => syncBaseline());
          },
        }
      );
    },
    [quotationId, updateQuotationNotesMutation, syncBaseline]
  );

  const handleCustomerSelect = useCallback(
    (result: CustomerSelectionResult) => {
      setValue("quotation.potentialCustomerId", result.customerId);
      setValue("quotation.erpCustomerCode", result.erpCustomerCode ?? null);
      setValue("quotation.shippingAddressId", null);
      setSelectedCustomer({
        id: result.customerId,
        name: result.customerName,
        customerCode: result.erpCustomerCode,
      } as CustomerDto);
    },
    [setValue]
  );

  const handleDeliveryDateChange = useCallback(
    (_: DateTimePickerEvent, d?: Date) => {
      if (d) {
        setTempDeliveryDate(d);
        setValue("quotation.deliveryDate", d.toISOString().split("T")[0]);
      }
    },
    [setValue]
  );

  const handleOfferDateChange = useCallback(
    (_: DateTimePickerEvent, d?: Date) => {
      if (d) {
        setTempOfferDate(d);
        const nextOfferDate = d.toISOString().split("T")[0];
        setValue("quotation.offerDate", nextOfferDate);
        setValue("quotation.deliveryDate", addDaysToDateOnly(nextOfferDate, 21));
      }
    },
    [setValue]
  );

  const handleAddLine = useCallback(() => {
    if ((!watchedCustomerId && !watchedErpCustomerCode) || !watchedRepresentativeId || !watchedCurrency) {
      showToast("error", t("common.selectCustomerRepresentativeCurrency"));
      return;
    }
    setEditingLine(null);
    setLineFormVisible(true);
  }, [watchedCustomerId, watchedErpCustomerCode, watchedRepresentativeId, watchedCurrency, showToast, t]);

  const canAddLine = Boolean((watchedCustomerId || watchedErpCustomerCode) && watchedRepresentativeId && watchedCurrency);

  const handleEditLine = useCallback((line: QuotationLineFormState) => {
    setEditingLine(line);
    setLineFormVisible(true);
  }, []);

  const handleSaveLine = useCallback(
    (savedLine: QuotationLineFormState) => {
      if (editingLine) {
        const toUpdate = savedLine.relatedLines?.length
          ? [savedLine, ...savedLine.relatedLines]
          : [savedLine];
        const updateDtos =
          quotationId != null
            ? toUpdate
                .map((line) => mapQuotationLineFormStateToUpdateDto(line, quotationId))
                .filter((dto): dto is NonNullable<typeof dto> => dto != null)
            : [];
        const isExistingQuotation = quotationId != null && quotationId > 0 && updateDtos.length > 0;
        if (isExistingQuotation && quotationId != null) {
          updateQuotationLinesMutation.mutate(
            { quotationId, body: updateDtos },
            {
              onSuccess: async () => {
                const fetched = await quotationApi.getLinesByQuotation(quotationId);
                setLines(mapDetailLinesToFormState(fetched));
                setLineFormVisible(false);
                setEditingLine(null);
                queueMicrotask(() => syncBaseline());
              },
            }
          );
          return;
        }
        setLines((prev) => {
          const mainNewQty = savedLine.quantity;
          const mainOldQty = editingLine.quantity;
          const hasRelated = (savedLine.relatedLines?.length ?? 0) > 0;
          if (hasRelated && savedLine.relatedLines) {
            const others = prev.filter(
              (l) => l.id !== editingLine.id && l.relatedProductKey !== editingLine.relatedProductKey
            );
            return [savedLine, ...savedLine.relatedLines, ...others];
          }
          if (
            editingLine.relatedProductKey &&
            mainOldQty > 0 &&
            mainNewQty !== mainOldQty
          ) {
            const ratio = mainNewQty / mainOldQty;
            return prev.map((line) => {
              if (line.id === editingLine.id) return savedLine;
              if (line.relatedProductKey === editingLine.relatedProductKey) {
                const newQty = Math.max(0, Math.round(line.quantity * ratio * 10000) / 10000);
                const updated = { ...line, quantity: newQty };
                return calculateLineTotals(updated);
              }
              return line;
            });
          }
          return prev.map((line) => (line.id === editingLine.id ? savedLine : line));
        });
        setEditingLine(null);
        setLineFormVisible(false);
        return;
      }
      const isExistingQuotation = quotationId != null && quotationId > 0;
      const toAdd = savedLine.relatedLines?.length
        ? [savedLine, ...savedLine.relatedLines]
        : [savedLine];
      if (isExistingQuotation && quotationId != null) {
        const body = toAdd.map((line) => mapQuotationLineFormStateToCreateDto(line, quotationId));
        createQuotationLinesMutation.mutate(
          { quotationId, body },
          {
            onSuccess: async (data) => {
              await finalizeCreatedQuotationLineImages(quotationId, toAdd, data);
              const fetched = await quotationApi.getLinesByQuotation(quotationId);
              setLines(mapDetailLinesToFormState(fetched));
              setLineFormVisible(false);
              setEditingLine(null);
              queueMicrotask(() => syncBaseline());
            },
          }
        );
        return;
      }
      setLines((prev) => [...prev, ...toAdd]);
      setEditingLine(null);
      setLineFormVisible(false);
    },
    [editingLine, quotationId, createQuotationLinesMutation, updateQuotationLinesMutation, syncBaseline]
  );

  const handleDeleteLine = useCallback((lineId: string) => {
    setDeleteLineId(lineId);
    setDeleteLineDialogVisible(true);
  }, []);

  const handleDeleteLineCancel = useCallback(() => {
    if (!deleteQuotationLineMutation.isPending) {
      setDeleteLineDialogVisible(false);
      setDeleteLineId(null);
    }
  }, [deleteQuotationLineMutation.isPending]);

  const handleDeleteLineConfirm = useCallback(() => {
    if (deleteLineId == null) return;
    const lineId = deleteLineId;
    const backendLineId = quotationId != null ? parseLineId(lineId) : 0;
    const isExistingQuotation = quotationId != null && quotationId > 0 && backendLineId > 0;
    if (isExistingQuotation && quotationId != null) {
      deleteQuotationLineMutation.mutate(
        { quotationId, lineId: backendLineId },
        {
          onSuccess: () => {
            setDeleteLineDialogVisible(false);
            setDeleteLineId(null);
          },
        }
      );
      return;
    }
    setLines((prev) => {
      const toDelete = prev.find((line) => line.id === lineId);
      const relatedGroup = getValidRelatedProductGroup(prev, toDelete);
      if (relatedGroup.length > 0) {
        const relatedGroupIds = new Set(relatedGroup.map((line) => line.id));
        return prev.filter((line) => !relatedGroupIds.has(line.id));
      }
      if (toDelete?.relatedLines && toDelete.relatedLines.length > 0) {
        const relatedIds = toDelete.relatedLines.map((rl) => rl.id);
        return prev.filter((line) => line.id !== lineId && !relatedIds.includes(line.id));
      }
      return prev.filter((line) => line.id !== lineId);
    });
    setDeleteLineDialogVisible(false);
    setDeleteLineId(null);
  }, [deleteLineId, quotationId, deleteQuotationLineMutation]);

  const handleProductSelectWithRelatedStocks = useCallback(
    async (stock: StockGetDto, relatedStockIds?: number[]) => {
      if (!stock.id) return;

      const applyCurrencyToPrice = (listPrice: number, priceCurrency: string): number => {
        if (!watchedCurrency || priceCurrency === watchedCurrency) return listPrice;
        const oldRate = findExchangeRateByCurrency(
          priceCurrency,
          exchangeRates,
          erpRatesForQuotation,
          currencyOptions
        );
        const newRate = findExchangeRateByCurrency(
          watchedCurrency,
          exchangeRates,
          erpRatesForQuotation,
          currencyOptions
        );
        if (oldRate == null || oldRate <= 0 || newRate == null || newRate <= 0) return listPrice;
        return (listPrice * oldRate) / newRate;
      };

      const stockWithRelations = stock as StockGetDto & { parentRelations?: StockRelationDto[] };
      let filteredRelations = (stockWithRelations.parentRelations || []).filter(
        (r) => r.relatedStockId && r.relatedStockCode
      );
      if (relatedStockIds != null && relatedStockIds.length >= 0) {
        const idSet = new Set(relatedStockIds);
        filteredRelations = filteredRelations.filter((r) => idSet.has(r.relatedStockId));
        filteredRelations = relatedStockIds
          .map((id) => filteredRelations.find((r) => r.relatedStockId === id))
          .filter((r): r is NonNullable<typeof r> => r != null);
      }
      const products = [{ productCode: stock.erpStockCode, groupCode: stock.grupKodu || "" }];
      let relatedStocks: Array<{ erpStockCode: string; stockName: string; grupKodu?: string }> = [];

      if (filteredRelations.length > 0) {
        try {
          const fetched = await Promise.all(
            filteredRelations.map((r) => stockApi.getById(r.relatedStockId))
          );
          relatedStocks = fetched.map((s) => ({
            erpStockCode: s.erpStockCode,
            stockName: s.stockName,
            grupKodu: s.grupKodu,
          }));
          relatedStocks.forEach((s) =>
            products.push({ productCode: s.erpStockCode, groupCode: s.grupKodu || "" })
          );
        } catch {
          relatedStocks = filteredRelations.map((r) => ({
            erpStockCode: r.relatedStockCode!,
            stockName: r.relatedStockName || "",
            grupKodu: undefined,
          }));
          products.length = 1;
          relatedStocks.forEach((s) =>
            products.push({ productCode: s.erpStockCode, groupCode: s.grupKodu || "" })
          );
        }
      }

      let priceData: Array<{ listPrice: number; currency: string; discount1?: number | null; discount2?: number | null; discount3?: number | null }> = [];
      try {
        priceData = await quotationApi.getPriceOfProduct(products);
      } catch {
        priceData = products.map(() => ({ listPrice: 0, currency: watchedCurrency || "" }));
      }

      const mainPrice = priceData[0];
      const mainUnitPrice = mainPrice
        ? applyCurrencyToPrice(mainPrice.listPrice, mainPrice.currency)
        : 0;
      const relatedProductKey = createClientId(`main-${stock.id}`);
      const mainLine: QuotationLineFormState = calculateLineTotals({
        id: `temp-${Date.now()}`,
        productId: stock.id,
        productCode: stock.erpStockCode,
        productName: stock.stockName,
        groupCode: stock.grupKodu || null,
        quantity: 1,
        unitPrice: mainUnitPrice,
        discountRate1: mainPrice?.discount1 ?? 0,
        discountAmount1: 0,
        discountRate2: mainPrice?.discount2 ?? 0,
        discountAmount2: 0,
        discountRate3: mainPrice?.discount3 ?? 0,
        discountAmount3: 0,
        vatRate: 18,
        vatAmount: 0,
        lineTotal: 0,
        lineGrandTotal: 0,
        relatedStockId: stock.id,
        relatedProductKey,
        isMainRelatedProduct: true,
        isEditing: false,
      });

      if (filteredRelations.length > 0 && relatedStocks.length > 0) {
        const relatedLines: QuotationLineFormState[] = filteredRelations.map((relation, idx) => {
          const relStock = relatedStocks[idx];
          const price = priceData[idx + 1];
          const unitPrice =
            price && relStock
              ? applyCurrencyToPrice(price.listPrice, price.currency)
              : 0;
          return calculateLineTotals({
            id: `temp-${Date.now()}-${relation.id}`,
            productId: relation.relatedStockId,
            productCode: relation.relatedStockCode!,
            productName: relStock?.stockName ?? relation.relatedStockName ?? "",
            quantity: relation.quantity,
            unitPrice,
            discountRate1: price?.discount1 ?? 0,
            discountAmount1: 0,
            discountRate2: price?.discount2 ?? 0,
            discountAmount2: 0,
            discountRate3: price?.discount3 ?? 0,
            discountAmount3: 0,
            vatRate: 18,
            vatAmount: 0,
            lineTotal: 0,
            lineGrandTotal: 0,
            relatedStockId: stock.id,
            relatedProductKey,
            isMainRelatedProduct: false,
            isEditing: false,
            relationQuantity: relation.quantity,
          });
        });
        mainLine.relatedLines = relatedLines;
        setEditingLine(mainLine);
      } else {
        setLines((prev) => [...prev, mainLine]);
      }
    },
    [watchedCurrency, exchangeRates, erpRatesForQuotation, currencyOptions]
  );

  const handleStartApproval = useCallback(() => {
    if (!quotationId) return;
    const totalAmount = apiTotals.grandTotal;
    Alert.alert(
      t("quotation.sendForApproval"),
      t("quotation.sendForApprovalConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" as const },
        {
          text: t("common.confirm"),
          onPress: () =>
            startApproval.mutate({
              entityId: quotationId,
              documentType: PricingRuleType.Quotation,
              totalAmount,
            }),
        },
      ]
    );
  }, [quotationId, apiTotals.grandTotal, startApproval, t]);

  const handleCustomerCancel = useCallback(() => {
    setCustomerCancellationVisible(true);
  }, []);

  const handleConfirmCustomerCancel = useCallback(
    (reason: string) => {
      if (!quotationId) return;
      cancelByCustomer.mutate(
        { id: quotationId, reason },
        {
          onSuccess: () => setCustomerCancellationVisible(false),
        }
      );
    },
    [cancelByCustomer, quotationId]
  );

  const onSaveUpdate = useCallback(
    async (formData: CreateQuotationSchema) => {
      if (!quotationId) return;

      if (lines.length === 0) {
        setError("root", {
          type: "manual",
          message: t("quotation.atLeastOneLine", "En az 1 satır eklenmelidir."),
        });
        return;
      }

      const notesError = validateNotesMaxLength(notes);
      if (notesError) {
        setError("root", { type: "manual", message: notesError });
        return;
      }

      const flatLines = flattenDocumentLinesForBulk(lines);
      const cleanedLines = flatLines.map((line) =>
        mapQuotationLineFormStateToCreateDto(line, quotationId)
      );

      const effectiveExchangeRatePayload = buildEffectiveExchangeRates(
        exchangeRates,
        erpRatesForQuotation,
        currencyOptions ?? [],
        formData.quotation.offerDate || new Date().toISOString().split("T")[0]
      );

      const cleanedExchangeRates = effectiveExchangeRatePayload.map((rate) => {
        const { id, dovizTipi, ...rest } = rate;
        return {
          ...rest,
          quotationId,
          isOfficial: rest.isOfficial ?? true,
        };
      });

      const quotationPayload = {
        ...formData.quotation,
        offerType: normalizeOfferType(formData.quotation.offerType),
        documentSerialTypeId: formData.quotation.documentSerialTypeId ?? 0,
        generalDiscountRate: formData.quotation.generalDiscountRate ?? null,
        generalDiscountAmount: formData.quotation.generalDiscountAmount ?? null,
        erpProjectCode: formData.quotation.erpProjectCode ?? null,
        salesTypeDefinitionId: formData.quotation.salesTypeDefinitionId ?? null,
        koliBaskiDefinitionId: formData.quotation.koliBaskiDefinitionId ?? null,
        revisionNo: formData.quotation.revisionNo ?? null,
        revisionId:
          formData.quotation.revisionId && formData.quotation.revisionId > 0
            ? formData.quotation.revisionId
            : null,
      };

      const quotationNotes = notesToDto(notes);
      const hasNotes = Object.keys(quotationNotes).length > 0;

      await updateQuotationBulk.mutateAsync({
        id: quotationId,
        data: {
          quotation: quotationPayload,
          lines: cleanedLines,
          exchangeRates:
            cleanedExchangeRates.length > 0 ? cleanedExchangeRates : undefined,
          quotationNotes: hasNotes ? quotationNotes : undefined,
        },
      });
      markSaved();
    },
    [
      quotationId,
      lines,
      notes,
      exchangeRates,
      erpRatesForQuotation,
      currencyOptions,
      updateQuotationBulk,
      setError,
      t,
      markSaved,
    ]
  );

  const onInvalidSaveUpdate = useCallback(() => {
    showToast("error", t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun"));
  }, [showToast, t]);

  const handleSaveUpdate = useCallback(() => {
    void handleSubmit(onSaveUpdate, onInvalidSaveUpdate)();
  }, [handleSubmit, onSaveUpdate, onInvalidSaveUpdate]);

  const buildPreviewPdfInput = useCallback(
    async (draft: boolean) => {
      const resolvedCustomerName = await resolveQuotationCustomerLabelForPdf({
        potentialCustomerId: watchedCustomerId,
        potentialCustomerName: selectedCustomer?.name ?? header?.potentialCustomerName,
        erpCustomerCode: watchedErpCustomerCode ?? header?.erpCustomerCode,
        selectedCustomerName: selectedCustomer?.name,
      });

      return buildQuotationPreviewPdfInput({
        offerDate: watchedOfferDate ?? header?.offerDate ?? null,
        offerNo: watchedOfferNo ?? header?.offerNo ?? null,
        customerName: resolvedCustomerName,
        branch,
        currency: watchedCurrency ?? header?.currency ?? "TRY",
        currencyCode: resolveCurrencyIsoCode(watchedCurrency ?? header?.currency ?? "TRY"),
        generalDiscountRate: watchedGeneralDiscountRate ?? null,
        generalDiscountAmount: watchedGeneralDiscountAmount ?? null,
        draft,
        lines,
      });
    },
    [
      branch,
      header?.currency,
      header?.erpCustomerCode,
      header?.offerDate,
      header?.offerNo,
      header?.potentialCustomerName,
      lines,
      selectedCustomer?.name,
      watchedCurrency,
      watchedCustomerId,
      watchedErpCustomerCode,
      watchedGeneralDiscountAmount,
      watchedGeneralDiscountRate,
      watchedOfferDate,
      watchedOfferNo,
    ]
  );

  const pageTitle = header?.offerNo ?? (quotationId != null ? `#${quotationId}` : t("quotation.detail"));
  const isReadonly =
    header?.status === APPROVAL_WAITING ||
    header?.status === APPROVAL_APPROVED ||
    header?.status === APPROVAL_REJECTED ||
    header?.status === APPROVAL_CLOSED ||
    header?.status === APPROVAL_CUSTOMER_CANCELLED;
  const showOnayaGonder = header?.status === APPROVAL_HAVENOT_STARTED;
  const showSaveUpdate = !isReadonly;
  const showApproveReject = header?.status === APPROVAL_WAITING;
  const showCustomerCancel =
    Boolean(header) &&
    !header?.isERPIntegrated &&
    header?.status !== APPROVAL_CLOSED &&
    header?.status !== APPROVAL_CUSTOMER_CANCELLED;

  const statusKind = useMemo(() => resolveStatusKind(header?.status), [header?.status]);

  const currentWaitingApproval = useMemo(
    () => (waitingApprovalsData ?? []).find((a) => a.approvalRequestId === quotationId) ?? null,
    [waitingApprovalsData, quotationId]
  );
  const canApproveReject = showApproveReject && currentWaitingApproval != null;

  const handleApprove = useCallback(
    () => {
      if (currentWaitingApproval == null) return;
      approveAction.mutate({ approvalActionId: currentWaitingApproval.id });
    },
    [currentWaitingApproval, approveAction]
  );

  const handleRejectClick = useCallback(() => {
    setSelectedApprovalForReject(currentWaitingApproval);
    setRejectModalVisible(true);
  }, [currentWaitingApproval]);

  const handleRejectConfirm = useCallback(
    (rejectReason: string) => {
      if (selectedApprovalForReject == null) return;
      rejectAction.mutate(
        {
          approvalActionId: selectedApprovalForReject.id,
          rejectReason: rejectReason.trim() || null,
        },
        {
          onSuccess: () => {
            setRejectModalVisible(false);
            setSelectedApprovalForReject(null);
          },
        }
      );
    },
    [selectedApprovalForReject, rejectAction]
  );

  const handleRejectModalClose = useCallback(() => {
    if (!rejectAction.isPending) {
      setRejectModalVisible(false);
      setSelectedApprovalForReject(null);
    }
  }, [rejectAction.isPending]);

  if (!quotationId) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.container, { backgroundColor: mainBg }]}>
          <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <ScreenHeader title={t("quotation.detail")} showBackButton />
          <View style={styles.centered}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.errText, { color: colors.error }]}>{t("quotation.invalidId")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  if (detailLoading && !header) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.container, { backgroundColor: mainBg }]}>
          <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <ScreenHeader title={t("quotation.detail")} showBackButton />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      </>
    );
  }

  if (detailError && !header) {
    if (isForbiddenError(detailErrorObj)) {
      return <PermissionDeniedState />;
    }

    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.container, { backgroundColor: mainBg }]}>
          <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <ScreenHeader title={t("quotation.detail")} showBackButton />
          <View style={styles.centered}>
            <Text style={[styles.errText, { color: colors.error }]}>
              {detailErrorObj?.message ?? t("common.error")}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.accent }]}
              onPress={() => refetch()}
            >
              <Text style={styles.retryBtnText}>{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  const renderLineRow = (l: QuotationLineFormState, opts: { related?: boolean }): React.ReactElement => {
    const hasImage = Boolean(l.imagePath?.trim());
    const descs = [l.description1, l.description2, l.description3].filter(Boolean).join(" · ");
    const definitions = [
      l.profilDefinitionId ? `${t("common.profil")}: ${profilMap[l.profilDefinitionId] ?? `#${l.profilDefinitionId}`}` : "",
      l.demirDefinitionId ? `${t("common.demir")}: ${demirMap[l.demirDefinitionId] ?? `#${l.demirDefinitionId}`}` : "",
      l.vidaDefinitionId ? `${t("common.vida")}: ${l.vidaDefinitionName ?? vidaMap[l.vidaDefinitionId] ?? `#${l.vidaDefinitionId}`}` : "",
      l.baskiDefinitionId ? `Baskı: ${l.baskiDefinitionName ?? baskiMap[l.baskiDefinitionId] ?? `#${l.baskiDefinitionId}`}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const rates = [l.discountRate1, l.discountRate2, l.discountRate3]
      .filter((r) => r > 0)
      .map((r) => `${formatRateTr(r)}%`);

    return (
      <View
        style={[
          styles.lineRow,
          opts.related && styles.lineRowRelated,
          {
            borderColor: innerBorder,
            backgroundColor: opts.related
              ? isDark
                ? "rgba(255,255,255,0.03)"
                : "rgba(15,23,42,0.02)"
              : innerBg,
          },
          !opts.related && l.approvalStatus === 1 && {
            borderColor: colors.warning,
            borderWidth: 1.5,
          },
        ]}
      >
        <View style={[styles.lineRowMain, hasImage ? styles.lineRowMainWithThumb : undefined]}>
          {hasImage ? (
            <Image
              source={{ uri: resolveMobileImageUri(l.imagePath) ?? l.imagePath ?? "" }}
              style={opts.related ? styles.lineRowThumbRelated : styles.lineRowThumb}
              resizeMode="cover"
            />
          ) : null}
          <View style={[styles.lineRowTextBlock, opts.related && styles.lineRowTextBlockRelated]}>
            <Text style={[styles.lineRowCode, { color: softText }]} numberOfLines={1}>
              {l.productCode || "—"}
            </Text>
            <Text style={[styles.lineRowName, { color: titleText }]} numberOfLines={2}>
              {l.productName || t("quotation.productNotSelected")}
            </Text>
            {descs ? (
              <Text style={[styles.lineRowDesc, { color: softText }]} numberOfLines={1}>
                {descs}
              </Text>
            ) : null}
            {definitions ? (
              <Text style={[styles.lineRowDesc, { color: mutedText }]} numberOfLines={2}>
                {definitions}
              </Text>
            ) : null}
            <Text style={[styles.lineRowMeta, styles.lineRowMetaFine, { color: mutedText }]} numberOfLines={2}>
              <Text style={{ color: titleText, fontWeight: "600" }}>{formatQtyTr(l.quantity)}</Text>
              <Text>{` ad. · `}</Text>
              <Text style={{ color: titleText, fontWeight: "600" }}>{formatMoneyTr(l.unitPrice)}</Text>
              {lineListCurrencyLabel ? (
                <Text style={{ color: titleText, fontWeight: "600" }}>{` ${lineListCurrencyLabel}`}</Text>
              ) : null}
              {rates.length > 0 ? (
                <>
                  <Text>{` · ${t("common.discount")} `}</Text>
                  <Text style={{ color: titleText, fontWeight: "600" }}>{rates.join("/")}</Text>
                </>
              ) : null}
            </Text>
            <Text style={[styles.lineRowMeta, styles.lineRowMetaFine, { color: mutedText }]} numberOfLines={2}>
              <Text style={{ color: titleText, fontWeight: "600" }}>{formatMoneyTr(l.lineTotal)}</Text>
              {lineListCurrencyLabel ? <Text style={{ color: mutedText }}>{` ${lineListCurrencyLabel}`}</Text> : null}
              <Text>{` · KDV ${formatRateTr(l.vatRate)}% `}</Text>
              <Text style={{ color: titleText, fontWeight: "600" }}>{formatMoneyTr(l.vatAmount)}</Text>
              {lineListCurrencyLabel ? <Text>{` ${lineListCurrencyLabel}`}</Text> : null}
              <Text>{` · `}</Text>
              <Text style={{ color: accent, fontWeight: "700" }}>{formatMoneyTr(l.lineGrandTotal)}</Text>
              {lineListCurrencyLabel ? (
                <Text style={{ color: accent, fontWeight: "700" }}>{` ${lineListCurrencyLabel}`}</Text>
              ) : null}
            </Text>
            {!opts.related && l.approvalStatus === 1 ? (
              <View style={[styles.lineRowApproval, { backgroundColor: colors.warning + "18" }]}>
                <Alert02Icon size={12} color={colors.warning} variant="stroke" strokeWidth={1.8} />
                <Text style={[styles.lineRowApprovalText, { color: colors.warning }]}>{t("quotation.approvalRequired")}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.lineRowTopRight}>
          {!opts.related ? (
            <View style={[styles.lineRowMainBadge, { backgroundColor: colors.activeBackground }]}>
              <Text style={[styles.lineRowMainBadgeText, { color: accent }]}>{t("quotation.main")}</Text>
            </View>
          ) : null}
          {!isReadonly ? (
            <>
              <TouchableOpacity
                style={[
                  styles.lineIconButton,
                  {
                    borderColor: isDark ? "rgba(236,72,153,0.35)" : "rgba(219,39,119,0.22)",
                    backgroundColor: isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.06)",
                  },
                ]}
                onPress={() => handleEditLine(l)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Edit02Icon size={16} color={accent} variant="stroke" strokeWidth={1.8} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.lineIconButton,
                  {
                    borderColor: isDark ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.22)",
                    backgroundColor: isDark ? "rgba(239,68,68,0.10)" : "rgba(239,68,68,0.06)",
                  },
                ]}
                onPress={() => handleDeleteLine(l.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Delete02Icon size={16} color={colors.error} variant="stroke" strokeWidth={1.8} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.container, { backgroundColor: mainBg }]}>
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScreenHeader
            title={pageTitle}
            showBackButton
            homeRoute="/(tabs)/sales/quotations"
            rightElement={
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginRight: 2 }}>
                {statusKind ? <StatusBadge kind={statusKind} isDark={isDark} /> : null}
                <TouchableOpacity
                  onPress={() => setPreviewPdfVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.85}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderColor: isDark ? "rgba(236,72,153,0.35)" : "rgba(219,39,119,0.22)",
                    backgroundColor: isDark ? "rgba(236,72,153,0.10)" : "rgba(219,39,119,0.06)",
                  }}
                >
                  <Pdf01Icon size={16} color={accent} variant="stroke" strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            }
          />

          <View
            style={[
              styles.tabBarCard,
              { backgroundColor: tabSurface, borderColor: tabSurfaceBorder },
            ]}
          >
            {(["detail", "approval", "report"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const tabLabel =
                tab === "detail"
                  ? t("common.tabDetail")
                  : tab === "approval"
                    ? t("common.tabApprovalFlow")
                    : t("common.tabReport");
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabPill,
                    isActive
                      ? [styles.tabPillActive, { borderColor: accent, backgroundColor: tabActiveBg }]
                      : styles.tabPillInactive,
                  ]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.tabPillText, { color: isActive ? accent : softText }]}>
                    {tabLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === "approval" && quotationId != null ? (
            <QuotationApprovalFlowTab quotationId={quotationId} />
          ) : activeTab === "report" && quotationId != null ? (
            <QuotationReportTab
              quotationId={quotationId}
              offerNo={header?.offerNo ?? watchedOfferNo ?? null}
              customerName={selectedCustomer?.name ?? header?.potentialCustomerName ?? null}
              potentialCustomerId={watchedCustomerId ?? header?.potentialCustomerId ?? null}
              erpCustomerCode={watchedErpCustomerCode ?? header?.erpCustomerCode ?? null}
              currency={watchedCurrency ?? header?.currency ?? "TRY"}
              currencyCode={resolveCurrencyIsoCode(watchedCurrency ?? header?.currency ?? "TRY")}
              generalDiscountRate={watchedGeneralDiscountRate ?? null}
              generalDiscountAmount={watchedGeneralDiscountAmount ?? null}
              lines={lines}
              representativeName={header?.representativeName ?? null}
              address={header?.shippingAddressText ?? null}
              shippingAddress={header?.shippingAddressText ?? null}
              offerDate={header?.offerDate ?? watchedOfferDate ?? null}
              deliveryDate={header?.deliveryDate ?? null}
              validUntil={reportValidUntil}
              paymentTypeName={header?.paymentTypeName ?? null}
              salesTypeName={reportSalesTypeName}
              projectCode={reportProjectCode}
              description={header?.description ?? null}
              notes={notes.filter((note) => note.trim().length > 0)}
              metaFields={builtInReportMetaFields}
            />
          ) : (
            <FlatListScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                {
                  paddingBottom: showApproveReject
                    ? insets.bottom + 110
                    : listContentBottomPadding(insets.bottom),
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
                <View style={[styles.sectionLeadHeader, { borderBottomColor: sectionOutline }]}>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>{t("quotation.customerSection")}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.customerSelectButton,
                    {
                      backgroundColor: innerBg,
                      borderColor: errors.quotation?.potentialCustomerId ? colors.error : innerBorder,
                    },
                  ]}
                  onPress={() => !isReadonly && setCustomerSelectDialogOpen(true)}
                  disabled={isReadonly}
                  activeOpacity={isReadonly ? 1 : 0.85}
                >
                  <View style={styles.customerSelectContent}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                        backgroundColor: `${accent}10`,
                        borderColor: `${accent}18`,
                      }}
                    >
                      <UserIcon size={14} color={accent} variant="stroke" strokeWidth={1.8} />
                    </View>
                    <View style={styles.customerSelectTextContainer}>
                      <Text style={[styles.customerSelectLabel, { color: softText }]}>
                        {t("quotation.selectCustomer")}
                      </Text>
                      <Text style={[styles.customerSelectValue, { color: titleText }]} numberOfLines={1}>
                        {selectedCustomer?.name ??
                          (watchedErpCustomerCode ? `ERP: ${watchedErpCustomerCode}` : t("quotation.selectCustomerPlaceholder"))}
                      </Text>
                    </View>
                  </View>
                  <ArrowRight01Icon size={18} color={softText} variant="stroke" strokeWidth={1.8} />
                </TouchableOpacity>

                {errors.quotation?.potentialCustomerId?.message && (
                  <Text style={[styles.fieldError, { color: colors.error }]}>
                    {errors.quotation.potentialCustomerId.message}
                  </Text>
                )}

                {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
                  <Controller
                    control={control}
                    name="quotation.shippingAddressId"
                    render={({ field: { value } }) => (
                      <View style={styles.fieldContainerTight}>
                        <Text style={[styles.labelCompact, { color: mutedText }]}>
                          {t("quotation.shippingAddress")}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.pickerButton,
                            styles.pickerShellCompact,
                            { backgroundColor: innerBg, borderColor: innerBorder },
                          ]}
                          onPress={() => !isReadonly && setShippingAddressModalVisible(true)}
                          disabled={isReadonly}
                          activeOpacity={isReadonly ? 1 : 0.85}
                        >
                          <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                            {shippingAddresses.find((a) => a.id === value)?.address ?? t("quotation.select")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>

              <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
                <View style={[styles.sectionLeadHeader, { borderBottomColor: sectionOutline }]}>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>{t("quotation.quotationInfo")}</Text>
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={styles.twoColumnItem}>
                    <OfferTypePicker control={control} disabled={isReadonly} compact />
                  </View>
                  <View style={styles.twoColumnItem}>
                    <Controller
                      control={control}
                      name="quotation.representativeId"
                      render={() => (
                        <View style={styles.fieldContainerTight}>
                          <Text style={[styles.labelCompact, { color: mutedText }]}>
                            {t("quotation.representative")}
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.pickerButton,
                              styles.pickerShellCompact,
                              { backgroundColor: innerBg, borderColor: innerBorder },
                            ]}
                            onPress={() => !isReadonly && setRepresentativeModalVisible(true)}
                            disabled={isReadonly}
                            activeOpacity={isReadonly ? 1 : 0.85}
                          >
                            <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                              {watchedRepresentativeId
                                ? (() => {
                                    const u = relatedUsers.find((rel) => rel.userId === watchedRepresentativeId);
                                    return u
                                      ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                                      : String(watchedRepresentativeId);
                                  })()
                                : t("quotation.select")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  </View>
                </View>

                <Controller
                  control={control}
                  name="quotation.paymentTypeId"
                  render={() => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("quotation.paymentType")} <Text style={{ color: colors.error }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.quotation?.paymentTypeId ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setPaymentTypeModalVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                          {paymentTypes?.find((p) => p.id === watch("quotation.paymentTypeId"))?.name ?? t("quotation.select")}
                        </Text>
                      </TouchableOpacity>
                      {errors.quotation?.paymentTypeId?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.quotation.paymentTypeId.message}
                        </Text>
                      )}
                    </View>
                  )}
                />

                <View style={styles.twoColumnRow}>
                  <View style={styles.twoColumnItem}>
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("quotation.deliveryDate")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.dateCell,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.quotation?.deliveryDate ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setDeliveryDateModalOpen(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.dateCellValue, { color: titleText }]} numberOfLines={1}>
                          {watchedDeliveryDate || t("quotation.select")}
                        </Text>
                      </TouchableOpacity>
                      {errors.quotation?.deliveryDate?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.quotation.deliveryDate.message}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.twoColumnItem}>
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("quotation.offerDate")}
                      </Text>
                      <TouchableOpacity
                        style={[styles.dateCell, { backgroundColor: innerBg, borderColor: innerBorder }]}
                        onPress={() => !isReadonly && setOfferDateModalOpen(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.dateCellValue, { color: titleText }]} numberOfLines={1}>
                          {watchedOfferDate || t("quotation.select")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <Controller
                  control={control}
                  name="quotation.currency"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <View style={styles.currencyHeader}>
                        <Text style={[styles.labelCompact, { color: mutedText }]}>
                          {t("quotation.currency")} <Text style={{ color: colors.error }}>*</Text>
                        </Text>
                        {value ? (
                          <TouchableOpacity
                            style={[styles.exchangeRateButtonCompact, { backgroundColor: accent + "D6" }]}
                            onPress={() => !isReadonly && setExchangeRateDialogVisible(true)}
                            disabled={isReadonly}
                            activeOpacity={isReadonly ? 1 : 0.9}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <MoneyExchange01Icon size={13} color="#FFFFFF" variant="stroke" strokeWidth={1.8} />
                              <Text style={styles.exchangeRateButtonTextCompact}>
                                {t("quotation.exchangeRates")}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.quotation?.currency ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setCurrencyModalVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                          {value ? selectedCurrencyLabel : t("quotation.select")}
                        </Text>
                      </TouchableOpacity>
                      {errors.quotation?.currency?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.quotation.currency.message}
                        </Text>
                      )}
                    </View>
                  )}
                />

                <DocumentSerialTypePicker
                  control={control}
                  customerTypeId={customerTypeId}
                  representativeId={watchedRepresentativeId ?? undefined}
                  disabled={isReadonly || !watchedRepresentativeId}
                />

                <Controller
                  control={control}
                  name="quotation.koliBaskiDefinitionId"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("quotation.koliBaski")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          {
                            backgroundColor: innerBg,
                            borderColor: innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setKoliBaskiModalVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                          {value
                            ? koliBaskiOptions.find((option) => option.id === value)?.name ?? t("quotation.select")
                            : t("quotation.select")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />

                <FormField
                  label={t("quotation.description")}
                  value={watch("quotation.description") || ""}
                  onChangeText={(txt) => setValue("quotation.description", txt || null)}
                  placeholder={t("quotation.descriptionPlaceholder")}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  editable={!isReadonly}
                />

                {!isReadonly && (
                  <TouchableOpacity
                    style={[
                      styles.notesButton,
                      { backgroundColor: innerBg, borderColor: innerBorder },
                    ]}
                    onPress={() => setNotesModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9,
                          borderWidth: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 8,
                          backgroundColor: `${accent}10`,
                          borderColor: `${accent}18`,
                        }}
                      >
                        <Note01Icon size={14} color={accent} variant="stroke" strokeWidth={1.8} />
                      </View>
                      <Text style={[styles.notesButtonText, { color: titleText }]}>
                        {t("quotation.notesSection")}
                        {notes.some((n) => n.trim()) ? ` (${notes.filter((n) => n.trim()).length})` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                <QuotationNotesModal
                  visible={notesModalVisible}
                  notes={notes}
                  onSave={handleSaveNotes}
                  onClose={() => setNotesModalVisible(false)}
                  isSaving={updateQuotationNotesMutation.isPending}
                />
              </View>

              <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
                <View style={[styles.sectionHeader, { borderBottomColor: sectionOutline }]}>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>
                    {t("quotation.lines")}
                    {visibleMainLines.length > 0 ? ` (${visibleMainLines.length})` : ""}
                  </Text>
                  {!isReadonly && (
                    <TouchableOpacity
                      style={[
                        styles.addButton,
                        { backgroundColor: accent + "CC" },
                        !canAddLine && styles.submitButtonDisabled,
                      ]}
                      onPress={handleAddLine}
                      disabled={!canAddLine}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.addButtonText}>+ {t("quotation.addLine")}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {errors.root?.message && (
                  <Text style={[styles.fieldError, { color: colors.error }]}>{errors.root.message}</Text>
                )}

                {lines.length === 0 ? (
                  <Text style={[styles.emptyText, { color: softText }]}>{t("quotation.noLinesYet")}</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {visibleMainLines.map((line) => (
                      <View key={line.id} style={styles.lineCardWrapper}>
                        {renderLineRow(line, {})}
                        {line.relatedLines && line.relatedLines.length > 0 ? (
                          <View style={styles.relatedLinesBlock}>
                            <Text style={[styles.relatedLinesTitle, { color: softText }]}>
                              {t("quotation.relatedStocks")}
                            </Text>
                            {line.relatedLines.map((relatedLine) => (
                              <View
                                key={relatedLine.id}
                                style={[
                                  styles.relatedLineIndent,
                                  {
                                    borderLeftColor: isDark
                                      ? "rgba(236,72,153,0.45)"
                                      : "rgba(219,39,119,0.28)",
                                  },
                                ]}
                              >
                                {renderLineRow(relatedLine, { related: true })}
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {lines.length > 0 && (
                <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
                  <View style={[styles.sectionLeadHeader, { borderBottomColor: sectionOutline }]}>
                    <Text style={[styles.sectionTitle, { color: titleText }]}>
                      {t("quotation.summary")}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: mutedText }]}>{t("quotation.subtotal")}</Text>
                    <Text style={[styles.summaryValue, { color: titleText }]}>
                      {formatMoneyTr(totals.subtotal)}
                      {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: mutedText }]}>{t("quotation.totalVat")}</Text>
                    <Text style={[styles.summaryValue, { color: titleText }]}>
                      {formatMoneyTr(totals.totalVat)}
                      {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.summaryGrandRow, { borderTopColor: sectionOutline }]}>
                    <Text style={[styles.summaryGrandLabel, { color: titleText }]}>
                      {t("quotation.grandTotal")}
                    </Text>
                    <Text style={[styles.summaryGrandValue, { color: accent }]}>
                      {formatMoneyTr(totals.grandTotal)}
                      {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                    </Text>
                  </View>
                </View>
              )}

              {showSaveUpdate && (
                <View style={styles.inlineActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.inlineActionButtonWrap,
                      !hasUnsavedChanges && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSaveUpdate}
                    disabled={!hasUnsavedChanges || updateQuotationBulk.isPending}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={[colors.accentSecondary || "#f97316", accent]}
                      start={{ x: 1, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.actionFullButton}
                    >
                      {updateQuotationBulk.isPending ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <FloppyDiskIcon size={18} color="#FFFFFF" variant="stroke" strokeWidth={2} />
                          <Text style={styles.actionButtonText}>{t("common.saveUpdate")}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {showOnayaGonder && (
                    <TouchableOpacity
                      style={styles.inlineActionButtonWrap}
                      onPress={handleStartApproval}
                      disabled={startApproval.isPending || updateQuotationBulk.isPending}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={[accent, colors.accentSecondary || "#f97316"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.actionFullButton}
                      >
                        {startApproval.isPending ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <SentIcon size={18} color="#FFFFFF" variant="stroke" strokeWidth={2} />
                            <Text style={styles.actionButtonText}>{t("quotation.sendForApproval")}</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  {showCustomerCancel && (
                    <TouchableOpacity
                      style={styles.inlineActionButtonWrap}
                      onPress={handleCustomerCancel}
                      disabled={cancelByCustomer.isPending || updateQuotationBulk.isPending}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={["#be123c", "#e11d48"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.actionFullButton}
                      >
                        {cancelByCustomer.isPending ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <Cancel01Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={2} />
                            <Text style={styles.actionButtonText}>{t("quotation.customerCancelButton", "Müşteri İptali")}</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </FlatListScrollView>
          )}

          {activeTab === "detail" && showApproveReject && (
            <View
              style={[
                styles.actionBar,
                {
                  backgroundColor: shellBgAlt,
                  borderTopColor: sectionOutline,
                  paddingBottom: stickyActionBarBottomPadding(insets.bottom),
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.actionRejectButton, { backgroundColor: colors.error }]}
                onPress={handleRejectClick}
                disabled={!canApproveReject || rejectAction.isPending}
                activeOpacity={0.9}
              >
                {rejectAction.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Cancel01Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={2} />
                    <Text style={styles.actionButtonText}>{t("quotation.rejectButton")}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionApproveButtonWrap]}
                onPress={handleApprove}
                disabled={!canApproveReject || approveAction.isPending}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={["#10b981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionApproveButton}
                >
                  {approveAction.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Tick02Icon size={18} color="#FFFFFF" variant="stroke" strokeWidth={2} />
                      <Text style={styles.actionButtonText}>{t("quotation.approveButton")}</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <QuotationLineForm
            visible={lineFormVisible}
            line={editingLine}
            onClose={() => {
              setLineFormVisible(false);
              setEditingLine(null);
            }}
            onSave={handleSaveLine}
            onRequestRelatedStocksSelection={
              !editingLine
                ? (stock: StockGetDto & { parentRelations: StockRelationDto[] }) => {
                    setPendingStockForRelated(stock);
                  }
                : undefined
            }
            onCancelRelatedSelection={() => setPendingStockForRelated(null)}
            onApplyRelatedSelection={
              !editingLine
                ? (stock: StockGetDto & { parentRelations: StockRelationDto[] }, selectedIds: number[]) => {
                    handleProductSelectWithRelatedStocks(stock, selectedIds);
                    setPendingStockForRelated(null);
                  }
                : undefined
            }
            pendingRelatedStock={pendingStockForRelated}
            currency={watchedCurrency || ""}
            currencyOptions={currencyOptions?.map((c) => ({
              code: c.code,
              dovizTipi: c.dovizTipi,
              dovizIsmi: c.dovizIsmi ?? c.code,
            }))}
            pricingRules={pricingRules}
            userDiscountLimits={userDiscountLimits}
            exchangeRates={effectiveRatesForLines}
            allowImageUpload={Boolean(editingLine)}
            imageUploadScope="quotation-line"
            imageUploadExtras={
              editingLine
                ? {
                    quotationId,
                    quotationLineId:
                      typeof editingLine.id === "string" && editingLine.id.startsWith("line-")
                        ? Number(editingLine.id.replace("line-", ""))
                        : undefined,
                  }
                : undefined
            }
          />

          <RejectModal
            visible={rejectModalVisible}
            approval={selectedApprovalForReject}
            onClose={handleRejectModalClose}
            onConfirm={handleRejectConfirm}
            isPending={rejectAction.isPending}
          />

          <CustomerCancellationReasonModal
            visible={customerCancellationVisible}
            title={t("quotation.customerCancelTitle", "Müşteri iptali")}
            description={t("quotation.customerCancelDescription", "Bu teklifi müşteri tarafından iptal edildi olarak işaretlemek üzeresiniz.")}
            reasonLabel={t("quotation.customerCancelReasonLabel", "İptal nedeni")}
            reasonPlaceholder={t("quotation.customerCancelReasonPlaceholder", "Müşterinin iptal nedenini yazın...")}
            cancelLabel={t("common.cancel")}
            confirmLabel={t("quotation.customerCancelConfirmButton", "İptal Et")}
            isPending={cancelByCustomer.isPending}
            colors={{
              card: shellBgAlt,
              text: titleText,
              textSecondary: mutedText,
              textMuted: softText,
              border: innerBorder,
            }}
            onClose={() => setCustomerCancellationVisible(false)}
            onConfirm={handleConfirmCustomerCancel}
          />

          <Modal visible={deleteLineDialogVisible} transparent animationType="fade">
            <View style={[styles.modalOverlay, styles.deleteConfirmOverlay]}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                onPress={handleDeleteLineCancel}
                disabled={deleteQuotationLineMutation.isPending}
              />
              <View style={[styles.deleteConfirmBox, { backgroundColor: shellBgAlt, borderColor: sectionOutline }]}>
                <Text style={[styles.deleteConfirmTitle, { color: titleText }]}>
                  {deleteLineId != null && (() => {
                    const lineToDelete = lines.find((l) => l.id === deleteLineId);
                    const sameGroup = getValidRelatedProductGroup(lines, lineToDelete);
                    const relatedCount = sameGroup.length - 1;
                    return relatedCount > 0
                      ? t("quotation.deleteRelatedGroupTitle")
                      : t("quotation.deleteLineTitle");
                  })()}
                </Text>
                <Text style={[styles.deleteConfirmMessage, { color: mutedText }]}>
                  {deleteLineId != null && (() => {
                    const lineToDelete = lines.find((l) => l.id === deleteLineId);
                    const sameGroup = getValidRelatedProductGroup(lines, lineToDelete);
                    const relatedCount = sameGroup.length - 1;
                    return relatedCount > 0
                      ? t("quotation.deleteRelatedGroupMessage", { count: relatedCount })
                      : t("quotation.deleteLineMessage");
                  })()}
                </Text>
                <View style={styles.deleteConfirmActions}>
                  <TouchableOpacity
                    style={[styles.deleteConfirmCancelBtn, { borderColor: innerBorder }]}
                    onPress={handleDeleteLineCancel}
                    disabled={deleteQuotationLineMutation.isPending}
                  >
                    <Text style={[styles.deleteConfirmCancelTxt, { color: titleText }]}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deleteConfirmDeleteBtn,
                      { backgroundColor: colors.error },
                      deleteQuotationLineMutation.isPending && styles.deleteConfirmBtnDisabled,
                    ]}
                    onPress={handleDeleteLineConfirm}
                    disabled={deleteQuotationLineMutation.isPending}
                  >
                    {deleteQuotationLineMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.deleteConfirmDeleteTxt}>{t("common.delete")}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={deliveryDateModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={styles.modalBackdrop} onPress={() => setDeliveryDateModalOpen(false)} />
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: shellBgAlt, paddingBottom: insets.bottom + 16 },
                ]}
              >
                <View
                  style={{
                    width: 42,
                    height: 4,
                    borderRadius: 2,
                    marginBottom: 12,
                    backgroundColor: isDark ? "rgba(255,255,255,0.24)" : "rgba(15,23,42,0.10)",
                    alignSelf: "center",
                  }}
                />
                <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
                  <Text style={[styles.modalTitle, { color: titleText }]}>{t("quotation.deliveryDate")}</Text>
                </View>
                <DateTimePicker
                  value={tempDeliveryDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDeliveryDateChange}
                  locale="tr-TR"
                />
                <TouchableOpacity
                  style={[styles.modalOkBtn, { backgroundColor: accent }]}
                  onPress={() => {
                    setValue("quotation.deliveryDate", tempDeliveryDate.toISOString().split("T")[0]);
                    setDeliveryDateModalOpen(false);
                  }}
                >
                  <Text style={styles.modalOkTxt}>{t("common.confirm")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={offerDateModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={styles.modalBackdrop} onPress={() => setOfferDateModalOpen(false)} />
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: shellBgAlt, paddingBottom: insets.bottom + 16 },
                ]}
              >
                <View
                  style={{
                    width: 42,
                    height: 4,
                    borderRadius: 2,
                    marginBottom: 12,
                    backgroundColor: isDark ? "rgba(255,255,255,0.24)" : "rgba(15,23,42,0.10)",
                    alignSelf: "center",
                  }}
                />
                <View style={[styles.modalHeader, { borderBottomColor: innerBorder }]}>
                  <Text style={[styles.modalTitle, { color: titleText }]}>{t("quotation.offerDate")}</Text>
                </View>
                <DateTimePicker
                  value={tempOfferDate}
                  mode="date"
                  display="spinner"
                  onChange={handleOfferDateChange}
                  locale="tr-TR"
                />
                <TouchableOpacity
                  style={[styles.modalOkBtn, { backgroundColor: accent }]}
                  onPress={() => {
                    setValue("quotation.offerDate", tempOfferDate.toISOString().split("T")[0]);
                    setOfferDateModalOpen(false);
                  }}
                >
                  <Text style={styles.modalOkTxt}>{t("common.confirm")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <ExchangeRateDialog
            visible={exchangeRateDialogVisible}
            exchangeRates={exchangeRates}
            currencyOptions={currencyOptions}
            erpExchangeRates={erpRatesForQuotation}
            isLoadingErpRates={isLoadingErpRates && erpRatesForQuotation.length === 0}
            currencyInUse={linesData.length > 0 ? (watchedCurrency || undefined) : undefined}
            useQuotationRatesAsPrimary={true}
            onClose={() => setExchangeRateDialogVisible(false)}
            onSave={(rates) => {
              if (quotationId != null && quotationId > 0 && header != null) {
                const body = mapExchangeRateFormStateToUpdateDtos(
                  rates,
                  quotationId,
                  header.offerNo ?? null
                );
                updateExchangeRateInQuotation.mutate(
                  { quotationId, body },
                  {
                    onSuccess: () => {
                      setExchangeRates(rates);
                      setExchangeRateDialogVisible(false);
                      queueMicrotask(() => syncBaseline());
                    },
                  }
                );
              } else {
                setExchangeRates(rates);
                setExchangeRateDialogVisible(false);
              }
            }}
            offerDate={watchedOfferDate ?? undefined}
          />

          <CustomerSelectDialog
            open={customerSelectDialogOpen}
            onOpenChange={setCustomerSelectDialogOpen}
            onSelect={handleCustomerSelect}
            contextUserId={watchedRepresentativeId ?? undefined}
          />

          <PickerModal
            visible={paymentTypeModalVisible}
            options={paymentTypes?.map((p) => ({ id: p.id, name: p.name })) ?? []}
            selectedValue={watch("quotation.paymentTypeId") ?? undefined}
            onSelect={(o) => {
              setValue("quotation.paymentTypeId", o.id as number);
              setPaymentTypeModalVisible(false);
            }}
            onClose={() => setPaymentTypeModalVisible(false)}
            title={t("quotation.selectPaymentType")}
            searchPlaceholder={t("quotation.searchPaymentType")}
          />

          <PickerModal
            visible={currencyModalVisible}
            options={currencyOptions?.map((c) => ({ id: c.code, name: c.dovizIsmi ?? c.code, code: c.code })) ?? []}
            selectedValue={watch("quotation.currency")}
            onSelect={(o) => handleCurrencySelect(o.id as string)}
            onClose={() => setCurrencyModalVisible(false)}
            title={t("quotation.selectCurrency")}
            searchPlaceholder={t("quotation.searchCurrency")}
          />

          <PickerModal
            visible={koliBaskiModalVisible}
            options={koliBaskiOptions.map((option) => ({
              id: option.id,
              name: option.name,
            }))}
            selectedValue={watch("quotation.koliBaskiDefinitionId") ?? undefined}
            onSelect={(option) => {
              setValue("quotation.koliBaskiDefinitionId", option.id as number);
              setKoliBaskiModalVisible(false);
            }}
            onClose={() => setKoliBaskiModalVisible(false)}
            title={t("quotation.koliBaski")}
            searchPlaceholder={t("quotation.koliBaskiSearch")}
          />

          <PickerModal
            visible={representativeModalVisible}
            options={relatedUsers.map((u) => ({
              id: u.userId,
              name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
            }))}
            selectedValue={watch("quotation.representativeId") ?? undefined}
            onSelect={(o) => {
              setValue("quotation.representativeId", o.id as number);
              setRepresentativeModalVisible(false);
            }}
            onClose={() => setRepresentativeModalVisible(false)}
            title={t("quotation.selectRepresentative")}
            searchPlaceholder={t("quotation.searchRepresentative")}
          />

          {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
            <PickerModal
              visible={shippingAddressModalVisible}
              options={shippingAddresses.map((a) => ({ id: a.id, name: a.address ?? "" }))}
              selectedValue={watch("quotation.shippingAddressId") ?? undefined}
              onSelect={(o) => {
                setValue("quotation.shippingAddressId", o.id as number);
                setShippingAddressModalVisible(false);
              }}
              onClose={() => setShippingAddressModalVisible(false)}
              title={t("quotation.selectShippingAddress")}
              searchPlaceholder={t("quotation.searchAddress")}
            />
          )}

          <QuotationPreviewPdfDialog
            visible={previewPdfVisible}
            onClose={() => setPreviewPdfVisible(false)}
            buildInput={buildPreviewPdfInput}
            validateBeforeOpen={() =>
              lines.length === 0 ? "En az bir satır gerekli" : null
            }
          />
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  errText: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  retryBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  tabBarCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 6,
    gap: 6,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
  },
  tabPill: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  tabPillActive: { borderWidth: 1.6 },
  tabPillInactive: { borderWidth: 0, backgroundColor: "transparent" },
  tabPillText: { fontSize: 12, fontWeight: "700" },

  content: { flex: 1, backgroundColor: "transparent" },
  contentContainer: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 28 },

  section: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.35,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  sectionLeadHeader: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 12.3,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(236,72,153,0.08)",
    overflow: "hidden",
    alignSelf: "flex-start",
  },

  twoColumnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  twoColumnItem: { flex: 1, minWidth: 0 },
  fieldContainerTight: { marginBottom: 10 },
  labelCompact: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.25,
    marginBottom: 5,
  },
  pickerButton: {
    borderWidth: 1.3,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  pickerShellCompact: {
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pickerText: { fontSize: 15 },
  pickerTextCompact: { fontSize: 13 },
  dateCell: {
    borderWidth: 1.3,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center",
  },
  dateCellValue: { fontSize: 13, fontWeight: "500" },
  fieldError: { fontSize: 12, marginTop: 4, marginBottom: 4 },

  customerSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
    minHeight: 50,
  },
  customerSelectContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  customerSelectTextContainer: { flex: 1 },
  customerSelectLabel: { fontSize: 11, fontWeight: "600", marginBottom: 2, letterSpacing: 0.25 },
  customerSelectValue: { fontSize: 14, fontWeight: "600" },

  currencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  exchangeRateButtonCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  exchangeRateButtonTextCompact: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  notesButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    marginTop: 4,
  },
  notesButtonText: { fontSize: 14, fontWeight: "600" },

  addButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 18, fontStyle: "italic" },

  lineCardWrapper: {},
  lineRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 11,
    paddingTop: 10,
  },
  lineRowRelated: {
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  lineRowMain: { flex: 1, minWidth: 0 },
  lineRowMainWithThumb: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  lineRowThumb: { width: 40, height: 40, borderRadius: 10 },
  lineRowThumbRelated: { width: 32, height: 32, borderRadius: 8 },
  lineRowTextBlock: { flex: 1, minWidth: 0, gap: 2, paddingRight: 112 },
  lineRowTextBlockRelated: { paddingRight: 76 },
  lineRowTopRight: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 2,
  },
  lineRowCode: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
    paddingRight: 4,
  },
  lineRowName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 1,
  },
  lineRowMainBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    flexShrink: 0,
  },
  lineRowMainBadgeText: { fontSize: 7, fontWeight: "700" },
  lineRowDesc: { fontSize: 10, fontWeight: "500", marginTop: 2, opacity: 0.92 },
  lineRowMeta: {
    marginTop: 4,
    fontWeight: "400",
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },
  lineRowMetaFine: { fontSize: 10, lineHeight: 13.5 },
  lineRowApproval: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  lineRowApprovalText: { fontSize: 10, fontWeight: "600" },
  lineIconButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  relatedLinesBlock: { marginTop: 8, gap: 6 },
  relatedLinesTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    opacity: 0.72,
    marginBottom: 2,
  },
  relatedLineIndent: {
    paddingLeft: 10,
    marginLeft: 2,
    borderLeftWidth: 2,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 13, fontWeight: "500" },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },
  summaryGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  summaryGrandLabel: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
  summaryGrandValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },

  actionBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionRejectButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionApproveButtonWrap: { flex: 1 },
  actionApproveButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionFullButtonWrap: { flex: 1 },
  inlineActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  inlineActionButtonWrap: { flex: 1, marginTop: 0 },
  actionFullButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  submitButtonDisabled: { opacity: 0.55 },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  deleteConfirmOverlay: { justifyContent: "center", alignItems: "center" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12 },
  modalHeader: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalOkBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalOkTxt: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  deleteConfirmBox: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
    maxWidth: 360,
  },
  deleteConfirmTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  deleteConfirmMessage: { fontSize: 13.5, marginBottom: 20, lineHeight: 19 },
  deleteConfirmActions: { flexDirection: "row", gap: 12 },
  deleteConfirmCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmCancelTxt: { fontSize: 14, fontWeight: "700" },
  deleteConfirmDeleteBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  deleteConfirmDeleteTxt: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  deleteConfirmBtnDisabled: { opacity: 0.7 },
});
