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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { CustomerErpBalanceAction } from "@/components/shared/CustomerErpBalanceAction";
import { createClientId } from "@/lib/create-client-id";
import { getValidRelatedProductGroup } from "@/lib/relatedProductGroup";
import { resolveDocumentSerialCustomerTypeId } from "@/lib/resolve-document-serial-customer-type-id";
import {
  resolveDocumentCustomerSelectLabel,
  resolvePricingRuleCustomerCode,
} from "@/lib/customerIntegration";
import { resolveRepresentativeDisplayLabel } from "@/lib/resolveRepresentativeDisplayLabel";
import {
  resolveExchangeRateByCurrency as findExchangeRateByCurrency,
  buildEffectiveExchangeRates,
} from "@/lib/resolve-exchange-rate";
import { buildDocumentExchangeRatesForLines } from "@/lib/document-exchange-rates";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
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
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Clock04Icon,
  FileEditIcon,
  Tick02Icon,
  SentIcon,
  Pdf01Icon,
  FloppyDiskIcon,
} from "hugeicons-react-native";
import { DocumentDetailActions } from "../../../components/paged/DocumentDetailActions";
import { DocumentDetailStatusAlerts } from "../../../components/paged/DocumentDetailStatusAlerts";
import { listContentBottomPadding } from "../../../constants/layout";
import { ScreenHeader } from "../../../components/navigation";
import { CustomerCancellationReasonModal } from "../../../components/CustomerCancellationReasonModal";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useSystemSettingsStore } from "../../../store/system-settings";
import { PermissionDeniedState } from "../../access-control/components/PermissionDeniedState";
import { isForbiddenError } from "../../access-control/utils/isForbiddenError";
import { useAuthStore } from "../../../store/auth";
import { useToastStore } from "../../../store/toast";
import { FormField } from "../../activity/components";
import { useCustomer, useCustomerScopeAccess } from "../../customer/hooks";
import { useCustomerShippingAddresses } from "../../shipping-address/hooks";
import { buildShippingAddressLabel } from "../../shipping-address/utils/shippingAddressLabel";
import { stockApi } from "../../stocks/api";
import {
  localizeDocumentLineFormStates,
  mapApiLinesToLocalizedFormState,
  resolveDocumentLineProductName,
} from "../../stocks/utils";
import { getLocalizedStockNameFromStock, mergeCreatedLineProductName } from "../../../lib/localizedStockName";
import {
  computeDocumentDetailReadOnly,
  isDocumentDetailReadOnlyWhileLoading,
} from "../../../lib/documentDetailReadOnly";
import { resolveDocumentCancellationReason } from "../../../lib/resolveDocumentStatus";
import { enforceExportVatOnLine, isExportOfferType, resolveDocumentVatRate } from "../../../utils/documentVat";
import { quotationApi } from "../api";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida/hooks/useWindoDefinitionOptions";
import { useSpecialCodes } from "../../common/hooks/useSpecialCodes";
import {
  formatSpecialCodeOptionName,
  resolveSpecialCodeLabel,
} from "../../common/utils/specialCodeLabel";
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
  useCancelQuotationByCustomer,
  useCanEditQuotation,
  useCreateRevisionOfQuotation,
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
  QuotationFormLineGroup,
  QuotationLinesSectionHeader,
  notesFromDto,
  notesToPutPayload,
  validateNotesMaxLength,
} from "../components";

function parsePersistedRateId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  const text = String(value ?? "");
  const prefixedMatch = text.match(/^rate-(\d+)$/);
  if (prefixedMatch) return Number(prefixedMatch[1]);
  if (/^\d+$/.test(text)) return Number(text);
  return null;
}

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
  APPROVAL_SALESPERSON_CLOSED_FOR_REVISION,
  APPROVAL_SUPERSEDED_BY_APPROVED_REVISION,
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
import { buildSalesDocumentPreviewPdfExtras } from "../../../lib/salesDocumentPreviewPdf";
import { resolveQuotationCustomerLabelForPdf } from "../utils/resolveQuotationCustomerLabelForPdf";
import { useDocumentDetailDirtyState } from "../../../hooks/useDocumentDetailDirtyState";
import { invalidateDocumentListAndDetailHeader } from "../../../lib/documentListQueryInvalidation";

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
        productName: mergeCreatedLineProductName(createdLine, draftLine).productName,
        imagePath: uploaded.relativeUrl,
      },
    ]);
  }
}

function formatMoneyTr(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
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
  const { t, i18n } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const hideVatRate = useSystemSettingsStore((state) => state.settings.hideQuotationVatRate);
  const isDark = themeMode === "dark";
  const { user, branch } = useAuthStore();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiMap, koliBaskiOptions, isLoading: isDefinitionOptionsLoading } = useWindoDefinitionOptions();
  const { specialCode1Options, specialCode2Options, isSpecialCodesLoading } = useSpecialCodes("quotation");

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

  const formInitRef = useRef(false);
  const linesInitRef = useRef(false);
  const ratesInitRef = useRef(false);
  const notesInitRef = useRef(false);
  const erpRatesFilledRef = useRef(false);
  const activeQuotationIdRef = useRef<number | undefined>(quotationId);

  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);
  const [erpRatesForQuotation, setErpRatesForQuotation] = useState<ExchangeRateDto[]>([]);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
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
  const [specialCode1ModalVisible, setSpecialCode1ModalVisible] = useState(false);
  const [specialCode2ModalVisible, setSpecialCode2ModalVisible] = useState(false);
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
        ozelKod1: "",
        ozelKod2: "",
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
  const watchedDescription = watch("quotation.description");
  const watchedKoliBaskiDefinitionId = watch("quotation.koliBaskiDefinitionId");
  const watchedOfferType = watch("quotation.offerType");
  const formSnapshot = watch();

  useEffect(() => {
    if (!isExportOfferType(watchedOfferType)) return;
    setLines((prev) => {
      if (!prev.some((line) => (line.vatRate ?? 0) !== 0 || (line.vatAmount ?? 0) !== 0)) {
        return prev;
      }
      return prev.map((line) => calculateLineTotals(enforceExportVatOnLine(line, watchedOfferType)));
    });
  }, [watchedOfferType]);

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

  const representativeDisplayLabel = useMemo(
    () =>
      resolveRepresentativeDisplayLabel({
        representativeId: watchedRepresentativeId,
        representativeName: header?.representativeName,
        relatedUsers,
        emptyLabel: t("quotation.select"),
      }),
    [watchedRepresentativeId, header?.representativeName, relatedUsers, t]
  );

  const customerTypeId = useMemo(() => {
    return resolveDocumentSerialCustomerTypeId({
      erpCustomerCode: watchedErpCustomerCode,
      selectedCustomerId: watchedCustomerId,
      customerTypeId: customer?.customerTypeId,
    });
  }, [watchedErpCustomerCode, watchedCustomerId, customer?.customerTypeId]);

  const customerCode = useMemo(
    () => resolvePricingRuleCustomerCode(watchedErpCustomerCode),
    [watchedErpCustomerCode]
  );

  const customerSelectLabel = useMemo(
    () =>
      resolveDocumentCustomerSelectLabel({
        customer: selectedCustomer,
        erpCustomerCode: watchedErpCustomerCode,
        placeholder: t("quotation.selectCustomerPlaceholder"),
      }),
    [selectedCustomer, watchedErpCustomerCode, t]
  );

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
  const documentRatesForLines = useMemo(
    () => buildDocumentExchangeRatesForLines(exchangeRates),
    [exchangeRates]
  );

  const { data: pricingRules } = usePriceRuleOfQuotation({
    customerCode,
    salesmenId: watchedRepresentativeId || undefined,
    quotationDate: watchedOfferDate || undefined,
  });

  const { data: userDiscountLimits } = useUserDiscountLimitsBySalesperson(
    watchedRepresentativeId || undefined
  );

  const apiTotals = useMemo(() => totalsFromDetailLines(linesData), [linesData]);
  const totals = useMemo(
    () =>
      calculateTotals(lines, {
        generalDiscountRate: watchedGeneralDiscountRate ?? null,
        generalDiscountAmount: watchedGeneralDiscountAmount ?? null,
      }),
    [lines, watchedGeneralDiscountAmount, watchedGeneralDiscountRate]
  );
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
  const createRevision = useCreateRevisionOfQuotation();
  const documentStatus = header?.status ?? null;
  const { data: canEditWhileWaiting, isLoading: canEditLoading } = useCanEditQuotation(
    quotationId,
    documentStatus
  );
  const readOnlyState = useMemo(
    () => computeDocumentDetailReadOnly(documentStatus, canEditWhileWaiting),
    [canEditWhileWaiting, documentStatus]
  );
  const cancellationReason = useMemo(
    () => (header ? resolveDocumentCancellationReason(header) : null),
    [header]
  );
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
    let cancelled = false;
    void mapApiLinesToLocalizedFormState(linesData, mapDetailLinesToFormState, i18n.language).then(
      (localized) => {
        if (!cancelled) {
          setLines(localized.length > 0 ? localized : []);
          linesInitRef.current = true;
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [header, linesData, i18n.language]);

  useEffect(() => {
    if (!linesInitRef.current || header == null) return;
    let cancelled = false;
    void mapApiLinesToLocalizedFormState(linesData, mapDetailLinesToFormState, i18n.language).then(
      (localized) => {
        if (!cancelled) setLines(localized.length > 0 ? localized : []);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [linesData, header, i18n.language]);

  const linesRef = useRef(lines);
  linesRef.current = lines;

  useEffect(() => {
    if (!linesInitRef.current || linesRef.current.length === 0) return;
    let cancelled = false;
    void localizeDocumentLineFormStates(linesRef.current, i18n.language).then((localized) => {
      if (!cancelled) setLines(localized);
    });
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

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
      const normalizedSavedLine = enforceExportVatOnLine(savedLine, watchedOfferType);
      const normalizedRelatedLines = savedLine.relatedLines?.map((line) =>
        enforceExportVatOnLine(line, watchedOfferType),
      );
      const lineToSave = {
        ...normalizedSavedLine,
        relatedLines: normalizedRelatedLines,
      };

      if (editingLine) {
        const toUpdate = lineToSave.relatedLines?.length
          ? [lineToSave, ...lineToSave.relatedLines]
          : [lineToSave];
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
                const localized = await mapApiLinesToLocalizedFormState(
                  fetched,
                  mapDetailLinesToFormState,
                  i18n.language
                );
                setLines(localized);
                setLineFormVisible(false);
                setEditingLine(null);
                queueMicrotask(() => syncBaseline());
              },
            }
          );
          return;
        }
        setLines((prev) => {
          const mainNewQty = lineToSave.quantity;
          const mainOldQty = editingLine.quantity;
          const hasRelated = (lineToSave.relatedLines?.length ?? 0) > 0;
          if (hasRelated && lineToSave.relatedLines) {
            const others = prev.filter(
              (l) => l.id !== editingLine.id && l.relatedProductKey !== editingLine.relatedProductKey
            );
            return [lineToSave, ...lineToSave.relatedLines, ...others];
          }
          if (
            editingLine.relatedProductKey &&
            mainOldQty > 0 &&
            mainNewQty !== mainOldQty
          ) {
            const ratio = mainNewQty / mainOldQty;
            return prev.map((line) => {
              if (line.id === editingLine.id) return lineToSave;
              if (line.relatedProductKey === editingLine.relatedProductKey) {
                const newQty = Math.max(0, Math.round(line.quantity * ratio * 10000) / 10000);
                const updated = { ...line, quantity: newQty };
                return calculateLineTotals(updated);
              }
              return line;
            });
          }
          return prev.map((line) => (line.id === editingLine.id ? lineToSave : line));
        });
        setEditingLine(null);
        setLineFormVisible(false);
        return;
      }
      const isExistingQuotation = quotationId != null && quotationId > 0;
      const toAdd = lineToSave.relatedLines?.length
        ? [lineToSave, ...lineToSave.relatedLines]
        : [lineToSave];
      if (isExistingQuotation && quotationId != null) {
        const body = toAdd.map((line) => mapQuotationLineFormStateToCreateDto(line, quotationId));
        createQuotationLinesMutation.mutate(
          { quotationId, body },
          {
            onSuccess: async (data) => {
              await finalizeCreatedQuotationLineImages(quotationId, toAdd, data);
              const fetched = await quotationApi.getLinesByQuotation(quotationId);
              const localized = await mapApiLinesToLocalizedFormState(
                fetched,
                mapDetailLinesToFormState,
                i18n.language
              );
              setLines(localized);
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
    [editingLine, quotationId, createQuotationLinesMutation, updateQuotationLinesMutation, syncBaseline, watchedOfferType]
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
      let relatedStocks: Array<Pick<StockGetDto, "erpStockCode" | "stockName" | "englishStockName" | "grupKodu">> = [];

      if (filteredRelations.length > 0) {
        try {
          const fetched = await Promise.all(
            filteredRelations.map((r) => stockApi.getById(r.relatedStockId))
          );
          relatedStocks = fetched.map((s) => ({
            erpStockCode: s.erpStockCode,
            stockName: s.stockName,
            englishStockName: s.englishStockName,
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
      const mainProductName = await resolveDocumentLineProductName(
        { stockId: stock.id, code: stock.erpStockCode, name: stock.stockName },
        i18n.language
      );
      const mainLine: QuotationLineFormState = calculateLineTotals({
        id: `temp-${Date.now()}`,
        productId: stock.id,
        productCode: stock.erpStockCode,
        productName: mainProductName,
        groupCode: stock.grupKodu || null,
        quantity: 1,
        unitPrice: mainUnitPrice,
        discountRate1: mainPrice?.discount1 ?? 0,
        discountAmount1: 0,
        discountRate2: mainPrice?.discount2 ?? 0,
        discountAmount2: 0,
        discountRate3: mainPrice?.discount3 ?? 0,
        discountAmount3: 0,
        vatRate: resolveDocumentVatRate(18, watchedOfferType),
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
            productName:
              relStock != null
                ? getLocalizedStockNameFromStock(relStock, i18n.language)
                : relation.relatedStockName ?? "",
            quantity: relation.quantity,
            unitPrice,
            discountRate1: price?.discount1 ?? 0,
            discountAmount1: 0,
            discountRate2: price?.discount2 ?? 0,
            discountAmount2: 0,
            discountRate3: price?.discount3 ?? 0,
            discountAmount3: 0,
            vatRate: resolveDocumentVatRate(18, watchedOfferType),
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
    [watchedCurrency, exchangeRates, erpRatesForQuotation, currencyOptions, i18n.language, watchedOfferType]
  );

  const handleStartApproval = useCallback(() => {
    if (!quotationId) return;
    const totalAmount = totals.grandTotalAfterDiscount;
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
  }, [quotationId, startApproval, t, totals.grandTotalAfterDiscount]);

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

      const effectiveExchangeRatePayload = buildEffectiveExchangeRates(
        exchangeRates,
        erpRatesForQuotation,
        currencyOptions ?? [],
        formData.quotation.offerDate || new Date().toISOString().split("T")[0]
      );

      const exchangeRateRows = effectiveExchangeRatePayload.map((rate) => {
        const { id, dovizTipi, ...rest } = rate;
        return {
          id: parsePersistedRateId(id),
          data: {
            ...rest,
            quotationId,
            isOfficial: rest.isOfficial ?? true,
          },
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
        ozelKod1: formData.quotation.ozelKod1?.trim() || null,
        ozelKod2: formData.quotation.ozelKod2?.trim() || null,
        koliBaskiDefinitionId: formData.quotation.koliBaskiDefinitionId ?? null,
        revisionNo: formData.quotation.revisionNo ?? null,
        revisionId:
          formData.quotation.revisionId && formData.quotation.revisionId > 0
            ? formData.quotation.revisionId
            : null,
      };

      const persistedRateIds = new Set(ratesData.map((rate) => rate.id).filter((rateId) => rateId > 0));
      const currentPersistedRateIds = new Set(
        exchangeRateRows.map((rate) => rate.id).filter((rateId): rateId is number => rateId != null)
      );
      const deletedRateIds = Array.from(persistedRateIds).filter(
        (rateId) => !currentPersistedRateIds.has(rateId)
      );

      try {
        setIsSavingUpdate(true);
        await quotationApi.updateHeader(quotationId, quotationPayload);
        await Promise.all(deletedRateIds.map((rateId) => quotationApi.deleteQuotationExchangeRate(rateId)));
        await Promise.all(
          exchangeRateRows
            .filter((rate) => rate.id != null)
            .map((rate) => quotationApi.updateQuotationExchangeRate(rate.id as number, rate.data))
        );
        await Promise.all(
          exchangeRateRows
            .filter((rate) => rate.id == null)
            .map((rate) => quotationApi.createQuotationExchangeRate(rate.data))
        );
        await updateQuotationNotesMutation.mutateAsync({
          quotationId,
          data: { notes: notesToPutPayload(notes) },
        });
        await invalidateDocumentListAndDetailHeader(queryClient, "quotation", quotationId);
        await queryClient.invalidateQueries({
          queryKey: ["quotation", "detail", "lines", quotationId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["quotation", "detail", "exchangeRates", quotationId],
        });
        markSaved();
        showToast("success", t("common.quotationUpdated"));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("common.quotationUpdateFailed", "Teklif güncellenemedi");
        showToast("error", message, 10000);
      } finally {
        setIsSavingUpdate(false);
      }
    },
    [
      quotationId,
      lines,
      notes,
      exchangeRates,
      erpRatesForQuotation,
      currencyOptions,
      ratesData,
      updateQuotationNotesMutation,
      queryClient,
      setError,
      t,
      markSaved,
      showToast,
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

      const pdfExtras = buildSalesDocumentPreviewPdfExtras({
        t,
        koliBaskiDefinitionId: watchedKoliBaskiDefinitionId ?? header?.koliBaskiDefinitionId,
        koliBaskiDefinitionName: header?.koliBaskiDefinitionName,
        koliBaskiMap,
        description: watchedDescription ?? header?.description,
        structuredNotes: notes.filter((note) => note.trim().length > 0),
        lineDetailMaps: { profilMap, demirMap, vidaMap, baskiMap },
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
        footerDetails: pdfExtras.footerDetails,
        lineDetailLabels: pdfExtras.lineDetailLabels,
        lineDetailMaps: pdfExtras.lineDetailMaps,
      });
    },
    [
      baskiMap,
      branch,
      demirMap,
      header?.currency,
      header?.description,
      header?.erpCustomerCode,
      header?.koliBaskiDefinitionId,
      header?.koliBaskiDefinitionName,
      header?.offerDate,
      header?.offerNo,
      header?.potentialCustomerName,
      koliBaskiMap,
      lines,
      notes,
      profilMap,
      selectedCustomer?.name,
      t,
      vidaMap,
      watchedCurrency,
      watchedCustomerId,
      watchedDescription,
      watchedErpCustomerCode,
      watchedGeneralDiscountAmount,
      watchedGeneralDiscountRate,
      watchedKoliBaskiDefinitionId,
      watchedOfferDate,
      watchedOfferNo,
    ]
  );

  const pageTitle = header?.offerNo ?? (quotationId != null ? `#${quotationId}` : t("quotation.detail"));
  const isReadonly = isDocumentDetailReadOnlyWhileLoading(readOnlyState, canEditLoading);
  const showOnayaGonder = header?.status === APPROVAL_HAVENOT_STARTED && !isReadonly;
  const showSaveUpdate = !isReadonly;
  const showApproveReject = header?.status === APPROVAL_WAITING;
  const showRevise = header?.status === APPROVAL_REJECTED;
  const showCustomerCancel =
    Boolean(header) &&
    !header?.isERPIntegrated &&
    !isReadonly &&
    header?.status !== APPROVAL_CLOSED &&
    header?.status !== APPROVAL_CUSTOMER_CANCELLED &&
    header?.status !== APPROVAL_SALESPERSON_CLOSED_FOR_REVISION &&
    header?.status !== APPROVAL_SUPERSEDED_BY_APPROVED_REVISION;

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

  const handleRevise = useCallback(() => {
    if (quotationId == null) return;
    createRevision.mutate(quotationId);
  }, [createRevision, quotationId]);

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
              koliBaskiDefinitionId={watchedKoliBaskiDefinitionId ?? header?.koliBaskiDefinitionId}
              koliBaskiDefinitionName={header?.koliBaskiDefinitionName}
              metaFields={builtInReportMetaFields}
            />
          ) : (
            <FlatListScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: listContentBottomPadding(insets.bottom) },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <DocumentDetailStatusAlerts
                module="quotation"
                status={documentStatus}
                showApprovalLockBanner={readOnlyState.showApprovalLockBanner}
                cancellationReason={cancellationReason}
                isDark={isDark}
              />
              <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
                <View style={[styles.sectionLeadHeader, { borderBottomColor: sectionOutline }]}>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>{t("quotation.customerSection")}</Text>
                </View>

                <View style={styles.customerSelectRow}>
                  <TouchableOpacity
                    style={[
                      styles.customerSelectButton,
                      {
                        backgroundColor: innerBg,
                        borderColor: errors.quotation?.potentialCustomerId ? colors.error : innerBorder,
                        flex: 1,
                        marginBottom: 0,
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
                          {customerSelectLabel}
                        </Text>
                      </View>
                    </View>
                    <ArrowRight01Icon size={18} color={softText} variant="stroke" strokeWidth={1.8} />
                  </TouchableOpacity>
                  <CustomerErpBalanceAction
                    customerId={watchedCustomerId}
                    erpCustomerCode={watchedErpCustomerCode}
                    customerLabel={customerSelectLabel}
                  />
                </View>

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
                            {shippingAddresses.find((a) => a.id === value)
                              ? buildShippingAddressLabel(shippingAddresses.find((a) => a.id === value)!)
                              : t("quotation.select")}
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
                              {representativeDisplayLabel}
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
                  documentId={quotationId}
                  readOnly={isReadonly}
                />

                <Controller
                  control={control}
                  name="quotation.ozelKod1"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("quotation.ozelKod1")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.quotation?.ozelKod1 ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setSpecialCode1ModalVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                          {resolveSpecialCodeLabel(value, specialCode1Options, t("quotation.select"))}
                        </Text>
                      </TouchableOpacity>
                      {errors.quotation?.ozelKod1?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.quotation.ozelKod1.message}
                        </Text>
                      )}
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="quotation.ozelKod2"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("quotation.ozelKod2")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.quotation?.ozelKod2 ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setSpecialCode2ModalVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                          {resolveSpecialCodeLabel(value, specialCode2Options, t("quotation.select"))}
                        </Text>
                      </TouchableOpacity>
                      {errors.quotation?.ozelKod2?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.quotation.ozelKod2.message}
                        </Text>
                      )}
                    </View>
                  )}
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
                <QuotationLinesSectionHeader
                  lineCount={visibleMainLines.length}
                  canAddLine={canAddLine}
                  isReadonly={isReadonly}
                  onAddLine={handleAddLine}
                />

                {errors.root?.message && (
                  <Text style={[styles.fieldError, { color: colors.error }]}>{errors.root.message}</Text>
                )}

                {lines.length === 0 ? (
                  <Text style={[styles.emptyText, { color: softText }]}>{t("quotation.noLinesYet")}</Text>
                ) : (
                  <View style={styles.linesList}>
                    {visibleMainLines.map((line) => (
                      <QuotationFormLineGroup
                        key={line.id}
                        line={line}
                        isReadonly={isReadonly}
                        currencyLabel={lineListCurrencyLabel}
                        hideVatRate={hideVatRate}
                        onEdit={handleEditLine}
                        onDelete={handleDeleteLine}
                      />
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
                      {formatMoneyTr(totals.netTotal)}
                      {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                    </Text>
                  </View>
                  {totals.generalDiscountAmount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: accent }]}>
                        {t("quotation.generalDiscount")}
                      </Text>
                      <Text style={[styles.summaryValue, { color: accent }]}>
                        -{formatMoneyTr(totals.generalDiscountAmount)}
                        {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                      </Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: mutedText }]}>{t("quotation.totalVat")}</Text>
                    <Text style={[styles.summaryValue, { color: titleText }]}>
                      {formatMoneyTr(totals.totalVatAfterDiscount)}
                      {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.summaryGrandRow, { borderTopColor: sectionOutline }]}>
                    <Text style={[styles.summaryGrandLabel, { color: titleText }]}>
                      {t("quotation.grandTotal")}
                    </Text>
                    <Text style={[styles.summaryGrandValue, { color: accent }]}>
                      {formatMoneyTr(totals.grandTotalAfterDiscount)}
                      {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                    </Text>
                  </View>
                </View>
              )}

              <DocumentDetailActions
                visible={showApproveReject || showSaveUpdate}
                accent={accent}
                accentSecondary={colors.accentSecondary || "#f97316"}
                errorColor={colors.error}
                showApproveReject={showApproveReject}
                canApproveReject={canApproveReject}
                rejectPending={rejectAction.isPending}
                approvePending={approveAction.isPending}
                onReject={handleRejectClick}
                onApprove={handleApprove}
                rejectLabel={t("quotation.rejectButton")}
                approveLabel={t("quotation.approveButton")}
                showSaveUpdate={showSaveUpdate && !showApproveReject}
                hasUnsavedChanges={hasUnsavedChanges}
                isSavingUpdate={isSavingUpdate}
                onSaveUpdate={handleSaveUpdate}
                saveLabel={t("common.saveUpdate")}
                showOnayaGonder={showOnayaGonder}
                startApprovalPending={startApproval.isPending}
                onStartApproval={handleStartApproval}
                sendForApprovalLabel={t("quotation.sendForApproval")}
                showCustomerCancel={showCustomerCancel}
                cancelByCustomerPending={cancelByCustomer.isPending}
                onCustomerCancel={handleCustomerCancel}
                customerCancelLabel={t("quotation.customerCancelButton", "Müşteri İptali")}
                showRevise={showRevise}
                revisePending={createRevision.isPending}
                onRevise={handleRevise}
                reviseLabel={t("quotation.rowActions.revise")}
              />
            </FlatListScrollView>
          )}

          <QuotationLineForm
            visible={lineFormVisible}
            line={editingLine}
            offerType={watchedOfferType}
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
            exchangeRates={documentRatesForLines}
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
            visible={specialCode1ModalVisible}
            options={specialCode1Options.map((item) => ({
              id: item.ozelKod,
              name: formatSpecialCodeOptionName(item),
              code: item.ozelKod,
            }))}
            selectedValue={watch("quotation.ozelKod1") ?? undefined}
            onSelect={(option) => {
              setValue("quotation.ozelKod1", String(option.code ?? option.id), {
                shouldDirty: true,
                shouldValidate: true,
              });
              setSpecialCode1ModalVisible(false);
            }}
            onClose={() => setSpecialCode1ModalVisible(false)}
            title={t("quotation.ozelKod1")}
            searchPlaceholder={t("quotation.specialCodeSearch")}
            isLoading={isSpecialCodesLoading}
          />

          <PickerModal
            visible={specialCode2ModalVisible}
            options={specialCode2Options.map((item) => ({
              id: item.ozelKod,
              name: formatSpecialCodeOptionName(item),
              code: item.ozelKod,
            }))}
            selectedValue={watch("quotation.ozelKod2") ?? undefined}
            onSelect={(option) => {
              setValue("quotation.ozelKod2", String(option.code ?? option.id), {
                shouldDirty: true,
                shouldValidate: true,
              });
              setSpecialCode2ModalVisible(false);
            }}
            onClose={() => setSpecialCode2ModalVisible(false)}
            title={t("quotation.ozelKod2")}
            searchPlaceholder={t("quotation.specialCodeSearch")}
            isLoading={isSpecialCodesLoading}
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
            isLoading={isDefinitionOptionsLoading}
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
              options={shippingAddresses.map((a) => ({ id: a.id, name: buildShippingAddressLabel(a) }))}
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
  customerSelectRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginBottom: 10,
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

  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 18, fontStyle: "italic" },

  linesList: { gap: 10 },

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
