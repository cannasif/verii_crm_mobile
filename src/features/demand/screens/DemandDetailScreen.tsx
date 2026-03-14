import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { resolveDocumentSerialCustomerTypeId } from "@/lib/resolve-document-serial-customer-type-id";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useToastStore } from "../../../store/toast";
import { FormField } from "../../activity/components";
import { useCustomer } from "../../customer/hooks";
import { useCustomerShippingAddresses } from "../../shipping-address/hooks";
import { stockApi } from "../../stocks/api";
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
} from "../hooks";
import {
  ExchangeRateDialog,
  PickerModal,
  DocumentSerialTypePicker,
  OfferTypePicker,
  DemandLineForm,
  DemandApprovalFlowTab,
  ProductPicker,
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
  groupDemandLines,
  totalsFromDetailLines,
} from "../utils";
import { calculateLineTotals, calculateTotals } from "../utils";

function findExchangeRateByCurrency(
  currency: string,
  formRates: DemandExchangeRateFormState[],
  erpRates: ExchangeRateDto[] | undefined
): number | undefined {
  const formRate = formRates.find((r) => r.currency === currency)?.exchangeRate;
  if (formRate != null && formRate > 0) return formRate;
  const erpRate = erpRates?.find((r) => String(r.dovizTipi) === currency)?.kurDegeri;
  if (erpRate != null && erpRate > 0) return erpRate;
  return undefined;
}

export function DemandDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, themeMode } = useUIStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.showToast);

  const demandId = id != null && id !== "" ? Number(id) : undefined;
  const {
    header,
    lines: linesData,
    exchangeRates: ratesData,
    isLoading: detailLoading,
    isError: detailError,
    error: detailErrorObj,
    refetch,
  } = useDemandDetail(demandId);

  const contentBackground = themeMode === "dark" ? "rgba(20, 10, 30, 0.5)" : colors.background;

  const formInitRef = useRef(false);
  const linesInitRef = useRef(false);
  const ratesInitRef = useRef(false);
  const erpRatesFilledRef = useRef(false);

  const [lines, setLines] = useState<DemandLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<DemandExchangeRateFormState[]>([]);
  const [erpRatesForDemand, setErpRatesForDemand] = useState<ExchangeRateDto[]>([]);
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
  const [lineFormVisible, setLineFormVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<DemandLineFormState | null>(null);
  const [pendingStockForRelated, setPendingStockForRelated] = useState<
    (StockGetDto & { parentRelations: StockRelationDto[] }) | null
  >(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
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
    setError,
    clearErrors,
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
      },
    },
  });

  const watchedCurrency = watch("demand.currency");
  const watchedCustomerId = watch("demand.potentialCustomerId");
  const watchedErpCustomerCode = watch("demand.erpCustomerCode");
  const watchedRepresentativeId = watch("demand.representativeId");
  const watchedOfferDate = watch("demand.offerDate");
  const watchedDeliveryDate = watch("demand.deliveryDate");

  const { data: customer } = useCustomer(watchedCustomerId ?? undefined);
  const { data: shippingAddresses } = useCustomerShippingAddresses(watchedCustomerId ?? undefined);
  const exchangeRateParams = useMemo(
    () => ({ tarih: new Date().toISOString().split("T")[0], fiyatTipi: 1 as const }),
    []
  );
  const { data: exchangeRatesData, isLoading: isLoadingErpRates } = useExchangeRate(exchangeRateParams);
  const { data: currencyOptions } = useCurrencyOptions(exchangeRateParams);
  const { data: paymentTypes } = usePaymentTypes();
  const { data: relatedUsers = [] } = useRelatedUsers(user?.id);

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

  const lineGroups = useMemo(() => groupDemandLines(linesData), [linesData]);
  const apiTotals = useMemo(() => totalsFromDetailLines(linesData), [linesData]);
  const totals = useMemo(() => calculateTotals(lines), [lines]);
  const displayCurrency = header?.currency ?? watchedCurrency ?? "";

  const startApproval = useStartApprovalFlow();
  const { data: waitingApprovalsData } = useWaitingApprovals();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();
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

  const handleAddLine = useCallback(() => {
    if ((!watchedCustomerId && !watchedErpCustomerCode) || !watchedRepresentativeId || !watchedCurrency) {
      showToast("error", t("common.selectCustomerRepresentativeCurrency"));
      return;
    }
    setEditingLine(null);
    setLineFormVisible(true);
  }, [watchedCustomerId, watchedErpCustomerCode, watchedRepresentativeId, watchedCurrency, showToast]);

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
                setLines(mapDetailLinesToFormState(fetched));
                setLineFormVisible(false);
                setEditingLine(null);
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
            onSuccess: (data) => {
              setLines((prev) => [...prev, ...mapDetailLinesToFormState(data)]);
              setLineFormVisible(false);
              setEditingLine(null);
            },
          }
        );
        return;
      }
      setLines((prev) => [...prev, ...toAdd]);
      setEditingLine(null);
      setLineFormVisible(false);
    },
    [editingLine, demandId, createDemandLinesMutation, updateDemandLinesMutation]
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
    const lineToDelete = lines.find((line) => line.id === lineId);
    const sameGroup = lineToDelete?.relatedProductKey
      ? lines.filter((l) => l.relatedProductKey === lineToDelete.relatedProductKey)
      : [];
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
      if (toDelete?.relatedProductKey) {
        return prev.filter(
          (line) => line.id !== lineId && line.relatedProductKey !== toDelete.relatedProductKey
        );
      }
      if (toDelete?.relatedLines && toDelete.relatedLines.length > 0) {
        const relatedIds = toDelete.relatedLines.map((rl) => rl.id);
        return prev.filter((line) => line.id !== lineId && !relatedIds.includes(line.id));
      }
      return prev.filter((line) => line.id !== lineId);
    });
    setDeleteLineDialogVisible(false);
    setDeleteLineId(null);
  }, [deleteLineId, lines, demandId, deleteDemandLineMutation]);

  const handleProductSelectWithRelatedStocks = useCallback(
    async (stock: StockGetDto, relatedStockIds?: number[]) => {
      if (!stock.id) return;

      const applyCurrencyToPrice = (listPrice: number, priceCurrency: string): number => {
        if (!watchedCurrency || priceCurrency === watchedCurrency) return listPrice;
        const oldRate = findExchangeRateByCurrency(priceCurrency, exchangeRates, erpRatesForDemand);
        const newRate = findExchangeRateByCurrency(watchedCurrency, exchangeRates, erpRatesForDemand);
        if (oldRate == null || oldRate <= 0 || newRate == null || newRate <= 0) return listPrice;
        return (listPrice * newRate) / oldRate;
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
        priceData = await demandApi.getPriceOfProduct(products);
      } catch {
        priceData = products.map(() => ({ listPrice: 0, currency: watchedCurrency || "" }));
      }

      const mainPrice = priceData[0];
      const mainUnitPrice = mainPrice
        ? applyCurrencyToPrice(mainPrice.listPrice, mainPrice.currency)
        : 0;
      const mainLine: DemandLineFormState = calculateLineTotals({
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
        relatedProductKey: `main-${stock.id}`,
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
            relatedProductKey: `main-${stock.id}`,
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
    [watchedCurrency, exchangeRates, erpRatesForDemand]
  );

  const handleStartApproval = useCallback(() => {
    if (!demandId) return;
    Alert.alert(
      t("demand.sendForApproval"),
      t("demand.sendForApprovalConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" as const },
        { text: t("common.confirm"), onPress: () => startApproval.mutate(demandId) },
      ]
    );
  }, [demandId, startApproval, t]);

  const pageTitle = header?.offerNo ?? (demandId != null ? `#${demandId}` : t("demand.detail"));
  const isReadonly = header?.status === APPROVAL_APPROVED || header?.status === APPROVAL_REJECTED;
  const showOnayaGonder = header?.status === APPROVAL_HAVENOT_STARTED;
  const showApproveReject = header?.status === APPROVAL_WAITING;

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

  if (!demandId) {
    return (
      <>
        <StatusBar style="light" />
        <View style={[styles.container, { backgroundColor: colors.header }]}>
          <ScreenHeader title={t("demand.detail")} showBackButton />
          <View style={[styles.content, { backgroundColor: contentBackground }]}>
            <View style={styles.centered}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={[styles.errText, { color: colors.error }]}>
                  {t("demand.invalidId")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </>
    );
  }

  if (detailLoading && !header) {
    return (
      <>
        <StatusBar style="light" />
        <View style={[styles.container, { backgroundColor: colors.header }]}>
          <ScreenHeader title={t("demand.detail")} showBackButton />
          <View style={[styles.content, { backgroundColor: contentBackground }]}>
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          </View>
        </View>
      </>
    );
  }

  if (detailError && !header) {
    return (
      <>
        <StatusBar style="light" />
        <View style={[styles.container, { backgroundColor: colors.header }]}>
          <ScreenHeader title={t("demand.detail")} showBackButton />
          <View style={[styles.content, { backgroundColor: contentBackground }]}>
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
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.header }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScreenHeader title={pageTitle} showBackButton />
        <View style={[styles.tabBar, { backgroundColor: colors.header }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "detail" && styles.tabActive,
              activeTab === "detail" && { borderBottomColor: colors.accent },
            ]}
            onPress={() => setActiveTab("detail")}
          >
            <Text style={[styles.tabText, activeTab === "detail" && { color: colors.accent }]}>
              {t("common.tabDetail")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "approval" && styles.tabActive,
              activeTab === "approval" && { borderBottomColor: colors.accent },
            ]}
            onPress={() => setActiveTab("approval")}
          >
            <Text style={[styles.tabText, activeTab === "approval" && { color: colors.accent }]}>
              {t("common.tabApprovalFlow")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "report" && styles.tabActive,
              activeTab === "report" && { borderBottomColor: colors.accent },
            ]}
            onPress={() => setActiveTab("report")}
          >
            <Text style={[styles.tabText, activeTab === "report" && { color: colors.accent }]}>
              {t("common.tabReport")}
            </Text>
          </TouchableOpacity>
        </View>
        {activeTab === "approval" && demandId != null ? (
          <DemandApprovalFlowTab demandId={demandId} />
        ) : activeTab === "report" && demandId != null ? (
          <ReportTab entityId={demandId} ruleType={DocumentRuleType.Demand} />
        ) : (
        <FlatListScrollView
          style={[styles.content, { backgroundColor: contentBackground }]}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("demand.customerSection")}
            </Text>
            <TouchableOpacity
              style={[
                styles.customerBtn,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: errors.demand?.potentialCustomerId ? colors.error : colors.border,
                },
              ]}
              onPress={() => !isReadonly && setCustomerSelectDialogOpen(true)}
              disabled={isReadonly}
              activeOpacity={isReadonly ? 1 : undefined}
            >
              <View style={styles.customerBtnInner}>
                <Text style={styles.customerIcon}>👤</Text>
                <View style={styles.customerTextWrap}>
                  <Text style={[styles.customerLabel, { color: colors.textSecondary }]}>
                    {t("demand.selectCustomer")}
                  </Text>
                  <Text style={[styles.customerValue, { color: colors.text }]} numberOfLines={1}>
                    {selectedCustomer?.name ??
                      (watchedErpCustomerCode ? `ERP: ${watchedErpCustomerCode}` : t("demand.selectCustomerPlaceholder"))}
                  </Text>
                </View>
              </View>
              <Text style={[styles.customerArrow, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
            {errors.demand?.potentialCustomerId?.message && (
              <Text style={[styles.fieldErr, { color: colors.error }]}>
                {errors.demand.potentialCustomerId.message}
              </Text>
            )}
            {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
              <Controller
                control={control}
                name="demand.shippingAddressId"
                render={({ field: { value } }) => (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      {t("demand.shippingAddress")}
                    </Text>
                    <TouchableOpacity
                      style={[styles.pickerBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                      onPress={() => !isReadonly && setShippingAddressModalVisible(true)}
                      disabled={isReadonly}
                      activeOpacity={isReadonly ? 1 : undefined}
                    >
                      <Text style={[styles.pickerTxt, { color: colors.text }]}>
                        {shippingAddresses.find((a) => a.id === value)?.address ?? t("demand.select")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("demand.demandInfo")}
            </Text>
            <OfferTypePicker control={control} disabled={isReadonly} />
            <Controller
              control={control}
              name="demand.representativeId"
              render={() => (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t("demand.representative")}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pickerBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={() => !isReadonly && setRepresentativeModalVisible(true)}
                    disabled={isReadonly}
                    activeOpacity={isReadonly ? 1 : undefined}
                  >
                    <Text style={[styles.pickerTxt, { color: colors.text }]}>
                      {watchedRepresentativeId
                        ? (() => {
                            const u = relatedUsers.find((u) => u.userId === watchedRepresentativeId);
                            return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : String(watchedRepresentativeId);
                          })()
                        : t("demand.select")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            <Controller
              control={control}
              name="demand.paymentTypeId"
              render={() => (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t("demand.paymentType")} <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerBtn,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: errors.demand?.paymentTypeId ? colors.error : colors.border,
                      },
                    ]}
                    onPress={() => !isReadonly && setPaymentTypeModalVisible(true)}
                    disabled={isReadonly}
                    activeOpacity={isReadonly ? 1 : undefined}
                  >
                    <Text style={[styles.pickerTxt, { color: colors.text }]}>
                      {paymentTypes?.find((p) => p.id === watch("demand.paymentTypeId"))?.name ?? t("demand.select")}
                    </Text>
                  </TouchableOpacity>
                  {errors.demand?.paymentTypeId?.message && (
                    <Text style={[styles.fieldErr, { color: colors.error }]}>
                      {errors.demand.paymentTypeId.message}
                    </Text>
                  )}
                </View>
              )}
            />
            <View style={styles.field}>
              <TouchableOpacity
                style={[
                  styles.dateBtn,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: errors.demand?.deliveryDate ? colors.error : colors.border,
                  },
                ]}
                onPress={() => !isReadonly && setDeliveryDateModalOpen(true)}
                disabled={isReadonly}
                activeOpacity={isReadonly ? 1 : undefined}
              >
                <Text style={[styles.dateBtnTxt, { color: colors.text }]}>
                  {t("demand.deliveryDate")}: {watchedDeliveryDate ?? t("demand.select")}
                </Text>
              </TouchableOpacity>
              {errors.demand?.deliveryDate?.message && (
                <Text style={[styles.fieldErr, { color: colors.error }]}>
                  {errors.demand.deliveryDate.message}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => !isReadonly && setOfferDateModalOpen(true)}
              disabled={isReadonly}
              activeOpacity={isReadonly ? 1 : undefined}
            >
              <Text style={[styles.dateBtnTxt, { color: colors.text }]}>
                {t("demand.offerDate")}: {watchedOfferDate ?? t("demand.select")}
              </Text>
            </TouchableOpacity>
            <Controller
              control={control}
              name="demand.currency"
              render={({ field: { value } }) => (
                <View style={styles.field}>
                  <View style={styles.currencyRow}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      {t("demand.currency")} <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    {value && (
                      <TouchableOpacity
                        style={[styles.kurlarBtn, { backgroundColor: colors.accent }]}
                        onPress={() => !isReadonly && setExchangeRateDialogVisible(true)}
                        disabled={isReadonly}
                        activeOpacity={isReadonly ? 1 : undefined}
                      >
                        <Text style={styles.kurlarBtnTxt}>💱 {t("demand.exchangeRates")}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.pickerBtn,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: errors.demand?.currency ? colors.error : colors.border,
                      },
                    ]}
                    onPress={() => !isReadonly && setCurrencyModalVisible(true)}
                    disabled={isReadonly}
                    activeOpacity={isReadonly ? 1 : undefined}
                  >
                    <Text style={[styles.pickerTxt, { color: colors.text }]}>
                      {currencyOptions?.find((c) => c.code === value)?.dovizIsmi ?? t("demand.select")}
                    </Text>
                  </TouchableOpacity>
                  {errors.demand?.currency?.message && (
                    <Text style={[styles.fieldErr, { color: colors.error }]}>
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

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("demand.lines")}</Text>
              {!isReadonly && (
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    { backgroundColor: colors.accent },
                    !canAddLine && styles.submitBtnDisabled,
                  ]}
                  onPress={handleAddLine}
                  disabled={!canAddLine}
                >
                  <Text style={styles.addButtonText}>+ Satır Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
            {errors.root?.message && (
              <Text style={[styles.fieldErr, { color: colors.error }]}>{errors.root.message}</Text>
            )}

            {lines.length === 0 ? (
              <Text style={[styles.emptyTxt, { color: colors.textMuted }]}>
                {t("demand.noLinesYet")}
              </Text>
            ) : (
              <FlatList
                data={lines.filter((line) => !line.relatedProductKey || line.isMainRelatedProduct === true)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item: line }) => (
                  <View style={styles.lineCardWrapper}>
                    <View
                      style={[
                        styles.lineCard,
                        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                        line.approvalStatus === 1 && { borderColor: colors.warning, borderWidth: 2 },
                      ]}
                    >
                      <View style={styles.lineCardHeader}>
                        <View style={styles.lineCardContent}>
                          <View style={styles.lineCardTitleRow}>
                            <Text style={[styles.lineProductName, { color: colors.text }]} numberOfLines={2}>
                              {line.productName || t("demand.productNotSelected")}
                            </Text>
                            {(line.isMainRelatedProduct || !line.relatedProductKey) && (
                              <View style={[styles.mainBadge, { backgroundColor: colors.backgroundSecondary }]}>
                                <Text style={[styles.mainBadgeText, { color: colors.accent }]}>
                                  {t("demand.main")}
                                </Text>
                              </View>
                            )}
                          </View>
                          {line.productCode ? (
                            <Text style={[styles.lineProductCode, { color: colors.textMuted }]}>{line.productCode}</Text>
                          ) : null}
                          <View style={styles.lineDetailRows}>
                            <View style={styles.lineDetailRow}>
                              <Text style={[styles.lineDetailLabel, { color: colors.textMuted }]}>{t("demand.quantity")}:</Text>
                              <Text style={[styles.lineDetailValue, { color: colors.text }]}>
                                {line.quantity.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </View>
                            <View style={styles.lineDetailRow}>
                              <Text style={[styles.lineDetailLabel, { color: colors.textMuted }]}>{t("demand.unitPrice")}:</Text>
                              <Text style={[styles.lineDetailValue, { color: colors.text }]}>
                                {line.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </View>
                            <View style={styles.lineDetailRow}>
                              <Text style={[styles.lineDetailLabel, { color: colors.textMuted }]}>{t("demand.lineTotal")}:</Text>
                              <Text style={[styles.lineDetailValue, { color: colors.text }]}>
                                {line.lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </View>
                            <View style={[styles.lineGrandTotalRow, { borderTopColor: colors.border }]}>
                              <Text style={[styles.lineGrandTotalLabel, { color: colors.text }]}>{t("demand.lineGrandTotalLabel")}:</Text>
                              <Text style={[styles.lineGrandTotalValue, { color: colors.accent }]}>
                                {line.lineGrandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </View>
                          </View>
                          {line.approvalStatus === 1 && (
                            <View style={[styles.approvalBadge, { backgroundColor: colors.warning + "20" }]}>
                              <Text style={[styles.approvalBadgeText, { color: colors.warning }]}>⚠️ {t("demand.approvalRequired")}</Text>
                            </View>
                          )}
                        </View>
                        {!isReadonly && (
                        <View style={styles.lineActions}>
                          <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.accent }]} onPress={() => handleEditLine(line)}>
                            <Text style={styles.editButtonText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.error }]} onPress={() => handleDeleteLine(line.id)}>
                            <Text style={styles.deleteButtonText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      </View>
                      {line.relatedLines && line.relatedLines.length > 0 && (
                        <View style={[styles.relatedLinesContainer, { borderTopColor: colors.border }]}>
                          <Text style={[styles.relatedLinesTitle, { color: colors.textMuted }]}>{t("demand.relatedStocks")}</Text>
                          {line.relatedLines.map((relatedLine) => (
                            <View key={relatedLine.id} style={[styles.relatedLineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                              <Text style={[styles.relatedLineProductName, { color: colors.text }]} numberOfLines={2}>{relatedLine.productName}</Text>
                              {relatedLine.productCode ? (
                                <Text style={[styles.relatedLineProductCode, { color: colors.textMuted }]}>{relatedLine.productCode}</Text>
                              ) : null}
                              <View style={styles.lineDetailRow}>
                                <Text style={[styles.lineDetailLabel, { color: colors.textMuted }]}>{t("demand.quantity")}:</Text>
                                <Text style={[styles.lineDetailValue, { color: colors.text }]}>
                                  {relatedLine.quantity.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                              </View>
                              <View style={[styles.lineGrandTotalRow, { borderTopColor: colors.border }]}>
                                <Text style={[styles.lineGrandTotalLabel, { color: colors.text }]}>{t("demand.lineGrandTotalLabel")}:</Text>
                                <Text style={[styles.lineGrandTotalValue, { color: colors.accent }]}>
                                  {relatedLine.lineGrandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}
              />
            )}
          </View>

          {lines.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("demand.summary")}</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t("demand.subtotal")}:
                </Text>
                <Text style={[styles.summaryVal, { color: colors.text }]}>
                  {totals.subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t("demand.totalVat")}:
                </Text>
                <Text style={[styles.summaryVal, { color: colors.text }]}>
                  {totals.totalVat.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>
                  {t("demand.grandTotal")}:
                </Text>
                <Text style={[styles.summaryVal, { color: colors.accent, fontWeight: "600" }]}>
                  {totals.grandTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.submitRow}>
            {showApproveReject && (
              <>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.error }]}
                  onPress={handleRejectClick}
                  disabled={!canApproveReject || rejectAction.isPending}
                >
                  {rejectAction.isPending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnTxt}>{t("demand.rejectButton")}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.success }]}
                  onPress={handleApprove}
                  disabled={!canApproveReject || approveAction.isPending}
                >
                  {approveAction.isPending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnTxt}>{t("demand.approveButton")}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            {!isReadonly && !showApproveReject && showOnayaGonder && (
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.success }]}
                onPress={handleStartApproval}
                disabled={startApproval.isPending}
              >
                {startApproval.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnTxt}>{t("demand.sendForApproval")}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
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

        <Modal visible={deleteLineDialogVisible} transparent animationType="fade">
          <View style={[styles.modalOverlay, styles.deleteConfirmOverlay]}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={handleDeleteLineCancel}
              disabled={deleteDemandLineMutation.isPending}
            />
            <View style={[styles.deleteConfirmBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.deleteConfirmTitle, { color: colors.text }]}>
                {deleteLineId != null && (() => {
                  const lineToDelete = lines.find((l) => l.id === deleteLineId);
                  const sameGroup = lineToDelete?.relatedProductKey
                    ? lines.filter((l) => l.relatedProductKey === lineToDelete.relatedProductKey)
                    : [];
                  const relatedCount = sameGroup.length - 1;
                  return relatedCount > 0
                    ? t("demand.deleteRelatedGroupTitle")
                    : t("demand.deleteLineTitle");
                })()}
              </Text>
              <Text style={[styles.deleteConfirmMessage, { color: colors.textSecondary }]}>
                {deleteLineId != null && (() => {
                  const lineToDelete = lines.find((l) => l.id === deleteLineId);
                  const sameGroup = lineToDelete?.relatedProductKey
                    ? lines.filter((l) => l.relatedProductKey === lineToDelete.relatedProductKey)
                    : [];
                  const relatedCount = sameGroup.length - 1;
                  return relatedCount > 0
                    ? t("demand.deleteRelatedGroupMessage", { count: relatedCount })
                    : t("demand.deleteLineMessage");
                })()}
              </Text>
              <View style={styles.deleteConfirmActions}>
                <TouchableOpacity
                  style={[styles.deleteConfirmCancelBtn, { borderColor: colors.border }]}
                  onPress={handleDeleteLineCancel}
                  disabled={deleteDemandLineMutation.isPending}
                >
                  <Text style={[styles.deleteConfirmCancelTxt, { color: colors.text }]}>
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
                    <ActivityIndicator color="#FFF" size="small" />
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
            <View style={[styles.modalBox, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t("demand.deliveryDate")}</Text>
              <DateTimePicker
                value={tempDeliveryDate}
                mode="date"
                display="spinner"
                onChange={handleDeliveryDateChange}
                locale="tr-TR"
              />
              <TouchableOpacity
                style={[styles.modalOkBtn, { backgroundColor: colors.accent }]}
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
            <View style={[styles.modalBox, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t("demand.offerDate")}</Text>
              <DateTimePicker
                value={tempOfferDate}
                mode="date"
                display="spinner"
                onChange={handleOfferDateChange}
                locale="tr-TR"
              />
              <TouchableOpacity
                style={[styles.modalOkBtn, { backgroundColor: colors.accent }]}
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
          onSelect={(o) => {
            setValue("demand.currency", o.id as string);
            setCurrencyModalVisible(false);
          }}
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

        {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
          <PickerModal
            visible={shippingAddressModalVisible}
            options={shippingAddresses.map((a) => ({ id: a.id, name: a.address ?? "" }))}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  content: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  contentContainer: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  errText: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  section: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
  pickerBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  pickerTxt: { fontSize: 15 },
  dateBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  dateBtnTxt: { fontSize: 15 },
  currencyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  kurlarBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  kurlarBtnTxt: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  customerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  customerBtnInner: { flexDirection: "row", alignItems: "center", flex: 1 },
  customerIcon: { fontSize: 20, marginRight: 12 },
  customerTextWrap: { flex: 1 },
  customerLabel: { fontSize: 12, marginBottom: 2 },
  customerValue: { fontSize: 15, fontWeight: "500" },
  customerArrow: { fontSize: 20, fontWeight: "300", marginLeft: 8 },
  fieldErr: { fontSize: 12, marginTop: 4, marginBottom: 4 },
  emptyTxt: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  lineCardWrapper: { marginBottom: 12 },
  lineCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  lineCardHeader: { flexDirection: "row", justifyContent: "space-between" },
  lineCardContent: { flex: 1, marginRight: 12 },
  lineCardTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  lineProductName: { fontSize: 15, fontWeight: "600", flex: 1 },
  mainBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  mainBadgeText: { fontSize: 11, fontWeight: "700" },
  lineProductCode: { fontSize: 12, marginBottom: 8 },
  lineDetailRows: { marginBottom: 4 },
  lineDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  lineDetailLabel: { fontSize: 13 },
  lineDetailValue: { fontSize: 13, fontWeight: "500" },
  lineGrandTotalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  lineGrandTotalLabel: { fontSize: 13 },
  lineGrandTotalValue: { fontSize: 13, fontWeight: "600" },
  lineActions: { justifyContent: "center", gap: 8 },
  editButton: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  editButtonText: { fontSize: 18 },
  deleteButton: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  deleteButtonText: { fontSize: 18 },
  approvalBadge: { padding: 8, borderRadius: 6, marginTop: 8 },
  approvalBadgeText: { fontSize: 12 },
  relatedLinesContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  relatedLinesTitle: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  relatedLineCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  relatedLineProductName: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  relatedLineProductCode: { fontSize: 12, marginBottom: 8 },
  lineGroup: { marginBottom: 16 },
  relatedBlock: { marginTop: 8, marginLeft: 4 },
  relatedTitle: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryVal: { fontSize: 14, fontWeight: "500" },
  submitRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center" },
  cancelBtnTxt: { fontSize: 16, fontWeight: "600" },
  submitBtn: { flex: 1, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnTxt: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  deleteConfirmOverlay: { justifyContent: "center", alignItems: "center" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  deleteConfirmBox: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 12,
    width: "100%",
    maxWidth: 340,
  },
  deleteConfirmTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  deleteConfirmMessage: { fontSize: 14, marginBottom: 20 },
  deleteConfirmActions: { flexDirection: "row", gap: 12 },
  deleteConfirmCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmCancelTxt: { fontSize: 16, fontWeight: "600" },
  deleteConfirmDeleteBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  deleteConfirmDeleteTxt: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  deleteConfirmBtnDisabled: { opacity: 0.7 },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16 },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16, paddingHorizontal: 20 },
  modalOkBtn: { marginHorizontal: 20, marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  modalOkTxt: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
