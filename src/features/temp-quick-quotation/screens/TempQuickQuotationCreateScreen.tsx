import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import * as Sharing from "expo-sharing";
import {
  Add01Icon, 
  Edit02Icon, 
  Delete02Icon, 
  Note01Icon, 
  Coins01Icon,
  File01Icon,
} from "hugeicons-react-native";
import { WebView } from "react-native-webview";

import { ScreenHeader } from "../../../components/navigation";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { useToast } from "../../../hooks/useToast";
import { tempQuickQuotationRepository } from "../repositories/tempQuotattion.repository";
import type {
  TempQuotattionCreateDto,
  TempQuotattionLineCreateDto,
  TempQuotattionLineUpdateDto,
  TempQuotattionExchangeLineCreateDto,
  TempQuotattionExchangeLineUpdateDto,
  TempQuotattionUpdateDto,
} from "../models/tempQuotattion.model";
import { QuotationLineForm, PickerModal } from "../../quotation/components";
import type { QuotationLineFormState, QuotationExchangeRateFormState } from "../../quotation/types";
import { useExchangeRate, useCurrencyOptions } from "../../quotation/hooks";
import {
  CustomerSelectDialog,
  type CustomerSelectionResult,
} from "../../customer/components";
import type { CustomerDto } from "../../customer/types";
import {
  buildEffectiveExchangeRates,
  findCurrencyOptionByValue,
  resolveExchangeRateByCurrency,
} from "../../../lib/resolve-exchange-rate";
import { canPreviewPdfInApp, openPdfExternallyAsync } from "../../../lib/pdf";
import { calculateLineTotals } from "../../quotation/utils";
import { createBuiltInTempQuickQuotationReportPdf } from "../utils/createBuiltInTempQuickQuotationReportPdf";

function numberValue(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDbLineId(mixedId: string): number | null {
  if (!mixedId.startsWith("db-")) return null;
  const parsed = Number(mixedId.replace("db-", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toDbExchangeId(mixedId: string): number | null {
  if (!mixedId.startsWith("dbx-")) return null;
  const parsed = Number(mixedId.replace("dbx-", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function mapFormLineToCreateDto(line: QuotationLineFormState, headerId: number): TempQuotattionLineCreateDto {
  return {
    tempQuotattionId: headerId,
    productCode: line.productCode || "",
    productName: line.productName || "",
    quantity: line.quantity || 0,
    unitPrice: line.unitPrice || 0,
    discountRate1: line.discountRate1 || 0,
    discountAmount1: line.discountAmount1 || 0,
    discountRate2: line.discountRate2 || 0,
    discountAmount2: line.discountAmount2 || 0,
    discountRate3: line.discountRate3 || 0,
    discountAmount3: line.discountAmount3 || 0,
    vatRate: line.vatRate || 0,
    vatAmount: line.vatAmount || 0,
    lineTotal: line.lineTotal || 0,
    lineGrandTotal: line.lineGrandTotal || 0,
    description: line.description || "",
  };
}

function mapFormLineToUpdateDto(line: QuotationLineFormState): TempQuotattionLineUpdateDto {
  return {
    productCode: line.productCode || "",
    productName: line.productName || "",
    quantity: line.quantity || 0,
    unitPrice: line.unitPrice || 0,
    discountRate1: line.discountRate1 || 0,
    discountAmount1: line.discountAmount1 || 0,
    discountRate2: line.discountRate2 || 0,
    discountAmount2: line.discountAmount2 || 0,
    discountRate3: line.discountRate3 || 0,
    discountAmount3: line.discountAmount3 || 0,
    vatRate: line.vatRate || 0,
    vatAmount: line.vatAmount || 0,
    lineTotal: line.lineTotal || 0,
    lineGrandTotal: line.lineGrandTotal || 0,
    description: line.description || "",
  };
}

function mapRateToCreateDto(
  rate: QuotationExchangeRateFormState,
  headerId: number,
  fallbackDate: string
): TempQuotattionExchangeLineCreateDto {
  return {
    tempQuotattionId: headerId,
    currency: rate.currency,
    exchangeRate: rate.exchangeRate || 0,
    exchangeRateDate: rate.exchangeRateDate || fallbackDate,
    isManual: !(rate.isOfficial ?? true),
  };
}

function mapRateToUpdateDto(
  rate: QuotationExchangeRateFormState,
  fallbackDate: string
): TempQuotattionExchangeLineUpdateDto {
  return {
    currency: rate.currency,
    exchangeRate: rate.exchangeRate || 0,
    exchangeRateDate: rate.exchangeRateDate || fallbackDate,
    isManual: !(rate.isOfficial ?? true),
  };
}

export function TempQuickQuotationCreateScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { colors, themeMode } = useUIStore();
  const { showError, showSuccess } = useToast();
  const params = useLocalSearchParams<{
    id?: string;
    customerId?: string;
    customerName?: string;
    customerCode?: string;
  }>();

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#0c0516" : "#FAFAFA";
  const gradientColors = (isDark
    ? ['rgba(236, 72, 153, 0.12)', 'transparent', 'rgba(249, 115, 22, 0.12)']
    : ['rgba(255, 235, 240, 0.6)', '#FFFFFF', 'rgba(255, 240, 225, 0.6)']) as [string, string, ...string[]];

  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(236, 72, 153, 0.25)";
  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const errorColor = "#EF4444";

  const editId = params.id ? Number(params.id) : undefined;
  const isEdit = !!editId;
  const preselectedCustomerId = params.customerId ? Number(params.customerId) : undefined;
  const hasPreselectedCustomer = !!preselectedCustomerId;

  const [customerId, setCustomerId] = useState<number | undefined>(preselectedCustomerId);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | undefined>(
    hasPreselectedCustomer
      ? {
          id: preselectedCustomerId as number,
          name: params.customerName ? String(params.customerName) : "",
          customerCode: params.customerCode ? String(params.customerCode) : undefined,
        }
      : undefined
  );
  const [currencyCode, setCurrencyCode] = useState("TRY");
  const [exchangeRate, setExchangeRate] = useState("1.00");
  const [description, setDescription] = useState("");
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [pdfFileUri, setPdfFileUri] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  const [editingLine, setEditingLine] = useState<QuotationLineFormState | null>(null);
  const [lineFormVisible, setLineFormVisible] = useState(false);

  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);

  const offerDate = useMemo(() => new Date().toISOString().split("T")[0], []);
  const exchangeRateParams = useMemo(() => ({ tarih: offerDate, fiyatTipi: 1 as const }), [offerDate]);
  const { data: erpExchangeRates = [], isLoading: isLoadingErpRates } = useExchangeRate(exchangeRateParams);
  const { data: currencyOptions = [] } = useCurrencyOptions(exchangeRateParams);

  const detailQuery = useQuery({
    queryKey: ["temp-quick-quotation", "detail", editId],
    queryFn: () => tempQuickQuotationRepository.getById(editId as number),
    enabled: isEdit,
  });

  const linesQuery = useQuery({
    queryKey: ["temp-quick-quotation", "lines", editId],
    queryFn: () => tempQuickQuotationRepository.getLinesByHeaderId(editId as number),
    enabled: isEdit,
  });

  const exchangeLinesQuery = useQuery({
    queryKey: ["temp-quick-quotation", "exchange-lines", editId],
    queryFn: () => tempQuickQuotationRepository.getExchangeLinesByHeaderId(editId as number),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    const detailCustomerId = detailQuery.data.customerId ?? undefined;
    setCustomerId(detailCustomerId);
    if (detailCustomerId) {
      setSelectedCustomer({
        id: detailCustomerId,
        name: detailQuery.data.customerName || "",
      } as CustomerDto);
    }
    setCurrencyCode(detailQuery.data.currencyCode || "TRY");
    setExchangeRate(String(detailQuery.data.exchangeRate ?? 1));
    setDescription(detailQuery.data.description || "");
  }, [detailQuery.data]);

  useEffect(() => {
    if (!detailQuery.data || !currencyOptions.length) return;
    const normalizedCode =
      findCurrencyOptionByValue(detailQuery.data.currencyCode, currencyOptions)?.code ??
      detailQuery.data.currencyCode ??
      "TRY";
    setCurrencyCode(String(normalizedCode).toUpperCase());
  }, [detailQuery.data, currencyOptions]);

  useEffect(() => {
    if (!isEdit && hasPreselectedCustomer) {
      setCustomerId(preselectedCustomerId);
      setExchangeRate("1.00");
    }
  }, [isEdit, hasPreselectedCustomer, preselectedCustomerId]);

  const handleCustomerChange = useCallback((customer: CustomerDto | undefined) => {
    setSelectedCustomer(customer);
    setCustomerId(customer?.id);
  }, []);

  const handleCustomerSelect = useCallback((result: CustomerSelectionResult) => {
    const nextCustomer: CustomerDto = {
      id: result.customerId,
      name: result.customerName,
      customerCode: result.erpCustomerCode,
    };

    handleCustomerChange(nextCustomer);
  }, [handleCustomerChange]);

  useEffect(() => {
    if (isEdit) return;
    if (!currencyOptions || currencyOptions.length === 0) return;
    if (currencyCode && currencyOptions.some((x) => x.code === currencyCode)) return;
    const tlOption =
      findCurrencyOptionByValue("TL", currencyOptions) ??
      findCurrencyOptionByValue("TRY", currencyOptions);
    setCurrencyCode((tlOption?.code || currencyOptions[0]?.code || "TRY").toUpperCase());
  }, [currencyOptions, currencyCode, isEdit]);

  useEffect(() => {
    const normalized = currencyCode.trim().toUpperCase();
    if (!normalized) return;
    const tlOption =
      findCurrencyOptionByValue("TL", currencyOptions) ??
      findCurrencyOptionByValue("TRY", currencyOptions);
    const isTlCurrency =
      normalized === "TRY" ||
      normalized === "TL" ||
      (tlOption != null && normalized === String(tlOption.dovizTipi).toUpperCase());

    if (isTlCurrency) {
      setExchangeRate("1.00");
      return;
    }
    const lineRate = exchangeRates.find((x) => x.currency === normalized)?.exchangeRate;
    if (lineRate && lineRate > 0) {
      setExchangeRate(String(lineRate));
      return;
    }
    const erpRate = erpExchangeRates.find((x) => String(x.dovizTipi) === normalized)?.kurDegeri;
    if (erpRate && erpRate > 0) {
      setExchangeRate(String(erpRate));
    }
  }, [currencyCode, exchangeRates, erpExchangeRates, currencyOptions]);

  useEffect(() => {
    if (!linesQuery.data) return;
    const mapped: QuotationLineFormState[] = linesQuery.data.map((line) => ({
      id: `db-${line.id}`,
      productId: null,
      productCode: line.productCode,
      productName: line.productName,
      groupCode: null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate1: line.discountRate1,
      discountAmount1: line.discountAmount1,
      discountRate2: line.discountRate2,
      discountAmount2: line.discountAmount2,
      discountRate3: line.discountRate3,
      discountAmount3: line.discountAmount3,
      vatRate: line.vatRate,
      vatAmount: line.vatAmount,
      lineTotal: line.lineTotal,
      lineGrandTotal: line.lineGrandTotal,
      description: line.description,
      isEditing: false,
      relatedStockId: null,
      relatedProductKey: undefined,
      isMainRelatedProduct: true,
      approvalStatus: 0,
    }));
    setLines(mapped);
  }, [linesQuery.data]);

  useEffect(() => {
    if (!exchangeLinesQuery.data) return;
    const mapped: QuotationExchangeRateFormState[] = exchangeLinesQuery.data.map((line) => ({
      id: `dbx-${line.id}`,
      currency: line.currency,
      exchangeRate: line.exchangeRate,
      exchangeRateDate: line.exchangeRateDate,
      isOfficial: !line.isManual,
      dovizTipi: Number(line.currency),
    }));
    setExchangeRates(mapped);
  }, [exchangeLinesQuery.data]);

  const effectiveExchangeRates = useMemo<QuotationExchangeRateFormState[]>(() => {
    const mergedRates = buildEffectiveExchangeRates(
      exchangeRates,
      erpExchangeRates,
      currencyOptions,
      offerDate
    );

    const hasSelectedCurrency = mergedRates.some((rate) => rate.currency === currencyCode);
    if (hasSelectedCurrency) {
      return mergedRates;
    }

    const normalizedExchangeRate = numberValue(exchangeRate) > 0 ? numberValue(exchangeRate) : 1;
    return [
      ...mergedRates,
      {
        id: "selected-currency",
        currency: currencyCode.trim().toUpperCase() || "TRY",
        exchangeRate: normalizedExchangeRate,
        exchangeRateDate: offerDate,
        isOfficial: false,
      },
    ];
  }, [currencyCode, exchangeRate, exchangeRates, erpExchangeRates, currencyOptions, offerDate]);

  const effectiveLineExchangeRates = useMemo(
    () =>
      effectiveExchangeRates
        .map((rate) => {
          const dovizTipi =
            rate.dovizTipi ??
            findCurrencyOptionByValue(rate.currency, currencyOptions)?.dovizTipi ??
            Number(rate.currency);

          if (!Number.isFinite(dovizTipi) || !(rate.exchangeRate > 0)) {
            return null;
          }

          return {
            dovizTipi,
            kurDegeri: rate.exchangeRate,
          };
        })
        .filter((rate): rate is { dovizTipi: number; kurDegeri: number } => rate !== null),
    [effectiveExchangeRates, currencyOptions]
  );

  const applyCurrencyChange = useCallback(
    (newCurrency: string) => {
      const normalizedNewCurrency = newCurrency.trim().toUpperCase();
      const oldCurrency = currencyCode || "";

      if (!oldCurrency || oldCurrency === normalizedNewCurrency) {
        setCurrencyCode(normalizedNewCurrency);
        return;
      }

      const oldRate = resolveExchangeRateByCurrency(
        oldCurrency,
        effectiveExchangeRates,
        erpExchangeRates,
        currencyOptions
      );
      const newRate = resolveExchangeRateByCurrency(
        normalizedNewCurrency,
        effectiveExchangeRates,
        erpExchangeRates,
        currencyOptions
      );

      if (oldRate == null || newRate == null || newRate <= 0) {
        setCurrencyCode(normalizedNewCurrency);
        return;
      }

      const conversionRatio = oldRate / newRate;
      setLines((prev) =>
        prev.map((line) =>
          calculateLineTotals({
            ...line,
            unitPrice: line.unitPrice * conversionRatio,
          })
        )
      );
      setCurrencyCode(normalizedNewCurrency);
    },
    [currencyCode, effectiveExchangeRates, erpExchangeRates, currencyOptions]
  );

  const createMutation = useMutation({
    mutationFn: async (payload: TempQuotattionCreateDto) => {
      const created = await tempQuickQuotationRepository.create(payload);
      const headerId = created.id;
      if (lines.length > 0) {
        const createLinesPayload = lines.map((line) => mapFormLineToCreateDto(line, headerId));
        await tempQuickQuotationRepository.createLines(createLinesPayload);
      }
      for (const rate of effectiveExchangeRates) {
        if (!rate.currency || !rate.exchangeRate) continue;
        await tempQuickQuotationRepository.createExchangeLine(
          mapRateToCreateDto(rate, headerId, offerDate)
        );
      }
      return created;
    },
    onSuccess: () => {
      showSuccess("Hızlı teklif oluşturuldu");
      router.replace("/(tabs)/sales/quotations/quick/list");
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : "Hızlı teklif oluşturulamadı");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: TempQuotattionUpdateDto }) => {
      await tempQuickQuotationRepository.revise(id, payload);

      const existingLines = linesQuery.data ?? [];
      const existingLineIdSet = new Set(existingLines.map((x) => x.id));
      const currentDbLineIds = new Set(
        lines.map((x) => toDbLineId(x.id)).filter((x): x is number => x !== null)
      );

      const lineDeleteIds = [...existingLineIdSet].filter((idItem) => !currentDbLineIds.has(idItem));
      for (const deleteId of lineDeleteIds) {
        await tempQuickQuotationRepository.removeLine(deleteId);
      }

      for (const line of lines) {
        const dbId = toDbLineId(line.id);
        if (dbId !== null) {
          await tempQuickQuotationRepository.updateLine(dbId, mapFormLineToUpdateDto(line));
        }
      }

      const newLines = lines.filter((x) => toDbLineId(x.id) === null);
      if (newLines.length > 0) {
        await tempQuickQuotationRepository.createLines(
          newLines.map((line) => mapFormLineToCreateDto(line, id))
        );
      }

      const existingExchangeLines = exchangeLinesQuery.data ?? [];
      const existingExchangeIdSet = new Set(existingExchangeLines.map((x) => x.id));
      const currentDbExchangeIds = new Set(
        effectiveExchangeRates.map((x) => toDbExchangeId(x.id)).filter((x): x is number => x !== null)
      );

      const exchangeDeleteIds = [...existingExchangeIdSet].filter((idItem) => !currentDbExchangeIds.has(idItem));
      for (const deleteId of exchangeDeleteIds) {
        await tempQuickQuotationRepository.removeExchangeLine(deleteId);
      }

      for (const rate of effectiveExchangeRates) {
        const dbId = toDbExchangeId(rate.id);
        if (dbId !== null) {
          await tempQuickQuotationRepository.updateExchangeLine(dbId, mapRateToUpdateDto(rate, offerDate));
        }
      }

      const newRates = effectiveExchangeRates.filter((x) => toDbExchangeId(x.id) === null);
      for (const rate of newRates) {
        if (!rate.currency || !rate.exchangeRate) continue;
        await tempQuickQuotationRepository.createExchangeLine(
          mapRateToCreateDto(rate, id, offerDate)
        );
      }

      return true;
    },
    onSuccess: () => {
      showSuccess("Hızlı teklif revize edildi");
      router.replace("/(tabs)/sales/quotations/quick/list");
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : "Hızlı teklif revize edilemedi");
    },
  });

  const handleSaveLine = useCallback(
    (savedLine: QuotationLineFormState) => {
      if (editingLine) {
        setLines((prev) => prev.map((line) => (line.id === editingLine.id ? savedLine : line)));
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

  const handleDeleteLine = useCallback((lineId: string) => {
    setLines((prev) => {
      const lineToDelete = prev.find((line) => line.id === lineId);
      if (lineToDelete?.relatedProductKey) {
        return prev.filter(
          (line) => line.id !== lineId && line.relatedProductKey !== lineToDelete.relatedProductKey
        );
      }
      return prev.filter((line) => line.id !== lineId);
    });
  }, []);

  const submit = (): void => {
    const resolvedExchangeRate =
      effectiveExchangeRates.find((x) => x.currency === currencyCode)?.exchangeRate ||
      effectiveExchangeRates[0]?.exchangeRate ||
      numberValue(exchangeRate);

    const payload: TempQuotattionCreateDto = {
      customerId: customerId ?? 0,
      currencyCode: currencyCode.trim().toUpperCase() || "TRY",
      exchangeRate: resolvedExchangeRate,
      discountRate1: 0,
      discountRate2: 0,
      discountRate3: 0,
      description: description.trim(),
    };

    if (!payload.customerId) {
      showError("Müşteri seçimi zorunlu");
      return;
    }

    if (lines.length === 0) {
      showError("En az 1 stok satırı eklemelisin");
      return;
    }

    if (isEdit && editId) {
      updateMutation.mutate({ id: editId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const loading = detailQuery.isLoading || linesQuery.isLoading || exchangeLinesQuery.isLoading;
  const inAppPdfPreviewAvailable = useMemo(() => canPreviewPdfInApp(), []);
  const pdfViewerHeight = useMemo(() => Math.max(420, windowHeight * 0.55), [windowHeight]);

  const handleGeneratePdf = useCallback(async () => {
    if (lines.length === 0) {
      showError("PDF oluşturmak için en az 1 stok satırı eklemelisin");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const fileUri = await createBuiltInTempQuickQuotationReportPdf({
        tempQuotationId: editId,
        customerName: selectedCustomer?.name ?? detailQuery.data?.customerName ?? null,
        customerCode: selectedCustomer?.customerCode ?? params.customerCode ?? null,
        currencyCode,
        lines,
        offerDate,
        description,
      });

      setPdfFileUri(fileUri);
      if (!inAppPdfPreviewAvailable) {
        const result = await openPdfExternallyAsync(fileUri);
        if (!result.opened && result.reason === "no_app") {
          showError("Cihazda PDF açabilecek bir uygulama bulunamadı.");
        }
      }
      showSuccess("PDF oluşturuldu");
    } catch (error) {
      showError(error instanceof Error ? error.message : "PDF oluşturulamadı");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [
    currencyCode,
    description,
    detailQuery.data?.customerName,
    editId,
    lines,
    offerDate,
    params.customerCode,
    selectedCustomer?.customerCode,
    selectedCustomer?.name,
    showError,
    showSuccess,
    inAppPdfPreviewAvailable,
  ]);

  const handleSharePdf = useCallback(async () => {
    if (pdfFileUri == null) {
      return;
    }

    try {
      const shareUri = pdfFileUri.startsWith("file://") ? pdfFileUri : `file://${pdfFileUri}`;
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showError("Paylaşım bu cihazda kullanılamıyor");
        return;
      }

      await Sharing.shareAsync(shareUri, {
        mimeType: "application/pdf",
        dialogTitle: "Hızlı Teklif PDF Paylaş",
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "PDF paylaşılamadı");
    }
  }, [pdfFileUri, showError]);

  const handleOpenPdf = useCallback(async () => {
    if (pdfFileUri == null) {
      return;
    }

    const result = await openPdfExternallyAsync(pdfFileUri);
    if (!result.opened) {
      showError(
        result.reason === "no_app"
          ? "Cihazda PDF açabilecek bir uygulama bulunamadı."
          : "PDF açılamadı."
      );
    }
  }, [pdfFileUri, showError]);

  return (
    <View style={[styles.container, { backgroundColor: mainBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={{ flex: 1 }}>
        <ScreenHeader
          title={isEdit ? "Hızlı Teklif Revize Et" : "Hızlı Teklif Oluştur"}
          showBackButton
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={brandColor} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, 24) + 60 }, 
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={[styles.label, { color: mutedColor }]}>Müşteri</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerButton, { borderColor, backgroundColor: inputBg }]}
                onPress={() => setCustomerSelectDialogOpen(true)}
                activeOpacity={0.78}
              >
                <Text
                  style={[
                    styles.pickerText,
                    { color: selectedCustomer?.name ? textColor : mutedColor },
                  ]}
                >
                  {selectedCustomer?.name?.trim() || "Müşteri seçiniz"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: mutedColor }]}>Para Birimi</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerButton, { borderColor, backgroundColor: inputBg }]}
                onPress={() => setCurrencyModalVisible(true)}
              >
                <Text style={[styles.pickerText, { color: textColor }]}>
                  {currencyOptions.find((c) => c.code === currencyCode)?.dovizIsmi ?? currencyCode}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: mutedColor }]}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textArea, { borderColor, backgroundColor: inputBg, color: textColor }]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="Teklif açıklaması..."
                placeholderTextColor={mutedColor}
              />
            </View>

            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Note01Icon size={18} color={brandColor} variant="stroke" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Stok Satırları</Text>
              </View>
              <TouchableOpacity
                style={[styles.sectionButton, { backgroundColor: isDark ? "rgba(14, 165, 233, 0.15)" : "rgba(14, 165, 233, 0.1)", borderColor: "rgba(14, 165, 233, 0.3)" }]}
                onPress={() => {
                  setEditingLine(null);
                  setLineFormVisible(true);
                }}
              >
                <Add01Icon size={16} color="#0ea5e9" variant="stroke" style={{ marginRight: 4 }} />
                <Text style={[styles.sectionButtonText, { color: "#0ea5e9" }]}>Stok Ekle</Text>
              </TouchableOpacity>
            </View>

            {lines.length === 0 ? (
              <View style={[styles.emptyContainer, { borderColor, backgroundColor: cardBg }]}>
                <Text style={[styles.emptyText, { color: mutedColor }]}>Henüz stok satırı eklenmedi.</Text>
              </View>
            ) : (
              <View style={styles.listGroup}>
                {lines.map((line) => (
                  <View key={line.id} style={[styles.lineCard, { borderColor, backgroundColor: cardBg }]}> 
                    <Text style={[styles.lineTitle, { color: textColor }]}>{line.productCode} - {line.productName}</Text>
                    <View style={styles.lineDetailsGrid}>
                      <Text style={[styles.lineText, { color: mutedColor }]}>Miktar: <Text style={{ color: textColor }}>{line.quantity}</Text></Text>
                      <Text style={[styles.lineText, { color: mutedColor }]}>Fiyat: <Text style={{ color: textColor }}>{line.unitPrice}</Text></Text>
                      <Text style={[styles.lineText, { color: mutedColor }]}>Kur: <Text style={{ color: textColor }}>{exchangeRate}</Text></Text>
                      <Text style={[styles.lineText, { color: mutedColor }]}>İsk. 1: <Text style={{ color: textColor }}>%{line.discountRate1 ?? 0}</Text></Text>
                    </View>
                    <View style={styles.lineActions}>
                      <TouchableOpacity
                        style={[styles.actionPill, { backgroundColor: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(14, 165, 233, 0.08)", borderColor: "rgba(14, 165, 233, 0.2)" }]}
                        onPress={() => {
                          setEditingLine(line);
                          setLineFormVisible(true);
                        }}
                      >
                        <Edit02Icon size={16} color="#0ea5e9" variant="stroke" style={{ marginRight: 6 }} />
                        <Text style={[styles.actionPillText, { color: "#0ea5e9" }]}>Düzenle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionPill, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.2)" }]}
                        onPress={() =>
                          Alert.alert("Sil", "Bu stok satırını silmek istiyor musun?", [
                            { text: "Vazgeç", style: "cancel" },
                            { text: "Sil", style: "destructive", onPress: () => handleDeleteLine(line.id) },
                          ])
                        }
                      >
                        <Delete02Icon size={16} color={errorColor} variant="stroke" style={{ marginRight: 6 }} />
                        <Text style={[styles.actionPillText, { color: errorColor }]}>Sil</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Coins01Icon size={18} color={brandColor} variant="stroke" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Anlık Kur Satırları</Text>
              </View>
            </View>

            {effectiveExchangeRates.length === 0 ? (
              <View style={[styles.emptyContainer, { borderColor, backgroundColor: cardBg }]}>
                <Text style={[styles.emptyText, { color: mutedColor }]}>Kur satırı bulunmuyor.</Text>
              </View>
            ) : (
              <View style={styles.listGroup}>
                {effectiveExchangeRates.map((rate) => (
                  <View key={rate.id} style={[styles.exchangeCard, { borderColor, backgroundColor: cardBg }]}> 
                    <Text style={[styles.lineTitle, { color: textColor }]}>{rate.currency}</Text>
                    <View style={styles.exchangeRatePill}>
                      <Text style={[styles.lineText, { color: brandColor, fontWeight: "700" }]}>{rate.exchangeRate}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <File01Icon size={18} color={brandColor} variant="stroke" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>PDF Çıktısı</Text>
              </View>
            </View>

            <View style={[styles.reportCard, { borderColor, backgroundColor: cardBg }]}>
              <Text style={[styles.label, { color: mutedColor, marginLeft: 0 }]}>Rapor Şablonu</Text>
              <View style={[styles.reportTemplateBox, { borderColor, backgroundColor: inputBg }]}>
                <Text style={[styles.reportTemplateText, { color: textColor }]}>Windo Teklif Yap</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.reportPrimaryButton,
                  { backgroundColor: isGeneratingPdf ? mutedColor : brandColor },
                ]}
                onPress={() => {
                  void handleGeneratePdf();
                }}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.reportPrimaryButtonText}>PDF Oluştur</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reportSecondaryButton,
                  { backgroundColor: pdfFileUri ? "#60A5FA" : mutedColor, opacity: pdfFileUri ? 1 : 0.6 },
                ]}
                onPress={() => {
                  void handleSharePdf();
                }}
                disabled={!pdfFileUri}
              >
                <Text style={styles.reportSecondaryButtonText}>Paylaş</Text>
              </TouchableOpacity>

              {!inAppPdfPreviewAvailable && (
                <TouchableOpacity
                  style={[
                    styles.reportSecondaryButton,
                    { backgroundColor: pdfFileUri ? "#60A5FA" : mutedColor, opacity: pdfFileUri ? 1 : 0.6 },
                  ]}
                  onPress={() => {
                    void handleOpenPdf();
                  }}
                  disabled={!pdfFileUri}
                >
                  <Text style={styles.reportSecondaryButtonText}>PDF Aç</Text>
                </TouchableOpacity>
              )}

              {pdfFileUri && inAppPdfPreviewAvailable ? (
                <View style={[styles.previewSection, { borderColor, backgroundColor: inputBg }]}>
                  <Text style={[styles.previewTitle, { color: textColor }]}>PDF Önizleme</Text>
                  <View style={[styles.pdfViewerWrapper, { height: pdfViewerHeight }]}>
                    <WebView
                      source={{ uri: pdfFileUri }}
                      originWhitelist={["file://", "content://"]}
                      style={styles.pdfWebView}
                      scalesPageToFit
                      nestedScrollEnabled
                    />
                  </View>
                </View>
              ) : pdfFileUri ? (
                <View style={[styles.previewSection, { borderColor, backgroundColor: inputBg }]}>
                  <Text style={[styles.previewTitle, { color: textColor }]}>PDF Önizleme</Text>
                  <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 20 }}>
                    Android APK içinde yerel PDF önizleme yerine dosya, cihazdaki PDF uygulamasında açılır. Açılmazsa Paylaş ile dış uygulamaya gönderebilirsiniz.
                  </Text>
                </View>
              ) : null}
            </View>

            {!loading && (
              <View style={styles.submitContainer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton, 
                    { 
                      backgroundColor: pending ? mutedColor : (isDark ? "rgba(236, 72, 153, 0.15)" : "rgba(219, 39, 119, 0.1)"),
                      borderColor: pending ? "transparent" : (isDark ? "rgba(236, 72, 153, 0.4)" : "rgba(219, 39, 119, 0.3)"),
                      borderWidth: pending ? 0 : 1
                    }
                  ]}
                  onPress={submit}
                  disabled={pending}
                >
                  {pending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={[styles.submitButtonText, { color: pending ? "#FFFFFF" : brandColor }]}>
                      {isEdit ? "Revize Kaydet" : "Hızlı Teklif Oluştur"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        <QuotationLineForm
          visible={lineFormVisible}
          line={editingLine}
          onClose={() => {
            setEditingLine(null);
            setLineFormVisible(false);
          }}
          onSave={handleSaveLine}
          currency={currencyCode}
          currencyOptions={(currencyOptions ?? []).map((x) => ({
            code: x.code,
            dovizTipi: x.dovizTipi,
            dovizIsmi: x.dovizIsmi ?? "",
          }))}
          exchangeRates={effectiveLineExchangeRates}
        />

        <PickerModal
          visible={currencyModalVisible}
          options={(currencyOptions ?? []).map((c) => ({
            id: c.code,
            name: c.dovizIsmi ?? c.code,
            code: c.code,
          }))}
          selectedValue={currencyCode}
          onSelect={(option) => {
            applyCurrencyChange(String(option.id).toUpperCase());
            setCurrencyModalVisible(false);
          }}
          onClose={() => setCurrencyModalVisible(false)}
          title="Para Birimi Seçiniz"
          searchPlaceholder="Para birimi ara..."
        />

        <CustomerSelectDialog
          open={customerSelectDialogOpen}
          onOpenChange={setCustomerSelectDialogOpen}
          onSelect={handleCustomerSelect}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  pickerButton: {
    minHeight: 48,
    justifyContent: "center",
  },
  pickerText: {
    fontSize: 15,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  customerInfoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  customerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  customerInfoTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  customerInfoLine: {
    fontSize: 13,
  },
  sectionHeaderRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listGroup: {
    gap: 10,
  },
  lineCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  lineTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  lineDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  lineText: {
    fontSize: 13,
    minWidth: "45%",
  },
  lineActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  exchangeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  exchangeRatePill: {
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  reportCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  reportTemplateBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  reportTemplateText: {
    fontSize: 15,
    fontWeight: "600",
  },
  reportPrimaryButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reportPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  reportSecondaryButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reportSecondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  previewSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  pdfViewerWrapper: {
    borderRadius: 10,
    overflow: "hidden",
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  submitContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonText: {
    fontWeight: "700",
    fontSize: 15,
  },
});
