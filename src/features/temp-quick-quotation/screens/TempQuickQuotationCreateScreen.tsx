import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import * as Sharing from "expo-sharing";
import { Edit02Icon, Delete02Icon, Coins01Icon, File01Icon } from "hugeicons-react-native";

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
import type {
  QuotationLineFormState,
  QuotationExchangeRateFormState,
} from "../../quotation/types";
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
import { getApiBaseUrl } from "../../../constants/config";
import { openPdfExternallyAsync } from "../../../lib/pdf";
import { calculateLineTotals } from "../../quotation/utils";
import { generateTempQuickQuotationReportPdf } from "../utils/generateTempQuickQuotationReportPdf";
import { useReportTemplateList } from "../../quotation/hooks/useReportTemplateList";
import { DocumentRuleType } from "../../quotation/types";
import { getCurrencyDisplayLabel as getCurrencyDisplayName } from "../../../lib/currencyDisplay";
import type { ProductSelectionResult } from "../../stocks/types";
import type { UploadReportAssetOptions } from "../../quotation/api/quotationApi";

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

function mapFormLineToCreateDto(
  line: QuotationLineFormState,
  headerId: number
): TempQuotattionLineCreateDto {
  return {
    tempQuotattionId: headerId,
    productCode: line.productCode || "",
    productName: line.productName || "",
    imagePath: line.imagePath || "",
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
    imagePath: line.imagePath || "",
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
  const gradientColors = (
    isDark
      ? ["rgba(236, 72, 153, 0.12)", "transparent", "rgba(249, 115, 22, 0.12)"]
      : ["rgba(255, 235, 240, 0.6)", "#FFFFFF", "rgba(255, 240, 225, 0.6)"]
  ) as [string, string, ...string[]];

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
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);

  const [lines, setLines] = useState<QuotationLineFormState[]>([]);
  const [editingLine, setEditingLine] = useState<QuotationLineFormState | null>(null);
  const [lineFormVisible, setLineFormVisible] = useState(false);

  const quickQuotationImageUploadExtras = useMemo((): Omit<UploadReportAssetOptions, "assetScope"> | undefined => {
    if (!isEdit || !editId) return undefined;

    const dbLineId = editingLine?.id?.startsWith("db-") ? toDbLineId(editingLine.id) : null;

    return {
      tempQuotattionId: editId,
      tempQuotattionLineId: dbLineId ?? undefined,
      productCode: editingLine?.productCode || undefined,
    };
  }, [isEdit, editId, editingLine?.id, editingLine?.productCode]);

  const [exchangeRates, setExchangeRates] = useState<QuotationExchangeRateFormState[]>([]);

  const offerDate = useMemo(() => new Date().toISOString().split("T")[0], []);
  const exchangeRateParams = useMemo(
    () => ({ tarih: offerDate, fiyatTipi: 1 as const }),
    [offerDate]
  );
  const { data: erpExchangeRates = [] } = useExchangeRate(exchangeRateParams);
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
      imagePath: line.imagePath || null,
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
          await tempQuickQuotationRepository.updateExchangeLine(
            dbId,
            mapRateToUpdateDto(rate, offerDate)
          );
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

  const handleMultiProductSelect = useCallback(
    async (products: ProductSelectionResult[]) => {
      if (products.length === 0) return [];

      const nextLines = products.map((product, index) =>
        calculateLineTotals({
          id: `temp-${Date.now()}-m${index}`,
          productId: product.id ?? null,
          productCode: product.code,
          productName: product.name,
          groupCode: product.groupCode ?? null,
          unit: product.unit ?? null,
          quantity: 1,
          unitPrice: 0,
          discountRate1: 0,
          discountAmount1: 0,
          discountRate2: 0,
          discountAmount2: 0,
          discountRate3: 0,
          discountAmount3: 0,
          vatRate: product.vatRate ?? 20,
          vatAmount: 0,
          lineTotal: 0,
          lineGrandTotal: 0,
          description: null,
          description1: null,
          description2: null,
          description3: null,
          imagePath: null,
          erpProjectCode: null,
          approvalStatus: 0,
          isEditing: false,
          relatedStockId: product.id ?? null,
          relatedProductKey: product.id != null ? `main-${product.id}-m${index}` : null,
          isMainRelatedProduct: true,
        })
      );
      return nextLines;
    },
    []
  );

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
      showError("En az bir satır eklemelisin");
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
  const { data: reportTemplates } = useReportTemplateList(DocumentRuleType.FastQuotation);
  const selectedTemplate = useMemo(
    () =>
      reportTemplates.find((template) => template.id === selectedTemplateId) ??
      reportTemplates.find((template) => template.default === true) ??
      reportTemplates[0],
    [reportTemplates, selectedTemplateId]
  );
  const selectedReportTemplateTitle =
    selectedTemplate?.title?.trim() || "Hızlı teklif şablonu bulunamadı";

  const canAddLine = useMemo(
    () => Boolean(customerId && String(currencyCode ?? "").trim().length > 0),
    [customerId, currencyCode]
  );

  const headerCurrencyLabel = useMemo(() => {
    const code = String(currencyCode ?? "").trim().toUpperCase();
    const opt = currencyOptions.find((c) => String(c.code).toUpperCase() === code);
    return opt?.dovizIsmi?.trim() || getCurrencyDisplayName(currencyCode);
  }, [currencyOptions, currencyCode]);

  useEffect(() => {
    if (selectedTemplateId == null && selectedTemplate?.id != null) {
      setSelectedTemplateId(selectedTemplate.id);
    }
  }, [selectedTemplate, selectedTemplateId]);

  const handleGeneratePdf = useCallback(async () => {
    if (!editId) {
      showError("Tasarım şablonundan PDF oluşturmak için önce hızlı teklifi kaydedin");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const fileUri = await generateTempQuickQuotationReportPdf({
        tempQuotationId: editId,
        templateId: selectedTemplate?.id,
      });

      setPdfFileUri(fileUri);
      showSuccess("PDF oluşturuldu");
    } catch (error) {
      showError(error instanceof Error ? error.message : "PDF oluşturulamadı");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [
    editId,
    selectedTemplate?.id,
    showError,
    showSuccess,
  ]);

  const handleSharePdf = useCallback(async () => {
    if (pdfFileUri == null) return;

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
    if (pdfFileUri == null) return;

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
                style={[
                  styles.input,
                  styles.pickerButton,
                  { borderColor, backgroundColor: inputBg },
                ]}
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
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor, backgroundColor: inputBg, color: textColor },
                ]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="Teklif açıklaması..."
                placeholderTextColor={mutedColor}
              />
            </View>

            <View style={[styles.linesSectionHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.linesSectionTitle, { color: textColor }]}>Satırlar</Text>
              <TouchableOpacity
                style={[
                  styles.linesAddButton,
                  { backgroundColor: colors.accent + "CC" },
                  !canAddLine && styles.linesAddButtonDisabled,
                ]}
                onPress={() => {
                  setEditingLine(null);
                  setLineFormVisible(true);
                }}
                disabled={!canAddLine}
                activeOpacity={0.85}
              >
                <Text style={styles.linesAddButtonText}>+ Satır Ekle</Text>
              </TouchableOpacity>
            </View>

            {lines.length === 0 ? (
              <Text style={[styles.linesEmptyText, { color: mutedColor }]}>Henüz satır eklenmedi</Text>
            ) : (
              <View style={styles.listGroup}>
                {lines.map((line) => {
                  const qty = Number(line.quantity) || 0;
                  const price = Number(line.unitPrice) || 0;
                  const qtyStr = qty.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const priceStr = price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const disc1 = Number(line.discountRate1 ?? 0) || 0;
                  return (
                    <View
                      key={line.id}
                      style={[styles.lineRow, { borderColor, backgroundColor: cardBg }]}
                    >
                      <View style={styles.lineRowMain}>
                        {line.imagePath ? (
                          <Image
                            source={{ uri: resolveMobileImageUri(line.imagePath) ?? line.imagePath }}
                            style={styles.lineRowThumb}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.lineRowThumbEmpty, { borderColor, backgroundColor: inputBg }]} />
                        )}
                        <View style={styles.lineRowTextBlock}>
                          <Text style={[styles.lineRowCode, { color: mutedColor }]} numberOfLines={1}>
                            {line.productCode || "—"}
                          </Text>
                          <Text style={[styles.lineRowName, { color: textColor }]} numberOfLines={2}>
                            {line.productName || "—"}
                          </Text>
                          <Text style={[styles.lineRowMeta, { color: mutedColor }]} numberOfLines={2}>
                            <Text style={{ color: textColor, fontWeight: "600" }}>{qtyStr}</Text>
                            {" adet · "}
                            <Text style={{ color: textColor, fontWeight: "600" }}>
                              {priceStr} {headerCurrencyLabel}
                            </Text>
                            {" · Kur "}
                            <Text style={{ color: textColor, fontWeight: "600" }}>{exchangeRate}</Text>
                            {disc1 > 0 ? (
                              <>
                                {" · İsk "}
                                <Text style={{ color: textColor, fontWeight: "600" }}>%{disc1}</Text>
                              </>
                            ) : null}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.lineRowActions}>
                        <TouchableOpacity
                          style={[
                            styles.lineIconButton,
                            {
                              borderColor: isDark ? "rgba(236,72,153,0.35)" : "rgba(219,39,119,0.22)",
                              backgroundColor: isDark ? "rgba(236,72,153,0.1)" : "rgba(219,39,119,0.06)",
                            },
                          ]}
                          onPress={() => {
                            setEditingLine(line);
                            setLineFormVisible(true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Satırı düzenle"
                        >
                          <Edit02Icon size={18} color={brandColor} variant="stroke" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.lineIconButton,
                            {
                              borderColor: isDark ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.22)",
                              backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
                            },
                          ]}
                          onPress={() =>
                            Alert.alert("Sil", "Bu satırı silmek istiyor musun?", [
                              { text: "Vazgeç", style: "cancel" },
                              {
                                text: "Sil",
                                style: "destructive",
                                onPress: () => handleDeleteLine(line.id),
                              },
                            ])
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Satırı sil"
                        >
                          <Delete02Icon size={18} color={errorColor} variant="stroke" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={[styles.sectionHeaderRow, { borderBottomColor: borderColor }]}>
              <View style={styles.sectionHeaderLeft}>
                <Coins01Icon size={18} color={brandColor} variant="stroke" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Anlık Kur Satırları</Text>
              </View>
            </View>

            {effectiveExchangeRates.length === 0 ? (
  <View style={[styles.emptyContainer, { borderColor, backgroundColor: cardBg }]}>
    <Text style={[styles.emptyText, { color: mutedColor }]}>
      Kur satırı bulunmuyor.
    </Text>
  </View>
) : (
  <View style={styles.exchangeGrid}>
    {effectiveExchangeRates.map((rate) => {
      const displayCurrency = getCurrencyDisplayName(rate.currency);
      const isSelectedCurrency =
        getCurrencyDisplayName(rate.currency) === getCurrencyDisplayName(currencyCode);

      return (
        <View
          key={rate.id}
          style={[
            styles.exchangeCard,
            {
              borderColor: isSelectedCurrency
                ? isDark
                  ? "rgba(236,72,153,0.28)"
                  : "rgba(219,39,119,0.22)"
                : borderColor,
              backgroundColor: isSelectedCurrency
                ? isDark
                  ? "rgba(236,72,153,0.06)"
                  : "rgba(219,39,119,0.04)"
                : cardBg,
            },
          ]}
        >
          <View style={styles.exchangeTopRow}>
            <Text style={[styles.exchangeCurrencyTitle, { color: textColor }]}>
              {displayCurrency}
            </Text>

            <View
              style={[
                styles.exchangeRatePill,
                {
                  backgroundColor: isSelectedCurrency
                    ? isDark
                      ? "rgba(236,72,153,0.14)"
                      : "rgba(219,39,119,0.10)"
                    : "rgba(236, 72, 153, 0.1)",
                },
              ]}
            >
              <Text style={[styles.exchangeRateText, { color: brandColor }]}>
                {rate.exchangeRate}
              </Text>
            </View>
          </View>

          <Text style={[styles.exchangeSubText, { color: mutedColor }]}>
            {rate.exchangeRateDate || offerDate}
          </Text>
        </View>
      );
    })}
  </View>
)}

            <View style={[styles.sectionHeaderRow, { borderBottomColor: borderColor }]}>
              <View style={styles.sectionHeaderLeft}>
                <File01Icon size={18} color={brandColor} variant="stroke" />
                <Text style={[styles.sectionTitle, { color: textColor }]}>PDF Çıktısı</Text>
              </View>
            </View>

            <View style={[styles.reportCard, { borderColor, backgroundColor: cardBg }]}>
              <Text style={[styles.label, { color: mutedColor, marginLeft: 0 }]}>
                Rapor Şablonu
              </Text>

              <View
                style={[
                  styles.reportTemplateBox,
                  { borderColor, backgroundColor: inputBg },
                ]}
              >
                <TouchableOpacity activeOpacity={0.8} onPress={() => setTemplatePickerVisible(true)}>
                  <Text style={[styles.reportTemplateText, { color: textColor }]}>
                    {selectedReportTemplateTitle}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.reportPrimaryButton,
                  {
                    backgroundColor: isGeneratingPdf
                      ? isDark
                        ? "rgba(236,72,153,0.10)"
                        : "rgba(219,39,119,0.08)"
                      : isDark
                        ? "rgba(236,72,153,0.18)"
                        : "rgba(219,39,119,0.12)",
                    borderColor: isGeneratingPdf
                      ? isDark
                        ? "rgba(236,72,153,0.22)"
                        : "rgba(219,39,119,0.16)"
                      : isDark
                        ? "rgba(236,72,153,0.38)"
                        : "rgba(219,39,119,0.24)",
                  },
                ]}
                onPress={() => {
                  void handleGeneratePdf();
                }}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator color={brandColor} size="small" />
                ) : (
                  <Text style={[styles.reportPrimaryButtonText, { color: brandColor }]}>
                    PDF Oluştur
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.pdfActionRow}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.reportSecondaryButton,
                    {
                      flex: 1,
                      backgroundColor: pdfFileUri
                        ? isDark
                          ? "rgba(56,189,248,0.10)"
                          : "rgba(14,165,233,0.08)"
                        : isDark
                          ? "rgba(255,255,255,0.025)"
                          : "rgba(15,23,42,0.035)",
                      borderColor: pdfFileUri
                        ? isDark
                          ? "rgba(56,189,248,0.26)"
                          : "rgba(14,165,233,0.18)"
                        : borderColor,
                      opacity: pdfFileUri ? 1 : 0.55,
                    },
                  ]}
                  onPress={() => {
                    void handleOpenPdf();
                  }}
                  disabled={!pdfFileUri}
                >
                  <Text
                    style={[
                      styles.reportSecondaryButtonText,
                      { color: pdfFileUri ? (isDark ? "#7DD3FC" : "#0284C7") : mutedColor },
                    ]}
                  >
                    PDF Aç
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.reportSecondaryButton,
                    {
                      flex: 1,
                      backgroundColor: pdfFileUri
                        ? isDark
                          ? "rgba(249,115,22,0.10)"
                          : "rgba(245,158,11,0.08)"
                        : isDark
                          ? "rgba(255,255,255,0.025)"
                          : "rgba(15,23,42,0.035)",
                      borderColor: pdfFileUri
                        ? isDark
                          ? "rgba(249,115,22,0.24)"
                          : "rgba(245,158,11,0.18)"
                        : borderColor,
                      opacity: pdfFileUri ? 1 : 0.55,
                    },
                  ]}
                  onPress={() => {
                    void handleSharePdf();
                  }}
                  disabled={!pdfFileUri}
                >
                  <Text
                    style={[
                      styles.reportSecondaryButtonText,
                      { color: pdfFileUri ? (isDark ? "#FDBA74" : "#D97706") : mutedColor },
                    ]}
                  >
                    Paylaş
                  </Text>
                </TouchableOpacity>
              </View>

              {pdfFileUri ? (
                <View
                  style={[
                    styles.previewSection,
                    {
                      borderColor: isDark
                        ? "rgba(236,72,153,0.18)"
                        : "rgba(219,39,119,0.14)",
                      backgroundColor: isDark
                        ? "rgba(236,72,153,0.08)"
                        : "rgba(219,39,119,0.06)",
                    },
                  ]}
                >
                  <Text style={[styles.previewTitle, { color: textColor }]}>PDF hazır</Text>
                  <Text style={[styles.previewInfoText, { color: mutedColor }]}>
                    Görüntülemek için “PDF Aç” butonuna dokunup cihazınızdaki uygun uygulamayı
                    seçebilirsiniz.
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.previewSection,
                    {
                      borderColor,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.025)"
                        : "rgba(15,23,42,0.03)",
                    },
                  ]}
                >
                  <Text style={[styles.previewTitle, { color: textColor }]}>
                    PDF henüz oluşturulmadı
                  </Text>
                  <Text style={[styles.previewInfoText, { color: mutedColor }]}>
                    Önce PDF oluşturun, ardından açabilir veya paylaşabilirsiniz.
                  </Text>
                </View>
              )}
            </View>

            {!loading && (
              <View style={styles.submitContainer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: pending
                        ? mutedColor
                        : isDark
                          ? "rgba(236, 72, 153, 0.15)"
                          : "rgba(219, 39, 119, 0.1)",
                      borderColor: pending
                        ? "transparent"
                        : isDark
                          ? "rgba(236, 72, 153, 0.4)"
                          : "rgba(219, 39, 119, 0.3)",
                      borderWidth: pending ? 0 : 1,
                    },
                  ]}
                  onPress={submit}
                  disabled={pending}
                >
                  {pending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={[styles.submitButtonText, { color: pending ? "#FFFFFF" : brandColor }]}
                    >
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
          allowImageUpload
          imageUploadScope="quick-quotation"
          imageUploadExtras={quickQuotationImageUploadExtras}
          currencyOptions={(currencyOptions ?? []).map((x) => ({
            code: x.code,
            dovizTipi: x.dovizTipi,
            dovizIsmi: x.dovizIsmi ?? "",
          }))}
          exchangeRates={effectiveLineExchangeRates}
          onMultiProductSelect={handleMultiProductSelect}
          onSaveMultiple={(newLines) => {
            setLines((prev) => [...prev, ...newLines]);
            setEditingLine(null);
            setLineFormVisible(false);
          }}
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

        <PickerModal
          visible={templatePickerVisible}
          options={reportTemplates.map((template) => ({
            id: template.id,
            name: template.title,
          }))}
          selectedValue={selectedTemplateId}
          onSelect={(option) => {
            setSelectedTemplateId(Number(option.id));
            setTemplatePickerVisible(false);
          }}
          onClose={() => setTemplatePickerVisible(false)}
          title="Rapor Şablonu Seçiniz"
          searchPlaceholder="Şablon ara..."
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
    borderWidth: 1.3,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  pickerButton: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1.3,
    borderRadius: 14,
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
    borderWidth: 1.25,
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
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(236,72,153,0.08)",
  },
  linesSectionHeader: {
    marginTop: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  linesSectionTitle: {
    fontSize: 12.3,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(236,72,153,0.08)",
  },
  linesAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  linesAddButtonDisabled: {
    opacity: 0.45,
  },
  linesAddButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  linesEmptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
    fontWeight: "500",
  },
  emptyContainer: {
    borderWidth: 1.2,
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
    gap: 8,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  lineRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  lineRowThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  lineRowThumbEmpty: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  lineRowTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  lineRowCode: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  lineRowName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  lineRowMeta: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
  lineRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lineIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  exchangeGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 10,
},

exchangeCard: {
  width: "48%",
  borderWidth: 1,
  borderRadius: 16,
  padding: 14,
  gap: 8,
},

exchangeTopRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
},

exchangeCurrencyTitle: {
  flex: 1,
  fontSize: 14,
  fontWeight: "700",
},

exchangeSubText: {
  fontSize: 11,
  fontWeight: "500",
},

exchangeRatePill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 10,
  alignSelf: "flex-start",
},

exchangeRateText: {
  fontSize: 13,
  fontWeight: "800",
},

  exchangeLeft: {
    flex: 1,
    gap: 4,
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
    borderWidth: 1,
  },
  reportPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  pdfActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  reportSecondaryButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  reportSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  previewInfoText: {
    fontSize: 14,
    lineHeight: 20,
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
