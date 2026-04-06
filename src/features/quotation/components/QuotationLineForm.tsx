import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { ProductPicker, type ProductPickerRef } from "./ProductPicker";
import { PickerModal } from "./PickerModal";
import type { StockRelationDto } from "../../stocks/types";
import { quotationApi } from "../api";
import { stockApi } from "../../stocks/api";
import { useErpProjects } from "../hooks";
import { useStock } from "../../stocks/hooks";
import { parseDecimalInput, sanitizeDecimalInput } from "../../../lib/decimal-input";
import { getApiBaseUrl } from "../../../constants/config";
import type {
  QuotationLineFormState,
  PricingRuleLineGetDto,
  UserDiscountLimitDto,
  StockGetDto,
} from "../types";
import { calculateLineTotals } from "../utils";

interface QuotationLineFormProps {
  visible: boolean;
  line: QuotationLineFormState | null;
  onClose: () => void;
  onSave: (line: QuotationLineFormState) => void;
  onAddWithRelatedStocks?: (stock: StockGetDto, relatedStockIds: number[]) => void;
  onRequestRelatedStocksSelection?: (
    stock: StockGetDto & { parentRelations: StockRelationDto[] }
  ) => void;
  onCancelRelatedSelection?: () => void;
  onApplyRelatedSelection?: (
    stock: StockGetDto & { parentRelations: StockRelationDto[] },
    selectedIds: number[]
  ) => void;
  pendingRelatedStock?: (StockGetDto & { parentRelations: StockRelationDto[] }) | null;
  disableRelatedStocks?: boolean;
  currency: string;
  currencyOptions?: Array<{ code: string; dovizTipi: number; dovizIsmi: string }>;
  pricingRules?: PricingRuleLineGetDto[];
  userDiscountLimits?: UserDiscountLimitDto[];
  exchangeRates?: Array<{ dovizTipi: number; kurDegeri: number }>;
  allowImageUpload?: boolean;
}

function normalizeCurrencyCode(value?: string | null): string {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "TL" || normalized === "TRY") return "TRY";
  return normalized;
}

function resolveCurrencyRate(
  currencyCode: string,
  currencyOptions?: Array<{ code: string; dovizTipi: number; dovizIsmi: string }>,
  exchangeRates?: Array<{ dovizTipi: number; kurDegeri: number }>
): number | null {
  const normalizedCode = normalizeCurrencyCode(currencyCode);

  if (!normalizedCode) return null;
  if (normalizedCode === "TRY") return 1;

  const option = currencyOptions?.find(
    (c) => normalizeCurrencyCode(c.code) === normalizedCode
  );

  if (!option) return null;

  const rate = exchangeRates?.find((r) => r.dovizTipi === option.dovizTipi)?.kurDegeri;

  return rate && rate > 0 ? rate : null;
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

function convertPriceBetweenCurrencies(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
  currencyOptions?: Array<{ code: string; dovizTipi: number; dovizIsmi: string }>,
  exchangeRates?: Array<{ dovizTipi: number; kurDegeri: number }>
): number {
  const safeAmount = Number(amount) || 0;
  const source = normalizeCurrencyCode(sourceCurrency || "TRY");
  const target = normalizeCurrencyCode(targetCurrency || "TRY");

  if (safeAmount <= 0) return 0;
  if (source === target) return safeAmount;

  const sourceRate = resolveCurrencyRate(source, currencyOptions, exchangeRates);
  const targetRate = resolveCurrencyRate(target, currencyOptions, exchangeRates);

  if (sourceRate == null || targetRate == null || targetRate <= 0) {
    return safeAmount;
  }

  return (safeAmount * sourceRate) / targetRate;
}

export function QuotationLineForm({
  visible,
  line,
  onClose,
  onSave,
  onAddWithRelatedStocks,
  onRequestRelatedStocksSelection,
  onCancelRelatedSelection,
  onApplyRelatedSelection,
  pendingRelatedStock = null,
  disableRelatedStocks = false,
  currency,
  currencyOptions,
  pricingRules,
  userDiscountLimits,
  exchangeRates,
  allowImageUpload = false,
}: QuotationLineFormProps): React.ReactElement {
  const { t } = useTranslation();
  const { themeMode } = useUIStore();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === "dark";
  const mainBg = isDark ? "#161224" : "#FFFFFF";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.92)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const softPinkBorder = isDark ? "rgba(236,72,153,0.26)" : "rgba(219,39,119,0.18)";
  const softPinkBg = isDark ? "rgba(236,72,153,0.06)" : "rgba(219,39,119,0.04)";
  const textColor = isDark ? "#F8FAFC" : "#1E293B";
  const mutedColor = isDark ? "#94A3B8" : "#64748B";
  const brandColor = isDark ? "#EC4899" : "#DB2777";
  const brandSoft = isDark ? "rgba(236,72,153,0.12)" : "rgba(219,39,119,0.08)";
  const warningColor = "#F59E0B";

  const normalizedCurrency = useMemo(() => normalizeCurrencyCode(currency), [currency]);

  const [selectedStock, setSelectedStock] = useState<StockGetDto | undefined>();
  const [quantity, setQuantity] = useState<string>("1");
  const [unitPrice, setUnitPrice] = useState<string>("0");
  const [discountRate1, setDiscountRate1] = useState<string>("0");
  const [discountRate2, setDiscountRate2] = useState<string>("0");
  const [discountRate3, setDiscountRate3] = useState<string>("0");
  const [vatRate, setVatRate] = useState<string>("18");
  const [description, setDescription] = useState<string>("");
  const [description1, setDescription1] = useState<string>("");
  const [description2, setDescription2] = useState<string>("");
  const [description3, setDescription3] = useState<string>("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<number>(0);
  const [approvalMessage, setApprovalMessage] = useState<string>("");
  const [relatedLinesDisplay, setRelatedLinesDisplay] = useState<QuotationLineFormState[]>([]);
  const [erpProjectCode, setErpProjectCode] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [projectCodeModalVisible, setProjectCodeModalVisible] = useState(false);
  const productPickerRef = useRef<ProductPickerRef>(null);

  const { data: projects = [] } = useErpProjects();
  const { data: stockData } = useStock(selectedStock?.id);

  const currentLine: QuotationLineFormState = useMemo(() => {
    const qty = parseDecimalInput(quantity);
    const price = parseDecimalInput(unitPrice);
    const disc1 = parseDecimalInput(discountRate1);
    const disc2 = parseDecimalInput(discountRate2);
    const disc3 = parseDecimalInput(discountRate3);
    const vat = parseDecimalInput(vatRate);

    const baseLine: QuotationLineFormState = {
      id: line?.id || `temp-${Date.now()}`,
      productId: selectedStock?.id || null,
      productCode: selectedStock?.erpStockCode || "",
      productName: selectedStock?.stockName || "",
      unit: selectedStock?.unit ?? line?.unit ?? null,
      imagePath,
      groupCode: selectedStock?.grupKodu || null,
      quantity: qty,
      unitPrice: price,
      discountRate1: disc1,
      discountAmount1: 0,
      discountRate2: disc2,
      discountAmount2: 0,
      discountRate3: disc3,
      discountAmount3: 0,
      vatRate: vat,
      vatAmount: 0,
      lineTotal: 0,
      lineGrandTotal: 0,
      description: description || null,
      description1: description1 || null,
      description2: description2 || null,
      description3: description3 || null,
      erpProjectCode: erpProjectCode || null,
      isEditing: false,
      approvalStatus,
      relatedStockId: line?.relatedStockId ?? selectedStock?.id ?? null,
      relatedProductKey:
        line?.relatedProductKey ?? (selectedStock ? `main-${selectedStock.id}` : undefined),
      isMainRelatedProduct: line?.isMainRelatedProduct ?? true,
    };

    return calculateLineTotals(baseLine);
  }, [
    line?.id,
    line?.relatedStockId,
    line?.relatedProductKey,
    line?.isMainRelatedProduct,
    selectedStock,
    quantity,
    unitPrice,
    discountRate1,
    discountRate2,
    discountRate3,
    vatRate,
    description,
    description1,
    description2,
    description3,
    imagePath,
    erpProjectCode,
    approvalStatus,
  ]);

  const displayedRelatedLines = useMemo((): QuotationLineFormState[] => {
    if (relatedLinesDisplay.length === 0) return [];
    const mainQty = parseDecimalInput(quantity);

    return relatedLinesDisplay.map((rel) =>
      calculateLineTotals({
        ...rel,
        quantity: (rel.relationQuantity ?? 1) * mainQty,
      })
    );
  }, [relatedLinesDisplay, quantity]);

  const lineToSave: QuotationLineFormState = useMemo(() => {
    if (displayedRelatedLines.length > 0) {
      return { ...currentLine, relatedLines: displayedRelatedLines };
    }
    return currentLine;
  }, [currentLine, displayedRelatedLines]);

  const resetForm = useCallback(() => {
    setSelectedStock(undefined);
    setQuantity("1");
    setUnitPrice("0");
    setDiscountRate1("0");
    setDiscountRate2("0");
    setDiscountRate3("0");
    setVatRate("18");
    setDescription("");
    setDescription1("");
    setDescription2("");
    setDescription3("");
    setImagePath(null);
    setErpProjectCode(null);
    setApprovalStatus(0);
    setApprovalMessage("");
    setRelatedLinesDisplay([]);
  }, []);

  useEffect(() => {
    if (line && visible) {
      setQuantity(sanitizeDecimalInput(String(line.quantity)));
      setUnitPrice(sanitizeDecimalInput(String(line.unitPrice)));
      setDiscountRate1(sanitizeDecimalInput(String(line.discountRate1)));
      setDiscountRate2(sanitizeDecimalInput(String(line.discountRate2)));
      setDiscountRate3(sanitizeDecimalInput(String(line.discountRate3)));
      setVatRate(sanitizeDecimalInput(String(line.vatRate)));
      setDescription(line.description || "");
      setDescription1(line.description1 || "");
      setDescription2(line.description2 || "");
      setDescription3(line.description3 || "");
      setImagePath(line.imagePath || null);
      setErpProjectCode(line.erpProjectCode ?? null);
      setApprovalStatus(line.approvalStatus || 0);
      setRelatedLinesDisplay(line.relatedLines ?? []);

      if (line.productCode || line.productName) {
        setSelectedStock({
          id: line.productId ?? 0,
          erpStockCode: line.productCode || "",
          stockName: line.productName || "",
          unit: line.unit ?? undefined,
          branchCode: 0,
          grupKodu: line.groupCode ?? undefined,
        } as StockGetDto);
      }
    } else if (!visible) {
      resetForm();
    }
  }, [line, visible, resetForm]);

  const handlePickImage = useCallback(async (mode: "camera" | "gallery") => {
    const permission =
      mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      mode === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setIsUploadingImage(true);
    try {
      const uploaded = await quotationApi.uploadReportAsset(result.assets[0].uri);
      setImagePath(uploaded.relativeUrl);
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const openImagePickerMenu = useCallback(() => {
    Alert.alert("Kalem Görseli", "Görsel kaynağını seç", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Kameradan Çek", onPress: () => void handlePickImage("camera") },
      { text: "Galeriden Seç", onPress: () => void handlePickImage("gallery") },
    ]);
  }, [handlePickImage]);

  const handleStockSelect = useCallback(
    async (stock: StockGetDto | undefined): Promise<boolean> => {
      let stockToUse: StockGetDto | undefined = stock;

      if (stock && (onAddWithRelatedStocks || onRequestRelatedStocksSelection)) {
        try {
          const fullStock = await stockApi.getById(stock.id);
          let relations = fullStock.parentRelations ?? [];

          if (relations.length === 0 && !disableRelatedStocks) {
            const relationsRes = await stockApi.getRelations(stock.id, {
              pageNumber: 1,
              pageSize: 100,
            });
            relations = relationsRes?.items ?? [];
          }

          if (relations.length > 0 && !disableRelatedStocks && onRequestRelatedStocksSelection) {
            onRequestRelatedStocksSelection({ ...fullStock, parentRelations: relations });
            return false;
          }

          setSelectedStock(fullStock);
          stockToUse = fullStock;
        } catch {
          setSelectedStock(stock);
        }
      } else if (stock) {
        setSelectedStock(stock);
      } else {
        setSelectedStock(undefined);
      }

      if (!stockToUse) {
        setUnitPrice("0");
        return true;
      }

      setIsLoadingPrice(true);

      try {
        const priceData = await quotationApi.getPriceOfProduct([
          {
            productCode: stockToUse.erpStockCode,
            groupCode: stockToUse.grupKodu || "",
          },
        ]);

        if (priceData && priceData.length > 0) {
          const price = priceData[0];

          const sourceCurrency = normalizeCurrencyCode(price.currency || "TRY");
          const targetCurrency = normalizedCurrency || "TRY";

          const finalPrice = convertPriceBetweenCurrencies(
            Number(price.listPrice) || 0,
            sourceCurrency,
            targetCurrency,
            currencyOptions,
            exchangeRates
          );

          setUnitPrice(sanitizeDecimalInput(String(finalPrice)));

          if (price.discount1 !== null && price.discount1 !== undefined) {
            setDiscountRate1(String(price.discount1));
          }
          if (price.discount2 !== null && price.discount2 !== undefined) {
            setDiscountRate2(String(price.discount2));
          }
          if (price.discount3 !== null && price.discount3 !== undefined) {
            setDiscountRate3(String(price.discount3));
          }
        }

        if (pricingRules && stockToUse.erpStockCode) {
          const qty = parseDecimalInput(quantity, 1);
          const matchingRule = pricingRules.find(
            (rule) =>
              rule.stokCode === stockToUse.erpStockCode &&
              qty >= rule.minQuantity &&
              (!rule.maxQuantity || qty <= rule.maxQuantity)
          );

          if (matchingRule) {
            if (
              matchingRule.fixedUnitPrice !== null &&
              matchingRule.fixedUnitPrice !== undefined
            ) {
              const convertedRulePrice = convertPriceBetweenCurrencies(
                Number(matchingRule.fixedUnitPrice) || 0,
                "TRY",
                normalizedCurrency || "TRY",
                currencyOptions,
                exchangeRates
              );

              setUnitPrice(sanitizeDecimalInput(String(convertedRulePrice)));
            }

            setDiscountRate1(String(matchingRule.discountRate1));
            setDiscountRate2(String(matchingRule.discountRate2));
            setDiscountRate3(String(matchingRule.discountRate3));
          }
        }
      } catch (error) {
        console.error("Price fetch error:", error);
      } finally {
        setIsLoadingPrice(false);
      }

      return true;
    },
    [
      normalizedCurrency,
      exchangeRates,
      currencyOptions,
      pricingRules,
      quantity,
      disableRelatedStocks,
      onAddWithRelatedStocks,
      onRequestRelatedStocksSelection,
    ]
  );

  useEffect(() => {
    if (selectedStock && pricingRules && selectedStock.erpStockCode) {
      const qty = parseDecimalInput(quantity, 1);
      const matchingRule = pricingRules.find(
        (rule) =>
          rule.stokCode === selectedStock.erpStockCode &&
          qty >= rule.minQuantity &&
          (!rule.maxQuantity || qty <= rule.maxQuantity)
      );

      if (matchingRule) {
        if (matchingRule.fixedUnitPrice !== null && matchingRule.fixedUnitPrice !== undefined) {
          const convertedRulePrice = convertPriceBetweenCurrencies(
            Number(matchingRule.fixedUnitPrice) || 0,
            "TRY",
            normalizedCurrency || "TRY",
            currencyOptions,
            exchangeRates
          );

          setUnitPrice(sanitizeDecimalInput(String(convertedRulePrice)));
        }

        setDiscountRate1(String(matchingRule.discountRate1));
        setDiscountRate2(String(matchingRule.discountRate2));
        setDiscountRate3(String(matchingRule.discountRate3));
      }
    }
  }, [
    selectedStock,
    pricingRules,
    quantity,
    normalizedCurrency,
    currencyOptions,
    exchangeRates,
  ]);

  useEffect(() => {
    if (stockData && stockData.parentRelations && stockData.parentRelations.length > 0) {
      const relatedStocksInfo = stockData.parentRelations
        .map((r) => `${r.relatedStockName || r.relatedStockCode} (${r.quantity})`)
        .join(", ");

      if (relatedStocksInfo && !description.includes("İlgili Stoklar")) {
        setDescription((prev) => (prev ? `${prev}\n` : "") + `İlgili Stoklar: ${relatedStocksInfo}`);
      }
    }
  }, [stockData, description]);

  useEffect(() => {
    if (selectedStock && userDiscountLimits && selectedStock.grupKodu) {
      const matchingLimit = userDiscountLimits.find(
        (limit) => limit.erpProductGroupCode === selectedStock.grupKodu
      );

      if (matchingLimit) {
        const disc1 = parseDecimalInput(discountRate1);
        const disc2 = parseDecimalInput(discountRate2);
        const disc3 = parseDecimalInput(discountRate3);

        const exceedsLimit1 = disc1 > matchingLimit.maxDiscount1;
        const exceedsLimit2 =
          matchingLimit.maxDiscount2 !== null &&
          matchingLimit.maxDiscount2 !== undefined &&
          disc2 > matchingLimit.maxDiscount2;
        const exceedsLimit3 =
          matchingLimit.maxDiscount3 !== null &&
          matchingLimit.maxDiscount3 !== undefined &&
          disc3 > matchingLimit.maxDiscount3;

        if (exceedsLimit1 || exceedsLimit2 || exceedsLimit3) {
          setApprovalStatus(1);
          setApprovalMessage(
            `İndirim limiti aşıldı. Maksimum: %${matchingLimit.maxDiscount1} / %${
              matchingLimit.maxDiscount2 || "-"
            } / %${matchingLimit.maxDiscount3 || "-"}`
          );
        } else {
          setApprovalStatus(0);
          setApprovalMessage("");
        }
      }
    }
  }, [selectedStock, userDiscountLimits, discountRate1, discountRate2, discountRate3]);

  const handleSave = useCallback(() => {
    const canSave = selectedStock || (line?.productCode && lineToSave.productCode);
    if (!canSave) {
      return;
    }

    onSave(lineToSave);
    resetForm();
    onClose();
  }, [selectedStock, line?.productCode, lineToSave, onSave, onClose, resetForm]);

  const handleCancel = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const clampDiscount = useCallback((value: number): number => {
    return Math.max(0, Math.min(100, Number.isNaN(value) ? 0 : value));
  }, []);

  const normalizeDiscountOnBlur = useCallback(
    (value: string): string => {
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === ".") return "0";
      const num = parseDecimalInput(trimmed);
      return String(clampDiscount(Number.isNaN(num) ? 0 : num));
    },
    [clampDiscount]
  );

  const handleDiscount1Change = useCallback(
    (text: string) => {
      const sanitized = sanitizeDecimalInput(text);
      if (sanitized === "" || sanitized === ".") {
        setDiscountRate1(sanitized);
        return;
      }

      const num = parseDecimalInput(sanitized);
      if (!Number.isNaN(num)) {
        setDiscountRate1(sanitizeDecimalInput(String(clampDiscount(num))));
      } else {
        setDiscountRate1(sanitized);
      }
    },
    [clampDiscount]
  );

  const handleDiscount2Change = useCallback(
    (text: string) => {
      const sanitized = sanitizeDecimalInput(text);
      if (sanitized === "" || sanitized === ".") {
        setDiscountRate2(sanitized);
        return;
      }

      const num = parseDecimalInput(sanitized);
      if (!Number.isNaN(num)) {
        setDiscountRate2(sanitizeDecimalInput(String(clampDiscount(num))));
      } else {
        setDiscountRate2(sanitized);
      }
    },
    [clampDiscount]
  );

  const handleDiscount3Change = useCallback(
    (text: string) => {
      const sanitized = sanitizeDecimalInput(text);
      if (sanitized === "" || sanitized === ".") {
        setDiscountRate3(sanitized);
        return;
      }

      const num = parseDecimalInput(sanitized);
      if (!Number.isNaN(num)) {
        setDiscountRate3(sanitizeDecimalInput(String(clampDiscount(num))));
      } else {
        setDiscountRate3(sanitized);
      }
    },
    [clampDiscount]
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleCancel} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: mainBg, paddingBottom: insets.bottom + 14 },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <View style={[styles.handle, { backgroundColor: borderColor }]} />
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {line ? "Satır Düzenle" : "Yeni Satır"}
              </Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: textColor }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contentWrapper}>
              <FlatListScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
              >
                <ProductPicker
                  ref={productPickerRef}
                  value={selectedStock?.erpStockCode}
                  productName={selectedStock?.stockName}
                  onChange={handleStockSelect}
                  label="Ürün"
                  required
                  parentVisible={visible}
                  relatedStocksSelection={
                    pendingRelatedStock &&
                    onCancelRelatedSelection &&
                    onApplyRelatedSelection
                      ? {
                          stock: pendingRelatedStock,
                          onCancel: onCancelRelatedSelection,
                          onApply: (selectedIds) => {
                            onApplyRelatedSelection(pendingRelatedStock, selectedIds);
                            productPickerRef.current?.close();
                          },
                        }
                      : undefined
                    }
                />

                {(selectedStock?.unit || line?.unit) ? (
                  <View
                    style={[
                      styles.formCard,
                      { borderColor, backgroundColor: cardBg, paddingVertical: 12 },
                    ]}
                  >
                    <Text style={[styles.sectionMiniTitle, { color: textColor }]}>
                      Olcu Birimi
                    </Text>
                    <Text style={{ color: mutedColor, fontSize: 14, fontWeight: "600", marginTop: 6 }}>
                      {selectedStock?.unit || line?.unit}
                    </Text>
                  </View>
                ) : null}

                {allowImageUpload ? (
                  <View style={[styles.formCard, { borderColor, backgroundColor: cardBg }]}>
                    <Text style={[styles.sectionMiniTitle, { color: textColor }]}>
                      Kalem Görseli
                    </Text>

                    {imagePath ? (
                      <Image
                        source={{ uri: resolveMobileImageUri(imagePath) ?? imagePath }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.imagePlaceholder,
                          { borderColor: softPinkBorder, backgroundColor: softPinkBg },
                        ]}
                      >
                        <Text style={[styles.imagePlaceholderText, { color: mutedColor }]}>
                          Bu kalem için henüz görsel eklenmedi
                        </Text>
                      </View>
                    )}

                    <View style={styles.imageActionRow}>
                      <TouchableOpacity
                        style={[
                          styles.imageActionButton,
                          { borderColor: softPinkBorder, backgroundColor: inputBg },
                        ]}
                        onPress={openImagePickerMenu}
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? (
                          <ActivityIndicator size="small" color={brandColor} />
                        ) : (
                          <Text style={[styles.imageActionButtonText, { color: textColor }]}>
                            {imagePath ? "Görseli Değiştir" : "Görsel Ekle"}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {imagePath ? (
                        <TouchableOpacity
                          style={[
                            styles.imageActionButton,
                            { borderColor: softPinkBorder, backgroundColor: inputBg },
                          ]}
                          onPress={() => setImagePath(null)}
                        >
                          <Text style={[styles.imageActionButtonText, { color: warningColor }]}>
                            Kaldır
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {isLoadingPrice && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={brandColor} />
                    <Text style={[styles.loadingText, { color: mutedColor }]}>
                      Fiyat bilgisi yükleniyor...
                    </Text>
                  </View>
                )}

                <View style={[styles.formCard, { borderColor, backgroundColor: cardBg }]}>
                  <View style={styles.rowTwo}>
                    <View style={styles.fieldHalf}>
                      <Text style={[styles.label, { color: mutedColor }]}>
                        Miktar <Text style={{ color: "#ef4444" }}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                        ]}
                        value={quantity}
                        onChangeText={(text) => setQuantity(sanitizeDecimalInput(text))}
                        placeholder="Miktar"
                        placeholderTextColor={mutedColor}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.fieldHalf}>
                      <Text style={[styles.label, { color: mutedColor }]}>
                        Birim Fiyat <Text style={{ color: "#ef4444" }}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                        ]}
                        value={unitPrice}
                        onChangeText={(text) => setUnitPrice(sanitizeDecimalInput(text))}
                        placeholder="Birim fiyat"
                        placeholderTextColor={mutedColor}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.rowThree}>
                    <View style={styles.fieldThird}>
                      <Text style={[styles.label, { color: mutedColor }]}>İnd. 1 (%)</Text>
                      <TextInput
                        style={[
                          styles.input,
                          styles.compactInput,
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                        ]}
                        value={discountRate1}
                        onChangeText={handleDiscount1Change}
                        onBlur={() => setDiscountRate1(normalizeDiscountOnBlur(discountRate1))}
                        placeholder="0"
                        placeholderTextColor={mutedColor}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.fieldThird}>
                      <Text style={[styles.label, { color: mutedColor }]}>İnd. 2 (%)</Text>
                      <TextInput
                        style={[
                          styles.input,
                          styles.compactInput,
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                        ]}
                        value={discountRate2}
                        onChangeText={handleDiscount2Change}
                        onBlur={() => setDiscountRate2(normalizeDiscountOnBlur(discountRate2))}
                        placeholder="0"
                        placeholderTextColor={mutedColor}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.fieldThird}>
                      <Text style={[styles.label, { color: mutedColor }]}>İnd. 3 (%)</Text>
                      <TextInput
                        style={[
                          styles.input,
                          styles.compactInput,
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                        ]}
                        value={discountRate3}
                        onChangeText={handleDiscount3Change}
                        onBlur={() => setDiscountRate3(normalizeDiscountOnBlur(discountRate3))}
                        placeholder="0"
                        placeholderTextColor={mutedColor}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.rowTwo}>
                    <View style={styles.fieldHalf}>
                      <Text style={[styles.label, { color: mutedColor }]}>KDV Oranı (%)</Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                        ]}
                        value={vatRate}
                        onChangeText={(text) => setVatRate(sanitizeDecimalInput(text))}
                        placeholder="18"
                        placeholderTextColor={mutedColor}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.fieldHalf}>
                      <Text style={[styles.label, { color: mutedColor }]}>
                        {t("quotation.projectCode")}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.82}
                        style={[
                          styles.pickerButton,
                          {
                            backgroundColor: softPinkBg,
                            borderColor: softPinkBorder,
                          },
                        ]}
                        onPress={() => setProjectCodeModalVisible(true)}
                      >
                        <Text
                          style={[styles.pickerText, { color: erpProjectCode ? textColor : mutedColor }]}
                          numberOfLines={1}
                        >
                          {erpProjectCode
                            ? (() => {
                                const p = projects.find((pr) => pr.projeKod === erpProjectCode);
                                return p
                                  ? p.projeAciklama
                                    ? `${p.projeKod} - ${p.projeAciklama}`
                                    : p.projeKod
                                  : erpProjectCode;
                              })()
                            : t("common.select")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={[styles.label, { color: mutedColor }]}>Açıklama</Text>
                    <TextInput
                      style={[
                        styles.textArea,
                        { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                      ]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Satır açıklaması"
                      placeholderTextColor={mutedColor}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={[styles.detailCard, { borderColor: softPinkBorder, backgroundColor: softPinkBg }]}>
                    <Text style={[styles.sectionMiniTitle, { color: textColor }]}>
                      Ek Detaylar
                    </Text>

                    <View style={styles.rowThree}>
                      <View style={styles.fieldThird}>
                        <Text style={[styles.label, { color: mutedColor }]}>Profile</Text>
                        <TextInput
                          style={[
                            styles.input,
                            styles.compactInput,
                            { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                          ]}
                          value={description1}
                          onChangeText={setDescription1}
                          placeholder="Profile"
                          placeholderTextColor={mutedColor}
                        />
                      </View>

                      <View style={styles.fieldThird}>
                        <Text style={[styles.label, { color: mutedColor }]}>Demir</Text>
                        <TextInput
                          style={[
                            styles.input,
                            styles.compactInput,
                            { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                          ]}
                          value={description2}
                          onChangeText={setDescription2}
                          placeholder="Demir"
                          placeholderTextColor={mutedColor}
                        />
                      </View>

                      <View style={styles.fieldThird}>
                        <Text style={[styles.label, { color: mutedColor }]}>Vida</Text>
                        <TextInput
                          style={[
                            styles.input,
                            styles.compactInput,
                            { backgroundColor: inputBg, borderColor: softPinkBorder, color: textColor },
                          ]}
                          value={description3}
                          onChangeText={setDescription3}
                          placeholder="Vida"
                          placeholderTextColor={mutedColor}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {approvalStatus === 1 && approvalMessage && (
                  <View
                    style={[
                      styles.approvalWarning,
                      {
                        backgroundColor: warningColor + "12",
                        borderColor: warningColor + "26",
                      },
                    ]}
                  >
                    <Text style={[styles.approvalWarningText, { color: warningColor }]}>
                      ⚠️ {approvalMessage}
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    styles.summaryCard,
                    { backgroundColor: cardBg, borderColor: borderColor },
                  ]}
                >
                  <Text style={[styles.summaryTitle, { color: textColor }]}>
                    {t("quotation.calculationSummary")}
                  </Text>

                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: mutedColor }]}>Ara Toplam:</Text>
                    <Text style={[styles.summaryValue, { color: textColor }]}>
                      {currentLine.lineTotal.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: mutedColor }]}>KDV:</Text>
                    <Text style={[styles.summaryValue, { color: textColor }]}>
                      {currentLine.vatAmount.toFixed(2)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.summaryRow,
                      styles.summaryRowTotal,
                      { borderTopColor: borderColor },
                    ]}
                  >
                    <Text style={[styles.summaryLabel, { color: textColor, fontWeight: "700" }]}>
                      Genel Toplam:
                    </Text>
                    <Text style={[styles.summaryValue, { color: brandColor, fontWeight: "800" }]}>
                      {currentLine.lineGrandTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {displayedRelatedLines.length > 0 && (
                  <View
                    style={[
                      styles.relatedSummaryCard,
                      { backgroundColor: cardBg, borderColor: borderColor },
                    ]}
                  >
                    <Text style={[styles.relatedSummaryTitle, { color: textColor }]}>
                      {t("quotation.relatedStocksSummary")}
                    </Text>

                    {displayedRelatedLines.map((rel) => (
                      <View
                        key={rel.id}
                        style={[styles.relatedSummaryRow, { borderBottomColor: borderColor }]}
                      >
                        <Text
                          style={[styles.relatedSummaryCode, { color: textColor }]}
                          numberOfLines={1}
                        >
                          {rel.productCode}
                        </Text>

                        <View style={styles.relatedSummaryGrid}>
                          <View style={styles.relatedSummaryItem}>
                            <Text style={[styles.relatedSummaryItemLabel, { color: mutedColor }]}>
                              {t("quotation.discount1")}
                            </Text>
                            <Text style={[styles.relatedSummaryItemValue, { color: textColor }]}>
                              % {rel.discountRate1.toFixed(1)}
                            </Text>
                          </View>

                          <View style={styles.relatedSummaryItem}>
                            <Text style={[styles.relatedSummaryItemLabel, { color: mutedColor }]}>
                              {t("quotation.discountAmount1")}
                            </Text>
                            <Text style={[styles.relatedSummaryItemValue, { color: textColor }]}>
                              {rel.discountAmount1.toFixed(2)}
                            </Text>
                          </View>

                          <View style={styles.relatedSummaryItem}>
                            <Text style={[styles.relatedSummaryItemLabel, { color: mutedColor }]}>
                              {t("quotation.discount2")}
                            </Text>
                            <Text style={[styles.relatedSummaryItemValue, { color: textColor }]}>
                              % {rel.discountRate2.toFixed(1)}
                            </Text>
                          </View>

                          <View style={styles.relatedSummaryItem}>
                            <Text style={[styles.relatedSummaryItemLabel, { color: mutedColor }]}>
                              {t("quotation.discountAmount2")}
                            </Text>
                            <Text style={[styles.relatedSummaryItemValue, { color: textColor }]}>
                              {rel.discountAmount2.toFixed(2)}
                            </Text>
                          </View>

                          <View style={styles.relatedSummaryItem}>
                            <Text style={[styles.relatedSummaryItemLabel, { color: mutedColor }]}>
                              {t("quotation.discount3")}
                            </Text>
                            <Text style={[styles.relatedSummaryItemValue, { color: textColor }]}>
                              % {rel.discountRate3.toFixed(1)}
                            </Text>
                          </View>

                          <View style={styles.relatedSummaryItem}>
                            <Text style={[styles.relatedSummaryItemLabel, { color: mutedColor }]}>
                              {t("quotation.discountAmount3")}
                            </Text>
                            <Text style={[styles.relatedSummaryItemValue, { color: textColor }]}>
                              {rel.discountAmount3.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </FlatListScrollView>
            </View>

            <View
              style={[
                styles.modalFooter,
                { borderTopColor: borderColor, backgroundColor: mainBg },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  styles.cancelButton,
                  {
                    borderColor: softPinkBorder,
                    backgroundColor: softPinkBg,
                  },
                ]}
                onPress={handleCancel}
              >
                <Text style={[styles.cancelButtonText, { color: textColor }]}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                style={[
                  styles.saveButton,
                  { backgroundColor: brandColor },
                  !(selectedStock || (line?.productCode && lineToSave.productCode)) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!(selectedStock || (line?.productCode && lineToSave.productCode))}
              >
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PickerModal
        visible={projectCodeModalVisible}
        options={projects.map((p) => ({
          id: p.projeKod,
          name: p.projeAciklama ? `${p.projeKod} - ${p.projeAciklama}` : p.projeKod,
          code: p.projeKod,
        }))}
        selectedValue={erpProjectCode ?? undefined}
        onSelect={(option) => {
          setErpProjectCode(((option.code ?? option.id) as string) ?? null);
          setProjectCodeModalVisible(false);
        }}
        onClose={() => setProjectCodeModalVisible(false)}
        title={t("quotation.projectCode")}
        searchPlaceholder={t("quotation.projectCodeSearch")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  modalContent: {
    height: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  contentWrapper: {
    flex: 1,
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  handle: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: [{ translateX: -22 }],
    width: 44,
    height: 5,
    borderRadius: 3,
    opacity: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
    opacity: 0.75,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 22,
    gap: 14,
  },
  formCard: {
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 18,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 2,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "500",
  },
  fieldContainer: {
    marginBottom: 2,
  },
  rowTwo: {
    flexDirection: "row",
    gap: 10,
  },
  rowThree: {
    flexDirection: "row",
    gap: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldThird: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginLeft: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "500",
    minHeight: 46,
  },
  compactInput: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 44,
  },
  inputReadOnly: {
    opacity: 0.6,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: "center",
  },
  pickerText: {
    fontSize: 14,
    fontWeight: "500",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 88,
    textAlignVertical: "top",
  },
  imagePreview: {
    width: "100%",
    height: 148,
    borderRadius: 14,
  },
  imagePlaceholder: {
    width: "100%",
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  imageActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  imageActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  imageActionButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailCard: {
    marginTop: 2,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  sectionMiniTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  approvalWarning: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  approvalWarningText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
    letterSpacing: 0.25,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  summaryRowTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  relatedSummaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 2,
  },
  relatedSummaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  relatedSummaryRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  relatedSummaryCode: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },
  relatedSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  relatedSummaryItem: {
    width: "48%",
    padding: 9,
    borderRadius: 10,
    backgroundColor: "rgba(148,163,184,0.05)",
  },
  relatedSummaryItemLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  relatedSummaryItemValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#db2777",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
