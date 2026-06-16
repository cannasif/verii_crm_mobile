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
import {
  SalesDocumentFormLineGroup,
  SalesDocumentLinesSectionHeader,
} from "@/components/shared/sales-document-line";
import { createClientId } from "@/lib/create-client-id";
import { getValidRelatedProductGroup } from "@/lib/relatedProductGroup";
import { resolveDocumentSerialCustomerTypeId } from "@/lib/resolve-document-serial-customer-type-id";
import {
  resolveDocumentCustomerSelectLabel,
  resolvePricingRuleCustomerCode,
} from "@/lib/customerIntegration";
import { resolveRepresentativeDisplayLabel } from "@/lib/resolveRepresentativeDisplayLabel";
import { resolveExchangeRateByCurrency as findExchangeRateByCurrency } from "@/lib/resolve-exchange-rate";
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
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Clock04Icon,
  FileEditIcon,
  Tick02Icon,
  SentIcon,
  FloppyDiskIcon,
} from "hugeicons-react-native";
import { DocumentDetailActions } from "../../../components/paged/DocumentDetailActions";
import { DocumentDetailStatusAlerts } from "../../../components/paged/DocumentDetailStatusAlerts";
import { listContentBottomPadding } from "../../../constants/layout";
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
import { demandApi } from "../api";
import {
  useDemandDetail,
  useStartApprovalFlow,
  useWaitingApprovals,
  useApproveAction,
  useRejectAction,
  useExchangeRate,
  useCurrencyOptions,
  usePaymentTypes,
  useRelatedUsers,
  usePriceRuleOfDemand,
  useUserDiscountLimitsBySalesperson,
  useUpdateExchangeRateInDemand,
  useDeleteDemandLine,
  useCreateDemandLines,
  useUpdateDemandLines,
  useCancelDemandByCustomer,
  useCanEditDemand,
  useCreateRevisionOfDemand,
} from "../hooks";
import {
  ExchangeRateDialog,
  PickerModal,
  DocumentSerialTypePicker,
  OfferTypePicker,
  DemandLineForm,
  DemandApprovalFlowTab,
  RejectModal,
} from "../components";
import { CustomerSelectDialog, type CustomerSelectionResult } from "../../customer";
import type { CustomerDto } from "../../customer/types";
import { ReportTab, DocumentRuleType } from "../../quotation";
import { createDemandSchema, type CreateDemandSchema } from "../schemas";
import type {
  DemandLineFormState,
  DemandExchangeRateFormState,
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
} from "../types";
import type { StockRelationDto } from "../../stocks/types";
import {
  mapDetailHeaderToForm,
  mapDetailLinesToFormState,
  mapDetailRatesToFormState,
  mapExchangeRateFormStateToUpdateDtos,
  parseLineId,
  mapDemandLineFormStateToCreateDto,
  mapDemandLineFormStateToUpdateDto,
  totalsFromDetailLines,
} from "../utils";
import { calculateLineTotals, calculateTotals } from "../utils";
import { resolveLineListCurrencyLabel } from "../../../lib/currencyDisplay";
import { getApiBaseUrl } from "../../../constants/config";
import { useDocumentDetailDirtyState } from "../../../hooks/useDocumentDetailDirtyState";
import { invalidateDocumentListAndDetailHeader } from "../../../lib/documentListQueryInvalidation";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida/hooks/useWindoDefinitionOptions";

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

function formatMoneyTr(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function parsePersistedRateId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  const text = String(value ?? "");
  const prefixedMatch = text.match(/^rate-(\d+)$/);
  if (prefixedMatch) return Number(prefixedMatch[1]);
  if (/^\d+$/.test(text)) return Number(text);
  return null;
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

export function DemandDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);
  const queryClient = useQueryClient();

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

  const demandId = id != null && id !== "" ? Number(id) : undefined;
  const isFocused = useIsFocused();
  const {
    header,
    lines: linesData,
    exchangeRates: ratesData,
    isLoading: detailLoading,
    isError: detailError,
    error: detailErrorObj,
    refetch,
  } = useDemandDetail(isFocused ? demandId : undefined);
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiOptions, isLoading: isDefinitionOptionsLoading } = useWindoDefinitionOptions();

  const formInitRef = useRef(false);
  const linesInitRef = useRef(false);
  const ratesInitRef = useRef(false);
  const erpRatesFilledRef = useRef(false);

  const [lines, setLines] = useState<DemandLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<DemandExchangeRateFormState[]>([]);
  const [erpRatesForDemand, setErpRatesForDemand] = useState<ExchangeRateDto[]>([]);
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
  const [koliBaskiModalVisible, setKoliBaskiModalVisible] = useState(false);
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [representativeModalVisible, setRepresentativeModalVisible] = useState(false);
  const [lineFormVisible, setLineFormVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<DemandLineFormState | null>(null);
  const [pendingStockForRelated, setPendingStockForRelated] = useState<
    (StockGetDto & { parentRelations: StockRelationDto[] }) | null
  >(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [customerCancellationVisible, setCustomerCancellationVisible] = useState(false);
  const [selectedApprovalForReject, setSelectedApprovalForReject] = useState<ApprovalActionGetDto | null>(null);
  const [deleteLineDialogVisible, setDeleteLineDialogVisible] = useState(false);
  const [deleteLineId, setDeleteLineId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "approval" | "report">("detail");

  const schema = useMemo(() => createDemandSchema(), []);

  const {
    control,
    setValue,
    watch,
    reset,
    clearErrors,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateDemandSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      demand: {
        offerType: "Domestic",
        currency: "",
        offerDate: new Date().toISOString().split("T")[0],
        deliveryDate: new Date().toISOString().split("T")[0],
        representativeId: user?.id ?? null,
        koliBaskiDefinitionId: null,
      },
    },
  });

  const watchedCurrency = watch("demand.currency");
  const watchedCustomerId = watch("demand.potentialCustomerId");
  const watchedErpCustomerCode = watch("demand.erpCustomerCode");
  const watchedRepresentativeId = watch("demand.representativeId");
  const watchedOfferDate = watch("demand.offerDate");
  const watchedDeliveryDate = watch("demand.deliveryDate");
  const formSnapshot = watch();

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
  const { data: relatedUsers = [] } = useRelatedUsers(user?.id);

  const representativeDisplayLabel = useMemo(
    () =>
      resolveRepresentativeDisplayLabel({
        representativeId: watchedRepresentativeId,
        representativeName: header?.representativeName,
        relatedUsers,
        emptyLabel: t("demand.select"),
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
        placeholder: t("demand.selectCustomerPlaceholder"),
      }),
    [selectedCustomer, watchedErpCustomerCode, t]
  );

  const effectiveRatesForLines = useMemo(() => {
    return erpRatesForDemand.map((erp) => {
      const override = exchangeRates.find(
        (r) => r.currency === String(erp.dovizTipi) || r.dovizTipi === erp.dovizTipi
      );
      return {
        dovizTipi: erp.dovizTipi,
        kurDegeri: override?.exchangeRate ?? erp.kurDegeri,
      };
    });
  }, [erpRatesForDemand, exchangeRates]);

  const { data: pricingRules } = usePriceRuleOfDemand({
    customerCode,
    salesmenId: watchedRepresentativeId || undefined,
    demandDate: watchedOfferDate || undefined,
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
    formInitRef.current &&
    linesInitRef.current &&
    ratesInitRef.current
  );

  const { hasUnsavedChanges, markSaved, syncBaseline } = useDocumentDetailDirtyState({
    resetKey: demandId,
    isHydrated: isDetailHydrated,
    formSnapshot,
    lines,
    exchangeRates,
  });

  const startApproval = useStartApprovalFlow();
  const cancelByCustomer = useCancelDemandByCustomer();
  const { data: waitingApprovalsData } = useWaitingApprovals();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();
  const createRevision = useCreateRevisionOfDemand();
  const documentStatus = header?.status ?? null;
  const { data: canEditWhileWaiting, isLoading: canEditLoading } = useCanEditDemand(
    demandId,
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
  const updateExchangeRateInDemand = useUpdateExchangeRateInDemand();
  const deleteDemandLineMutation = useDeleteDemandLine();
  const createDemandLinesMutation = useCreateDemandLines();
  const updateDemandLinesMutation = useUpdateDemandLines();

  useEffect(() => {
    if (exchangeRatesData?.length && !erpRatesFilledRef.current) {
      setErpRatesForDemand(exchangeRatesData);
      erpRatesFilledRef.current = true;
    }
  }, [exchangeRatesData]);

  useEffect(() => {
    if (!header || formInitRef.current) return;
    reset({ demand: mapDetailHeaderToForm(header) });
    formInitRef.current = true;
  }, [header, reset]);

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
    setValue("demand.potentialCustomerId", null);
    setValue("demand.erpCustomerCode", null);
    setValue("demand.shippingAddressId", null);
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

  const handleCustomerSelect = useCallback(
    (result: CustomerSelectionResult) => {
      setValue("demand.potentialCustomerId", result.customerId);
      setValue("demand.erpCustomerCode", result.erpCustomerCode ?? null);
      setValue("demand.shippingAddressId", null);
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
        setValue("demand.deliveryDate", d.toISOString().split("T")[0]);
      }
    },
    [setValue]
  );

  const handleOfferDateChange = useCallback(
    (_: DateTimePickerEvent, d?: Date) => {
      if (d) {
        setTempOfferDate(d);
        setValue("demand.offerDate", d.toISOString().split("T")[0]);
      }
    },
    [setValue]
  );

  const applyCurrencyChange = useCallback(
    (newCurrency: string) => {
      const oldCurrency = watchedCurrency || "";
      if (!oldCurrency || oldCurrency === newCurrency) {
        setValue("demand.currency", newCurrency);
        return;
      }

      const oldRate = findExchangeRateByCurrency(
        oldCurrency,
        exchangeRates,
        erpRatesForDemand,
        currencyOptions
      );
      const newRate = findExchangeRateByCurrency(
        newCurrency,
        exchangeRates,
        erpRatesForDemand,
        currencyOptions
      );

      if (oldRate == null || newRate == null || newRate <= 0) {
        setValue("demand.currency", newCurrency);
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
      setValue("demand.currency", newCurrency);
    },
    [watchedCurrency, exchangeRates, erpRatesForDemand, currencyOptions, setValue]
  );

  const handleCurrencySelect = useCallback(
    (newCurrency: string) => {
      if (lines.length === 0) {
        setValue("demand.currency", newCurrency);
        setCurrencyModalVisible(false);
        return;
      }

      Alert.alert(
        t("demand.currencyChangeTitle"),
        t("demand.currencyChangeMessage"),
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

  const handleAddLine = useCallback(() => {
    if ((!watchedCustomerId && !watchedErpCustomerCode) || !watchedRepresentativeId || !watchedCurrency) {
      showToast("error", t("common.selectCustomerRepresentativeCurrency"));
      return;
    }
    setEditingLine(null);
    setLineFormVisible(true);
  }, [watchedCustomerId, watchedErpCustomerCode, watchedRepresentativeId, watchedCurrency, showToast, t]);

  const canAddLine = Boolean((watchedCustomerId || watchedErpCustomerCode) && watchedRepresentativeId && watchedCurrency);

  const handleEditLine = useCallback((line: DemandLineFormState) => {
    setEditingLine(line);
    setLineFormVisible(true);
  }, []);

  const handleSaveLine = useCallback(
    (savedLine: DemandLineFormState) => {
      if (editingLine) {
        const toUpdate = savedLine.relatedLines?.length
          ? [savedLine, ...savedLine.relatedLines]
          : [savedLine];
        const updateDtos =
          demandId != null
            ? toUpdate
                .map((line) => mapDemandLineFormStateToUpdateDto(line, demandId))
                .filter((dto): dto is NonNullable<typeof dto> => dto != null)
            : [];
        const isExistingDemand = demandId != null && demandId > 0 && updateDtos.length > 0;
        if (isExistingDemand && demandId != null) {
          updateDemandLinesMutation.mutate(
            { demandId, body: updateDtos },
            {
              onSuccess: async () => {
                const fetched = await demandApi.getLinesByDemand(demandId);
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
      const isExistingDemand = demandId != null && demandId > 0;
      const toAdd = savedLine.relatedLines?.length
        ? [savedLine, ...savedLine.relatedLines]
        : [savedLine];
      if (isExistingDemand && demandId != null) {
        const body = toAdd.map((line) => mapDemandLineFormStateToCreateDto(line, demandId));
        createDemandLinesMutation.mutate(
          { demandId, body },
          {
            onSuccess: async (data) => {
              const mapped = mapDetailLinesToFormState(data);
              const localized = await localizeDocumentLineFormStates(mapped, i18n.language);
              const merged = localized.map((apiLine, index) =>
                toAdd[index] ? mergeCreatedLineProductName(apiLine, toAdd[index]) : apiLine
              );
              setLines((prev) => [...prev, ...merged]);
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
    [editingLine, demandId, createDemandLinesMutation, updateDemandLinesMutation, syncBaseline]
  );

  const handleDeleteLine = useCallback((lineId: string) => {
    setDeleteLineId(lineId);
    setDeleteLineDialogVisible(true);
  }, []);

  const handleDeleteLineCancel = useCallback(() => {
    if (!deleteDemandLineMutation.isPending) {
      setDeleteLineDialogVisible(false);
      setDeleteLineId(null);
    }
  }, [deleteDemandLineMutation.isPending]);

  const handleDeleteLineConfirm = useCallback(() => {
    if (deleteLineId == null) return;
    const lineId = deleteLineId;
    const backendLineId = demandId != null ? parseLineId(lineId) : 0;
    const isExistingDemand = demandId != null && demandId > 0 && backendLineId > 0;
    if (isExistingDemand && demandId != null) {
      deleteDemandLineMutation.mutate(
        { demandId, lineId: backendLineId },
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
  }, [deleteLineId, demandId, deleteDemandLineMutation]);

  const handleProductSelectWithRelatedStocks = useCallback(
    async (stock: StockGetDto, relatedStockIds?: number[]) => {
      if (!stock.id) return;

      const applyCurrencyToPrice = (listPrice: number, priceCurrency: string): number => {
        if (!watchedCurrency || priceCurrency === watchedCurrency) return listPrice;
        const oldRate = findExchangeRateByCurrency(priceCurrency, exchangeRates, erpRatesForDemand, currencyOptions);
        const newRate = findExchangeRateByCurrency(watchedCurrency, exchangeRates, erpRatesForDemand, currencyOptions);
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
        priceData = await demandApi.getPriceOfProduct(products);
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
      const mainLine: DemandLineFormState = calculateLineTotals({
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
        const relatedLines: DemandLineFormState[] = filteredRelations.map((relation, idx) => {
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
    [watchedCurrency, exchangeRates, erpRatesForDemand, currencyOptions, i18n.language]
  );

  const handleStartApproval = useCallback(() => {
    if (!demandId) return;
    const totalAmount = totals.grandTotal;
    Alert.alert(
      t("demand.sendForApproval"),
      t("demand.sendForApprovalConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" as const },
        {
          text: t("common.confirm"),
          onPress: () =>
            startApproval.mutate({
              entityId: demandId,
              documentType: PricingRuleType.Demand,
              totalAmount,
            }),
        },
      ]
    );
  }, [demandId, startApproval, t, totals.grandTotal]);

  const handleCustomerCancel = useCallback(() => {
    setCustomerCancellationVisible(true);
  }, []);

  const handleConfirmCustomerCancel = useCallback(
    (reason: string) => {
      if (!demandId) return;
      cancelByCustomer.mutate(
        { id: demandId, reason },
        {
          onSuccess: () => setCustomerCancellationVisible(false),
        }
      );
    },
    [cancelByCustomer, demandId]
  );

  const onSaveUpdate = useCallback(
    async (formData: CreateDemandSchema) => {
      if (!demandId) return;

      if (lines.length === 0) {
        setError("root", {
          type: "manual",
          message: t("demand.atLeastOneLine", "En az 1 satır eklenmelidir."),
        });
        return;
      }

      const exchangeRateRows = exchangeRates.map((rate) => {
        const { id, dovizTipi, ...rest } = rate;
        return {
          id: parsePersistedRateId(id),
          data: {
            ...rest,
            demandId,
            isOfficial: rest.isOfficial ?? true,
          },
        };
      });

      const demandPayload = {
        ...formData.demand,
        revisionNo: formData.demand.revisionNo ?? null,
        revisionId:
          formData.demand.revisionId && formData.demand.revisionId > 0
            ? formData.demand.revisionId
            : null,
        koliBaskiDefinitionId: formData.demand.koliBaskiDefinitionId ?? null,
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
        await demandApi.updateHeader(demandId, demandPayload);
        await Promise.all(deletedRateIds.map((rateId) => demandApi.deleteDemandExchangeRate(rateId)));
        await Promise.all(
          exchangeRateRows
            .filter((rate) => rate.id != null)
            .map((rate) => demandApi.updateDemandExchangeRate(rate.id as number, rate.data))
        );
        await Promise.all(
          exchangeRateRows
            .filter((rate) => rate.id == null)
            .map((rate) => demandApi.createDemandExchangeRate(rate.data))
        );
        await invalidateDocumentListAndDetailHeader(queryClient, "demand", demandId);
        await queryClient.invalidateQueries({
          queryKey: ["demand", "detail", "lines", demandId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["demand", "detail", "exchangeRates", demandId],
        });
        markSaved();
        showToast("success", t("common.demandUpdated"));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("common.demandUpdateFailed");
        showToast("error", message, 10000);
      } finally {
        setIsSavingUpdate(false);
      }
    },
    [demandId, lines, exchangeRates, ratesData, setError, t, markSaved, queryClient, showToast]
  );

  const onInvalidSaveUpdate = useCallback(() => {
    showToast("error", t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun"));
  }, [showToast, t]);

  const handleSaveUpdate = useCallback(() => {
    void handleSubmit(onSaveUpdate, onInvalidSaveUpdate)();
  }, [handleSubmit, onSaveUpdate, onInvalidSaveUpdate]);

  const pageTitle = header?.offerNo ?? (demandId != null ? `#${demandId}` : t("demand.detail"));
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
    () => (waitingApprovalsData ?? []).find((a) => a.approvalRequestId === demandId) ?? null,
    [waitingApprovalsData, demandId]
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
    if (demandId == null) return;
    createRevision.mutate(demandId);
  }, [createRevision, demandId]);

  if (!demandId) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.container, { backgroundColor: mainBg }]}>
          <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <ScreenHeader title={t("demand.detail")} showBackButton />
          <View style={styles.centered}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.errText, { color: colors.error }]}>{t("demand.invalidId")}</Text>
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
          <ScreenHeader title={t("demand.detail")} showBackButton />
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
          <ScreenHeader title={t("demand.detail")} showBackButton />
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
            rightElement={statusKind ? <StatusBadge kind={statusKind} isDark={isDark} /> : undefined}
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

          {activeTab === "approval" && demandId != null ? (
            <DemandApprovalFlowTab demandId={demandId} />
          ) : activeTab === "report" && demandId != null ? (
            <ReportTab entityId={demandId} ruleType={DocumentRuleType.Demand} />
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
                module="demand"
                status={documentStatus}
                showApprovalLockBanner={readOnlyState.showApprovalLockBanner}
                cancellationReason={cancellationReason}
                isDark={isDark}
              />
              <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
                <View style={[styles.sectionLeadHeader, { borderBottomColor: sectionOutline }]}>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>{t("demand.customerSection")}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.customerSelectButton,
                    {
                      backgroundColor: innerBg,
                      borderColor: errors.demand?.potentialCustomerId ? colors.error : innerBorder,
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
                        {t("demand.selectCustomer")}
                      </Text>
                      <Text style={[styles.customerSelectValue, { color: titleText }]} numberOfLines={1}>
                        {customerSelectLabel}
                      </Text>
                    </View>
                  </View>
                  <ArrowRight01Icon size={18} color={softText} variant="stroke" strokeWidth={1.8} />
                </TouchableOpacity>

                {errors.demand?.potentialCustomerId?.message && (
                  <Text style={[styles.fieldError, { color: colors.error }]}>
                    {errors.demand.potentialCustomerId.message}
                  </Text>
                )}

                {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
                  <Controller
                    control={control}
                    name="demand.shippingAddressId"
                    render={({ field: { value } }) => (
                      <View style={styles.fieldContainerTight}>
                        <Text style={[styles.labelCompact, { color: mutedText }]}>
                          {t("demand.shippingAddress")}
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
                              : t("demand.select")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>

              <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
                <View style={[styles.sectionLeadHeader, { borderBottomColor: sectionOutline }]}>
                  <Text style={[styles.sectionTitle, { color: titleText }]}>{t("demand.demandInfo")}</Text>
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={styles.twoColumnItem}>
                    <OfferTypePicker control={control} disabled={isReadonly} compact />
                  </View>
                  <View style={styles.twoColumnItem}>
                    <Controller
                      control={control}
                      name="demand.representativeId"
                      render={() => (
                        <View style={styles.fieldContainerTight}>
                          <Text style={[styles.labelCompact, { color: mutedText }]}>
                            {t("demand.representative")}
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
                  name="demand.paymentTypeId"
                  render={() => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("demand.paymentType")} <Text style={{ color: colors.error }}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.demand?.paymentTypeId ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setPaymentTypeModalVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                          {paymentTypes?.find((p) => p.id === watch("demand.paymentTypeId"))?.name ?? t("demand.select")}
                        </Text>
                      </TouchableOpacity>
                      {errors.demand?.paymentTypeId?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.demand.paymentTypeId.message}
                        </Text>
                      )}
                    </View>
                  )}
                />

                <View style={styles.twoColumnRow}>
                  <View style={styles.twoColumnItem}>
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("demand.deliveryDate")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.dateCell,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.demand?.deliveryDate ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setDeliveryDateModalOpen(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.dateCellValue, { color: titleText }]} numberOfLines={1}>
                          {watchedDeliveryDate || t("demand.select")}
                        </Text>
                      </TouchableOpacity>
                      {errors.demand?.deliveryDate?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.demand.deliveryDate.message}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.twoColumnItem}>
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("demand.offerDate")}
                      </Text>
                      <TouchableOpacity
                        style={[styles.dateCell, { backgroundColor: innerBg, borderColor: innerBorder }]}
                        onPress={() => !isReadonly && setOfferDateModalOpen(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.dateCellValue, { color: titleText }]} numberOfLines={1}>
                          {watchedOfferDate || t("demand.select")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <Controller
                  control={control}
                  name="demand.currency"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <View style={styles.currencyHeader}>
                        <Text style={[styles.labelCompact, { color: mutedText }]}>
                          {t("demand.currency")} <Text style={{ color: colors.error }}>*</Text>
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
                                {t("demand.exchangeRates")}
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
                            borderColor: errors.demand?.currency ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => !isReadonly && setCurrencyModalVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                          {currencyOptions?.find((c) => c.code === value)?.dovizIsmi ?? t("demand.select")}
                        </Text>
                      </TouchableOpacity>
                      {errors.demand?.currency?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.demand.currency.message}
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
                  documentId={demandId}
                  readOnly={isReadonly}
                />

                <Controller
                  control={control}
                  name="demand.koliBaskiDefinitionId"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: mutedText }]}>
                        {t("demand.koliBaski")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          { backgroundColor: innerBg, borderColor: innerBorder },
                        ]}
                        onPress={() => !isReadonly && setKoliBaskiModalVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : 0.85}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: titleText }]} numberOfLines={1}>
                          {value
                            ? koliBaskiOptions.find((option) => option.id === value)?.name ?? t("demand.select")
                            : t("demand.select")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />

                <FormField
                  label={t("demand.description")}
                  value={watch("demand.description") || ""}
                  onChangeText={(txt) => setValue("demand.description", txt || null)}
                  placeholder={t("demand.descriptionPlaceholder")}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  editable={!isReadonly}
                />
              </View>

              <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
                <SalesDocumentLinesSectionHeader
                  lineCount={visibleMainLines.length}
                  canAddLine={canAddLine}
                  isReadonly={isReadonly}
                  translationPrefix="demand"
                  onAddLine={handleAddLine}
                />

                {errors.root?.message && (
                  <Text style={[styles.fieldError, { color: colors.error }]}>{errors.root.message}</Text>
                )}

                {lines.length === 0 ? (
                  <Text style={[styles.emptyText, { color: softText }]}>{t("demand.noLinesYet")}</Text>
                ) : (
                  <View style={styles.linesList}>
                    {visibleMainLines.map((line) => (
                      <SalesDocumentFormLineGroup
                        key={line.id}
                        line={line}
                        isReadonly={isReadonly}
                        currencyLabel={lineListCurrencyLabel}
                        translationPrefix="demand"
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
                      {t("demand.summary")}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: mutedText }]}>{t("demand.subtotal")}</Text>
                    <Text style={[styles.summaryValue, { color: titleText }]}>
                      {formatMoneyTr(totals.subtotal)}
                      {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: mutedText }]}>{t("demand.totalVat")}</Text>
                    <Text style={[styles.summaryValue, { color: titleText }]}>
                      {formatMoneyTr(totals.totalVat)}
                      {lineListCurrencyLabel ? ` ${lineListCurrencyLabel}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.summaryGrandRow, { borderTopColor: sectionOutline }]}>
                    <Text style={[styles.summaryGrandLabel, { color: titleText }]}>
                      {t("demand.grandTotal")}
                    </Text>
                    <Text style={[styles.summaryGrandValue, { color: accent }]}>
                      {formatMoneyTr(totals.grandTotal)}
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
                rejectLabel={t("demand.rejectButton")}
                approveLabel={t("demand.approveButton")}
                showSaveUpdate={showSaveUpdate && !showApproveReject}
                hasUnsavedChanges={hasUnsavedChanges}
                isSavingUpdate={isSavingUpdate}
                onSaveUpdate={handleSaveUpdate}
                saveLabel={t("common.saveUpdate")}
                showOnayaGonder={showOnayaGonder}
                startApprovalPending={startApproval.isPending}
                onStartApproval={handleStartApproval}
                sendForApprovalLabel={t("demand.sendForApproval")}
                showCustomerCancel={showCustomerCancel}
                cancelByCustomerPending={cancelByCustomer.isPending}
                onCustomerCancel={handleCustomerCancel}
                customerCancelLabel={t("demand.customerCancelButton", "Müşteri İptali")}
                showRevise={showRevise}
                revisePending={createRevision.isPending}
                onRevise={handleRevise}
                reviseLabel={t("demand.rowActions.revise")}
              />
            </FlatListScrollView>
          )}

          <DemandLineForm
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
            title={t("demand.customerCancelTitle", "Müşteri iptali")}
            description={t("demand.customerCancelDescription", "Bu talebi müşteri tarafından iptal edildi olarak işaretlemek üzeresiniz.")}
            reasonLabel={t("demand.customerCancelReasonLabel", "İptal nedeni")}
            reasonPlaceholder={t("demand.customerCancelReasonPlaceholder", "Müşterinin iptal nedenini yazın...")}
            cancelLabel={t("common.cancel")}
            confirmLabel={t("demand.customerCancelConfirmButton", "İptal Et")}
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
                disabled={deleteDemandLineMutation.isPending}
              />
              <View style={[styles.deleteConfirmBox, { backgroundColor: shellBgAlt, borderColor: sectionOutline }]}>
                <Text style={[styles.deleteConfirmTitle, { color: titleText }]}>
                  {deleteLineId != null && (() => {
                    const lineToDelete = lines.find((l) => l.id === deleteLineId);
                    const sameGroup = getValidRelatedProductGroup(lines, lineToDelete);
                    const relatedCount = sameGroup.length - 1;
                    return relatedCount > 0
                      ? t("demand.deleteRelatedGroupTitle")
                      : t("demand.deleteLineTitle");
                  })()}
                </Text>
                <Text style={[styles.deleteConfirmMessage, { color: mutedText }]}>
                  {deleteLineId != null && (() => {
                    const lineToDelete = lines.find((l) => l.id === deleteLineId);
                    const sameGroup = getValidRelatedProductGroup(lines, lineToDelete);
                    const relatedCount = sameGroup.length - 1;
                    return relatedCount > 0
                      ? t("demand.deleteRelatedGroupMessage", { count: relatedCount })
                      : t("demand.deleteLineMessage");
                  })()}
                </Text>
                <View style={styles.deleteConfirmActions}>
                  <TouchableOpacity
                    style={[styles.deleteConfirmCancelBtn, { borderColor: innerBorder }]}
                    onPress={handleDeleteLineCancel}
                    disabled={deleteDemandLineMutation.isPending}
                  >
                    <Text style={[styles.deleteConfirmCancelTxt, { color: titleText }]}>
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deleteConfirmDeleteBtn,
                      { backgroundColor: colors.error },
                      deleteDemandLineMutation.isPending && styles.deleteConfirmBtnDisabled,
                    ]}
                    onPress={handleDeleteLineConfirm}
                    disabled={deleteDemandLineMutation.isPending}
                  >
                    {deleteDemandLineMutation.isPending ? (
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
                  <Text style={[styles.modalTitle, { color: titleText }]}>{t("demand.deliveryDate")}</Text>
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
                    setValue("demand.deliveryDate", tempDeliveryDate.toISOString().split("T")[0]);
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
                  <Text style={[styles.modalTitle, { color: titleText }]}>{t("demand.offerDate")}</Text>
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
                    setValue("demand.offerDate", tempOfferDate.toISOString().split("T")[0]);
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
            erpExchangeRates={erpRatesForDemand}
            isLoadingErpRates={isLoadingErpRates && erpRatesForDemand.length === 0}
            currencyInUse={linesData.length > 0 ? (watchedCurrency || undefined) : undefined}
            useDemandRatesAsPrimary={true}
            onClose={() => setExchangeRateDialogVisible(false)}
            onSave={(rates) => {
              if (demandId != null && demandId > 0 && header != null) {
                const body = mapExchangeRateFormStateToUpdateDtos(
                  rates,
                  demandId,
                  header.offerNo ?? null
                );
                updateExchangeRateInDemand.mutate(
                  { demandId, body },
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
            selectedValue={watch("demand.paymentTypeId") ?? undefined}
            onSelect={(o) => {
              setValue("demand.paymentTypeId", o.id as number);
              setPaymentTypeModalVisible(false);
            }}
            onClose={() => setPaymentTypeModalVisible(false)}
            title={t("demand.selectPaymentType")}
            searchPlaceholder={t("demand.searchPaymentType")}
          />

          <PickerModal
            visible={currencyModalVisible}
            options={currencyOptions?.map((c) => ({ id: c.code, name: c.dovizIsmi ?? c.code, code: c.code })) ?? []}
            selectedValue={watch("demand.currency")}
            onSelect={(o) => handleCurrencySelect(o.id as string)}
            onClose={() => setCurrencyModalVisible(false)}
            title={t("demand.selectCurrency")}
            searchPlaceholder={t("demand.searchCurrency")}
          />

          <PickerModal
            visible={representativeModalVisible}
            options={relatedUsers.map((u) => ({
              id: u.userId,
              name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
            }))}
            selectedValue={watch("demand.representativeId") ?? undefined}
            onSelect={(o) => {
              setValue("demand.representativeId", o.id as number);
              setRepresentativeModalVisible(false);
            }}
            onClose={() => setRepresentativeModalVisible(false)}
            title={t("demand.selectRepresentative")}
            searchPlaceholder={t("demand.searchRepresentative")}
          />

          <PickerModal
            visible={koliBaskiModalVisible}
            options={koliBaskiOptions.map((option) => ({
              id: option.id,
              name: option.name,
            }))}
            selectedValue={watch("demand.koliBaskiDefinitionId") ?? undefined}
            onSelect={(option) => {
              setValue("demand.koliBaskiDefinitionId", option.id as number);
              setKoliBaskiModalVisible(false);
            }}
            onClose={() => setKoliBaskiModalVisible(false)}
            title={t("demand.koliBaski")}
            searchPlaceholder={t("demand.koliBaskiSearch")}
            isLoading={isDefinitionOptionsLoading}
          />

          {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
            <PickerModal
              visible={shippingAddressModalVisible}
              options={shippingAddresses.map((a) => ({ id: a.id, name: buildShippingAddressLabel(a) }))}
              selectedValue={watch("demand.shippingAddressId") ?? undefined}
              onSelect={(o) => {
                setValue("demand.shippingAddressId", o.id as number);
                setShippingAddressModalVisible(false);
              }}
              onClose={() => setShippingAddressModalVisible(false)}
              title={t("demand.selectShippingAddress")}
              searchPlaceholder={t("demand.searchAddress")}
            />
          )}
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

  addButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 18, fontStyle: "italic" },
  linesList: { gap: 10 },

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
