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
import { resolveExchangeRateByCurrency as findExchangeRateByCurrency } from "@/lib/resolve-exchange-rate";
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
  Edit02Icon,
  Delete02Icon,
  Alert02Icon,
} from "hugeicons-react-native";
import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useAuthStore } from "../../../store/auth";
import { useToastStore } from "../../../store/toast";
import { FormField } from "../../activity/components";
import { useCustomer } from "../../customer/hooks";
import { useCustomerShippingAddresses } from "../../shipping-address/hooks";
import { useErpCustomers } from "../../erp-customer/hooks";
import { useStock } from "../../stocks/hooks";
import { stockApi } from "../../stocks/api";
import { orderApi } from "../api";
import {
  useCreateOrderBulk,
  usePriceRuleOfOrder,
  useUserDiscountLimitsBySalesperson,
  useExchangeRate,
  useCurrencyOptions,
  usePaymentTypes,
  useRelatedUsers,
} from "../hooks";
import {
  OrderLineForm,
  ExchangeRateDialog,
  PickerModal,
  DocumentSerialTypePicker,
  OfferTypePicker,
  ProductPicker,
} from "../components";
import { CustomerSelectDialog, type CustomerSelectionResult } from "../../customer";
import type { CustomerDto } from "../../customer/types";
import { createOrderSchema, type CreateOrderSchema } from "../schemas";
import type {
  OrderLineFormState,
  OrderExchangeRateFormState,
  StockGetDto,
} from "../types";
import type { StockRelationDto } from "../../stocks/types";
import { calculateLineTotals, calculateTotals } from "../utils";
import type { ExchangeRateDto } from "../types";

export function OrderCreateScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode } = useUIStore();
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
  /** Form bölüm kartları (Müşteri / Teklif vb.) — hafif çerçeve */
  const sectionOutline = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)";
  const innerBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const innerBorder = isDark ? "rgba(255,255,255,0.10)" : colors.border;
  const titleText = colors.text;
  const mutedText = colors.textSecondary;
  const softText = colors.textMuted;
  const accent = colors.accent;

  const [lines, setLines] = useState<OrderLineFormState[]>([]);
  const [exchangeRates, setExchangeRates] = useState<OrderExchangeRateFormState[]>([]);
  const [erpRatesForOrder, setErpRatesForOrder] = useState<ExchangeRateDto[]>([]);
  const hasFilledErpRates = useRef(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>();
  const [deliveryDateModalOpen, setDeliveryDateModalOpen] = useState(false);
  const [offerDateModalOpen, setOfferDateModalOpen] = useState(false);
  const [tempDeliveryDate, setTempDeliveryDate] = useState(new Date());
  const [tempOfferDate, setTempOfferDate] = useState(new Date());
  const [lineFormVisible, setLineFormVisible] = useState(false);
  const [editingLine, setEditingLine] = useState<OrderLineFormState | null>(null);
  const [exchangeRateDialogVisible, setExchangeRateDialogVisible] = useState(false);
  const [paymentTypeModalVisible, setPaymentTypeModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [shippingAddressModalVisible, setShippingAddressModalVisible] = useState(false);
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [representativeModalVisible, setRepresentativeModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "lines">("general");
  const [pendingStockForRelated, setPendingStockForRelated] = useState<
    (StockGetDto & { parentRelations: StockRelationDto[] }) | null
  >(null);

  const schema = useMemo(() => createOrderSchema(), []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      order: {
        offerType: "Domestic",
        currency: "",
        offerDate: new Date().toISOString().split("T")[0],
        deliveryDate: new Date().toISOString().split("T")[0],
        representativeId: user?.id || null,
      },
    },
  });

  const watchedCurrency = watch("order.currency");
  const watchedCustomerId = watch("order.potentialCustomerId");
  const watchedErpCustomerCode = watch("order.erpCustomerCode");
  const watchedRepresentativeId = watch("order.representativeId");
  const watchedOfferDate = watch("order.offerDate");
  const watchedDeliveryDate = watch("order.deliveryDate");

  useEffect(() => {
    if (deliveryDateModalOpen) {
      const initial = watchedDeliveryDate
        ? new Date(watchedDeliveryDate + "T12:00:00")
        : new Date();
      setTempDeliveryDate(initial);
    }
  }, [deliveryDateModalOpen, watchedDeliveryDate]);

  const { data: customer } = useCustomer(watchedCustomerId ?? undefined);
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
      setErpRatesForOrder(exchangeRatesData);
      hasFilledErpRates.current = true;
    }
  }, [exchangeRatesData]);

  const effectiveRatesForLines = useMemo(() => {
    return erpRatesForOrder.map((erp) => {
      const override = exchangeRates.find(
        (r) => r.currency === String(erp.dovizTipi) || r.dovizTipi === erp.dovizTipi
      );
      return {
        dovizTipi: erp.dovizTipi,
        kurDegeri: override?.exchangeRate ?? erp.kurDegeri,
      };
    });
  }, [erpRatesForOrder, exchangeRates]);

  const customerCode = useMemo(() => {
    if (customer?.customerCode) return customer.customerCode;
    if (watchedErpCustomerCode) return watchedErpCustomerCode;
    return undefined;
  }, [customer, watchedErpCustomerCode]);

  const customerTypeId = useMemo(() => {
    return resolveDocumentSerialCustomerTypeId({
      erpCustomerCode: watchedErpCustomerCode,
      selectedCustomerId: watchedCustomerId,
      customerTypeId: customer?.customerTypeId,
    });
  }, [watchedErpCustomerCode, watchedCustomerId, customer?.customerTypeId]);

  const { data: pricingRules } = usePriceRuleOfOrder({
    customerCode,
    salesmenId: watchedRepresentativeId || undefined,
    orderDate: watchedOfferDate || undefined,
  });

  const { data: userDiscountLimits } = useUserDiscountLimitsBySalesperson(
    watchedRepresentativeId || undefined
  );

  const createOrder = useCreateOrderBulk();

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
      setValue("order.potentialCustomerId", result.customerId);
      setValue("order.erpCustomerCode", result.erpCustomerCode ?? null);
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
      setValue("order.potentialCustomerId", customer?.id || null);
      setValue("order.erpCustomerCode", null);
    },
    [setValue]
  );

  const handleDeliveryDateChange = useCallback(
    (_: DateTimePickerEvent, selectedDate?: Date) => {
      if (selectedDate) {
        setTempDeliveryDate(selectedDate);
        setValue("order.deliveryDate", selectedDate.toISOString().split("T")[0]);
      }
    },
    [setValue]
  );

  const handleOfferDateChange = useCallback(
    (_: DateTimePickerEvent, selectedDate?: Date) => {
      if (selectedDate) {
        setTempOfferDate(selectedDate);
        setValue("order.offerDate", selectedDate.toISOString().split("T")[0]);
      }
    },
    [setValue]
  );

  const applyCurrencyChange = useCallback(
    (newCurrency: string) => {
      const oldCurrency = watchedCurrency || "";
      if (!oldCurrency || oldCurrency === newCurrency) {
        setValue("order.currency", newCurrency);
        return;
      }
      const oldRate = findExchangeRateByCurrency(oldCurrency, exchangeRates, erpRatesForOrder, currencyOptions);
      const newRate = findExchangeRateByCurrency(newCurrency, exchangeRates, erpRatesForOrder, currencyOptions);
      if (oldRate == null || newRate == null || newRate <= 0) {
        setValue("order.currency", newCurrency);
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
      setValue("order.currency", newCurrency);
    },
    [watchedCurrency, exchangeRates, erpRatesForOrder, setValue]
  );

  const handleCurrencySelect = useCallback(
    (newCurrency: string) => {
      if (lines.length === 0) {
        setValue("order.currency", newCurrency);
        setCurrencyModalVisible(false);
        return;
      }
      Alert.alert(
        t("order.currencyChangeTitle"),
        t("order.currencyChangeMessage"),
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

  const handleAddLine = useCallback(() => {
    if ((!watchedCustomerId && !watchedErpCustomerCode) || !watchedRepresentativeId || !watchedCurrency) {
      showToast("error", t("common.selectCustomerRepresentativeCurrency"));
      return;
    }

    setEditingLine(null);
    setLineFormVisible(true);
  }, [watchedCustomerId, watchedErpCustomerCode, watchedRepresentativeId, watchedCurrency, showToast]);

  const canAddLine = Boolean((watchedCustomerId || watchedErpCustomerCode) && watchedRepresentativeId && watchedCurrency);

  const handleEditLine = useCallback(
    (line: OrderLineFormState) => {
      setEditingLine(line);
      setLineFormVisible(true);
    },
    []
  );

  const handleSaveLine = useCallback(
    (savedLine: OrderLineFormState) => {
      if (editingLine) {
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
      } else {
        const toAdd = savedLine.relatedLines?.length
          ? [savedLine, ...savedLine.relatedLines]
          : [savedLine];
        setLines((prev) => [...prev, ...toAdd]);
      }
      setEditingLine(null);
      setLineFormVisible(false);
    },
    [editingLine]
  );

  const handleProductSelectWithRelatedStocks = useCallback(
    async (stock: StockGetDto, relatedStockIds?: number[]) => {
      if (!stock.id) return;

      const applyCurrencyToPrice = (listPrice: number, priceCurrency: string): number => {
        if (!watchedCurrency || priceCurrency === watchedCurrency) return listPrice;
        const oldRate = findExchangeRateByCurrency(priceCurrency, exchangeRates, erpRatesForOrder, currencyOptions);
        const newRate = findExchangeRateByCurrency(watchedCurrency, exchangeRates, erpRatesForOrder, currencyOptions);
        if (oldRate == null || oldRate <= 0 || newRate == null || newRate <= 0) return listPrice;
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
        priceData = await orderApi.getPriceOfProduct(products);
      } catch {
        priceData = products.map(() => ({ listPrice: 0, currency: watchedCurrency || "" }));
      }

      const mainPrice = priceData[0];
      const mainUnitPrice = mainPrice
        ? applyCurrencyToPrice(mainPrice.listPrice, mainPrice.currency)
        : 0;
      const mainLine: OrderLineFormState = calculateLineTotals({
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
        const relatedLines: OrderLineFormState[] = filteredRelations.map((relation, idx) => {
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
    [watchedCurrency, exchangeRates, erpRatesForOrder]
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
              if (lineToDelete?.relatedProductKey) {
                return prev.filter(
                  (line) => line.id !== lineId && line.relatedProductKey !== lineToDelete.relatedProductKey
                );
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

  const onSubmit = useCallback(
    async (formData: CreateOrderSchema) => {
      if (lines.length === 0) {
        setError("root", { type: "manual", message: "En az 1 satır eklenmelidir." });
        return;
      }

      const cleanedLines = lines.map((line) => {
        const { id, isEditing, relatedLines, relationQuantity, ...rest } = line;
        return {
          ...rest,
          orderId: 0,
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
          orderId: 0,
          isOfficial: rest.isOfficial ?? true,
        };
      });

      createOrder.mutate({
        order: formData.order,
        lines: cleanedLines,
        exchangeRates: cleanedExchangeRates.length > 0 ? cleanedExchangeRates : undefined,
      });
    },
    [lines, exchangeRates, createOrder, setError]
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
        <ScreenHeader title={t("order.createNew")} showBackButton />
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
            const q = errors.order as Record<string, { message?: string }> | undefined;
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
            <Text style={[styles.sectionTitle, { color: titleText }]}>Müşteri Bilgileri</Text>

            <TouchableOpacity
              style={[
                styles.customerSelectButton,
                {
                  backgroundColor: innerBg,
                  borderColor: errors.order?.potentialCustomerId ? colors.error : innerBorder,
                  minHeight: 48,
                  borderRadius: 16,
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
                    {selectedCustomer?.name ||
                      (watchedErpCustomerCode ? `ERP: ${watchedErpCustomerCode}` : "Müşteri seçiniz")}
                  </Text>
                </View>
              </View>
              <ArrowRight01Icon size={18} color={softText} variant="stroke" strokeWidth={1.8} />
            </TouchableOpacity>
            {errors.order?.potentialCustomerId?.message && (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.order.potentialCustomerId.message}</Text>
            )}

            {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
              <Controller
                control={control}
                name="order.shippingAddressId"
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
                        {shippingAddresses.find((addr) => addr.id === value)?.address || "Seçiniz"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>

          <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
            <Text style={[styles.sectionTitle, { color: titleText }]}>Teklif Bilgileri</Text>

            <View style={styles.twoColumnRow}>
              <View style={styles.twoColumnItem}>
                <OfferTypePicker control={control} compact />
              </View>
              <View style={styles.twoColumnItem}>
                <Controller
                  control={control}
                  name="order.representativeId"
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
              name="order.paymentTypeId"
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
                        borderColor: errors.order?.paymentTypeId ? colors.error : innerBorder,
                      },
                    ]}
                    onPress={() => setPaymentTypeModalVisible(true)}
                  >
                    <Text style={[styles.pickerText, styles.pickerTextCompact, { color: colors.text }]} numberOfLines={1}>
                      {paymentTypes?.find((pt) => pt.id === value)?.name || "Seçin"}
                    </Text>
                  </TouchableOpacity>
                  {errors.order?.paymentTypeId?.message && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>{errors.order.paymentTypeId.message}</Text>
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
                        borderColor: errors.order?.deliveryDate ? colors.error : innerBorder,
                      },
                    ]}
                    onPress={() => setDeliveryDateModalOpen(true)}
                  >
                    <Text style={[styles.dateCellValue, { color: colors.text }]} numberOfLines={1}>
                      {watchedDeliveryDate || "Tarih seçin"}
                    </Text>
                  </TouchableOpacity>
                  {errors.order?.deliveryDate?.message && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>{errors.order.deliveryDate.message}</Text>
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
              name="order.currency"
              render={({ field: { value } }) => (
                <View style={styles.fieldContainerTight}>
                  <View style={styles.currencyHeader}>
                    <Text style={[styles.labelCompact, { color: colors.textSecondary }]}>
                      Para birimi <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    {value && (
                      <TouchableOpacity
                        style={[styles.exchangeRateButton, styles.exchangeRateButtonCompact, { backgroundColor: colors.accent }]}
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
                        borderColor: errors.order?.currency ? colors.error : innerBorder,
                      },
                    ]}
                    onPress={() => setCurrencyModalVisible(true)}
                  >
                    <Text style={[styles.pickerText, styles.pickerTextCompact, { color: colors.text }]} numberOfLines={1}>
                      {currencyOptions?.find((c) => c.code === value)?.dovizIsmi ?? "Seçin"}
                    </Text>
                  </TouchableOpacity>
                  {errors.order?.currency?.message && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>{errors.order.currency.message}</Text>
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

            <FormField
              label="Açıklama"
              value={watch("order.description") || ""}
              onChangeText={(text) => setValue("order.description", text || null)}
              placeholder="İsteğe bağlı kısa not…"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
          </View>

          <View style={{ display: activeTab === "lines" ? "flex" : "none" }}>
          <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: titleText }]}>Satırlar</Text>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: colors.accent },
                  !canAddLine && styles.submitButtonDisabled,
                ]}
                onPress={handleAddLine}
                disabled={!canAddLine}
              >
                <Text style={styles.addButtonText}>+ Satır Ekle</Text>
              </TouchableOpacity>
            </View>
            {errors.root?.message && (
              <Text style={[styles.fieldError, { color: colors.error }]}>{errors.root.message}</Text>
            )}

            {lines.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Henüz satır eklenmedi
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
                        {
                          backgroundColor: innerBg,
                          borderColor: innerBorder,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowRadius: 4,
                          shadowOpacity: isDark ? 0.12 : 0.03,
                          elevation: 1,
                        },
                        line.approvalStatus === 1 && {
                          borderColor: colors.warning,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <View style={styles.lineCardHeader}>
                        <View style={styles.lineCardContent}>
                          <View style={styles.lineCardTitleRow}>
                            <Text style={[styles.lineProductName, { color: titleText }]} numberOfLines={2}>
                              {line.productName || t("order.productNotSelected")}
                            </Text>
                            <View style={[styles.mainBadge, { backgroundColor: colors.activeBackground }]}>
                              <Text style={[styles.mainBadgeText, { color: colors.accent }]}>
                                {t("order.main")}
                              </Text>
                            </View>
                          </View>
                          {line.productCode ? (
                            <Text style={[styles.lineProductCode, { color: colors.textMuted }]}>
                              {line.productCode}
                            </Text>
                          ) : null}
                          <View
                            style={[
                              styles.lineDetailRowsInset,
                              {
                                backgroundColor: colors.activeBackground,
                                borderColor: innerBorder,
                              },
                            ]}
                          >
                            <View style={styles.lineDetailRows}>
                            <View style={[styles.linePairRow, { borderBottomColor: innerBorder }]}>
                              <View style={styles.lineHalf}>
                                <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>
                                  {t("order.quantity")}
                                </Text>
                                <Text style={[styles.lineMicroValue, { color: accent }]} numberOfLines={1}>
                                  {line.quantity.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </Text>
                              </View>
                              <View style={[styles.lineHalf, styles.lineHalfTrailing]}>
                                <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>
                                  {t("order.unitPrice")}
                                </Text>
                                <Text style={[styles.lineMicroValue, { color: accent }]} numberOfLines={1}>
                                  {line.unitPrice.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </Text>
                              </View>
                            </View>
                            <View style={[styles.linePairRow, { borderBottomColor: innerBorder }]}>
                              <View style={styles.lineHalf}>
                                <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>
                                  {t("order.discount1")}
                                </Text>
                                <Text style={[styles.lineMicroValue, { color: colors.textSecondary }]} numberOfLines={2}>
                                  {line.discountRate1.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                  % · {line.discountAmount1.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </Text>
                              </View>
                              <View style={[styles.lineHalf, styles.lineHalfTrailing]}>
                                <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>
                                  {t("order.discount2")}
                                </Text>
                                <Text style={[styles.lineMicroValue, { color: colors.textSecondary }]} numberOfLines={2}>
                                  {line.discountRate2.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                  % · {line.discountAmount2.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </Text>
                              </View>
                            </View>
                            <View style={[styles.linePairRow, { borderBottomColor: innerBorder }]}>
                              <View style={styles.lineHalf}>
                                <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>
                                  {t("order.discount3")}
                                </Text>
                                <Text style={[styles.lineMicroValue, { color: colors.textSecondary }]} numberOfLines={2}>
                                  {line.discountRate3.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                  % · {line.discountAmount3.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </Text>
                              </View>
                              <View style={[styles.lineHalf, styles.lineHalfTrailing]}>
                                <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>
                                  {t("order.lineTotal")}
                                </Text>
                                <Text style={[styles.lineMicroValue, { color: accent }]} numberOfLines={1}>
                                  {line.lineTotal.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </Text>
                              </View>
                            </View>
                            <View style={[styles.linePairRow, styles.linePairRowLast, { borderBottomColor: innerBorder }]}>
                              <View style={styles.lineHalf}>
                                <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>
                                  {t("order.vatRate")}
                                </Text>
                                <Text style={[styles.lineMicroValue, { color: titleText }]} numberOfLines={1}>
                                  {line.vatRate.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}%
                                </Text>
                              </View>
                              <View style={[styles.lineHalf, styles.lineHalfTrailing]}>
                                <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>
                                  {t("order.vatAmount")}
                                </Text>
                                <Text style={[styles.lineMicroValue, { color: titleText }]} numberOfLines={1}>
                                  {line.vatAmount.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </Text>
                              </View>
                            </View>
                            </View>
                          </View>
                          <View style={styles.lineGrandTotalRow}>
                            <Text style={[styles.lineGrandTotalLabel, { color: titleText }]}>
                              {t("order.lineGrandTotalLabel")}:
                            </Text>
                            <Text style={[styles.lineGrandTotalValue, { color: colors.accent }]}>
                              {line.lineGrandTotal.toLocaleString("tr-TR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Text>
                          </View>
                          {line.approvalStatus === 1 && (
                            <View style={[styles.approvalBadge, { backgroundColor: colors.warning + "20" }]}>
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <View style={{ marginRight: 6 }}>
                                  <Alert02Icon
                                    size={14}
                                    color={colors.warning}
                                    variant="stroke"
                                    strokeWidth={1.8}
                                  />
                                </View>
                                <Text style={[styles.approvalBadgeText, { color: colors.warning }]}>
                                  {t("order.approvalRequired")}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                        <View style={styles.lineActions}>
                          <TouchableOpacity
                            style={[
                              styles.editButton,
                              {
                                backgroundColor: isDark ? "rgba(236,72,153,0.15)" : "rgba(236,72,153,0.08)",
                              },
                            ]}
                            onPress={() => handleEditLine(line)}
                          >
                            <Edit02Icon size={14} color={colors.accent} variant="stroke" strokeWidth={1.8} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.deleteButton,
                              {
                                backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)",
                              },
                            ]}
                            onPress={() => handleDeleteLine(line.id)}
                          >
                            <Delete02Icon size={14} color={colors.error} variant="stroke" strokeWidth={1.8} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {line.relatedLines && line.relatedLines.length > 0 && (
                        <View style={[styles.relatedLinesContainer, { borderTopColor: colors.border }]}>
                          <Text style={[styles.relatedLinesTitle, { color: colors.textMuted }]}>
                            {t("order.relatedStocks")}
                          </Text>
                          {line.relatedLines.map((relatedLine) => (
                            <View
                              key={relatedLine.id}
                              style={[
                                styles.relatedLineCard,
                                {
                                  borderLeftColor: isDark ? "rgba(236,72,153,0.4)" : "rgba(236,72,153,0.3)",
                                },
                              ]}
                            >
                              <Text style={[styles.relatedLineProductName, { color: titleText }]} numberOfLines={2}>
                                {relatedLine.productName}
                              </Text>
                              {relatedLine.productCode ? (
                                <Text style={[styles.relatedLineProductCode, { color: mutedText }]}>
                                  {relatedLine.productCode}
                                </Text>
                              ) : null}
                              <View
                                style={[
                                  styles.lineDetailRowsInset,
                                  {
                                    backgroundColor: colors.activeBackground,
                                    borderColor: innerBorder,
                                    marginTop: 8,
                                  },
                                ]}
                              >
                                <View style={styles.relatedLineDetailRows}>
                                <View style={[styles.linePairRow, { borderBottomColor: innerBorder }]}>
                                  <View style={styles.lineHalf}>
                                    <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>{t("order.quantity")}</Text>
                                    <Text style={[styles.lineMicroValue, { color: accent }]} numberOfLines={1}>
                                      {relatedLine.quantity.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </View>
                                  <View style={[styles.lineHalf, styles.lineHalfTrailing]}>
                                    <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>{t("order.unitPrice")}</Text>
                                    <Text style={[styles.lineMicroValue, { color: accent }]} numberOfLines={1}>
                                      {relatedLine.unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </View>
                                </View>
                                <View style={[styles.linePairRow, { borderBottomColor: innerBorder }]}>
                                  <View style={styles.lineHalf}>
                                    <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>{t("order.discount1")}</Text>
                                    <Text style={[styles.lineMicroValue, { color: colors.textSecondary }]} numberOfLines={2}>
                                      {relatedLine.discountRate1.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      % · {relatedLine.discountAmount1.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </View>
                                  <View style={[styles.lineHalf, styles.lineHalfTrailing]}>
                                    <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>{t("order.discount2")}</Text>
                                    <Text style={[styles.lineMicroValue, { color: colors.textSecondary }]} numberOfLines={2}>
                                      {relatedLine.discountRate2.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      % · {relatedLine.discountAmount2.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </View>
                                </View>
                                <View style={[styles.linePairRow, { borderBottomColor: innerBorder }]}>
                                  <View style={styles.lineHalf}>
                                    <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>{t("order.discount3")}</Text>
                                    <Text style={[styles.lineMicroValue, { color: colors.textSecondary }]} numberOfLines={2}>
                                      {relatedLine.discountRate3.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      % · {relatedLine.discountAmount3.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </View>
                                  <View style={[styles.lineHalf, styles.lineHalfTrailing]}>
                                    <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>{t("order.lineTotal")}</Text>
                                    <Text style={[styles.lineMicroValue, { color: accent }]} numberOfLines={1}>
                                      {relatedLine.lineTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </View>
                                </View>
                                <View style={[styles.linePairRow, styles.linePairRowLast, { borderBottomColor: innerBorder }]}>
                                  <View style={styles.lineHalf}>
                                    <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>{t("order.vatRate")}</Text>
                                    <Text style={[styles.lineMicroValue, { color: titleText }]} numberOfLines={1}>
                                      {relatedLine.vatRate.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                    </Text>
                                  </View>
                                  <View style={[styles.lineHalf, styles.lineHalfTrailing]}>
                                    <Text style={[styles.lineMicroLabel, { color: mutedText }]} numberOfLines={1}>{t("order.vatAmount")}</Text>
                                    <Text style={[styles.lineMicroValue, { color: titleText }]} numberOfLines={1}>
                                      {relatedLine.vatAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </View>
                                </View>
                                </View>
                              </View>
                              <View style={styles.lineGrandTotalRow}>
                                <Text style={[styles.lineGrandTotalLabel, { color: titleText }]}>
                                  {t("order.lineGrandTotalLabel")}:
                                </Text>
                                <Text style={[styles.lineGrandTotalValue, { color: colors.accent }]}>
                                  {relatedLine.lineGrandTotal.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
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
            <View style={[styles.section, { backgroundColor: shellBg, borderColor: sectionOutline }]}>
              <Text style={[styles.sectionTitle, { color: titleText }]}>Özet</Text>
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
                (isSubmitting || createOrder.isPending) && styles.submitButtonDisabled,
              ]}
              onPress={
                activeTab === "general"
                  ? () => setActiveTab("lines")
                  : handleSubmit(onSubmit, onInvalidSubmit)
              }
              disabled={isSubmitting || createOrder.isPending}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentSecondary || "#f97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButton}
              >
                {isSubmitting || createOrder.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{activeTab === "general" ? "Devam Et" : "Siparişi Kaydet"}</Text>
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
                  setValue("order.deliveryDate", tempDeliveryDate.toISOString().split("T")[0]);
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

        <OrderLineForm
          visible={lineFormVisible}
          line={editingLine}
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
          exchangeRates={effectiveRatesForLines}
        />

        <ExchangeRateDialog
          visible={exchangeRateDialogVisible}
          exchangeRates={exchangeRates}
          currencyOptions={currencyOptions}
          erpExchangeRates={erpRatesForOrder}
          isLoadingErpRates={isLoadingErpRates && erpRatesForOrder.length === 0}
          currencyInUse={lines.length > 0 ? (watchedCurrency || undefined) : undefined}
          onClose={() => setExchangeRateDialogVisible(false)}
          onSave={(rates) => {
            setExchangeRates(rates);
            setExchangeRateDialogVisible(false);
          }}
          offerDate={watchedOfferDate || undefined}
        />

        <CustomerSelectDialog
          open={customerSelectDialogOpen}
          onOpenChange={setCustomerSelectDialogOpen}
          onSelect={handleCustomerSelect}
        />

        <PickerModal
          visible={paymentTypeModalVisible}
          options={
            paymentTypes?.map((pt) => ({ id: pt.id, name: pt.name })) || []
          }
          selectedValue={watch("order.paymentTypeId") ?? undefined}
          onSelect={(option) => {
            setValue("order.paymentTypeId", option.id as number);
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
          selectedValue={watch("order.currency")}
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
          selectedValue={watch("order.representativeId") ?? undefined}
          onSelect={(option) => {
            setValue("order.representativeId", option.id as number);
            setRepresentativeModalVisible(false);
          }}
          onClose={() => setRepresentativeModalVisible(false)}
          title="Satış Temsilcisi Seçiniz"
          searchPlaceholder="Temsilci ara..."
        />

        {watchedCustomerId && shippingAddresses && shippingAddresses.length > 0 && (
          <PickerModal
            visible={shippingAddressModalVisible}
            options={shippingAddresses.map((addr) => ({
              id: addr.id,
              name: addr.address || "",
            }))}
            selectedValue={watch("order.shippingAddressId") ?? undefined}
            onSelect={(option) => {
              setValue("order.shippingAddressId", option.id as number);
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
    borderWidth: 1,
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
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
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
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.35,
    marginBottom: 10,
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
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  pickerButton: {
    borderWidth: 1,
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
    borderWidth: 1,
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
  lineCard: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  lineCardHeader: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  lineCardContent: {
    flex: 1,
    marginRight: 0,
    paddingRight: 68,
  },
  lineCardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 1,
  },
  lineProductName: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.12,
    flex: 1,
    lineHeight: 16,
  },
  mainBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mainBadgeText: {
    fontSize: 8,
    fontWeight: "700",
  },
  lineProductCode: {
    fontSize: 9,
    marginBottom: 2,
  },
  lineDetailRows: {
    alignSelf: "stretch",
    width: "100%",
  },
  lineDetailRowsInset: {
    alignSelf: "stretch",
    width: "100%",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linePairRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linePairRowLast: {
    borderBottomWidth: 0,
  },
  lineHalf: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  lineHalfTrailing: {
    alignItems: "flex-end",
  },
  lineMicroLabel: {
    fontSize: 7,
    fontWeight: "600",
    letterSpacing: 0.28,
    textTransform: "uppercase",
  },
  lineMicroValue: {
    fontSize: 9,
    fontWeight: "500",
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] as const },
      default: {},
    }),
  },
  lineDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineDetailRowLast: {
    borderBottomWidth: 0,
  },
  lineDetailLabel: {
    fontSize: 12.5,
  },
  lineDetailValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  lineGrandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    paddingTop: 0,
  },
  lineGrandTotalLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  lineGrandTotalValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  approvalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  approvalBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  lineActions: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    gap: 6,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    fontSize: 16,
  },
  relatedLinesContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  relatedLinesTitle: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    opacity: 0.75,
  },
  relatedLineCard: {
    paddingVertical: 6,
    paddingRight: 6,
    marginBottom: 4,
    marginLeft: 6,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: "transparent",
  },
  relatedLineProductName: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    lineHeight: 15,
  },
  relatedLineProductCode: {
    fontSize: 9,
    marginBottom: 4,
  },
  relatedLineDetailRows: {
    alignSelf: "stretch",
    width: "100%",
    marginBottom: 4,
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
  lineCardWrapper: {
    marginBottom: 6,
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
