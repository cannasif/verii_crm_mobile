import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardEvent,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";
import { catalogApi } from "@/features/catalog/api/catalogApi";
import type {
  CatalogCategoryNodeDto,
  CatalogStockItemDto,
  ProductCatalogDto,
} from "@/features/catalog/types";
import type { StockGetDto } from "@/features/stocks/types";

const PAGE_SIZE = 20;

interface CatalogStockPickerModalProps {
  visible: boolean;
  selectedStock?: { code?: string; name?: string } | null;
  onClose: () => void;
  onApply: (stock: StockGetDto | undefined) => Promise<void> | void;
}

export function CatalogStockPickerModal({
  visible,
  selectedStock,
  onClose,
  onApply,
}: CatalogStockPickerModalProps): React.ReactElement {
  const { colors } = useUIStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const modalCardBackground = colors.card.startsWith("rgba") ? "#140B22" : colors.card;
  const nestedCardBackground = colors.card.startsWith("rgba")
    ? "rgba(255,255,255,0.06)"
    : colors.backgroundSecondary;
  const accentBorder = colors.accent + "70";
  const accentSoftBg = colors.accent + "12";
  const accentStrong = colors.accent + "B8";
  const [catalogs, setCatalogs] = useState<ProductCatalogDto[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<ProductCatalogDto | null>(null);
  const [navigationPath, setNavigationPath] = useState<CatalogCategoryNodeDto[]>([]);
  const [categories, setCategories] = useState<CatalogCategoryNodeDto[]>([]);
  const [selectedLeafCategory, setSelectedLeafCategory] = useState<CatalogCategoryNodeDto | null>(null);
  const [includeDescendants, setIncludeDescendants] = useState(false);
  const [stocks, setStocks] = useState<CatalogStockItemDto[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tempSelectedStocks, setTempSelectedStocks] = useState<CatalogStockItemDto[]>([]);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [stocksReloadNonce, setStocksReloadNonce] = useState(0);

  const currentParentCategoryId =
    navigationPath.length > 0 ? navigationPath[navigationPath.length - 1]?.catalogCategoryId ?? null : null;

  useEffect(() => {
    if (!visible) {
      setCatalogs([]);
      setSelectedCatalog(null);
      setNavigationPath([]);
      setCategories([]);
      setSelectedLeafCategory(null);
      setIncludeDescendants(false);
      setStocks([]);
      setStockSearch("");
      setCatalogSearch("");
      setPageNumber(1);
      setHasNextPage(false);
      setTempSelectedStocks([]);
      setGuideExpanded(false);
      setKeyboardInset(0);
      setStocksReloadNonce(0);
      return;
    }

    setTempSelectedStocks(
      selectedStock?.code
        ? [
            {
              id: 0,
              stockCategoryId: 0,
              stockId: 0,
              erpStockCode: selectedStock.code,
              stockName: selectedStock.name ?? selectedStock.code,
              isPrimaryCategory: true,
            },
          ]
        : []
    );
  }, [selectedStock, visible]);

  useEffect(() => {
    if (!visible) return;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (event: KeyboardEvent) => {
      setKeyboardInset(event.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardInset(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const loadCatalogs = async (): Promise<void> => {
      setLoadingCatalogs(true);
      try {
        const data = await catalogApi.getCatalogs();
        if (cancelled) return;
        setCatalogs(data);
        setSelectedCatalog((prev) => prev ?? null);
      } catch (error) {
        console.error("Catalog load error", error);
      } finally {
        if (!cancelled) setLoadingCatalogs(false);
      }
    };

    void loadCatalogs();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !selectedCatalog) return;
    let cancelled = false;

    const loadCategories = async (): Promise<void> => {
      setLoadingCategories(true);
      try {
        const data = await catalogApi.getCatalogCategories(selectedCatalog.id, currentParentCategoryId);
        if (cancelled) return;
        setCategories(data);
      } catch (error) {
        console.error("Catalog categories load error", error);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [currentParentCategoryId, selectedCatalog, visible]);

  useEffect(() => {
    if (!visible || !selectedCatalog || !selectedLeafCategory) {
      setStocks([]);
      setHasNextPage(false);
      return;
    }

    let cancelled = false;

    const loadStocks = async (): Promise<void> => {
      setLoadingStocks(true);
      try {
        const response = await catalogApi.getCatalogCategoryStocks(
          selectedCatalog.id,
          selectedLeafCategory.catalogCategoryId,
          {
            pageNumber,
            pageSize: PAGE_SIZE,
            search: stockSearch.trim() || undefined,
            includeDescendants,
          }
        );

        const nextItems = response.items ?? [];
        if (cancelled) return;

        setStocks((prev) => (pageNumber === 1 ? nextItems : [...prev, ...nextItems]));
        setHasNextPage(Boolean(response.hasNextPage));
      } catch (error) {
        console.error("Catalog stocks load error", error);
      } finally {
        if (!cancelled) setLoadingStocks(false);
      }
    };

    void loadStocks();

    return () => {
      cancelled = true;
    };
  }, [includeDescendants, pageNumber, selectedCatalog, selectedLeafCategory, stockSearch, visible, stocksReloadNonce]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setPageNumber(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [includeDescendants, stockSearch, selectedLeafCategory?.catalogCategoryId, visible, stocksReloadNonce]);

  const selectedLeafLabel = selectedLeafCategory?.name ?? t("stockPicker.catalogNoLeafSelected");
  const selectedLeafPathLabel =
    selectedLeafCategory?.fullPath ?? selectedLeafCategory?.name ?? t("stockPicker.catalogNoLeafSelected");
  const selectionModeLabel = selectedLeafCategory
    ? includeDescendants
      ? t("stockPicker.catalogListDescendantsMode")
      : t("stockPicker.catalogDirectCategoryMode")
    : null;
  const currentHierarchyPath = useMemo(() => {
    const parts = [
      selectedCatalog?.name,
      ...navigationPath.map((item) => item.name),
      selectedLeafCategory?.name,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" / ") : t("stockPicker.catalogNoCatalog");
  }, [navigationPath, selectedCatalog?.name, selectedLeafCategory?.name, t]);
  const filteredCatalogs = useMemo(() => {
    const q = catalogSearch.trim().toLocaleLowerCase("tr-TR");
    if (!q) return catalogs;
    return catalogs.filter((c) =>
      [c.name, c.code]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("tr-TR").includes(q))
    );
  }, [catalogSearch, catalogs]);

  const handleCatalogChange = useCallback((catalog: ProductCatalogDto) => {
    if (selectedCatalog?.id === catalog.id) {
      setSelectedCatalog(null);
      setNavigationPath([]);
      setSelectedLeafCategory(null);
      setIncludeDescendants(false);
      setTempSelectedStocks([]);
      setCategories([]);
      setStocks([]);
      setStockSearch("");
      setPageNumber(1);
      setHasNextPage(false);
      return;
    }
    setSelectedCatalog(catalog);
    setNavigationPath([]);
    setSelectedLeafCategory(null);
    setIncludeDescendants(false);
    setTempSelectedStocks([]);
    setCategories([]);
    setStocks([]);
    setStockSearch("");
    setPageNumber(1);
    setHasNextPage(false);
  }, [selectedCatalog?.id]);

  const handleCategoryPress = useCallback((category: CatalogCategoryNodeDto) => {
    if (category.hasChildren) {
      setNavigationPath((prev) => [...prev, category]);
      setSelectedLeafCategory(null);
      setIncludeDescendants(false);
      setTempSelectedStocks([]);
      setStocks([]);
      return;
    }

    if (selectedLeafCategory?.catalogCategoryId === category.catalogCategoryId) {
      setSelectedLeafCategory(null);
      setIncludeDescendants(false);
      setTempSelectedStocks([]);
      setStocks([]);
      setPageNumber(1);
      return;
    }

    setSelectedLeafCategory(category);
    setIncludeDescendants(false);
    setTempSelectedStocks([]);
    setStocks([]);
    setPageNumber(1);
  }, [selectedLeafCategory?.catalogCategoryId]);

  const handleCategoryList = useCallback((category: CatalogCategoryNodeDto) => {
    setSelectedLeafCategory(category);
    setIncludeDescendants(category.hasChildren);
    setTempSelectedStocks([]);
    setStocks([]);
    setPageNumber(1);
    setStocksReloadNonce((prev) => prev + 1);
  }, []);

  const handleBackLevel = useCallback(() => {
    setNavigationPath((prev) => prev.slice(0, -1));
    setSelectedLeafCategory(null);
    setIncludeDescendants(false);
    setTempSelectedStocks([]);
    setStocks([]);
    setPageNumber(1);
  }, []);

  const handleApply = useCallback(async () => {
    setSubmitting(true);
    try {
      if (tempSelectedStocks.length === 0) {
        await onApply(undefined);
        onClose();
        return;
      }

      for (const selected of tempSelectedStocks) {
        const stock: StockGetDto = {
          id: selected.stockId,
          erpStockCode: selected.erpStockCode,
          stockName: selected.stockName,
          unit: selected.unit ?? undefined,
          grupKodu: selected.grupKodu ?? undefined,
          grupAdi: selected.grupAdi ?? undefined,
          kod1: selected.kod1 ?? undefined,
          kod1Adi: selected.kod1Adi ?? undefined,
          kod2: selected.kod2 ?? undefined,
          kod2Adi: selected.kod2Adi ?? undefined,
          kod3: selected.kod3 ?? undefined,
          kod3Adi: selected.kod3Adi ?? undefined,
          branchCode: 0,
        };
        await onApply(stock);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [onApply, onClose, tempSelectedStocks]);

  const showEmptyStocks = !loadingStocks && selectedLeafCategory && stocks.length === 0;
  const isSameSelectedStock = useCallback(
    (stock: CatalogStockItemDto): boolean => {
      return tempSelectedStocks.some((selected) => {
        const byId =
          typeof selected.stockId === "number" &&
          typeof stock.stockId === "number" &&
          selected.stockId === stock.stockId;
        const byCode = (selected.erpStockCode || "").trim() !== "" && selected.erpStockCode === stock.erpStockCode;
        return byId || byCode;
      });
    },
    [tempSelectedStocks]
  );
  const handleStockPress = useCallback(
    (stock: CatalogStockItemDto): void => {
      if (isSameSelectedStock(stock)) {
        setTempSelectedStocks((prev) =>
          prev.filter((selected) => {
            const byId =
              typeof selected.stockId === "number" &&
              typeof stock.stockId === "number" &&
              selected.stockId === stock.stockId;
            const byCode =
              (selected.erpStockCode || "").trim() !== "" && selected.erpStockCode === stock.erpStockCode;
            return !(byId || byCode);
          })
        );
        return;
      }
      setTempSelectedStocks((prev) => [...prev, stock]);
    },
    [isSameSelectedStock]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
        <View
          style={[
            styles.container,
            { backgroundColor: modalCardBackground, maxHeight: keyboardInset > 0 ? "82%" : "90%" },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.headerRow}>
              <View style={[styles.headerIcon, { backgroundColor: colors.accent + "20" }]}>
                <Text style={[styles.headerIconText, { color: colors.accent }]}>▦</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.text }]}>{t("stockPicker.catalogTitle")}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t("stockPicker.catalogDescription")}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          <FlatListScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyScrollContent}>
            <View style={styles.stepRow}>
              {[1, 2, 3].map((step) => {
                const isActive =
                  (step === 1 && !selectedCatalog) ||
                  (step === 2 && !!selectedCatalog && !selectedLeafCategory) ||
                  (step === 3 && !!selectedLeafCategory);
                return (
                  <View
                    key={step}
                    style={[
                      styles.stepCard,
                      { borderColor: colors.border, backgroundColor: nestedCardBackground },
                      isActive && { borderColor: accentBorder, backgroundColor: accentSoftBg },
                    ]}
                  >
                    <View style={[styles.stepNumberBubble, { backgroundColor: isActive ? accentStrong : colors.border }]}>
                      <Text style={[styles.stepNumberBubbleText, { color: isActive ? "#fff" : colors.textSecondary }]}>
                        {step}
                      </Text>
                    </View>
                    <Text style={[styles.stepLabel, { color: isActive ? colors.accent : colors.textMuted }]} numberOfLines={1}>
                      {t(`stockPicker.catalogStep${step}Label`)}
                    </Text>
                    <Text
                      style={[styles.stepTitle, { color: isActive ? colors.text : colors.textSecondary }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {t(`stockPicker.catalogStep${step}Title`)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: nestedCardBackground }]}>
              <Text style={[styles.sectionCardTitle, { color: colors.text }]}>
                {t("stockPicker.catalogPickCatalogSectionTitle")}
              </Text>
              <Text style={[styles.sectionCardHint, { color: colors.textSecondary }]}>
                {t("stockPicker.catalogPickCatalogHint")}
              </Text>
              <View
                style={[
                  styles.catalogSearchWrap,
                  { borderColor: colors.border, backgroundColor: modalCardBackground },
                ]}
              >
                <Ionicons name="search-outline" size={15} color={colors.textMuted} />
                <TextInput
                  style={[styles.catalogSearchInput, { color: colors.text }]}
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                  placeholder={t("stockPicker.catalogSearchCatalogPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                />
                {catalogSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => setCatalogSearch("")} activeOpacity={0.8}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.catalogPills}>
                {loadingCatalogs ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : filteredCatalogs.length === 0 ? (
                  <Text style={[styles.catalogEmptyText, { color: colors.textMuted }]}>
                    {t("stockPicker.noSearchResults")}
                  </Text>
                ) : (
                  filteredCatalogs.map((catalog) => (
                    <TouchableOpacity
                      key={catalog.id}
                      style={[
                        styles.catalogPill,
                        { borderColor: colors.border, backgroundColor: modalCardBackground },
                        selectedCatalog?.id === catalog.id && { borderColor: accentBorder, backgroundColor: accentSoftBg },
                      ]}
                      onPress={() => handleCatalogChange(catalog)}
                    >
                      {selectedCatalog?.id === catalog.id ? (
                        <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={14} color={colors.textMuted} />
                      )}
                      <Text
                        style={[
                          styles.catalogPillName,
                          { color: selectedCatalog?.id === catalog.id ? colors.accent : colors.text },
                        ]}
                      >
                        {catalog.name}
                      </Text>
                      <Text style={[styles.catalogPillCode, { color: colors.textMuted }]}>{catalog.code}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            <View style={[styles.blueprintCard, { borderColor: colors.border, backgroundColor: nestedCardBackground }]}>
              <TouchableOpacity
                style={styles.blueprintHeader}
                onPress={() => setGuideExpanded((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={[styles.blueprintEyebrow, { color: colors.textMuted }]} numberOfLines={1}>
                  {t("stockPicker.catalogHierarchyTitle")}
                </Text>
              <View style={[styles.guideHeaderRight, { backgroundColor: modalCardBackground, borderColor: colors.border }]}>
                <Ionicons
                  name={guideExpanded ? "chevron-up" : "chevron-down"}
                  size={15}
                  color={colors.textSecondary}
                />
              </View>
              </TouchableOpacity>
              {guideExpanded ? (
                <>
                  <Text style={[styles.blueprintDescription, { color: colors.textSecondary }]}>
                    {t("stockPicker.catalogHierarchyDescription")}
                  </Text>
                  <View style={[styles.blueprintExampleBox, { borderColor: colors.border, backgroundColor: modalCardBackground }]}>
                    <Text style={[styles.blueprintExampleText, { color: colors.textSecondary }]}>
                      <Text style={[styles.blueprintExampleLabel, { color: colors.text }]}>
                        {t("stockPicker.catalogHierarchyExampleLabel")}:{" "}
                      </Text>
                      {t("stockPicker.catalogHierarchyExampleValue")}
                    </Text>
                  </View>
                  {(["root", "subcategory", "brand", "series", "products"] as const).map((stage, index) => (
                    <View
                      key={stage}
                      style={[styles.blueprintStageCard, { borderColor: colors.border, backgroundColor: modalCardBackground }]}
                    >
                      <View style={[styles.blueprintStageAccent, { backgroundColor: colors.accent + "66" }]} />
                      <View style={styles.blueprintStageHeader}>
                        <View style={[styles.blueprintStageIndex, { backgroundColor: colors.text }]}>
                          <Text style={styles.blueprintStageIndexText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.blueprintStageTitle, { color: colors.text }]}>
                          {t(`stockPicker.catalogHierarchyStages.${stage}.title`)}
                        </Text>
                      </View>
                      <Text style={[styles.blueprintStageDescription, { color: colors.textSecondary }]}>
                        {t(`stockPicker.catalogHierarchyStages.${stage}.description`)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>

            <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: nestedCardBackground }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("stockPicker.catalogCategoriesTitle")}</Text>
                {navigationPath.length > 0 ? (
                  <TouchableOpacity
                    onPress={handleBackLevel}
                    style={[styles.backButtonPill, { borderColor: colors.accent + "66", backgroundColor: colors.accent + "12" }]}
                  >
                    <Ionicons name="arrow-back" size={13} color={colors.accent} />
                    <Text style={[styles.backText, { color: colors.accent }]}>{t("stockPicker.catalogBack")}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.breadcrumbs}>
                <View style={[styles.breadcrumbBadge, { backgroundColor: modalCardBackground, borderColor: colors.border }]}>
                  <Ionicons name="albums-outline" size={11} color={colors.textSecondary} />
                  <Text style={[styles.breadcrumbBadgeText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {selectedCatalog?.name ?? t("stockPicker.catalogNoCatalog")}
                  </Text>
                </View>
                {navigationPath.map((item) => (
                  <View
                    key={item.catalogCategoryId}
                    style={[
                      styles.breadcrumbBadge,
                      { backgroundColor: modalCardBackground, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
                    <Text style={[styles.breadcrumbBadgeText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                ))}
              </View>
              {loadingCategories ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : categories.length === 0 ? (
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  {t("stockPicker.catalogEmptyCategories")}
                </Text>
              ) : (
                categories.map((category) => {
                  const isLeafSelected = selectedLeafCategory?.catalogCategoryId === category.catalogCategoryId;
                  return (
                    <View
                      key={category.catalogCategoryId}
                      style={[
                        styles.categoryCard,
                        { borderColor: colors.border, backgroundColor: modalCardBackground },
                        isLeafSelected && { borderColor: colors.accent + "99", backgroundColor: colors.accent + "0F" },
                      ]}
                    >
                      <TouchableOpacity onPress={() => handleCategoryPress(category)} activeOpacity={0.85}>
                        <View style={styles.categoryCardHeader}>
                          <View style={styles.categoryNameWrap}>
                            <View
                              style={[
                                styles.categoryIconWrap,
                                {
                                  backgroundColor: isLeafSelected
                                    ? colors.accent + "1A"
                                    : colors.backgroundSecondary,
                                  borderColor: isLeafSelected
                                    ? colors.accent + "66"
                                    : colors.border,
                                },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name={category.hasChildren ? "folder-outline" : "tag-outline"}
                                size={13}
                                color={isLeafSelected ? colors.accent : colors.textSecondary}
                              />
                            </View>
                            <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                              {category.name}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.categoryTypeBadge,
                              { color: category.hasChildren ? colors.textSecondary : colors.accent, backgroundColor: nestedCardBackground },
                            ]}
                          >
                            {category.hasChildren ? t("stockPicker.catalogSubCategory") : t("stockPicker.catalogLeafCategory")}
                          </Text>
                        </View>
                        <Text style={[styles.categoryCode, { color: colors.textMuted }]} numberOfLines={1}>
                          {category.code}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.categoryActionRow}>
                        {category.hasChildren ? (
                          <TouchableOpacity
                            style={[styles.categorySecondaryAction, { borderColor: colors.border, backgroundColor: nestedCardBackground }]}
                            onPress={() => handleCategoryPress(category)}
                          >
                            <Text style={[styles.categorySecondaryActionText, { color: colors.textSecondary }]}>
                              {t("stockPicker.catalogBrowseChildren")}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={[styles.categoryPrimaryAction, { backgroundColor: accentStrong }]}
                          onPress={() => handleCategoryList(category)}
                        >
                          <Text style={styles.categoryPrimaryActionText}>
                            {t("stockPicker.catalogListDescendants")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: nestedCardBackground }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("stockPicker.catalogStocksTitle")}</Text>
                <View style={[styles.selectedLeafPill, { borderColor: colors.accent + "66", backgroundColor: colors.accent + "12" }]}>
                  <Ionicons name="pricetag-outline" size={12} color={colors.accent} />
                  <Text style={[styles.selectedLeafPillText, { color: colors.accent }]} numberOfLines={1}>
                    {t("stockPicker.catalogSelectedLeaf")}: {selectedLeafLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.selectionMetaWrap}>
                <View
                  style={[
                    styles.selectionMetaBadge,
                    { backgroundColor: modalCardBackground, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="navigate-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.selectionMetaBadgeText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {t("stockPicker.catalogCurrentPathLabel")}: {currentHierarchyPath}
                  </Text>
                </View>
                {selectionModeLabel ? (
                  <View
                    style={[
                      styles.selectionMetaBadge,
                      { backgroundColor: modalCardBackground, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="git-branch-outline" size={12} color={colors.textSecondary} />
                    <Text style={[styles.selectionMetaBadgeText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectionModeLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.searchWrapper, { backgroundColor: modalCardBackground, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  value={stockSearch}
                  onChangeText={setStockSearch}
                  placeholder={t("stockPicker.catalogSearchPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  editable={!!selectedLeafCategory}
                />
              </View>
              {tempSelectedStocks.length > 0 ? (
                <View style={[styles.selectedSummaryCard, { borderColor: colors.border, backgroundColor: modalCardBackground }]}>
                  <View style={styles.selectedSummaryHeader}>
                    <Text style={[styles.selectedSummaryTitle, { color: colors.text }]}>
                      {t("stockPicker.catalogSelectedCount", { count: tempSelectedStocks.length })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempSelectedStocks([])}
                      style={[styles.selectedSummaryClearButton, { borderColor: colors.border, backgroundColor: nestedCardBackground }]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.selectedSummaryClearText, { color: colors.textSecondary }]}>{t("common.clear")}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.selectedSummaryList}>
                    {tempSelectedStocks.map((stock) => (
                      <TouchableOpacity
                        key={`${stock.stockId}-${stock.erpStockCode}`}
                        style={[styles.selectedSummaryPill, { borderColor: colors.accent + "55", backgroundColor: colors.accent + "12" }]}
                        onPress={() => handleStockPress(stock)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.selectedSummaryPillText, { color: colors.accent }]} numberOfLines={1}>
                          {stock.erpStockCode}
                        </Text>
                        <Ionicons name="close" size={12} color={colors.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {!selectedLeafCategory ? (
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  {t("stockPicker.catalogSelectLeafHint")}
                </Text>
              ) : loadingStocks && pageNumber === 1 ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : showEmptyStocks ? (
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  {t("stockPicker.catalogEmptyStocksHint")}
                </Text>
              ) : (
                <>
                  {stocks.map((stock) => {
                    const isSelected = isSameSelectedStock(stock);
                    return (
                      <TouchableOpacity
                        key={`${stock.id}-${stock.stockCategoryId}-${stock.erpStockCode}`}
                        style={[
                          styles.stockCard,
                          { borderColor: colors.border, backgroundColor: modalCardBackground },
                          isSelected && { borderColor: colors.accent + "99", backgroundColor: colors.accent + "10" },
                          isSelected && styles.stockCardSelected,
                        ]}
                        onPress={() => handleStockPress(stock)}
                        activeOpacity={0.82}
                      >
                        <View style={styles.stockCardHeader}>
                          <View style={styles.stockHeaderLeft}>
                            <View
                              style={[
                                styles.stockLeadingIcon,
                                {
                                  backgroundColor: isSelected ? colors.accent + "22" : colors.backgroundSecondary,
                                  borderColor: isSelected ? colors.accent + "66" : colors.border,
                                },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name={isSelected ? "check-decagram" : "package-variant-closed"}
                                size={13}
                                color={isSelected ? colors.accent : colors.textSecondary}
                              />
                            </View>
                            <Text style={[styles.stockCode, { color: colors.accent }]}>{stock.erpStockCode}</Text>
                          </View>
                          <Text
                            style={[
                              styles.stockSelectBadge,
                              {
                                color: isSelected ? "#fff" : colors.textSecondary,
                                backgroundColor: isSelected ? colors.accent : nestedCardBackground,
                              },
                            ]}
                          >
                            {isSelected ? t("stockPicker.catalogSelectedBadge") : t("stockPicker.catalogSelectStock")}
                          </Text>
                        </View>
                        <Text style={[styles.stockName, { color: colors.text }]} numberOfLines={3}>
                          {stock.stockName}
                        </Text>
                        <View style={styles.stockMetaGrid}>
                          <View
                            style={[
                              styles.stockMetaChip,
                              styles.stockMetaChipGroup,
                              { borderColor: colors.accent + "44", backgroundColor: colors.accent + "14" },
                            ]}
                          >
                            <Text style={[styles.stockMetaChipText, { color: colors.textSecondary }]}>
                              {t("stockPicker.group")}: {stock.grupKodu || "-"}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.stockMetaChip,
                              styles.stockMetaChipUnit,
                              { borderColor: colors.accent + "36", backgroundColor: colors.accent + "10" },
                            ]}
                          >
                            <Text style={[styles.stockMetaChipText, { color: colors.textSecondary }]}>
                              {t("stockPicker.unit")}: {stock.unit || "-"}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {hasNextPage ? (
                    <TouchableOpacity
                      style={[styles.loadMoreButton, { borderColor: colors.border, backgroundColor: modalCardBackground }]}
                      onPress={() => setPageNumber((prev) => prev + 1)}
                      disabled={loadingStocks}
                    >
                      {loadingStocks ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <Text style={[styles.loadMoreText, { color: colors.text }]}>{t("stockPicker.catalogLoadMore")}</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </View>
          </FlatListScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) + 10 }]}>
            <Text style={[styles.footerHint, { color: colors.textMuted }]}>
              {t("stockPicker.catalogFooterHint")}
            </Text>
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={[styles.footerSecondaryButton, { borderColor: colors.border }]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={[styles.footerSecondaryText, { color: colors.textSecondary }]}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footerPrimaryButton,
                  { backgroundColor: accentStrong },
                  tempSelectedStocks.length === 0 && styles.disabledButton,
                ]}
                onPress={() => void handleApply()}
                disabled={submitting || tempSelectedStocks.length === 0}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.footerPrimaryText}>{t("stockPicker.catalogApplySelection")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.62)" },
  keyboardAvoiding: { flex: 1, justifyContent: "flex-end" },
  container: {
    flex: 1,
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1 },
  handle: { alignSelf: "center", width: 42, height: 4, borderRadius: 999, marginBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerIconText: { fontSize: 18, fontWeight: "700" },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: "700" },
  subtitle: { fontSize: 12.2, marginTop: 2 },
  closeButton: { padding: 4 },
  closeButtonText: { fontSize: 20, fontWeight: "300" },
  bodyScroll: { flex: 1 },
  bodyScrollContent: { paddingBottom: 12 },
  stepRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  stepCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 1,
    minHeight: 56,
  },
  stepNumberBubble: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stepNumberBubbleText: {
    fontSize: 8,
    lineHeight: 9.5,
    fontWeight: "700",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  stepLabel: { fontSize: 8.1, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.12 },
  stepTitle: { marginTop: 1, fontSize: 9.9, fontWeight: "700", flexShrink: 1 },
  sectionCard: {
    borderWidth: 1.2,
    borderRadius: 15,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  sectionCardTitle: { fontSize: 12.1, fontWeight: "700", letterSpacing: 0.1 },
  sectionCardHint: { fontSize: 10.4, lineHeight: 14.5 },
  catalogPills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  catalogPill: {
    borderWidth: 1.2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  catalogPillName: { fontSize: 12.5, fontWeight: "700" },
  catalogPillCode: { fontSize: 10.5, marginTop: 1 },
  catalogSearchWrap: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catalogSearchInput: {
    flex: 1,
    minHeight: 40,
    fontSize: 12.5,
    paddingVertical: 0,
  },
  catalogEmptyText: {
    fontSize: 11.5,
    fontWeight: "500",
    paddingVertical: 4,
  },
  blueprintCard: { borderWidth: 1, borderRadius: 15, marginHorizontal: 16, marginTop: 8, padding: 11, gap: 7 },
  blueprintHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  blueprintEyebrow: { fontSize: 9.6, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.7, flex: 1 },
  guideHeaderRight: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
  },
  blueprintDescription: { fontSize: 10.8, lineHeight: 16 },
  blueprintExampleBox: { borderWidth: 1, borderStyle: "dashed", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  blueprintExampleText: { fontSize: 10.4, lineHeight: 15 },
  blueprintExampleLabel: { fontWeight: "700" },
  blueprintStagesWrap: { maxHeight: 160 },
  blueprintStages: { gap: 7 },
  blueprintStageCard: { borderWidth: 1, borderRadius: 12, padding: 9, overflow: "hidden" },
  blueprintStageAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  blueprintStageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  blueprintStageIndex: { width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  blueprintStageIndexText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  blueprintStageTitle: { flex: 1, fontSize: 11.7, fontWeight: "700" },
  blueprintStageDescription: { marginTop: 4, fontSize: 10.8, lineHeight: 15.5 },
  content: { flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  leftPane: { flex: 0.92, minHeight: 0 },
  rightPane: { flex: 1.2, minHeight: 0 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  sectionTitle: { fontSize: 13.2, fontWeight: "700" },
  sectionSubtle: { fontSize: 11.2, flexShrink: 1, marginLeft: 8 },
  backButtonPill: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  backText: { fontSize: 12, fontWeight: "700" },
  breadcrumbs: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 10 },
  breadcrumbBadge: {
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1.2,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  breadcrumbBadgeText: { fontSize: 11, fontWeight: "700", flexShrink: 1 },
  categoryList: { maxHeight: 130 },
  categoryListContent: { gap: 8, paddingBottom: 4 },
  categoryCard: { borderWidth: 1, borderRadius: 14, padding: 11 },
  categoryCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  categoryNameWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  categoryIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  categoryName: { flex: 1, fontSize: 13, fontWeight: "700" },
  categoryTypeBadge: {
    fontSize: 9.7,
    fontWeight: "700",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    overflow: "hidden",
  },
  categoryCode: { marginTop: 4, fontSize: 11 },
  categoryMetaRow: { marginTop: 8, gap: 6 },
  categoryMetaBadge: { alignSelf: "flex-start", fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden", borderWidth: 1 },
  categoryMetaPath: { fontSize: 11, lineHeight: 16 },
  categoryActionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  categorySecondaryAction: { flex: 1, minHeight: 36, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  categorySecondaryActionText: { fontSize: 11.1, fontWeight: "600" },
  categoryPrimaryAction: { flex: 1.15, minHeight: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  categoryPrimaryActionText: { color: "#fff", fontSize: 11.1, fontWeight: "600" },
  searchWrapper: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    marginBottom: 10,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { minHeight: 42, fontSize: 14, flex: 1, paddingVertical: 0 },
  selectionMetaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  selectionMetaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1.3,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectionMetaBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  selectedSummaryCard: { borderWidth: 1, borderRadius: 12, padding: 8, marginBottom: 8, gap: 8 },
  selectedSummaryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  selectedSummaryTitle: { fontSize: 11.5, fontWeight: "700", flex: 1 },
  selectedSummaryClearButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    minHeight: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSummaryClearText: { fontSize: 10.5, fontWeight: "600" },
  selectedSummaryList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  selectedSummaryPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
  },
  selectedSummaryPillText: { fontSize: 10.5, fontWeight: "700", maxWidth: 140 },
  selectedLeafPill: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 28,
    maxWidth: "62%",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  selectedLeafPillText: {
    fontSize: 10.6,
    fontWeight: "700",
    flexShrink: 1,
  },
  helperCard: { borderWidth: 1, borderRadius: 16, padding: 10, marginBottom: 6 },
  helperTitle: { fontSize: 13, fontWeight: "700" },
  helperText: { marginTop: 3, fontSize: 11.5, lineHeight: 16 },
  helperPathBox: { borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  helperPathText: { fontSize: 12, lineHeight: 18 },
  helperPathLabel: { fontWeight: "700" },
  selectedPanel: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 10 },
  selectedPanelHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  selectedPanelTitle: { fontSize: 14, fontWeight: "700" },
  selectedPanelHint: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  removeText: { fontSize: 12, fontWeight: "700" },
  selectedStockCard: { marginTop: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  selectedStockCode: { fontSize: 12, fontWeight: "800" },
  selectedStockName: { marginTop: 4, fontSize: 14, fontWeight: "600" },
  stockList: { flex: 1, minHeight: 0 },
  stockListContent: { gap: 8, paddingBottom: 6 },
  stockCard: { borderWidth: 1.3, borderRadius: 14, padding: 10 },
  stockCardSelected: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  stockCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 24 },
  stockHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  stockLeadingIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stockCode: { fontSize: 11, fontWeight: "800" },
  stockSelectBadge: {
    fontSize: 9.6,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  stockName: { marginTop: 5, fontSize: 11.8, fontWeight: "700", lineHeight: 16 },
  stockMetaGrid: { marginTop: 7, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  stockMetaChip: {
    borderWidth: 1.1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: "100%",
    minHeight: 18,
    justifyContent: "center",
  },
  stockMetaChipGroup: { paddingHorizontal: 7 },
  stockMetaChipUnit: { paddingHorizontal: 7 },
  stockMetaChipText: { fontSize: 8.3, fontWeight: "600" },
  loadMoreButton: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  loadMoreText: { fontSize: 13, fontWeight: "700" },
  emptyStateText: { fontSize: 13, lineHeight: 20, textAlign: "center", paddingVertical: 24 },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  footerHint: { fontSize: 12, lineHeight: 18 },
  footerActions: { flexDirection: "row", gap: 10 },
  footerSecondaryButton: { flex: 1, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", minHeight: 46 },
  footerSecondaryText: { fontSize: 13.2, fontWeight: "600" },
  footerPrimaryButton: { flex: 1.2, borderRadius: 14, alignItems: "center", justifyContent: "center", minHeight: 46 },
  footerPrimaryText: { color: "#fff", fontSize: 13.2, fontWeight: "600" },
  disabledButton: { opacity: 0.45 },
});
