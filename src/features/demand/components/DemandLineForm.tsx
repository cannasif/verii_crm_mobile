import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import { useUIStore } from "../../../store/ui";
import { ProductPicker, type ProductPickerRef } from "./ProductPicker";
import type { StockRelationDto } from "../../stocks/types";
import { getProductSelectionKey, type ProductSelectionResult } from "../../stocks/types";
import { demandApi } from "../api";
import { stockApi } from "../../stocks/api";
import { useStock } from "../../stocks/hooks";
import { parseDecimalInput, sanitizeDecimalInput } from "../../../lib/decimal-input";
import type {
  DemandLineFormState,
  PricingRuleLineGetDto,
  UserDiscountLimitDto,
  PriceOfProductDto,
  StockGetDto,
} from "../types";
import { calculateLineTotals } from "../utils";

interface DemandLineFormProps {
  visible: boolean;
  line: DemandLineFormState | null;
  onClose: () => void;
  onSave: (line: DemandLineFormState) => void;
  onMultiProductSelect?: (products: ProductSelectionResult[]) => DemandLineFormState[] | Promise<DemandLineFormState[]>;
  onSaveMultiple?: (lines: DemandLineFormState[]) => void;
  onAddWithRelatedStocks?: (stock: StockGetDto, relatedStockIds: number[]) => void;
  onRequestRelatedStocksSelection?: (stock: StockGetDto & { parentRelations: StockRelationDto[] }) => void;
  onCancelRelatedSelection?: () => void;
  onApplyRelatedSelection?: (stock: StockGetDto & { parentRelations: StockRelationDto[] }, selectedIds: number[]) => void;
  pendingRelatedStock?: (StockGetDto & { parentRelations: StockRelationDto[] }) | null;
  disableRelatedStocks?: boolean;
  currency: string;
  currencyOptions?: Array<{ code: string; dovizTipi: number; dovizIsmi: string }>;
  pricingRules?: PricingRuleLineGetDto[];
  userDiscountLimits?: UserDiscountLimitDto[];
  exchangeRates?: Array<{ dovizTipi: number; kurDegeri: number }>;
}

export function DemandLineForm({
  visible,
  line,
  onClose,
  onSave,
  onMultiProductSelect,
  onSaveMultiple,
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
}: DemandLineFormProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, showUnitInStockSelection } = useUIStore();
  const insets = useSafeAreaInsets();

  const [selectedStock, setSelectedStock] = useState<StockGetDto | undefined>();
  const [quantity, setQuantity] = useState<string>("1");
  const [unitPrice, setUnitPrice] = useState<string>("0");
  const [discountRate1, setDiscountRate1] = useState<string>("0");
  const [discountRate2, setDiscountRate2] = useState<string>("0");
  const [discountRate3, setDiscountRate3] = useState<string>("0");
  const [vatRate, setVatRate] = useState<string>("20");
  const [description, setDescription] = useState<string>("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<number>(0);
  const [approvalMessage, setApprovalMessage] = useState<string>("");
  const [relatedLinesDisplay, setRelatedLinesDisplay] = useState<DemandLineFormState[]>([]);
  const [bulkDraftLines, setBulkDraftLines] = useState<DemandLineFormState[]>([]);
  const [activeBulkDraftIndex, setActiveBulkDraftIndex] = useState<number>(0);
  const productPickerRef = useRef<ProductPickerRef>(null);

  const currentLine: DemandLineFormState = useMemo(() => {
    const qty = parseDecimalInput(quantity);
    const price = parseDecimalInput(unitPrice);
    const disc1 = parseDecimalInput(discountRate1);
    const disc2 = parseDecimalInput(discountRate2);
    const disc3 = parseDecimalInput(discountRate3);
    const vat = parseDecimalInput(vatRate);

    const baseLine: DemandLineFormState = {
      id: line?.id || `temp-${Date.now()}`,
      productId: selectedStock?.id || null,
      productCode: selectedStock?.erpStockCode || "",
      productName: selectedStock?.stockName || "",
      unit: selectedStock?.unit ?? line?.unit ?? null,
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
      isEditing: false,
      approvalStatus,
      relatedStockId: line?.relatedStockId ?? selectedStock?.id ?? null,
      relatedProductKey: line?.relatedProductKey ?? (selectedStock ? `main-${selectedStock.id}` : undefined),
      isMainRelatedProduct: line?.isMainRelatedProduct ?? true,
    };

    return calculateLineTotals(baseLine);
  }, [
    line?.id,
    selectedStock,
    quantity,
    unitPrice,
    discountRate1,
    discountRate2,
    discountRate3,
    vatRate,
    description,
    approvalStatus,
  ]);

  useEffect(() => {
    if (line && visible) {
      setQuantity(sanitizeDecimalInput(String(line.quantity)));
      setUnitPrice(sanitizeDecimalInput(String(line.unitPrice)));
      setDiscountRate1(sanitizeDecimalInput(String(line.discountRate1)));
      setDiscountRate2(sanitizeDecimalInput(String(line.discountRate2)));
      setDiscountRate3(sanitizeDecimalInput(String(line.discountRate3)));
      setVatRate(sanitizeDecimalInput(String(line.vatRate)));
      setDescription(line.description || "");
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
  }, [line, visible]);

  const displayedRelatedLines = useMemo((): DemandLineFormState[] => {
    if (relatedLinesDisplay.length === 0) return [];
    const mainQty = parseDecimalInput(quantity);
    return relatedLinesDisplay.map((rel) =>
      calculateLineTotals({
        ...rel,
        quantity: (rel.relationQuantity ?? 1) * mainQty,
      })
    );
  }, [relatedLinesDisplay, quantity]);

  const lineToSave: DemandLineFormState = useMemo(() => {
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
    setVatRate("20");
    setDescription("");
    setApprovalStatus(0);
    setApprovalMessage("");
    setRelatedLinesDisplay([]);
    setBulkDraftLines([]);
    setActiveBulkDraftIndex(0);
  }, []);

  const { data: stockData } = useStock(selectedStock?.id);
  const isMultiSelectMode = !line && Boolean(onMultiProductSelect);
  const hasBulkDrafts = bulkDraftLines.length > 0;

  const bulkQueuedProductKeys = useMemo(
    () =>
      bulkDraftLines.map((d) =>
        getProductSelectionKey({ id: d.productId ?? undefined, code: d.productCode })
      ),
    [bulkDraftLines]
  );

  const { width: windowWidth } = useWindowDimensions();
  const bulkDraftChipGap = 6;
  const bulkDraftChipCols = 4;
  const bulkDraftChipWidth = useMemo(() => {
    const rowPad = 20 * 2;
    const inner = Math.max(0, windowWidth - rowPad);
    const gaps = bulkDraftChipGap * (bulkDraftChipCols - 1);
    return Math.max(64, Math.floor((inner - gaps) / bulkDraftChipCols));
  }, [windowWidth]);

  const applyDraftLineToForm = useCallback((draft: DemandLineFormState) => {
    setQuantity(sanitizeDecimalInput(String(draft.quantity)));
    setUnitPrice(sanitizeDecimalInput(String(draft.unitPrice)));
    setDiscountRate1(sanitizeDecimalInput(String(draft.discountRate1)));
    setDiscountRate2(sanitizeDecimalInput(String(draft.discountRate2)));
    setDiscountRate3(sanitizeDecimalInput(String(draft.discountRate3)));
    setVatRate(sanitizeDecimalInput(String(draft.vatRate)));
    setDescription(draft.description || "");
    setApprovalStatus(draft.approvalStatus || 0);
    setRelatedLinesDisplay(draft.relatedLines ?? []);

    setSelectedStock({
      id: draft.productId ?? 0,
      erpStockCode: draft.productCode || "",
      stockName: draft.productName || "",
      unit: draft.unit ?? undefined,
      branchCode: 0,
      grupKodu: draft.groupCode ?? undefined,
    } as StockGetDto);
  }, []);

  const upsertActiveDraft = useCallback(() => {
    if (!hasBulkDrafts) return;
    setBulkDraftLines((prev) => {
      const next = [...prev];
      next[activeBulkDraftIndex] = {
        ...lineToSave,
        id: prev[activeBulkDraftIndex]?.id ?? lineToSave.id,
      };
      return next;
    });
  }, [hasBulkDrafts, activeBulkDraftIndex, lineToSave]);

  const mergeBulkDraftLinesAtIndex = useCallback(
    (drafts: DemandLineFormState[], index: number, snapshot: DemandLineFormState) => {
      if (drafts.length === 0) return drafts;
      return drafts.map((draft, i) =>
        i === index ? { ...snapshot, id: draft.id } : draft
      );
    },
    []
  );

  const handleRemoveDraft = useCallback((index: number) => {
    if (!hasBulkDrafts || index < 0 || index >= bulkDraftLines.length) return;
    const next = bulkDraftLines.filter((_, i) => i !== index);
    if (next.length === 0) {
      setBulkDraftLines([]);
      setActiveBulkDraftIndex(0);
      resetForm();
      return;
    }
    const nextActiveIndex =
      index < activeBulkDraftIndex
        ? activeBulkDraftIndex - 1
        : Math.min(activeBulkDraftIndex, next.length - 1);
    setBulkDraftLines(next);
    setActiveBulkDraftIndex(nextActiveIndex);
    applyDraftLineToForm(next[nextActiveIndex]);
  }, [hasBulkDrafts, bulkDraftLines, activeBulkDraftIndex, applyDraftLineToForm, resetForm]);

  const handleMultiSelect = useCallback(
    async (products: ProductSelectionResult[]) => {
      if (!onMultiProductSelect || products.length === 0) return;
      const newDrafts = await Promise.resolve(onMultiProductSelect(products));
      if (!newDrafts || newDrafts.length === 0) return;

      if (hasBulkDrafts) {
        const committed = mergeBulkDraftLinesAtIndex(bulkDraftLines, activeBulkDraftIndex, lineToSave);
        const combined = [...committed, ...newDrafts];
        setBulkDraftLines(combined);
        const firstNewIndex = committed.length;
        setActiveBulkDraftIndex(firstNewIndex);
        applyDraftLineToForm(combined[firstNewIndex]);
        return;
      }

      setBulkDraftLines(newDrafts);
      setActiveBulkDraftIndex(0);
      applyDraftLineToForm(newDrafts[0]);
    },
    [
      onMultiProductSelect,
      applyDraftLineToForm,
      hasBulkDrafts,
      bulkDraftLines,
      activeBulkDraftIndex,
      lineToSave,
      mergeBulkDraftLinesAtIndex,
    ]
  );

  const handleStockSelect = useCallback(
    async (stock: StockGetDto | undefined): Promise<boolean> => {
      let stockToUse: StockGetDto | undefined = stock;
      if (stock && (onAddWithRelatedStocks || onRequestRelatedStocksSelection)) {
        try {
          const fullStock = await stockApi.getById(stock.id);
          let relations = fullStock.parentRelations ?? [];
          if (relations.length === 0 && !disableRelatedStocks) {
            const relationsRes = await stockApi.getRelations(stock.id, { pageNumber: 1, pageSize: 100 });
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
        const priceData = await demandApi.getPriceOfProduct([
          {
            productCode: stockToUse.erpStockCode,
            groupCode: stockToUse.grupKodu || "",
          },
        ]);

        if (priceData && priceData.length > 0) {
          const price = priceData[0];
          let finalPrice = price.listPrice;

          if (price.currency !== currency && exchangeRates && currencyOptions) {
            const priceCurrency = currencyOptions.find((c) => c.code === price.currency);
            const targetCurrency = currencyOptions.find((c) => c.code === currency);

            if (priceCurrency && targetCurrency && exchangeRates) {
              const priceRate = exchangeRates.find(
                (r) => r.dovizTipi === priceCurrency.dovizTipi
              )?.kurDegeri;
              const targetRate = exchangeRates.find(
                (r) => r.dovizTipi === targetCurrency.dovizTipi
              )?.kurDegeri;

              if (priceRate && targetRate && priceRate > 0 && targetRate > 0) {
                finalPrice = (price.listPrice * priceRate) / targetRate;
              }
            }
          }

          setUnitPrice(String(finalPrice));

          if (price.discount1 !== null && price.discount1 !== undefined)
            setDiscountRate1(String(price.discount1));
          if (price.discount2 !== null && price.discount2 !== undefined)
            setDiscountRate2(String(price.discount2));
          if (price.discount3 !== null && price.discount3 !== undefined)
            setDiscountRate3(String(price.discount3));
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
            if (matchingRule.fixedUnitPrice !== null && matchingRule.fixedUnitPrice !== undefined) {
              setUnitPrice(String(matchingRule.fixedUnitPrice));
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
    [currency, exchangeRates, currencyOptions, pricingRules, quantity, disableRelatedStocks, onAddWithRelatedStocks, onRequestRelatedStocksSelection]
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
          setUnitPrice(String(matchingRule.fixedUnitPrice));
        }
        setDiscountRate1(String(matchingRule.discountRate1));
        setDiscountRate2(String(matchingRule.discountRate2));
        setDiscountRate3(String(matchingRule.discountRate3));
      }
    }
  }, [selectedStock, pricingRules, quantity]);

  useEffect(() => {
    if (stockData && stockData.parentRelations && stockData.parentRelations.length > 0) {
      const relatedStocksInfo = stockData.parentRelations
        .map((r) => `${r.relatedStockName || r.relatedStockCode} (${r.quantity})`)
        .join(", ");
      if (relatedStocksInfo && !description.includes("İlgili Stoklar")) {
        setDescription(
          (prev) => (prev ? `${prev}\n` : "") + `İlgili Stoklar: ${relatedStocksInfo}`
        );
      }
    }
  }, [stockData]);

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
            `İndirim limiti aşıldı. Maksimum: %${matchingLimit.maxDiscount1} / %${matchingLimit.maxDiscount2 || "-"} / %${matchingLimit.maxDiscount3 || "-"}`
          );
        } else {
          setApprovalStatus(0);
          setApprovalMessage("");
        }
      }
    }
  }, [selectedStock, userDiscountLimits, discountRate1, discountRate2, discountRate3]);

  const handleSave = useCallback(() => {
    if (hasBulkDrafts) {
      upsertActiveDraft();
      if (activeBulkDraftIndex < bulkDraftLines.length - 1) {
        const nextIndex = activeBulkDraftIndex + 1;
        setActiveBulkDraftIndex(nextIndex);
        applyDraftLineToForm(bulkDraftLines[nextIndex]);
      }
      return;
    }

    const canSave = selectedStock || (line?.productCode && lineToSave.productCode);
    if (!canSave) {
      return;
    }

    onSave(lineToSave);
    resetForm();
    onClose();
  }, [
    hasBulkDrafts,
    upsertActiveDraft,
    activeBulkDraftIndex,
    bulkDraftLines,
    applyDraftLineToForm,
    selectedStock,
    line?.productCode,
    lineToSave,
    onSave,
    onClose,
    resetForm,
  ]);

  const handleBulkDraftConfirm = useCallback(() => {
    if (!hasBulkDrafts) return;
    const drafts = bulkDraftLines.map((draft, index) =>
      index === activeBulkDraftIndex
        ? {
            ...lineToSave,
            id: draft.id,
          }
        : draft
    );
    const flattened = drafts.flatMap((draft) =>
      draft.relatedLines && draft.relatedLines.length > 0
        ? [draft, ...draft.relatedLines]
        : [draft]
    );

    if (onSaveMultiple) {
      onSaveMultiple(flattened);
    } else if (flattened[0]) {
      onSave(flattened[0]);
    }
    resetForm();
    onClose();
  }, [
    hasBulkDrafts,
    bulkDraftLines,
    activeBulkDraftIndex,
    lineToSave,
    onSaveMultiple,
    onSave,
    resetForm,
    onClose,
  ]);

  const handleCancel = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const clampDiscount = useCallback((value: number): number => {
    return Math.max(0, Math.min(100, Number.isNaN(value) ? 0 : value));
  }, []);

  const normalizeDiscountOnBlur = useCallback((value: string): string => {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === ".") return "0";
    const num = parseDecimalInput(trimmed);
    return String(clampDiscount(Number.isNaN(num) ? 0 : num));
  }, [clampDiscount]);

  const handleDiscount1Change = useCallback(
    (text: string) => {
      const sanitized = sanitizeDecimalInput(text);
      if (sanitized === "" || sanitized === ".") {
        setDiscountRate1(sanitized);
        return;
      }
      const num = parseDecimalInput(sanitized);
      if (!Number.isNaN(num)) setDiscountRate1(sanitizeDecimalInput(String(clampDiscount(num))));
      else setDiscountRate1(sanitized);
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
      if (!Number.isNaN(num)) setDiscountRate2(sanitizeDecimalInput(String(clampDiscount(num))));
      else setDiscountRate2(sanitized);
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
      if (!Number.isNaN(num)) setDiscountRate3(sanitizeDecimalInput(String(clampDiscount(num))));
      else setDiscountRate3(sanitized);
    },
    [clampDiscount]
  );

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={handleCancel} />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {line ? "Satır Düzenle" : "Yeni Satır"}
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
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
                pendingRelatedStock && onCancelRelatedSelection && onApplyRelatedSelection
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
              multiSelect={isMultiSelectMode}
              onMultiSelect={isMultiSelectMode ? handleMultiSelect : undefined}
              queuedProductKeys={isMultiSelectMode ? bulkQueuedProductKeys : undefined}
            />
            {hasBulkDrafts && (
              <View style={styles.bulkDraftContainer}>
                <View style={[styles.bulkDraftGrid, { gap: bulkDraftChipGap }]}>
                  {bulkDraftLines.map((draft, index) => (
                    <TouchableOpacity
                      key={draft.id}
                      style={[
                        styles.bulkDraftChip,
                        {
                          width: bulkDraftChipWidth,
                          maxWidth: bulkDraftChipWidth,
                          borderColor: index === activeBulkDraftIndex ? colors.accent : colors.border,
                          backgroundColor: index === activeBulkDraftIndex ? `${colors.accent}20` : colors.backgroundSecondary,
                        },
                      ]}
                      onPress={() => {
                        upsertActiveDraft();
                        setActiveBulkDraftIndex(index);
                        applyDraftLineToForm(bulkDraftLines[index]);
                      }}
                    >
                      <Text style={[styles.bulkDraftChipText, { color: colors.text }]} numberOfLines={1}>
                        {draft.productCode || draft.productName || `Kalem ${index + 1}`}
                      </Text>
                      <TouchableOpacity
                        style={[styles.bulkDraftChipRemove, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveDraft(index);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.bulkDraftChipRemoveText, { color: colors.textMuted }]}>×</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {showUnitInStockSelection && (selectedStock?.unit || line?.unit) ? (
              <View
                style={[
                  styles.approvalWarning,
                  {
                    backgroundColor: `${colors.accent}12`,
                    borderWidth: 1,
                    borderColor: `${colors.accent}33`,
                    marginBottom: 12,
                  },
                ]}
              >
                <Text style={[styles.approvalWarningText, { color: colors.text, fontWeight: "700" }]}>
                  Olcu Birimi: {selectedStock?.unit || line?.unit}
                </Text>
              </View>
            ) : null}

            {isLoadingPrice && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Fiyat bilgisi yükleniyor...
                </Text>
              </View>
            )}

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Miktar <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                value={quantity}
                onChangeText={(text) => setQuantity(sanitizeDecimalInput(text))}
                placeholder="Miktar"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Birim Fiyat <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                value={unitPrice}
                onChangeText={(text) => setUnitPrice(sanitizeDecimalInput(text))}
                placeholder="Birim fiyat"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>İndirim 1 (%) (0-100)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                value={discountRate1}
                onChangeText={handleDiscount1Change}
                onBlur={() => setDiscountRate1(normalizeDiscountOnBlur(discountRate1))}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>İndirim 2 (%) (0-100)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                value={discountRate2}
                onChangeText={handleDiscount2Change}
                onBlur={() => setDiscountRate2(normalizeDiscountOnBlur(discountRate2))}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>İndirim 3 (%) (0-100)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                value={discountRate3}
                onChangeText={handleDiscount3Change}
                onBlur={() => setDiscountRate3(normalizeDiscountOnBlur(discountRate3))}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>KDV Oranı (%)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                value={vatRate}
                onChangeText={(text) => setVatRate(sanitizeDecimalInput(text))}
                placeholder="18"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Açıklama</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Satır açıklaması"
                multiline
                numberOfLines={3}
              />
            </View>

            {approvalStatus === 1 && approvalMessage && (
              <View style={[styles.approvalWarning, { backgroundColor: colors.warning + "20" }]}>
                <Text style={[styles.approvalWarningText, { color: colors.warning }]}>
                  ⚠️ {approvalMessage}
                </Text>
              </View>
            )}

            <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>{t("demand.calculationSummary")}</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ara Toplam:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {currentLine.lineTotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>KDV:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {currentLine.vatAmount.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>Genel Toplam:</Text>
                <Text style={[styles.summaryValue, { color: colors.accent, fontWeight: "600" }]}>
                  {currentLine.lineGrandTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            {displayedRelatedLines.length > 0 && (
              <View style={[styles.relatedSummaryCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.relatedSummaryTitle, { color: colors.text }]}>{t("demand.relatedStocksSummary")}</Text>
                {displayedRelatedLines.map((rel) => (
                  <View key={rel.id} style={[styles.relatedSummaryRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.relatedSummaryCode, { color: colors.text }]} numberOfLines={1}>{rel.productCode}</Text>
                    <View style={styles.relatedSummaryGrid}>
                      <Text style={[styles.relatedSummaryLabel, { color: colors.textSecondary }]}>{t("demand.discount1")}:</Text>
                      <Text style={[styles.relatedSummaryValue, { color: colors.text }]}>% {rel.discountRate1.toFixed(1)}</Text>
                      <Text style={[styles.relatedSummaryLabel, { color: colors.textSecondary }]}>{t("demand.discountAmount1")}:</Text>
                      <Text style={[styles.relatedSummaryValue, { color: colors.text }]}>{rel.discountAmount1.toFixed(2)}</Text>
                      <Text style={[styles.relatedSummaryLabel, { color: colors.textSecondary }]}>{t("demand.discount2")}:</Text>
                      <Text style={[styles.relatedSummaryValue, { color: colors.text }]}>% {rel.discountRate2.toFixed(1)}</Text>
                      <Text style={[styles.relatedSummaryLabel, { color: colors.textSecondary }]}>{t("demand.discountAmount2")}:</Text>
                      <Text style={[styles.relatedSummaryValue, { color: colors.text }]}>{rel.discountAmount2.toFixed(2)}</Text>
                      <Text style={[styles.relatedSummaryLabel, { color: colors.textSecondary }]}>{t("demand.discount3")}:</Text>
                      <Text style={[styles.relatedSummaryValue, { color: colors.text }]}>% {rel.discountRate3.toFixed(1)}</Text>
                      <Text style={[styles.relatedSummaryLabel, { color: colors.textSecondary }]}>{t("demand.discountAmount3")}:</Text>
                      <Text style={[styles.relatedSummaryValue, { color: colors.text }]}>{rel.discountAmount3.toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </FlatListScrollView>
          </View>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.accent },
                !(selectedStock || (line?.productCode && lineToSave.productCode)) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!(selectedStock || (line?.productCode && lineToSave.productCode))}
            >
              <Text style={styles.saveButtonText}>
                {hasBulkDrafts ? "Taslağa Kaydet" : "Kaydet"}
              </Text>
            </TouchableOpacity>
          </View>
          {hasBulkDrafts && (
            <View style={[styles.multiConfirmBar, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.multiConfirmButton, { backgroundColor: colors.accent }]}
                onPress={handleBulkDraftConfirm}
              >
                <Text style={styles.saveButtonText}>Seçilenleri Ekle ({bulkDraftLines.length})</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    height: "90%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  handle: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 24,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputReadOnly: {
    opacity: 0.9,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  approvalWarning: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  approvalWarningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryRowTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  relatedSummaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  relatedSummaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  relatedSummaryRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  relatedSummaryCode: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  relatedSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  relatedSummaryLabel: {
    fontSize: 12,
    width: "30%",
  },
  relatedSummaryValue: {
    fontSize: 12,
    fontWeight: "500",
    width: "65%",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  multiConfirmBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  multiConfirmButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  bulkDraftContainer: {
    marginBottom: 12,
  },
  bulkDraftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  bulkDraftChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 0,
  },
  bulkDraftChipText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "600",
  },
  bulkDraftChipRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkDraftChipRemoveText: {
    fontSize: 12,
    lineHeight: 13,
    fontWeight: "700",
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
