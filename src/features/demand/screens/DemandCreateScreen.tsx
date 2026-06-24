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
import { CustomerErpBalanceAction } from "@/components/shared/CustomerErpBalanceAction";
import { createClientId } from "@/lib/create-client-id";
import { getValidRelatedProductGroup } from "@/lib/relatedProductGroup";
import { resolveDocumentSerialCustomerTypeId } from "@/lib/resolve-document-serial-customer-type-id";
import {
  resolveDocumentCustomerSelectLabel,
  resolvePricingRuleCustomerCode,
} from "@/lib/customerIntegration";
import {
  hasDocumentExchangeRate,
  resolveExchangeRateByCurrency as findExchangeRateByCurrency,
} from "@/lib/resolve-exchange-rate";
import { buildDocumentExchangeRatesForLines } from "@/lib/document-exchange-rates";
import { applyExchangeRateChangeToLines } from "@/lib/salesDocumentExchangeRate";
import { resolveLineListCurrencyLabel } from "../../../lib/currencyDisplay";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import {
  UserIcon,
  ArrowRight01Icon,
  MoneyExchange01Icon,
} from "hugeicons-react-native";
import {
  SalesDocumentFormLineGroup,
  SalesDocumentLinesSectionHeader,
} from "@/components/shared/sales-document-line";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useSystemSettingsStore } from "../../../store/system-settings";
import { useAuthStore } from "../../../store/auth";
import { useToastStore } from "../../../store/toast";
import { FormField } from "../../activity/components";
import { useCustomer, useCustomerScopeAccess } from "../../customer/hooks";
import { useCustomerShippingAddresses } from "../../shipping-address/hooks";
import { buildShippingAddressLabel } from "../../shipping-address/utils/shippingAddressLabel";
import { useErpCustomers } from "../../erp-customer/hooks";
import { useStock } from "../../stocks/hooks";
import { stockApi } from "../../stocks/api";
import { resolveDocumentLineProductName } from "../../stocks/utils";
import { getLocalizedStockNameFromStock } from "../../../lib/localizedStockName";
import { demandApi } from "../api";
import { useSpecialCodes } from "../../common/hooks/useSpecialCodes";
import {
  formatSpecialCodeOptionName,
  resolveSpecialCodeLabel,
} from "../../common/utils/specialCodeLabel";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida/hooks/useWindoDefinitionOptions";
import {
  useCreateDemandBulk,
  usePriceRuleOfDemand,
  useUserDiscountLimitsBySalesperson,
  useExchangeRate,
  useCurrencyOptions,
  usePaymentTypes,
  useRelatedUsers,
} from "../hooks";
import {
  DemandLineForm,
  ExchangeRateDialog,
  PickerModal,
  DocumentSerialTypePicker,
  OfferTypePicker,
  ProductPicker,
} from "../components";
import { CustomerSelectDialog, type CustomerSelectionResult } from "../../customer";
import type { CustomerDto } from "../../customer/types";
import { createDemandSchema, type CreateDemandSchema } from "../schemas";
import type {
  DemandLineFormState,
  DemandExchangeRateFormState,
  StockGetDto,
} from "../types";
import type { StockRelationDto } from "../../stocks/types";
import type { ProductSelectionResult } from "../../stocks/types";
import { calculateLineTotals, calculateTotals } from "../utils";
import type { ExchangeRateDto } from "../types";
import { enforceExportVatOnLine, isExportOfferType, resolveDocumentVatRate } from "../../../utils/documentVat";
import {
  canApplySpecialCodeDefault,
  getDefaultSpecialCodeForOfferType,
  hasSpecialCodeOption,
} from "@/lib/salesDocumentSpecialCodeDefaults";

export function DemandCreateScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
  const hideVatRate = useSystemSettingsStore((state) => state.settings.hideDemandVatRate);
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((state) => state.showToast);

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#0c0516" : "#FFFFFF";
  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];
  const contentBackground = "transparent";

  const shellBg = colors.card;
  const shellBgAlt = isDark ? "rgba(23,10,38,0.99)" : "rgba(255,255,255,0.98)";
  const shellBorder = colors.cardBorder;
  const sectionOutline = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)";
  const innerBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const innerBorder = isDark ? "rgba(255,255,255,0.10)" : colors.border;
  const titleText = colors.text;
  const mutedText = colors.textSecondary;
  const softText = colors.textMuted;
  const accent = colors.accent;

  const [lines, setLines] = useState<DemandLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<DemandExchangeRateFormState[]>([]);
  const [erpRatesForDemand, setErpRatesForDemand] = useState<ExchangeRateDto[]>([]);
  const hasFilledErpRates = useRef(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>();
  const [deliveryDateModalOpen, setDeliveryDateModalOpen] = useState(false);
  const [offerDateModalOpen, setOfferDateModalOpen] = useState(false);
  const [tempDeliveryDate, setTempDeliveryDate] = useState(new Date());
  const [tempOfferDate, setTempOfferDate] = useState(new Date());
  const [lineFormVisible, setLineFormVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<DemandLineFormState | null>(null);
  const [exchangeRateDialogVisible, setExchangeRateDialogVisible] = useState(false);
  const [paymentTypeModalVisible, setPaymentTypeModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [shippingAddressModalVisible, setShippingAddressModalVisible] = useState(false);
  const [specialCode1ModalVisible, setSpecialCode1ModalVisible] = useState(false);
  const [specialCode2ModalVisible, setSpecialCode2ModalVisible] = useState(false);
  const [koliBaskiModalVisible, setKoliBaskiModalVisible] = useState(false);
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [representativeModalVisible, setRepresentativeModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "lines">("general");
  const [pendingStockForRelated, setPendingStockForRelated] = useState<
    (StockGetDto & { parentRelations: StockRelationDto[] }) | null
  >(null);

  const schema = useMemo(() => createDemandSchema(), []);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateDemandSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      demand: {
        offerType: "Domestic",
        currency: "",
        offerDate: new Date().toISOString().split("T")[0],
        deliveryDate: new Date().toISOString().split("T")[0],
        representativeId: user?.id || null,
        ozelKod1: "",
        ozelKod2: "",
        koliBaskiDefinitionId: null,
      },
    },
  });

  const watchedCurrency = watch("demand.currency");

  const handleExchangeRatesSave = useCallback(
    (rates: DemandExchangeRateFormState[]) => {
      const currency = watchedCurrency == null ? "" : String(watchedCurrency);
      const oldRate = exchangeRates.find(
        (rate) => rate.currency === currency || String(rate.dovizTipi) === currency
      );
      const newRate = rates.find(
        (rate) => rate.currency === currency || String(rate.dovizTipi) === currency
      );
      const oldValue = Number(oldRate?.exchangeRate ?? 0);
      const newValue = Number(newRate?.exchangeRate ?? 0);

      if (oldValue > 0 && newValue > 0 && oldValue !== newValue) {
        setLines((prev) => applyExchangeRateChangeToLines(prev, oldValue, newValue, calculateLineTotals));
      }

      setExchangeRates(rates);
      setExchangeRateDialogVisible(false);
    },
    [exchangeRates, watchedCurrency]
  );
  const watchedCustomerId = watch("demand.potentialCustomerId");
  const watchedErpCustomerCode = watch("demand.erpCustomerCode");
  const watchedRepresentativeId = watch("demand.representativeId");
  const watchedOfferDate = watch("demand.offerDate");
  const watchedDeliveryDate = watch("demand.deliveryDate");
  const watchedOfferType = watch("demand.offerType");
  const specialCodeManualChangeRef = useRef({ ozelKod1: false, ozelKod2: false });
  const { specialCode1Options, specialCode2Options, isSpecialCodesLoading } = useSpecialCodes("demand");

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
    const nextSpecialCode = getDefaultSpecialCodeForOfferType(watchedOfferType);
    if (!nextSpecialCode || isSpecialCodesLoading) return;

    const currentOzelKod1 = getValues("demand.ozelKod1");
    const currentOzelKod2 = getValues("demand.ozelKod2");
    const hasOzelKod1Default = hasSpecialCodeOption(specialCode1Options, nextSpecialCode);
    const hasOzelKod2Default = hasSpecialCodeOption(specialCode2Options, nextSpecialCode);

    if (
      hasOzelKod1Default &&
      !specialCodeManualChangeRef.current.ozelKod1 &&
      currentOzelKod1 !== nextSpecialCode &&
      canApplySpecialCodeDefault(currentOzelKod1)
    ) {
      setValue("demand.ozelKod1", nextSpecialCode, { shouldDirty: false, shouldValidate: true });
    }

    if (
      hasOzelKod2Default &&
      !specialCodeManualChangeRef.current.ozelKod2 &&
      currentOzelKod2 !== nextSpecialCode &&
      canApplySpecialCodeDefault(currentOzelKod2)
    ) {
      setValue("demand.ozelKod2", nextSpecialCode, { shouldDirty: false, shouldValidate: true });
    }
  }, [
    watchedOfferType,
    isSpecialCodesLoading,
    specialCode1Options,
    specialCode2Options,
    getValues,
    setValue,
  ]);

  useEffect(() => {
    if (deliveryDateModalOpen) {
      const initial = watchedDeliveryDate
        ? new Date(watchedDeliveryDate + "T12:00:00")
        : new Date();
      setTempDeliveryDate(initial);
    }
  }, [deliveryDateModalOpen, watchedDeliveryDate]);

  const { data: customer } = useCustomer(watchedCustomerId ?? undefined);
  const { data: isCustomerInRepresentativeScope } = useCustomerScopeAccess(
    watchedCustomerId ?? undefined,
    watchedRepresentativeId ?? undefined
  );
  const { data: shippingAddresses } = useCustomerShippingAddresses(watchedCustomerId ?? undefined);
  const { data: erpCustomers } = useErpCustomers();
  const exchangeRateParamsOnce = useMemo(
    () => ({
      tarih: new Date().toISOString().split("T")[0],
      fiyatTipi: 1 as const,
    }),
    []
  );

  const { data: exchangeRatesData, isLoading: isLoadingErpRates } = useExchangeRate(exchangeRateParamsOnce);
  const { data: currencyOptions } = useCurrencyOptions(exchangeRateParamsOnce);
  const { data: paymentTypes } = usePaymentTypes();
  const { data: relatedUsers = [] } = useRelatedUsers(user?.id);

  useEffect(() => {
    if (exchangeRatesData && exchangeRatesData.length > 0 && !hasFilledErpRates.current) {
      setErpRatesForDemand(exchangeRatesData);
      hasFilledErpRates.current = true;
    }
  }, [exchangeRatesData]);

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
  const documentRatesForLines = useMemo(
    () => buildDocumentExchangeRatesForLines(exchangeRates),
    [exchangeRates]
  );

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

  const customerTypeId = useMemo(() => {
    return resolveDocumentSerialCustomerTypeId({
      erpCustomerCode: watchedErpCustomerCode,
      selectedCustomerId: watchedCustomerId,
      customerTypeId: customer?.customerTypeId,
    });
  }, [watchedErpCustomerCode, watchedCustomerId, customer?.customerTypeId]);

  const { data: pricingRules } = usePriceRuleOfDemand({
    customerCode,
    salesmenId: watchedRepresentativeId || undefined,
    demandDate: watchedOfferDate || undefined,
  });

  const { data: userDiscountLimits } = useUserDiscountLimitsBySalesperson(
    watchedRepresentativeId || undefined
  );

  useEffect(() => {
    if (!watchedCustomerId || isCustomerInRepresentativeScope !== false) return;

    setSelectedCustomer(undefined);
    setValue("demand.potentialCustomerId", null);
    setValue("demand.erpCustomerCode", null);
    setValue("demand.shippingAddressId", null);
  }, [isCustomerInRepresentativeScope, setValue, watchedCustomerId]);

  const createDemand = useCreateDemandBulk();

  useEffect(() => {
    if (lines.length > 0) {
      clearErrors("root");
    }
  }, [lines.length, clearErrors]);

  useEffect(() => {
    if (customer) {
      setSelectedCustomer(customer);
    }
  }, [customer]);

  const totals = useMemo(() => calculateTotals(lines), [lines]);

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

  const handleCustomerChange = useCallback(
    (customer: CustomerDto | undefined) => {
      setSelectedCustomer(customer);
      setValue("demand.potentialCustomerId", customer?.id || null);
      setValue("demand.erpCustomerCode", null);
      setValue("demand.shippingAddressId", null);
    },
    [setValue]
  );

  const handleDeliveryDateChange = useCallback(
    (_: DateTimePickerEvent, selectedDate?: Date) => {
      if (selectedDate) {
        setTempDeliveryDate(selectedDate);
        setValue("demand.deliveryDate", selectedDate.toISOString().split("T")[0]);
      }
    },
    [setValue]
  );

  const handleOfferDateChange = useCallback(
    (_: DateTimePickerEvent, selectedDate?: Date) => {
      if (selectedDate) {
        setTempOfferDate(selectedDate);
        setValue("demand.offerDate", selectedDate.toISOString().split("T")[0]);
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
      const oldRate = findExchangeRateByCurrency(oldCurrency, exchangeRates, erpRatesForDemand, currencyOptions);
      const newRate = findExchangeRateByCurrency(newCurrency, exchangeRates, erpRatesForDemand, currencyOptions);
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
    [watchedCurrency, exchangeRates, erpRatesForDemand, setValue]
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
          { text: t("common.cancel"), style: "cancel", onPress: () => setCurrencyModalVisible(false) },
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
    [lines.length, setValue, applyCurrencyChange, t]
  );

  const ensureDocumentExchangeRate = useCallback((): boolean => {
    if (
      hasDocumentExchangeRate(
        watchedCurrency || "",
        exchangeRates,
        erpRatesForDemand,
        currencyOptions,
        { allowErpFallback: false }
      )
    ) {
      return true;
    }

    showToast("error", "Kur değeri 0 olan para birimiyle stok eklenemez. Lütfen önce döviz kurunu girin.");
    return false;
  }, [watchedCurrency, exchangeRates, erpRatesForDemand, currencyOptions, showToast]);

  const handleAddLine = useCallback(() => {
    if ((!watchedCustomerId && !watchedErpCustomerCode) || !watchedRepresentativeId || !watchedCurrency) {
      showToast("error", t("common.selectCustomerRepresentativeCurrency"));
      return;
    }

    if (!ensureDocumentExchangeRate()) return;
    setEditingLine(null);
    setLineFormVisible(true);
  }, [
    watchedCustomerId,
    watchedErpCustomerCode,
    watchedRepresentativeId,
    watchedCurrency,
    ensureDocumentExchangeRate,
    showToast,
    t,
  ]);

  const canAddLine = Boolean((watchedCustomerId || watchedErpCustomerCode) && watchedRepresentativeId && watchedCurrency);

  const lineListCurrencyLabel = useMemo(
    () => resolveLineListCurrencyLabel(watchedCurrency, currencyOptions ?? null),
    [watchedCurrency, currencyOptions]
  );
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiOptions } = useWindoDefinitionOptions();

  const handleEditLine = useCallback(
    (line: DemandLineFormState) => {
      setEditingLine(line);
      setLineFormVisible(true);
    },
    []
  );

  const handleSaveLine = useCallback(
    (savedLine: DemandLineFormState) => {
      const normalizedSavedLine = enforceExportVatOnLine(savedLine, watchedOfferType);
      const normalizedRelatedLines = normalizedSavedLine.relatedLines?.map((line) =>
        enforceExportVatOnLine(line, watchedOfferType),
      );
      const lineToSave = normalizedRelatedLines
        ? { ...normalizedSavedLine, relatedLines: normalizedRelatedLines }
        : normalizedSavedLine;
      if (editingLine) {
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
      } else {
        const toAdd = lineToSave.relatedLines?.length
          ? [lineToSave, ...lineToSave.relatedLines]
          : [lineToSave];
        setLines((prev) => [...prev, ...toAdd]);
      }
      setEditingLine(null);
      setLineFormVisible(false);
    },
    [editingLine, watchedOfferType]
  );

  const handleProductSelectWithRelatedStocks = useCallback(
    async (stock: StockGetDto, relatedStockIds?: number[]) => {
      if (!stock.id) return;
      if (!ensureDocumentExchangeRate()) return;

      const applyCurrencyToPrice = (listPrice: number, priceCurrency: string): number | null => {
        if (!watchedCurrency || priceCurrency === watchedCurrency) return listPrice;
        const oldRate = findExchangeRateByCurrency(priceCurrency, exchangeRates, erpRatesForDemand, currencyOptions);
        const newRate = findExchangeRateByCurrency(watchedCurrency, exchangeRates, erpRatesForDemand, currencyOptions);
        if (oldRate == null || oldRate <= 0 || newRate == null || newRate <= 0) {
          showToast("error", "Kur değeri 0 olan para birimiyle stok eklenemez. Lütfen önce döviz kurunu girin.");
          return null;
        }
        return (listPrice * oldRate) / newRate;
      };

      let filteredRelations = (stock.parentRelations || []).filter(
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
      if (mainUnitPrice == null) return;
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
        vatRate: resolveDocumentVatRate(20, watchedOfferType),
        vatAmount: 0,
        lineTotal: 0,
        lineGrandTotal: 0,
        relatedStockId: stock.id,
        relatedProductKey,
        isMainRelatedProduct: true,
        isEditing: false,
      });

      if (filteredRelations.length > 0 && relatedStocks.length > 0) {
        const relatedLines: DemandLineFormState[] = [];
        for (let idx = 0; idx < filteredRelations.length; idx += 1) {
          const relation = filteredRelations[idx];
          const relStock = relatedStocks[idx];
          const price = priceData[idx + 1];
          const unitPrice =
            price && relStock
              ? applyCurrencyToPrice(price.listPrice, price.currency)
              : 0;
          if (unitPrice == null) {
            return;
          }
          relatedLines.push(calculateLineTotals({
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
            vatRate: resolveDocumentVatRate(20, watchedOfferType),
            vatAmount: 0,
            lineTotal: 0,
            lineGrandTotal: 0,
            relatedStockId: stock.id,
            relatedProductKey,
            isMainRelatedProduct: false,
            isEditing: false,
            relationQuantity: relation.quantity,
          }));
        }
        mainLine.relatedLines = relatedLines;
        setEditingLine(mainLine);
      } else {
        setLines((prev) => [...prev, mainLine]);
      }
    },
    [
      watchedCurrency,
      exchangeRates,
      erpRatesForDemand,
      currencyOptions,
      ensureDocumentExchangeRate,
      showToast,
      i18n.language,
      watchedOfferType,
    ]
  );

  const handleDeleteLine = useCallback(
    (lineId: string) => {
      Alert.alert(t("common.confirm"), t("common.delete"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            setLines((prev) => {
              const lineToDelete = prev.find((line) => line.id === lineId);
              const relatedGroup = getValidRelatedProductGroup(prev, lineToDelete);
              if (relatedGroup.length > 0) {
                const relatedGroupIds = new Set(relatedGroup.map((line) => line.id));
                return prev.filter((line) => !relatedGroupIds.has(line.id));
              }
              if (lineToDelete?.relatedLines && lineToDelete.relatedLines.length > 0) {
                const relatedIds = lineToDelete.relatedLines.map((rl) => rl.id);
                return prev.filter((line) => line.id !== lineId && !relatedIds.includes(line.id));
              }
              return prev.filter((line) => line.id !== lineId);
            });
          },
        },
      ]);
    },
    [t]
  );

  const handleMultiProductSelect = useCallback(
    async (products: ProductSelectionResult[]) => {
      if (products.length === 0) return [];

      const priceData = await demandApi.getPriceOfProduct(
        products.map((product) => ({
          productCode: product.code,
          groupCode: product.groupCode || "",
        }))
      ).catch(() => []);

      const nextLines = await Promise.all(
        products.map(async (product, index) => {
          const price = priceData[index];
          const productName = await resolveDocumentLineProductName(
            {
              stockId: product.id ?? null,
              code: product.code,
              name: product.name,
            },
            i18n.language
          );
          return calculateLineTotals({
            id: `temp-${Date.now()}-m${index}`,
            productId: product.id ?? null,
            productCode: product.code,
            productName,
          unit: product.unit ?? null,
          groupCode: product.groupCode ?? null,
          quantity: 1,
          unitPrice: price?.listPrice ?? 0,
          discountRate1: price?.discount1 ?? 0,
          discountAmount1: 0,
          discountRate2: price?.discount2 ?? 0,
          discountAmount2: 0,
          discountRate3: price?.discount3 ?? 0,
          discountAmount3: 0,
          vatRate: resolveDocumentVatRate(product.vatRate, watchedOfferType),
          vatAmount: 0,
          lineTotal: 0,
          lineGrandTotal: 0,
          isEditing: false,
          relatedStockId: product.id ?? null,
          relatedProductKey: null,
          isMainRelatedProduct: true,
        });
        })
      );
      return nextLines;
    },
    [i18n.language]
  );

  const onSubmit = useCallback(
    async (formData: CreateDemandSchema) => {
      if (lines.length === 0) {
        setError("root", { type: "manual", message: "En az 1 satır eklenmelidir." });
        return;
      }

      const cleanedLines = lines.map((line) => {
        const { id, isEditing, relatedLines, relationQuantity, ...rest } = line;
        return {
          ...rest,
          demandId: 0,
          productId: rest.productId || null,
          pricingRuleHeaderId:
            rest.pricingRuleHeaderId != null && rest.pricingRuleHeaderId > 0
              ? rest.pricingRuleHeaderId
              : null,
          relatedStockId:
            rest.relatedStockId != null && rest.relatedStockId > 0 ? rest.relatedStockId : null,
        };
      });

      const cleanedExchangeRates = exchangeRates.map((rate) => {
        const { id, dovizTipi, ...rest } = rate;
        return {
          ...rest,
          demandId: 0,
          isOfficial: rest.isOfficial ?? true,
        };
      });

      createDemand.mutate({
        demand: {
          ...formData.demand,
          ozelKod1: formData.demand.ozelKod1?.trim() || null,
          ozelKod2: formData.demand.ozelKod2?.trim() || null,
          koliBaskiDefinitionId: formData.demand.koliBaskiDefinitionId ?? null,
        },
        lines: cleanedLines,
        exchangeRates: cleanedExchangeRates.length > 0 ? cleanedExchangeRates : undefined,
      });
    },
    [lines, exchangeRates, createDemand, setError]
  );

  const onInvalidSubmit = useCallback(() => {
    showToast("error", t("validation.fillRequiredFields", "Lütfen zorunlu alanları doldurun"));
  }, [showToast, t]);

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

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
        <ScreenHeader title={t("demand.createNew")} showBackButton />
        <FlatListScrollView
          style={[styles.content, { backgroundColor: contentBackground }]}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {(() => {
            const msg = (e: { message?: string } | undefined) => (e && typeof e.message === "string" ? e.message : null);
            const list: string[] = [];
            const q = errors.demand as Record<string, { message?: string }> | undefined;
            if (q) {
              ["potentialCustomerId", "paymentTypeId", "deliveryDate", "documentSerialTypeId", "offerType", "currency"].forEach((key) => {
                const m = msg(q[key]);
                if (m && !list.includes(m)) list.push(m);
              });
            }
            const rootMsg = msg(errors.root as { message?: string } | undefined);
            if (rootMsg) list.push(rootMsg);
            return list.length > 0 ? (
              <View style={[styles.errorSummary, { backgroundColor: colors.error + "18", borderColor: colors.error }]}>
                <Text style={[styles.errorSummaryTitle, { color: colors.error }]}>Lütfen aşağıdaki hataları düzeltin:</Text>
                {list.map((text, i) => (
                  <Text key={i} style={[styles.errorSummaryItem, { color: colors.error }]}>• {text}</Text>
                ))}
              </View>
            ) : null;
          })()}
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
                        backgroundColor: isDark ? "rgba(236,72,153,0.22)" : "rgba(236,72,153,0.12)",
                      },
                    ]
                  : styles.tabPillInactive,
              ]}
              onPress={() => setActiveTab("general")}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabPillText, { color: activeTab === "general" ? "#ec4899" : mutedText }]}>
                Genel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabPill,
                activeTab === "lines"
                  ? [
                      styles.tabPillActive,
                      {
                        borderColor: "#ec4899",
                        backgroundColor: isDark ? "rgba(236,72,153,0.14)" : "rgba(236,72,153,0.08)",
                      },
                    ]
                  : styles.tabPillInactive,
              ]}
              onPress={() => setActiveTab("lines")}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabPillText, { color: activeTab === "lines" ? "#ec4899" : mutedText }]}>
                Satırlar
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ display: activeTab === "general" ? "flex" : "none" }}>

          <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
            <View style={[styles.sectionLeadHeader, { borderBottomColor: sectionOutline }]}>
              <Text style={[styles.sectionTitle, { color: titleText }]}>Müşteri Bilgileri</Text>
            </View>

            <View style={styles.customerSelectRow}>
              <TouchableOpacity
                style={[
                  styles.customerSelectButton,
                  {
                    backgroundColor: innerBg,
                    borderColor: errors.demand?.potentialCustomerId ? colors.error : innerBorder,
                    minHeight: 52,
                    borderRadius: 16,
                    flex: 1,
                    marginBottom: 0,
                  },
                ]}
                onPress={() => setCustomerSelectDialogOpen(true)}
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
                    <Text style={[styles.customerSelectLabel, { color: mutedText }]}>
                      Müşteri Seç
                    </Text>
                    <Text
                      style={[styles.customerSelectValue, { color: titleText }]}
                      numberOfLines={1}
                    >
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
            {errors.demand?.potentialCustomerId?.message && (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.demand.potentialCustomerId.message}</Text>
            )}

            {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
              <Controller
                control={control}
                name="demand.shippingAddressId"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldContainer}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      Teslimat Adresi
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.pickerButton,
                        { backgroundColor: innerBg, borderColor: innerBorder, minHeight: 48, borderRadius: 16 },
                      ]}
                      onPress={() => setShippingAddressModalVisible(true)}
                    >
                      <Text style={[styles.pickerText, { color: colors.text }]}>
                        {shippingAddresses.find((addr) => addr.id === value)
                          ? buildShippingAddressLabel(shippingAddresses.find((addr) => addr.id === value)!)
                          : "Seçiniz"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>

          <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
            <View style={[styles.sectionLeadHeader, { borderBottomColor: sectionOutline }]}>
              <Text style={[styles.sectionTitle, { color: titleText }]}>Teklif Bilgileri</Text>
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.twoColumnItem}>
                <OfferTypePicker control={control} compact />
              </View>
              <View style={styles.twoColumnItem}>
                <Controller
                  control={control}
                  name="demand.representativeId"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>Satış Temsilcisi</Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          { backgroundColor: innerBg, borderColor: innerBorder },
                        ]}
                        onPress={() => setRepresentativeModalVisible(true)}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: colors.text }]} numberOfLines={1}>
                          {value
                            ? relatedUsers.find((u) => u.userId === value)
                              ? `${relatedUsers.find((u) => u.userId === value)?.firstName} ${relatedUsers.find((u) => u.userId === value)?.lastName}`
                              : String(value)
                            : "Seçin"}
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
              render={({ field: { value } }) => (
                <View style={styles.fieldContainerTight}>
                  <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>
                    Ödeme tipi <Text style={{ color: colors.error }}>*</Text>
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
                    onPress={() => setPaymentTypeModalVisible(true)}
                  >
                    <Text style={[styles.pickerText, styles.pickerTextCompact, { color: colors.text }]} numberOfLines={1}>
                      {paymentTypes?.find((pt) => pt.id === value)?.name || "Seçin"}
                    </Text>
                  </TouchableOpacity>
                  {errors.demand?.paymentTypeId?.message && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>{errors.demand.paymentTypeId.message}</Text>
                  )}
                </View>
              )}
            />

            <View style={styles.twoColumnRow}>
              <View style={styles.twoColumnItem}>
                <View style={styles.fieldContainerTight}>
                  <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>Teslimat</Text>
                  <TouchableOpacity
                    style={[
                      styles.dateCell,
                      {
                        backgroundColor: innerBg,
                        borderColor: errors.demand?.deliveryDate ? colors.error : innerBorder,
                      },
                    ]}
                    onPress={() => setDeliveryDateModalOpen(true)}
                  >
                    <Text style={[styles.dateCellValue, { color: colors.text }]} numberOfLines={1}>
                      {watchedDeliveryDate || "Tarih seçin"}
                    </Text>
                  </TouchableOpacity>
                  {errors.demand?.deliveryDate?.message && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>{errors.demand.deliveryDate.message}</Text>
                  )}
                </View>
              </View>
              <View style={styles.twoColumnItem}>
                <View style={styles.fieldContainerTight}>
                  <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>Teklif</Text>
                  <TouchableOpacity
                    style={[styles.dateCell, { backgroundColor: innerBg, borderColor: innerBorder }]}
                    onPress={() => setOfferDateModalOpen(true)}
                  >
                    <Text style={[styles.dateCellValue, { color: colors.text }]} numberOfLines={1}>
                      {watchedOfferDate || "Tarih seçin"}
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
                    <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>
                      Para birimi <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    {value && (
                      <TouchableOpacity
                        style={[styles.exchangeRateButton, styles.exchangeRateButtonCompact, { backgroundColor: colors.accent + "D6" }]}
                        onPress={() => setExchangeRateDialogVisible(true)}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MoneyExchange01Icon size={13} color="#FFFFFF" variant="stroke" strokeWidth={1.8} />
                          <Text style={styles.exchangeRateButtonTextCompact}>Kurlar</Text>
                        </View>
                      </TouchableOpacity>
                    )}
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
                    onPress={() => setCurrencyModalVisible(true)}
                  >
                    <Text style={[styles.pickerText, styles.pickerTextCompact, { color: colors.text }]} numberOfLines={1}>
                      {currencyOptions?.find((c) => c.code === value)?.dovizIsmi ?? "Seçin"}
                    </Text>
                  </TouchableOpacity>
                  {errors.demand?.currency?.message && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>{errors.demand.currency.message}</Text>
                  )}
                </View>
              )}
            />

            <DocumentSerialTypePicker
              control={control}
              customerTypeId={customerTypeId}
              representativeId={watchedRepresentativeId || undefined}
              disabled={!watchedRepresentativeId}
            />

            <View style={styles.twoColumnRow}>
              <View style={styles.twoColumnItem}>
                <Controller
                  control={control}
                  name="demand.ozelKod1"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>
                        {t("demand.ozelKod1")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.demand?.ozelKod1 ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => setSpecialCode1ModalVisible(true)}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: colors.text }]} numberOfLines={1}>
                          {resolveSpecialCodeLabel(value, specialCode1Options, t("common.select"))}
                        </Text>
                      </TouchableOpacity>
                      {errors.demand?.ozelKod1?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.demand.ozelKod1.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
              </View>
              <View style={styles.twoColumnItem}>
                <Controller
                  control={control}
                  name="demand.ozelKod2"
                  render={({ field: { value } }) => (
                    <View style={styles.fieldContainerTight}>
                      <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>
                        {t("demand.ozelKod2")}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          styles.pickerShellCompact,
                          {
                            backgroundColor: innerBg,
                            borderColor: errors.demand?.ozelKod2 ? colors.error : innerBorder,
                          },
                        ]}
                        onPress={() => setSpecialCode2ModalVisible(true)}
                      >
                        <Text style={[styles.pickerText, styles.pickerTextCompact, { color: colors.text }]} numberOfLines={1}>
                          {resolveSpecialCodeLabel(value, specialCode2Options, t("common.select"))}
                        </Text>
                      </TouchableOpacity>
                      {errors.demand?.ozelKod2?.message && (
                        <Text style={[styles.fieldError, { color: colors.error }]}>
                          {errors.demand.ozelKod2.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="demand.koliBaskiDefinitionId"
              render={({ field: { value } }) => (
                <View style={styles.fieldContainerTight}>
                  <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>
                    {t("demand.koliBaski")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      styles.pickerShellCompact,
                      { backgroundColor: innerBg, borderColor: innerBorder },
                    ]}
                    onPress={() => setKoliBaskiModalVisible(true)}
                  >
                    <Text style={[styles.pickerText, styles.pickerTextCompact, { color: colors.text }]} numberOfLines={1}>
                      {value
                        ? koliBaskiOptions.find((option) => option.id === value)?.name ?? t("common.select")
                        : t("common.select")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            <FormField
              label="Açıklama"
              value={watch("demand.description") || ""}
              onChangeText={(text) => setValue("demand.description", text || null)}
              placeholder="İsteğe bağlı kısa not…"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
          </View>

          <View style={{ display: activeTab === "lines" ? "flex" : "none" }}>
          <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
            <SalesDocumentLinesSectionHeader
              lineCount={lines.filter((line) => !line.relatedProductKey || line.isMainRelatedProduct === true).length}
              canAddLine={canAddLine}
              translationPrefix="demand"
              onAddLine={handleAddLine}
            />
            {errors.root?.message && (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.root.message}</Text>
            )}

            {lines.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t("demand.noLinesYet")}
              </Text>
            ) : (
              <FlatList
                data={lines.filter((line) => !line.relatedProductKey || line.isMainRelatedProduct === true)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.linesList}
                renderItem={({ item: line }) => (
                  <SalesDocumentFormLineGroup
                    line={line}
                    currencyLabel={lineListCurrencyLabel}
                    hideVatRate={hideVatRate}
                    translationPrefix="demand"
                    onEdit={handleEditLine}
                    onDelete={handleDeleteLine}
                  />
                )}
              />
            )}
          </View>

          {lines.length > 0 && (
            <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Özet</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ara Toplam:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {totals.subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>KDV Toplamı:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {totals.totalVat.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>Genel Toplam:</Text>
                <Text style={[styles.summaryValue, { color: colors.accent, fontWeight: "600" }]}>
                  {totals.grandTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
          </View>

          <View style={styles.submitRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButtonWrap,
                { backgroundColor: shellBg, borderColor: shellBorder },
                (isSubmitting || createDemand.isPending) && styles.submitButtonDisabled,
              ]}
              onPress={
                activeTab === "general"
                  ? () => setActiveTab("lines")
                  : handleSubmit(onSubmit, onInvalidSubmit)
              }
              disabled={isSubmitting || createDemand.isPending}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentSecondary || "#f97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButton}
              >
                {isSubmitting || createDemand.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{activeTab === "general" ? "Devam Et" : "Talebi Kaydet"}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </FlatListScrollView>

        <Modal
          visible={deliveryDateModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setDeliveryDateModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setDeliveryDateModalOpen(false)}
            />
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
                <Text style={[styles.modalTitle, { color: titleText }]}>Teslimat Tarihi</Text>
              </View>
              <DateTimePicker
                value={tempDeliveryDate}
                mode="date"
                display="spinner"
                onChange={handleDeliveryDateChange}
                locale="tr-TR"
              />
              <TouchableOpacity
                style={[styles.dateModalTamamButton, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setValue("demand.deliveryDate", tempDeliveryDate.toISOString().split("T")[0]);
                  setDeliveryDateModalOpen(false);
                }}
              >
                <Text style={styles.dateModalTamamButtonText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={offerDateModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setOfferDateModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setOfferDateModalOpen(false)}
            />
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
                <Text style={[styles.modalTitle, { color: titleText }]}>Teklif Tarihi</Text>
              </View>
              <DateTimePicker
                value={tempOfferDate}
                mode="date"
                display="spinner"
                onChange={handleOfferDateChange}
                locale="tr-TR"
              />
              <TouchableOpacity
                style={[styles.dateModalTamamButton, { backgroundColor: colors.accent }]}
                onPress={() => setOfferDateModalOpen(false)}
              >
                <Text style={styles.dateModalTamamButtonText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <DemandLineForm
          visible={lineFormVisible}
          line={editingLine}
          offerType={watchedOfferType}
          onClose={() => {
            setLineFormVisible(false);
            setEditingLine(null);
          }}
          onSave={handleSaveLine}
          onAddWithRelatedStocks={
            !editingLine
              ? (stock, relatedStockIds) => {
                  handleProductSelectWithRelatedStocks(stock, relatedStockIds);
                  setLineFormVisible(false);
                  setEditingLine(null);
                }
              : undefined
          }
          onRequestRelatedStocksSelection={
            !editingLine
              ? (stock: StockGetDto & { parentRelations: StockRelationDto[] }) => {
                  setPendingStockForRelated(stock);
                }
              : undefined
          }
          onCancelRelatedSelection={!editingLine ? () => setPendingStockForRelated(null) : undefined}
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
          allowImageUpload
          onMultiProductSelect={handleMultiProductSelect}
          onSaveMultiple={(newLines) => {
            setLines((prev) => [...prev, ...newLines]);
            setLineFormVisible(false);
            setEditingLine(null);
          }}
        />

        <ExchangeRateDialog
          visible={exchangeRateDialogVisible}
          exchangeRates={exchangeRates}
          currencyOptions={currencyOptions}
          erpExchangeRates={erpRatesForDemand}
          isLoadingErpRates={isLoadingErpRates && erpRatesForDemand.length === 0}
          currencyInUse={lines.length > 0 ? (watchedCurrency || undefined) : undefined}
          onClose={() => setExchangeRateDialogVisible(false)}
          onSave={handleExchangeRatesSave}
          offerDate={watchedOfferDate || undefined}
        />

        <CustomerSelectDialog
          open={customerSelectDialogOpen}
          onOpenChange={setCustomerSelectDialogOpen}
          onSelect={handleCustomerSelect}
          contextUserId={watchedRepresentativeId ?? undefined}
        />

        <PickerModal
          visible={paymentTypeModalVisible}
          options={
            paymentTypes?.map((pt) => ({ id: pt.id, name: pt.name })) || []
          }
          selectedValue={watch("demand.paymentTypeId") ?? undefined}
          onSelect={(option) => {
            setValue("demand.paymentTypeId", option.id as number);
            setPaymentTypeModalVisible(false);
          }}
          onClose={() => setPaymentTypeModalVisible(false)}
          title="Ödeme Tipi Seçiniz"
          searchPlaceholder="Ödeme tipi ara..."
        />

        <PickerModal
          visible={currencyModalVisible}
          options={
            currencyOptions?.map((c) => ({
              id: c.code,
              name: c.dovizIsmi ?? c.code,
              code: c.code,
            })) || []
          }
          selectedValue={watch("demand.currency")}
          onSelect={(option) => handleCurrencySelect(option.id as string)}
          onClose={() => setCurrencyModalVisible(false)}
          title="Para Birimi Seçiniz"
          searchPlaceholder="Para birimi ara..."
        />

        <PickerModal
          visible={representativeModalVisible}
          options={relatedUsers.map((u) => ({
            id: u.userId,
            name: `${u.firstName} ${u.lastName}`.trim(),
          }))}
          selectedValue={watch("demand.representativeId") ?? undefined}
          onSelect={(option) => {
            setValue("demand.representativeId", option.id as number);
            setRepresentativeModalVisible(false);
          }}
          onClose={() => setRepresentativeModalVisible(false)}
          title="Satış Temsilcisi Seçiniz"
          searchPlaceholder="Temsilci ara..."
        />

        <PickerModal
          visible={specialCode1ModalVisible}
          options={specialCode1Options.map((item) => ({
            id: item.ozelKod,
            name: formatSpecialCodeOptionName(item),
            code: item.ozelKod,
          }))}
          selectedValue={watch("demand.ozelKod1") ?? undefined}
          onSelect={(option) => {
            specialCodeManualChangeRef.current.ozelKod1 = true;
            setValue("demand.ozelKod1", String(option.code ?? option.id), {
              shouldDirty: true,
              shouldValidate: true,
            });
            setSpecialCode1ModalVisible(false);
          }}
          onClose={() => setSpecialCode1ModalVisible(false)}
          title={t("demand.ozelKod1")}
          searchPlaceholder={t("demand.specialCodeSearch")}
          isLoading={isSpecialCodesLoading}
        />

        <PickerModal
          visible={specialCode2ModalVisible}
          options={specialCode2Options.map((item) => ({
            id: item.ozelKod,
            name: formatSpecialCodeOptionName(item),
            code: item.ozelKod,
          }))}
          selectedValue={watch("demand.ozelKod2") ?? undefined}
          onSelect={(option) => {
            specialCodeManualChangeRef.current.ozelKod2 = true;
            setValue("demand.ozelKod2", String(option.code ?? option.id), {
              shouldDirty: true,
              shouldValidate: true,
            });
            setSpecialCode2ModalVisible(false);
          }}
          onClose={() => setSpecialCode2ModalVisible(false)}
          title={t("demand.ozelKod2")}
          searchPlaceholder={t("demand.specialCodeSearch")}
          isLoading={isSpecialCodesLoading}
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
        />

        {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
          <PickerModal
            visible={shippingAddressModalVisible}
            options={shippingAddresses.map((addr) => ({
              id: addr.id,
              name: buildShippingAddressLabel(addr),
            }))}
            selectedValue={watch("demand.shippingAddressId") ?? undefined}
            onSelect={(option) => {
              setValue("demand.shippingAddressId", option.id as number);
              setShippingAddressModalVisible(false);
            }}
            onClose={() => setShippingAddressModalVisible(false)}
            title="Teslimat Adresi Seçiniz"
            searchPlaceholder="Adres ara..."
          />
        )}

      </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 28,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  twoColumnItem: {
    flex: 1,
    minWidth: 0,
  },
  fieldContainerTight: {
    marginBottom: 10,
  },
  labelCompact: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.25,
    marginBottom: 5,
  },
  pickerShellCompact: {
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pickerTextCompact: {
    fontSize: 13,
  },
  dateCell: {
    borderWidth: 1.3,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center",
  },
  dateCellValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabBarCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 6,
    gap: 10,
    marginBottom: 12,
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
  },
  tabPillInactive: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  errorSummary: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorSummaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorSummaryItem: {
    fontSize: 13,
    marginLeft: 4,
    marginBottom: 4,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
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
  addLineButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  addButtonTextSecondary: {
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 12.3,
    fontWeight: "700",
    letterSpacing: 0.35,
    marginBottom: 0,
    opacity: 0.9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(236,72,153,0.08)",
  },
  sectionLeadHeader: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.3,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  pickerButton: {
    borderWidth: 1.3,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  pickerText: {
    fontSize: 15,
  },
  dateButton: {
    borderWidth: 1.3,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    justifyContent: "center",
  },
  dateButtonText: {
    fontSize: 15,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
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
  lineRowMain: {
    flex: 1,
    minWidth: 0,
  },
  lineRowMainWithThumb: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  lineRowThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  lineRowThumbRelated: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  lineRowTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingRight: 112,
  },
  lineRowTextBlockRelated: {
    paddingRight: 76,
  },
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
  lineRowMainBadgeText: {
    fontSize: 7,
    fontWeight: "700",
  },
  lineRowDesc: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
    opacity: 0.92,
  },
  lineRowMeta: {
    marginTop: 4,
    fontWeight: "400",
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },
  lineRowMetaFine: {
    fontSize: 9,
    lineHeight: 12.5,
  },
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
  lineRowApprovalText: {
    fontSize: 10,
    fontWeight: "600",
  },
  lineIconButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  relatedLinesBlock: {
    marginTop: 8,
    gap: 6,
  },
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
  currencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  exchangeRateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exchangeRateButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  exchangeRateButtonCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  exchangeRateButtonTextCompact: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  customerSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  customerSelectRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginBottom: 16,
  },
  customerSelectContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  customerSelectIcon: {
    marginRight: 12,
  },
  customerSelectTextContainer: {
    flex: 1,
  },
  customerSelectLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  customerSelectValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  customerSelectArrow: {
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  linesList: {
    gap: 10,
  },
  lineCardWrapper: {
    marginBottom: 8,
  },
  submitRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  submitButtonWrap: {
    flex: 1,
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
  submitButtonDisabled: {
    opacity: 0.6,
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
  dateModalTamamButton: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dateModalTamamButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
