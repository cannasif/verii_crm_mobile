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
import { useSystemSettingsStore } from "../../../store/system-settings";
import { useSystemSettingsQuery } from "../../system-settings/hooks/useSystemSettingsQuery";
import { useDocumentFieldLabelMap } from "../../document-field-labels";
import { ProductPicker, type ProductPickerRef } from "./ProductPicker";
import { PickerModal } from "./PickerModal";
import type { StockRelationDto } from "../../stocks/types";
import { getProductSelectionKey, type ProductSelectionResult } from "../../stocks/types";
import { quotationApi } from "../api";
import type { UploadReportAssetOptions } from "../api/quotationApi";
import { stockApi } from "../../stocks/api";
import { useErpProjects } from "../hooks";
import { useStock } from "../../stocks/hooks";
import { parseDecimalInput, sanitizeDecimalInput } from "../../../lib/decimal-input";
import {
  areDiscountRatesValid,
  normalizeDiscountRateForField,
  type DiscountRateField,
} from "../../../lib/discountRateValidation";
import { areProfilDefinitionsValid } from "../../../lib/profilDefinitionValidation";
import { getApiBaseUrl } from "../../../constants/config";
import { resolveDocumentVatRate } from "../../../utils/documentVat";
import { useWindoDefinitionOptions } from "../../windo-profil-demir-vida/hooks/useWindoDefinitionOptions";
import { BaskiQuickCreateModal } from "../../windo-profil-demir-vida/components/BaskiQuickCreateModal";
import { LineFormDescriptionFieldsSection } from "@/components/shared/line-form";
import type {
  QuotationLineFormState,
  PricingRuleLineGetDto,
  UserDiscountLimitDto,
  StockGetDto,
} from "../types";
import { calculateLineTotals } from "../utils";
import { getCurrencyDisplayLabel } from "../../../lib/currencyDisplay";
import { resolveDocumentLineProductName } from "../../stocks/utils";

interface QuotationLineFormProps {
  visible: boolean;
  line: QuotationLineFormState | null;
  onClose: () => void;
  onSave: (line: QuotationLineFormState) => void;
  onMultiProductSelect?: (products: ProductSelectionResult[]) => QuotationLineFormState[] | Promise<QuotationLineFormState[]>;
  onSaveMultiple?: (lines: QuotationLineFormState[]) => void;
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
  offerType?: string | null;
  allowImageUpload?: boolean;
  imageUploadScope?:
    | "quick-quotation"
    | "pdf-designer"
    | "report-builder"
    | "template"
    | "quotation-line";
  /** Extra fields for /assets/upload (e.g. hızlı teklif temp header / line ids). `assetScope` comes from `imageUploadScope`. */
  imageUploadExtras?: Omit<UploadReportAssetOptions, "assetScope">;
}

type DiscountField = DiscountRateField;

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
  offerType,
  allowImageUpload = false,
  imageUploadScope = "pdf-designer",
  imageUploadExtras,
}: QuotationLineFormProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { themeMode, showUnitInStockSelection } = useUIStore();
  const storedSystemSettings = useSystemSettingsStore((state) => state.settings);
  const { data: freshSystemSettings } = useSystemSettingsQuery();
  const effectiveSystemSettings = freshSystemSettings ?? storedSystemSettings;
  const hideVatRate = Boolean(effectiveSystemSettings.hideQuotationVatRate);
  const readonlyVatRate = Boolean(effectiveSystemSettings.readonlyQuotationVatRate);
  const lineDescriptionLabels = useDocumentFieldLabelMap("quotation", "LineDescription");
  const description1Label = lineDescriptionLabels.Description1?.effectiveLabel || "Açıklama 1";
  const description2Label = lineDescriptionLabels.Description2?.effectiveLabel || "Açıklama 2";
  const description3Label = lineDescriptionLabels.Description3?.effectiveLabel || "Açıklama 3";
  const description1Placeholder = lineDescriptionLabels.Description1?.placeholder || description1Label;
  const description2Placeholder = lineDescriptionLabels.Description2?.placeholder || description2Label;
  const description3Placeholder = lineDescriptionLabels.Description3?.placeholder || description3Label;
  const isVatRateInputLocked = readonlyVatRate;
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
  const softInputText = isDark ? "#D9D1E8" : "#4B3F5F";
  const primaryActionBg = isDark ? "rgba(236,72,153,0.24)" : "#F6C7E2";
  const primaryActionText = isDark ? "#FCE7F3" : "#5B3150";
  const secondaryActionBg = isDark ? "rgba(255,255,255,0.06)" : "#F8F3FA";
  const secondaryActionText = isDark ? "#D9D1E8" : "#6D5A80";
  const warningColor = "#F59E0B";

  const normalizedCurrency = useMemo(() => normalizeCurrencyCode(currency), [currency]);

  const [selectedStock, setSelectedStock] = useState<StockGetDto | undefined>();
  const [lineProductName, setLineProductName] = useState("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitPrice, setUnitPrice] = useState<string>("0");
  const [discountRate1, setDiscountRate1] = useState<string>("0");
  const [discountRate2, setDiscountRate2] = useState<string>("0");
  const [discountRate3, setDiscountRate3] = useState<string>("0");
  const [vatRate, setVatRate] = useState<string>(() => String(resolveDocumentVatRate(20, offerType)));
  const [description, setDescription] = useState<string>("");
  const [description1, setDescription1] = useState<string>("");
  const [description2, setDescription2] = useState<string>("");
  const [description3, setDescription3] = useState<string>("");
  const [profilDefinitionId, setProfilDefinitionId] = useState<number | null>(null);
  const [demirDefinitionId, setDemirDefinitionId] = useState<number | null>(null);
  const [vidaDefinitionId, setVidaDefinitionId] = useState<number | null>(null);
  const [baskiDefinitionId, setBaskiDefinitionId] = useState<number | null>(null);
  const [baskiAciklama, setBaskiAciklama] = useState<string>("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<number>(0);
  const [approvalMessage, setApprovalMessage] = useState<string>("");
  const [relatedLinesDisplay, setRelatedLinesDisplay] = useState<QuotationLineFormState[]>([]);
  const [bulkDraftLines, setBulkDraftLines] = useState<QuotationLineFormState[]>([]);
  const [activeBulkDraftIndex, setActiveBulkDraftIndex] = useState<number>(0);
  const [erpProjectCode, setErpProjectCode] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [projectCodeModalVisible, setProjectCodeModalVisible] = useState(false);
  const [profilPickerVisible, setProfilPickerVisible] = useState(false);
  const [profilFieldError, setProfilFieldError] = useState(false);
  const [demirPickerVisible, setDemirPickerVisible] = useState(false);
  const [vidaPickerVisible, setVidaPickerVisible] = useState(false);
  const [baskiPickerVisible, setBaskiPickerVisible] = useState(false);
  const [baskiCreateVisible, setBaskiCreateVisible] = useState(false);
  const productPickerRef = useRef<ProductPickerRef>(null);
  const prevLineFormVisibleRef = useRef(false);
  const lastHydratedLineIdRef = useRef<string | null>(null);

  const { data: projects = [] } = useErpProjects();
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
  /** `scrollContentContainer` yatay padding ile uyumlu (padding: 18). */
  const bulkDraftChipWidth = useMemo(() => {
    const rowPad = 18 * 2;
    const inner = Math.max(0, windowWidth - rowPad);
    const gaps = bulkDraftChipGap * (bulkDraftChipCols - 1);
    return Math.max(64, Math.floor((inner - gaps) / bulkDraftChipCols));
  }, [windowWidth]);

  const currentLine: QuotationLineFormState = useMemo(() => {
    const qty = parseDecimalInput(quantity);
    const price = parseDecimalInput(unitPrice);
    const disc1 = parseDecimalInput(discountRate1);
    const disc2 = parseDecimalInput(discountRate2);
    const disc3 = parseDecimalInput(discountRate3);
    const vat = resolveDocumentVatRate(parseDecimalInput(vatRate), offerType);

    const baseLine: QuotationLineFormState = {
      id: line?.id || `temp-${Date.now()}`,
      productId: selectedStock?.id || null,
      productCode: selectedStock?.erpStockCode || "",
      productName: lineProductName || selectedStock?.stockName || "",
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
      profilDefinitionId,
      demirDefinitionId,
      vidaDefinitionId,
      baskiDefinitionId,
      baskiAciklama: baskiAciklama.trim() || null,
      erpProjectCode: erpProjectCode || null,
      pendingImageUri,
      isEditing: false,
      approvalStatus,
      relatedStockId: line?.relatedStockId ?? selectedStock?.id ?? null,
      relatedProductKey: line?.relatedProductKey ?? null,
      isMainRelatedProduct: line?.isMainRelatedProduct ?? true,
    };

    return calculateLineTotals(baseLine);
  }, [
    line?.id,
    line?.relatedStockId,
    line?.relatedProductKey,
    line?.isMainRelatedProduct,
    lineProductName,
    selectedStock,
    quantity,
    unitPrice,
    discountRate1,
    discountRate2,
    discountRate3,
    vatRate,
    offerType,
    description,
    description1,
    description2,
    description3,
    profilDefinitionId,
    demirDefinitionId,
    vidaDefinitionId,
    baskiDefinitionId,
    baskiAciklama,
    imagePath,
    pendingImageUri,
    erpProjectCode,
    approvalStatus,
  ]);

  const lineCurrencyDisplay = useMemo(() => {
    const opt = currencyOptions?.find((c) => normalizeCurrencyCode(c.code) === normalizedCurrency);
    if (opt?.dovizIsmi?.trim()) return opt.dovizIsmi.trim();
    return getCurrencyDisplayLabel(normalizedCurrency);
  }, [currencyOptions, normalizedCurrency]);

  const formattedVatRatePercent = useMemo(() => {
    const v = Number(currentLine.vatRate);
    if (!Number.isFinite(v)) return "0";
    const rounded = Math.round(v * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
  }, [currentLine.vatRate]);

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
    setLineProductName("");
    setQuantity("1");
    setUnitPrice("0");
    setDiscountRate1("0");
    setDiscountRate2("0");
    setDiscountRate3("0");
    setVatRate(String(resolveDocumentVatRate(20, offerType)));
    setDescription("");
    setDescription1("");
    setDescription2("");
    setDescription3("");
    setProfilDefinitionId(null);
    setDemirDefinitionId(null);
    setVidaDefinitionId(null);
    setBaskiDefinitionId(null);
    setBaskiAciklama("");
    setImagePath(null);
    setPendingImageUri(null);
    setErpProjectCode(null);
    setApprovalStatus(0);
    setApprovalMessage("");
    setRelatedLinesDisplay([]);
    setBulkDraftLines([]);
    setActiveBulkDraftIndex(0);
    setProfilFieldError(false);
  }, [offerType]);

  const applyDraftLineToForm = useCallback((draft: QuotationLineFormState) => {
    setQuantity(sanitizeDecimalInput(String(draft.quantity)));
    setUnitPrice(sanitizeDecimalInput(String(draft.unitPrice)));
    setDiscountRate1(sanitizeDecimalInput(String(draft.discountRate1)));
    setDiscountRate2(sanitizeDecimalInput(String(draft.discountRate2)));
    setDiscountRate3(sanitizeDecimalInput(String(draft.discountRate3)));
    setVatRate(sanitizeDecimalInput(String(resolveDocumentVatRate(draft.vatRate, offerType))));
    setDescription(draft.description || "");
    setDescription1(draft.description1 || "");
    setDescription2(draft.description2 || "");
    setDescription3(draft.description3 || "");
    setProfilDefinitionId(draft.profilDefinitionId ?? null);
    setDemirDefinitionId(draft.demirDefinitionId ?? null);
    setVidaDefinitionId(draft.vidaDefinitionId ?? null);
    setBaskiDefinitionId(draft.baskiDefinitionId ?? null);
    setBaskiAciklama(draft.baskiAciklama || "");
    setImagePath(draft.imagePath || null);
    setPendingImageUri(draft.pendingImageUri || null);
    setErpProjectCode(draft.erpProjectCode ?? null);
    setApprovalStatus(draft.approvalStatus || 0);
    setRelatedLinesDisplay(draft.relatedLines ?? []);

    setLineProductName(draft.productName || "");
    setSelectedStock({
      id: draft.productId ?? 0,
      erpStockCode: draft.productCode || "",
      stockName: draft.productName || "",
      unit: draft.unit ?? undefined,
      branchCode: 0,
      grupKodu: draft.groupCode ?? undefined,
    } as StockGetDto);
  }, [offerType]);

  const hydrateFromEditingLine = useCallback((editing: QuotationLineFormState) => {
    setBulkDraftLines([]);
    setActiveBulkDraftIndex(0);
    setQuantity(sanitizeDecimalInput(String(editing.quantity)));
    setUnitPrice(sanitizeDecimalInput(String(editing.unitPrice)));
    setDiscountRate1(sanitizeDecimalInput(String(editing.discountRate1)));
    setDiscountRate2(sanitizeDecimalInput(String(editing.discountRate2)));
    setDiscountRate3(sanitizeDecimalInput(String(editing.discountRate3)));
    setVatRate(sanitizeDecimalInput(String(resolveDocumentVatRate(editing.vatRate, offerType))));
    setDescription(editing.description || "");
    setDescription1(editing.description1 || "");
    setDescription2(editing.description2 || "");
    setDescription3(editing.description3 || "");
    setProfilDefinitionId(editing.profilDefinitionId ?? null);
    setDemirDefinitionId(editing.demirDefinitionId ?? null);
    setVidaDefinitionId(editing.vidaDefinitionId ?? null);
    setBaskiDefinitionId(editing.baskiDefinitionId ?? null);
    setBaskiAciklama(editing.baskiAciklama || "");
    setImagePath(editing.imagePath || null);
    setPendingImageUri(editing.pendingImageUri || null);
    setErpProjectCode(editing.erpProjectCode ?? null);
    setApprovalStatus(editing.approvalStatus || 0);
    setRelatedLinesDisplay(editing.relatedLines ?? []);

    if (editing.productCode || editing.productName) {
      setLineProductName(editing.productName || "");
      setSelectedStock({
        id: editing.productId ?? 0,
        erpStockCode: editing.productCode || "",
        stockName: editing.productName || "",
        unit: editing.unit ?? undefined,
        branchCode: 0,
        grupKodu: editing.groupCode ?? undefined,
      } as StockGetDto);
    } else {
      setSelectedStock(undefined);
    }
  }, [offerType]);

  const previousOfferTypeRef = useRef(offerType);
  useEffect(() => {
    if (previousOfferTypeRef.current === offerType) return;

    previousOfferTypeRef.current = offerType;
    setVatRate(String(resolveDocumentVatRate(undefined, offerType)));
  }, [offerType]);

  useEffect(() => {
    if (!visible) {
      resetForm();
      prevLineFormVisibleRef.current = false;
      lastHydratedLineIdRef.current = null;
      return;
    }

    const justOpened = !prevLineFormVisibleRef.current;
    const nextLineId = line?.id ?? null;
    const lineChanged = nextLineId !== lastHydratedLineIdRef.current;

    if (justOpened || lineChanged) {
      if (line) {
        hydrateFromEditingLine(line);
      } else if (!hasBulkDrafts && !selectedStock?.erpStockCode?.trim()) {
        resetForm();
      }
      lastHydratedLineIdRef.current = nextLineId;
    }

    prevLineFormVisibleRef.current = true;
  }, [visible, line, resetForm, hydrateFromEditingLine, hasBulkDrafts, selectedStock?.erpStockCode]);

  useEffect(() => {
    if (profilDefinitionId != null) {
      setProfilFieldError(false);
    }
  }, [profilDefinitionId]);

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

    const tempLineIdFromFormId =
      line?.id?.startsWith("db-") === true
        ? Number(line.id.replace("db-", ""))
        : undefined;
    const resolvedLineId =
      typeof imageUploadExtras?.tempQuotattionLineId === "number" &&
      imageUploadExtras.tempQuotattionLineId > 0
        ? imageUploadExtras.tempQuotattionLineId
        : Number.isFinite(tempLineIdFromFormId) && (tempLineIdFromFormId as number) > 0
          ? (tempLineIdFromFormId as number)
          : undefined;

    const canUploadImmediately =
      imageUploadScope !== "quotation-line" ||
      (typeof imageUploadExtras?.quotationLineId === "number" && imageUploadExtras.quotationLineId > 0) ||
      (typeof resolvedLineId === "number" && resolvedLineId > 0);

    if (!canUploadImmediately) {
      setPendingImageUri(result.assets[0].uri);
      setImagePath(null);
      return;
    }

    setIsUploadingImage(true);
    try {
      const productCodeForUpload =
        imageUploadExtras?.productCode ||
        line?.productCode ||
        selectedStock?.erpStockCode ||
        undefined;

      const uploaded = await quotationApi.uploadReportAsset(result.assets[0].uri, {
        assetScope: imageUploadScope,
        tempQuotattionId: imageUploadExtras?.tempQuotattionId,
        tempQuotattionLineId: resolvedLineId,
        productCode: productCodeForUpload,
        quotationId: imageUploadExtras?.quotationId,
        quotationLineId:
          imageUploadExtras?.quotationLineId && imageUploadExtras.quotationLineId > 0
            ? imageUploadExtras.quotationLineId
            : imageUploadScope === "quotation-line"
              ? resolvedLineId
              : undefined,
      });
      setImagePath(uploaded.relativeUrl);
      setPendingImageUri(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Görsel yüklenemedi";
      Alert.alert("Görsel", message);
    } finally {
      setIsUploadingImage(false);
    }
  }, [imageUploadScope, imageUploadExtras, line?.id, line?.productCode, selectedStock?.erpStockCode]);

  const displayImageUri = pendingImageUri || imagePath;

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
        setLineProductName("");
      }

      if (!stockToUse) {
        setLineProductName("");
        setUnitPrice("0");
        return true;
      }

      const resolvedName = await resolveDocumentLineProductName(
        {
          stockId: stockToUse.id,
          code: stockToUse.erpStockCode,
          name: stockToUse.stockName,
        },
        i18n.language
      );
      setLineProductName(resolvedName);
      setSelectedStock({
        ...stockToUse,
        stockName: stockToUse.stockName,
      });

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
      i18n.language,
    ]
  );

  useEffect(() => {
    if (!selectedStock?.erpStockCode) return;

    let cancelled = false;
    void resolveDocumentLineProductName(
      {
        stockId: selectedStock.id,
        code: selectedStock.erpStockCode,
        name: selectedStock.stockName,
      },
      i18n.language
    ).then((resolvedName) => {
      if (!cancelled) setLineProductName(resolvedName);
    });

    return () => {
      cancelled = true;
    };
  }, [i18n.language, selectedStock?.id, selectedStock?.erpStockCode, selectedStock?.stockName]);

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

  const mergeBulkDraftLinesAtIndex = useCallback(
    (drafts: QuotationLineFormState[], index: number, snapshot: QuotationLineFormState) => {
      if (drafts.length === 0) return drafts;

      return drafts.map((draft, i) =>
        i === index
          ? {
              ...snapshot,
              id: draft.id,
            }
          : draft
      );
    },
    []
  );

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

  const handleRemoveDraft = useCallback((index: number) => {
    if (!hasBulkDrafts || index < 0 || index >= bulkDraftLines.length) return;
    const committed = mergeBulkDraftLinesAtIndex(bulkDraftLines, activeBulkDraftIndex, lineToSave);
    const next = committed.filter((_, i) => i !== index);
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
  }, [
    hasBulkDrafts,
    bulkDraftLines,
    activeBulkDraftIndex,
    lineToSave,
    mergeBulkDraftLinesAtIndex,
    applyDraftLineToForm,
    resetForm,
  ]);

  const showDiscountRateError = useCallback(() => {
    Alert.alert("İndirim", "Kademeli iskonto efektif %100 değerine ulaşamaz.");
  }, []);

  const showProfilRequiredError = useCallback(() => {
    Alert.alert(t("common.warning"), t("validation.profilDefinitionRequired"));
  }, [t]);

  const validateProfilBeforeSave = useCallback(
    (linesToValidate: Array<Pick<QuotationLineFormState, "profilDefinitionId">>): boolean => {
      const isValid = areProfilDefinitionsValid(linesToValidate);
      if (!isValid) {
        setProfilFieldError(true);
        showProfilRequiredError();
      }
      return isValid;
    },
    [showProfilRequiredError],
  );

  const normalizeDiscountInput = useCallback(
    (field: DiscountField, value: number): number => {
      const normalized = normalizeDiscountRateForField(field, value, {
        discountRate1: parseDecimalInput(discountRate1),
        discountRate2: parseDecimalInput(discountRate2),
        discountRate3: parseDecimalInput(discountRate3),
      });
      if (normalized.wasClamped) {
        showDiscountRateError();
      }
      return normalized.value;
    },
    [discountRate1, discountRate2, discountRate3, showDiscountRateError]
  );

  const validateDiscountRatesBeforeSave = useCallback(
    (linesToValidate: Array<Pick<QuotationLineFormState, DiscountField>>): boolean => {
      const isValid = linesToValidate.every((item) => areDiscountRatesValid(item));
      if (!isValid) {
        showDiscountRateError();
      }
      return isValid;
    },
    [showDiscountRateError]
  );

  const handleSave = useCallback(() => {
    if (hasBulkDrafts) {
      const nextDrafts = mergeBulkDraftLinesAtIndex(bulkDraftLines, activeBulkDraftIndex, lineToSave);
      const flattenedDrafts = nextDrafts.flatMap((draft) =>
        draft.relatedLines && draft.relatedLines.length > 0 ? [draft, ...draft.relatedLines] : [draft]
      );
      if (!validateProfilBeforeSave([lineToSave])) {
        return;
      }
      if (!validateDiscountRatesBeforeSave(flattenedDrafts)) {
        return;
      }
      setBulkDraftLines(nextDrafts);

      if (activeBulkDraftIndex < nextDrafts.length - 1) {
        const nextIndex = activeBulkDraftIndex + 1;
        setActiveBulkDraftIndex(nextIndex);
        applyDraftLineToForm(nextDrafts[nextIndex]);
      }
      return;
    }

    const canSave = selectedStock || (line?.productCode && lineToSave.productCode);
    if (!canSave) {
      return;
    }

    if (!validateProfilBeforeSave([lineToSave])) {
      return;
    }

    if (!validateDiscountRatesBeforeSave([lineToSave, ...(lineToSave.relatedLines ?? [])])) {
      return;
    }

    onSave(lineToSave);
    resetForm();
    onClose();
  }, [
    hasBulkDrafts,
    activeBulkDraftIndex,
    bulkDraftLines,
    mergeBulkDraftLinesAtIndex,
    applyDraftLineToForm,
    selectedStock,
    line?.productCode,
    lineToSave,
    validateProfilBeforeSave,
    validateDiscountRatesBeforeSave,
    onSave,
    onClose,
    resetForm,
  ]);

  const handleBulkDraftConfirm = useCallback(() => {
    if (!hasBulkDrafts) return;
    const drafts = mergeBulkDraftLinesAtIndex(bulkDraftLines, activeBulkDraftIndex, lineToSave);
    const flattened = drafts.flatMap((draft) =>
      draft.relatedLines && draft.relatedLines.length > 0
        ? [draft, ...draft.relatedLines]
        : [draft]
    );
    if (!validateProfilBeforeSave(drafts)) {
      return;
    }
    if (!validateDiscountRatesBeforeSave(flattened)) {
      return;
    }
    if (onSaveMultiple) onSaveMultiple(flattened);
    else if (flattened[0]) onSave(flattened[0]);
    resetForm();
    onClose();
  }, [
    hasBulkDrafts,
    bulkDraftLines,
    activeBulkDraftIndex,
    mergeBulkDraftLinesAtIndex,
    lineToSave,
    validateProfilBeforeSave,
    validateDiscountRatesBeforeSave,
    onSaveMultiple,
    onSave,
    resetForm,
    onClose,
  ]);

  const handleCancel = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const normalizeDiscountOnBlur = useCallback(
    (field: DiscountField, value: string): string => {
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === ".") return "0";
      const num = parseDecimalInput(trimmed);
      return String(normalizeDiscountInput(field, Number.isNaN(num) ? 0 : num));
    },
    [normalizeDiscountInput]
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
        setDiscountRate1(sanitizeDecimalInput(String(normalizeDiscountInput("discountRate1", num))));
      } else {
        setDiscountRate1(sanitized);
      }
    },
    [normalizeDiscountInput]
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
        setDiscountRate2(sanitizeDecimalInput(String(normalizeDiscountInput("discountRate2", num))));
      } else {
        setDiscountRate2(sanitized);
      }
    },
    [normalizeDiscountInput]
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
        setDiscountRate3(sanitizeDecimalInput(String(normalizeDiscountInput("discountRate3", num))));
      } else {
        setDiscountRate3(sanitized);
      }
    },
    [normalizeDiscountInput]
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
                  productName={lineProductName || selectedStock?.stockName}
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
                              borderColor: index === activeBulkDraftIndex ? brandColor : borderColor,
                              backgroundColor: index === activeBulkDraftIndex ? brandSoft : inputBg,
                            },
                          ]}
                          onPress={() => {
                            const nextDrafts = mergeBulkDraftLinesAtIndex(
                              bulkDraftLines,
                              activeBulkDraftIndex,
                              lineToSave
                            );
                            setBulkDraftLines(nextDrafts);
                            setActiveBulkDraftIndex(index);
                            applyDraftLineToForm(nextDrafts[index]);
                          }}
                        >
                          <Text
                            style={[
                              styles.bulkDraftChipText,
                              { color: draft.productCode ? brandColor : textColor },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {draft.productCode || draft.productName || `Kalem ${index + 1}`}
                          </Text>
                          <TouchableOpacity
                            style={[styles.bulkDraftChipRemove, { borderColor, backgroundColor: inputBg }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleRemoveDraft(index);
                            }}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.bulkDraftChipRemoveText, { color: mutedColor }]}>×</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {showUnitInStockSelection && (selectedStock?.unit || line?.unit) ? (
                  <View style={[styles.unitInfoRow, { borderColor: softPinkBorder }]}>
                    <Text style={[styles.sectionMiniTitle, { color: mutedColor }]}>Olcu Birimi</Text>
                    <View style={[styles.unitBadge, { borderColor: softPinkBorder, backgroundColor: softPinkBg }]}>
                      <Text style={[styles.unitBadgeText, { color: primaryActionText }]}>
                        {selectedStock?.unit || line?.unit}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {allowImageUpload ? (
                  <View style={[styles.formCard, { borderColor, backgroundColor: cardBg }]}>
                    <Text style={[styles.sectionMiniTitle, { color: textColor }]}>
                      Kalem Görseli
                    </Text>

                    {displayImageUri ? (
                      <Image
                        source={{ uri: resolveMobileImageUri(displayImageUri) ?? displayImageUri }}
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
                        disabled={isUploadingImage || !(selectedStock?.erpStockCode || lineToSave.productCode)}
                      >
                        {isUploadingImage ? (
                          <ActivityIndicator size="small" color={brandColor} />
                        ) : (
                          <Text style={[styles.imageActionButtonText, { color: textColor }]}>
                            {displayImageUri ? "Görseli Değiştir" : "Görsel Ekle"}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {displayImageUri ? (
                        <TouchableOpacity
                          style={[
                            styles.imageActionButton,
                            { borderColor: softPinkBorder, backgroundColor: inputBg },
                          ]}
                          onPress={() => {
                            setImagePath(null);
                            setPendingImageUri(null);
                          }}
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
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: softInputText },
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
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: softInputText },
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
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: softInputText },
                        ]}
                        value={discountRate1}
                        onChangeText={handleDiscount1Change}
                        onBlur={() => setDiscountRate1(normalizeDiscountOnBlur("discountRate1", discountRate1))}
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
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: softInputText },
                        ]}
                        value={discountRate2}
                        onChangeText={handleDiscount2Change}
                        onBlur={() => setDiscountRate2(normalizeDiscountOnBlur("discountRate2", discountRate2))}
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
                          { backgroundColor: inputBg, borderColor: softPinkBorder, color: softInputText },
                        ]}
                        value={discountRate3}
                        onChangeText={handleDiscount3Change}
                        onBlur={() => setDiscountRate3(normalizeDiscountOnBlur("discountRate3", discountRate3))}
                        placeholder="0"
                        placeholderTextColor={mutedColor}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.rowTwo}>
                    {!hideVatRate ? (
                      <View style={styles.fieldHalf}>
                        <Text style={[styles.label, { color: mutedColor }]}>KDV Oranı (%)</Text>
                        <TextInput
                          style={[
                            styles.input,
                            { backgroundColor: inputBg, borderColor: softPinkBorder, color: softInputText },
                          ]}
                          value={vatRate}
                          editable={!isVatRateInputLocked}
                          onChangeText={(text) => {
                            if (isVatRateInputLocked) return;
                            setVatRate(sanitizeDecimalInput(text));
                          }}
                          placeholder="18"
                          placeholderTextColor={mutedColor}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    ) : null}

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
                          style={[styles.pickerText, { color: erpProjectCode ? softInputText : mutedColor }]}
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
                        { backgroundColor: inputBg, borderColor: softPinkBorder, color: softInputText },
                      ]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Satır açıklaması"
                      placeholderTextColor={mutedColor}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <LineFormDescriptionFieldsSection
                    description1={description1}
                    description2={description2}
                    description3={description3}
                    description1Label={description1Label}
                    description2Label={description2Label}
                    description3Label={description3Label}
                    description1Placeholder={description1Placeholder}
                    description2Placeholder={description2Placeholder}
                    description3Placeholder={description3Placeholder}
                    onDescription1Change={setDescription1}
                    onDescription2Change={setDescription2}
                    onDescription3Change={setDescription3}
                    profilDefinitionId={profilDefinitionId}
                    demirDefinitionId={demirDefinitionId}
                    vidaDefinitionId={vidaDefinitionId}
                    baskiDefinitionId={baskiDefinitionId}
                    profilMap={profilMap}
                    demirMap={demirMap}
                    vidaMap={vidaMap}
                    baskiMap={baskiMap}
                    onProfilPress={() => setProfilPickerVisible(true)}
                    onDemirPress={() => setDemirPickerVisible(true)}
                    onVidaPress={() => setVidaPickerVisible(true)}
                    onBaskiPress={() => setBaskiPickerVisible(true)}
                    onBaskiCreatePress={() => setBaskiCreateVisible(true)}
                    baskiAciklama={baskiAciklama}
                    onBaskiAciklamaChange={setBaskiAciklama}
                    profilError={profilFieldError}
                    colors={{
                      text: textColor,
                      textSecondary: mutedColor,
                      accent: brandColor,
                      inputBackground: inputBg,
                      border: softPinkBorder,
                      inputText: softInputText,
                      cardBackground: softPinkBg,
                      cardBorder: softPinkBorder,
                    }}
                    compact
                  />
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
                    {
                      backgroundColor: isDark ? "rgba(236,72,153,0.07)" : "rgba(219,39,119,0.06)",
                      borderColor: softPinkBorder,
                    },
                  ]}
                >
                  <Text style={[styles.summaryTitle, { color: textColor }]}>{t("quotation.calculationSummary")}</Text>

                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: mutedColor }]}>{t("quotation.subtotal")}</Text>
                    <View style={styles.summaryValueGroup}>
                      <Text style={[styles.summaryValue, { color: textColor }]}>{currentLine.lineTotal.toFixed(2)}</Text>
                      <Text style={[styles.summaryValueSuffix, { color: mutedColor }]}>{lineCurrencyDisplay}</Text>
                    </View>
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryLabelWithMeta}>
                      <Text style={[styles.summaryLabel, { color: mutedColor }]}>{t("quotation.vat")}</Text>
                      {!hideVatRate ? (
                        <Text style={[styles.summaryVatPercent, { color: brandColor }]}>%{formattedVatRatePercent}</Text>
                      ) : null}
                    </View>
                    <View style={styles.summaryValueGroup}>
                      <Text style={[styles.summaryValue, { color: textColor }]}>{currentLine.vatAmount.toFixed(2)}</Text>
                      <Text style={[styles.summaryValueSuffix, { color: mutedColor }]}>{lineCurrencyDisplay}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.summaryRow,
                      styles.summaryRowTotal,
                      { borderTopColor: borderColor },
                    ]}
                  >
                    <Text style={[styles.summaryLabel, { color: textColor, fontWeight: "700" }]}>
                      {t("quotation.grandTotal")}
                    </Text>
                    <View style={styles.summaryValueGroup}>
                      <Text style={[styles.summaryValue, { color: brandColor, fontWeight: "800" }]}>
                        {currentLine.lineGrandTotal.toFixed(2)}
                      </Text>
                      <Text style={[styles.summaryValueSuffix, { color: brandColor, opacity: 0.85 }]}>{lineCurrencyDisplay}</Text>
                    </View>
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
                    backgroundColor: secondaryActionBg,
                  },
                ]}
                onPress={handleCancel}
              >
                <Text style={[styles.cancelButtonText, { color: secondaryActionText }]}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.86}
                style={[
                  styles.saveButton,
                  !isDark && styles.saveButtonShadow,
                  { backgroundColor: primaryActionBg },
                  !hasBulkDrafts &&
                    !(selectedStock || (line?.productCode && lineToSave.productCode)) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!hasBulkDrafts && !(selectedStock || (line?.productCode && lineToSave.productCode))}
              >
                <Text style={[styles.saveButtonText, { color: primaryActionText }]}>
                  {hasBulkDrafts ? "Taslağa Kaydet" : "Kaydet"}
                </Text>
              </TouchableOpacity>
            </View>
            {hasBulkDrafts && (
              <View style={[styles.multiConfirmBar, { borderTopColor: borderColor, backgroundColor: mainBg }]}>
                <TouchableOpacity
                  style={[styles.multiConfirmButton, { backgroundColor: primaryActionBg }]}
                  onPress={handleBulkDraftConfirm}
                >
                  <Text style={[styles.saveButtonText, { color: primaryActionText }]}>
                    Seçilenleri Ekle ({bulkDraftLines.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
      <PickerModal
        visible={profilPickerVisible}
        options={profilOptions}
        selectedValue={profilDefinitionId ?? undefined}
        onSelect={(option) => setProfilDefinitionId(Number(option.id))}
        onClose={() => setProfilPickerVisible(false)}
        title="Profil seç"
        searchPlaceholder="Profil ara..."
        isLoading={isDefinitionOptionsLoading}
      />
      <PickerModal
        visible={demirPickerVisible}
        options={demirOptions}
        selectedValue={demirDefinitionId ?? undefined}
        onSelect={(option) => setDemirDefinitionId(Number(option.id))}
        onClose={() => setDemirPickerVisible(false)}
        title="Demir seç"
        searchPlaceholder="Demir ara..."
        isLoading={isDefinitionOptionsLoading}
      />
      <PickerModal
        visible={vidaPickerVisible}
        options={vidaOptions}
        selectedValue={vidaDefinitionId ?? undefined}
        onSelect={(option) => setVidaDefinitionId(Number(option.id))}
        onClose={() => setVidaPickerVisible(false)}
        title="Vida seç"
        searchPlaceholder="Vida ara..."
        isLoading={isDefinitionOptionsLoading}
      />
      <PickerModal
        visible={baskiPickerVisible}
        options={baskiOptions}
        selectedValue={baskiDefinitionId ?? undefined}
        onSelect={(option) => setBaskiDefinitionId(Number(option.id))}
        onClose={() => setBaskiPickerVisible(false)}
        title="Baskı seç"
        searchPlaceholder="Baskı ara..."
        isLoading={isDefinitionOptionsLoading}
      />
      <BaskiQuickCreateModal
        visible={baskiCreateVisible}
        onClose={() => setBaskiCreateVisible(false)}
        onCreated={(item) => setBaskiDefinitionId(item.id)}
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
    gap: 22,
  },
  formCard: {
    gap: 12,
    padding: 14,
    borderWidth: 1.3,
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
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginLeft: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "500",
    minHeight: 42,
  },
  compactInput: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 40,
  },
  inputReadOnly: {
    opacity: 0.6,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: "center",
  },
  quickCreateButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  quickCreateButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  pickerText: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 76,
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
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  sectionMiniTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  unitInfoRow: {
    borderWidth: 1.3,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 8,
  },
  unitBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unitBadgeText: {
    fontSize: 10,
    fontWeight: "700",
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.3,
    marginTop: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  summaryRowTotal: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    flexShrink: 1,
  },
  summaryLabelWithMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  summaryVatPercent: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  summaryValueGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  summaryValueSuffix: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.15,
    maxWidth: 96,
  },
  relatedSummaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
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
  multiConfirmBar: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  multiConfirmButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  bulkDraftContainer: {
    marginBottom: 14,
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
  },
  saveButtonShadow: {
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
    fontSize: 14,
    fontWeight: "800",
  },
});
