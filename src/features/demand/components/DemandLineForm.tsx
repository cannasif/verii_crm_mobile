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
  useWindowDimensions,
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
import { getProductSelectionKey, type ProductSelectionResult } from "../../stocks/types";
import { demandApi } from "../api";
import { quotationApi } from "../../quotation/api";
import type { UploadReportAssetOptions } from "../../quotation/api/quotationApi";
import { stockApi } from "../../stocks/api";
import { useStock } from "../../stocks/hooks";
import { parseDecimalInput, sanitizeDecimalInput } from "../../../lib/decimal-input";
import { getApiBaseUrl } from "../../../constants/config";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida/hooks/useWindoDefinitionOptions";
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
  allowImageUpload?: boolean;
  imageUploadScope?: "demand-line";
  imageUploadExtras?: Omit<UploadReportAssetOptions, "assetScope">;
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
  allowImageUpload = false,
  imageUploadScope = "demand-line",
  imageUploadExtras,
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
  const [description1, setDescription1] = useState<string>("");
  const [description2, setDescription2] = useState<string>("");
  const [description3, setDescription3] = useState<string>("");
  const [profilDefinitionId, setProfilDefinitionId] = useState<number | null>(null);
  const [demirDefinitionId, setDemirDefinitionId] = useState<number | null>(null);
  const [vidaDefinitionId, setVidaDefinitionId] = useState<number | null>(null);
  const [baskiDefinitionId, setBaskiDefinitionId] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<number>(0);
  const [approvalMessage, setApprovalMessage] = useState<string>("");
  const [relatedLinesDisplay, setRelatedLinesDisplay] = useState<DemandLineFormState[]>([]);
  const [bulkDraftLines, setBulkDraftLines] = useState<DemandLineFormState[]>([]);
  const [activeBulkDraftIndex, setActiveBulkDraftIndex] = useState<number>(0);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profilPickerVisible, setProfilPickerVisible] = useState(false);
  const [demirPickerVisible, setDemirPickerVisible] = useState(false);
  const [vidaPickerVisible, setVidaPickerVisible] = useState(false);
  const [baskiPickerVisible, setBaskiPickerVisible] = useState(false);
  const productPickerRef = useRef<ProductPickerRef>(null);
  const {
    profilOptions,
    demirOptions,
    vidaOptions,
    baskiOptions,
    profilMap,
    demirMap,
    vidaMap,
    baskiMap,
    demirDefinitions: allDemirDefinitions,
    vidaDefinitions: allVidaDefinitions,
    isLoading: isDefinitionOptionsLoading,
  } = useWindoDefinitionOptions({
    selectedProfilDefinitionId: profilDefinitionId,
    preserveSelection: {
      demirDefinitionId,
      vidaDefinitionId,
    },
  });

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
      description1: description1 || null,
      description2: description2 || null,
      description3: description3 || null,
      profilDefinitionId,
      demirDefinitionId,
      vidaDefinitionId,
      vidaDefinitionName: vidaDefinitionId ? vidaMap[vidaDefinitionId] ?? null : null,
      baskiDefinitionId,
      baskiDefinitionName: baskiDefinitionId ? baskiMap[baskiDefinitionId] ?? null : null,
      imagePath,
      isEditing: false,
      approvalStatus,
      relatedStockId: line?.relatedStockId ?? selectedStock?.id ?? null,
      relatedProductKey: line?.relatedProductKey ?? null,
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
    description1,
    description2,
    description3,
    profilDefinitionId,
    demirDefinitionId,
    vidaDefinitionId,
    vidaMap,
    baskiDefinitionId,
    baskiMap,
    imagePath,
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
      setDescription1(line.description1 || "");
      setDescription2(line.description2 || "");
      setDescription3(line.description3 || "");
      setProfilDefinitionId(line.profilDefinitionId ?? null);
      setDemirDefinitionId(line.demirDefinitionId ?? null);
      setVidaDefinitionId(line.vidaDefinitionId ?? null);
      setBaskiDefinitionId(line.baskiDefinitionId ?? null);
      setImagePath(line.imagePath || null);
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

  useEffect(() => {
    if (profilDefinitionId == null) {
      if (demirDefinitionId == null && vidaDefinitionId == null) {
        return;
      }

      setDemirDefinitionId(null);
      setVidaDefinitionId(null);
      return;
    }

    const currentDemir = allDemirDefinitions.find((item) => item.id === demirDefinitionId);
    const currentVida = allVidaDefinitions.find((item) => item.id === vidaDefinitionId);
    const nextDemirId =
      currentDemir?.profilDefinitionId === profilDefinitionId
        ? demirDefinitionId
        : null;
    const nextVidaId =
      currentVida?.profilDefinitionId === profilDefinitionId
        ? vidaDefinitionId
        : null;

    if (nextDemirId !== demirDefinitionId) {
      setDemirDefinitionId(nextDemirId);
    }

    if (nextVidaId !== vidaDefinitionId) {
      setVidaDefinitionId(nextVidaId);
    }
  }, [
    allDemirDefinitions,
    allVidaDefinitions,
    demirDefinitionId,
    demirOptions,
    profilDefinitionId,
    vidaDefinitionId,
    vidaOptions,
  ]);

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
    setDescription1("");
    setDescription2("");
    setDescription3("");
    setProfilDefinitionId(null);
    setDemirDefinitionId(null);
    setVidaDefinitionId(null);
    setBaskiDefinitionId(null);
    setImagePath(null);
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
    setDescription1(draft.description1 || "");
    setDescription2(draft.description2 || "");
    setDescription3(draft.description3 || "");
    setProfilDefinitionId(draft.profilDefinitionId ?? null);
    setDemirDefinitionId(draft.demirDefinitionId ?? null);
    setVidaDefinitionId(draft.vidaDefinitionId ?? null);
    setBaskiDefinitionId(draft.baskiDefinitionId ?? null);
    setImagePath(draft.imagePath || null);
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
      const lineIdFromForm =
        typeof line?.id === "string" && line.id.startsWith("line-")
          ? Number(line.id.replace("line-", ""))
          : undefined;
      const productCodeForUpload =
        imageUploadExtras?.productCode ||
        line?.productCode ||
        selectedStock?.erpStockCode ||
        undefined;

      const uploaded = await quotationApi.uploadReportAsset(result.assets[0].uri, {
        assetScope: imageUploadScope,
        demandId: imageUploadExtras?.demandId,
        demandLineId:
          imageUploadExtras?.demandLineId && imageUploadExtras.demandLineId > 0
            ? imageUploadExtras.demandLineId
            : Number.isFinite(lineIdFromForm) && (lineIdFromForm as number) > 0
              ? (lineIdFromForm as number)
              : undefined,
        productCode: productCodeForUpload,
      });
      setImagePath(uploaded.relativeUrl);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Görsel yüklenemedi";
      Alert.alert("Görsel", message);
    } finally {
      setIsUploadingImage(false);
    }
  }, [imageUploadExtras, imageUploadScope, line?.id, line?.productCode, selectedStock?.erpStockCode]);

  const openImagePickerMenu = useCallback(() => {
    Alert.alert("Kalem Görseli", "Görsel kaynağını seç", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Kameradan Çek", onPress: () => void handlePickImage("camera") },
      { text: "Galeriden Seç", onPress: () => void handlePickImage("gallery") },
    ]);
  }, [handlePickImage]);

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
                      <Text
                        style={[
                          styles.bulkDraftChipText,
                          { color: draft.productCode ? colors.accent : colors.text },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
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

            {allowImageUpload ? (
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Kalem Görseli</Text>
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
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>
                      Bu kalem için henüz görsel eklenmedi
                    </Text>
                  </View>
                )}
                <View style={styles.imageActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.imageActionButton,
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    ]}
                    onPress={openImagePickerMenu}
                    disabled={isUploadingImage || !(selectedStock?.erpStockCode || lineToSave.productCode)}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Text style={[styles.imageActionButtonText, { color: colors.text }]}>
                        {imagePath ? "Görseli Değiştir" : "Görsel Ekle"}
                      </Text>
                    )}
                  </TouchableOpacity>
                  {imagePath ? (
                    <TouchableOpacity
                      style={[
                        styles.imageActionButton,
                        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                      ]}
                      onPress={() => setImagePath(null)}
                    >
                      <Text style={[styles.imageActionButtonText, { color: colors.error }]}>
                        Kaldır
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
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

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Açıklama Alanları</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Açıklama 1</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                value={description1}
                onChangeText={setDescription1}
                placeholder="Açıklama 1"
              />
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>Açıklama 2</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text, marginTop: 8 },
                ]}
                value={description2}
                onChangeText={setDescription2}
                placeholder="Açıklama 2"
              />
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>Açıklama 3</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text, marginTop: 8 },
                ]}
                value={description3}
                onChangeText={setDescription3}
                placeholder="Açıklama 3"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Profil</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
                onPress={() => setProfilPickerVisible(true)}
              >
                <Text style={[styles.pickerText, { color: colors.text }]}>
                  {profilDefinitionId != null
                    ? profilMap[profilDefinitionId] || `#${profilDefinitionId}`
                    : isDefinitionOptionsLoading
                      ? "Yükleniyor..."
                      : "Profil seçin"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Demir</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
                onPress={() => setDemirPickerVisible(true)}
              >
                <Text style={[styles.pickerText, { color: colors.text }]}>
                  {demirDefinitionId != null
                    ? demirMap[demirDefinitionId] || `#${demirDefinitionId}`
                    : isDefinitionOptionsLoading
                      ? "Yükleniyor..."
                      : "Demir seçin"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Vida</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
                onPress={() => setVidaPickerVisible(true)}
              >
                <Text style={[styles.pickerText, { color: colors.text }]}>
                  {vidaDefinitionId != null
                    ? vidaMap[vidaDefinitionId] || `#${vidaDefinitionId}`
                    : isDefinitionOptionsLoading
                      ? "Yükleniyor..."
                      : "Vida seçin"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Baskı</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
                onPress={() => setBaskiPickerVisible(true)}
              >
                <Text style={[styles.pickerText, { color: colors.text }]}>
                  {baskiDefinitionId != null
                    ? baskiMap[baskiDefinitionId] || `#${baskiDefinitionId}`
                    : isDefinitionOptionsLoading
                      ? "Yükleniyor..."
                      : "Baskı seçin"}
                </Text>
              </TouchableOpacity>
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
                !hasBulkDrafts &&
                  !(selectedStock || (line?.productCode && lineToSave.productCode)) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!hasBulkDrafts && !(selectedStock || (line?.productCode && lineToSave.productCode))}
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
    <PickerModal
      visible={profilPickerVisible}
      title="Profil seç"
      options={profilOptions}
      selectedValue={profilDefinitionId ?? undefined}
      onClose={() => setProfilPickerVisible(false)}
      onSelect={(option) =>
        setProfilDefinitionId(typeof option.id === "number" ? option.id : Number(option.id) || null)
      }
    />
    <PickerModal
      visible={demirPickerVisible}
      title="Demir seç"
      options={demirOptions}
      selectedValue={demirDefinitionId ?? undefined}
      onClose={() => setDemirPickerVisible(false)}
      onSelect={(option) =>
        setDemirDefinitionId(typeof option.id === "number" ? option.id : Number(option.id) || null)
      }
    />
    <PickerModal
      visible={vidaPickerVisible}
      title="Vida seç"
      options={vidaOptions}
      selectedValue={vidaDefinitionId ?? undefined}
      onClose={() => setVidaPickerVisible(false)}
      onSelect={(option) =>
        setVidaDefinitionId(typeof option.id === "number" ? option.id : Number(option.id) || null)
      }
    />
    <PickerModal
      visible={baskiPickerVisible}
      title="Baskı seç"
      options={baskiOptions}
      selectedValue={baskiDefinitionId ?? undefined}
      onClose={() => setBaskiPickerVisible(false)}
      onSelect={(option) =>
        setBaskiDefinitionId(typeof option.id === "number" ? option.id : Number(option.id) || null)
      }
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
  imagePreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },
  imagePlaceholder: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  imagePlaceholderText: {
    fontSize: 13,
    textAlign: "center",
  },
  imageActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  imageActionButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  imageActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
  pickerButton: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  pickerText: {
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
    borderRadius: 10,
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 0,
  },
  bulkDraftChipText: {
    flex: 1,
    minWidth: 0,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  bulkDraftChipRemove: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bulkDraftChipRemoveText: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: "600",
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
