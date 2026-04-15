import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
  const [catalogs, setCatalogs] = useState<ProductCatalogDto[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<ProductCatalogDto | null>(null);
  const [navigationPath, setNavigationPath] = useState<CatalogCategoryNodeDto[]>([]);
  const [categories, setCategories] = useState<CatalogCategoryNodeDto[]>([]);
  const [selectedLeafCategory, setSelectedLeafCategory] = useState<CatalogCategoryNodeDto | null>(null);
  const [stocks, setStocks] = useState<CatalogStockItemDto[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tempSelectedStock, setTempSelectedStock] = useState<CatalogStockItemDto | undefined>(undefined);

  const currentParentCategoryId =
    navigationPath.length > 0 ? navigationPath[navigationPath.length - 1]?.catalogCategoryId ?? null : null;

  useEffect(() => {
    if (!visible) {
      setCatalogs([]);
      setSelectedCatalog(null);
      setNavigationPath([]);
      setCategories([]);
      setSelectedLeafCategory(null);
      setStocks([]);
      setStockSearch("");
      setPageNumber(1);
      setHasNextPage(false);
      setTempSelectedStock(undefined);
      return;
    }

    setTempSelectedStock(
      selectedStock?.code
        ? {
            id: 0,
            stockCategoryId: 0,
            stockId: 0,
            erpStockCode: selectedStock.code,
            stockName: selectedStock.name ?? selectedStock.code,
            isPrimaryCategory: true,
          }
        : undefined
    );
  }, [selectedStock, visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const loadCatalogs = async (): Promise<void> => {
      setLoadingCatalogs(true);
      try {
        const data = await catalogApi.getCatalogs();
        if (cancelled) return;
        setCatalogs(data);
        setSelectedCatalog((prev) => prev ?? data[0] ?? null);
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
          { pageNumber, pageSize: PAGE_SIZE, search: stockSearch.trim() || undefined }
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
  }, [pageNumber, selectedCatalog, selectedLeafCategory, stockSearch, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setPageNumber(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [stockSearch, selectedLeafCategory?.catalogCategoryId, visible]);

  const selectedLeafLabel = selectedLeafCategory?.name ?? t("stockPicker.catalogNoLeafSelected");
  const selectedLeafPathLabel =
    selectedLeafCategory?.fullPath ?? selectedLeafCategory?.name ?? t("stockPicker.catalogNoLeafSelected");
  const currentHierarchyPath = useMemo(() => {
    const parts = [
      selectedCatalog?.name,
      ...navigationPath.map((item) => item.name),
      selectedLeafCategory?.name,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" / ") : t("stockPicker.catalogNoCatalog");
  }, [navigationPath, selectedCatalog?.name, selectedLeafCategory?.name, t]);

  const handleCatalogChange = useCallback((catalog: ProductCatalogDto) => {
    setSelectedCatalog(catalog);
    setNavigationPath([]);
    setSelectedLeafCategory(null);
    setCategories([]);
    setStocks([]);
    setStockSearch("");
    setPageNumber(1);
    setHasNextPage(false);
  }, []);

  const handleCategoryPress = useCallback((category: CatalogCategoryNodeDto) => {
    if (category.hasChildren) {
      setNavigationPath((prev) => [...prev, category]);
      setSelectedLeafCategory(null);
      setStocks([]);
      return;
    }

    setSelectedLeafCategory(category);
    setPageNumber(1);
  }, []);

  const handleBackLevel = useCallback(() => {
    setNavigationPath((prev) => prev.slice(0, -1));
    setSelectedLeafCategory(null);
    setStocks([]);
    setPageNumber(1);
  }, []);

  const handleApply = useCallback(async () => {
    setSubmitting(true);
    try {
      if (!tempSelectedStock) {
        await onApply(undefined);
        onClose();
        return;
      }

      const stock: StockGetDto = {
        id: tempSelectedStock.stockId,
        erpStockCode: tempSelectedStock.erpStockCode,
        stockName: tempSelectedStock.stockName,
        unit: tempSelectedStock.unit ?? undefined,
        grupKodu: tempSelectedStock.grupKodu ?? undefined,
        grupAdi: tempSelectedStock.grupAdi ?? undefined,
        kod1: tempSelectedStock.kod1 ?? undefined,
        kod1Adi: tempSelectedStock.kod1Adi ?? undefined,
        kod2: tempSelectedStock.kod2 ?? undefined,
        kod2Adi: tempSelectedStock.kod2Adi ?? undefined,
        kod3: tempSelectedStock.kod3 ?? undefined,
        kod3Adi: tempSelectedStock.kod3Adi ?? undefined,
        branchCode: 0,
      };

      await onApply(stock);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [onApply, onClose, tempSelectedStock]);

  const showEmptyStocks = !loadingStocks && selectedLeafCategory && stocks.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.container, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
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
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    isActive && { borderColor: colors.accent, backgroundColor: colors.accent + "15" },
                  ]}
                >
                  <Text style={[styles.stepLabel, { color: isActive ? colors.accent : colors.textMuted }]}>
                    {t(`stockPicker.catalogStep${step}Label`)}
                  </Text>
                  <Text style={[styles.stepTitle, { color: isActive ? colors.text : colors.textSecondary }]}>
                    {t(`stockPicker.catalogStep${step}Title`)}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.catalogPills}>
            {loadingCatalogs ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              catalogs.map((catalog) => (
                <TouchableOpacity
                  key={catalog.id}
                  style={[
                    styles.catalogPill,
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    selectedCatalog?.id === catalog.id && { borderColor: colors.accent, backgroundColor: colors.accent + "18" },
                  ]}
                  onPress={() => handleCatalogChange(catalog)}
                >
                  <Text style={[styles.catalogPillName, { color: selectedCatalog?.id === catalog.id ? colors.accent : colors.text }]}>
                    {catalog.name}
                  </Text>
                  <Text style={[styles.catalogPillCode, { color: colors.textMuted }]}>{catalog.code}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={[styles.blueprintCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.blueprintEyebrow, { color: colors.textMuted }]}>
              {t("stockPicker.catalogHierarchyTitle")}
            </Text>
            <Text style={[styles.blueprintDescription, { color: colors.textSecondary }]}>
              {t("stockPicker.catalogHierarchyDescription")}
            </Text>
            <View style={[styles.blueprintExampleBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.blueprintExampleText, { color: colors.textSecondary }]}>
                <Text style={[styles.blueprintExampleLabel, { color: colors.text }]}>{t("stockPicker.catalogHierarchyExampleLabel")}: </Text>
                {t("stockPicker.catalogHierarchyExampleValue")}
              </Text>
            </View>
            <View style={styles.blueprintStages}>
              {(["root", "subcategory", "brand", "series", "products"] as const).map((stage, index) => (
                <View
                  key={stage}
                  style={[styles.blueprintStageCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
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
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.leftPane}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("stockPicker.catalogCategoriesTitle")}</Text>
                {navigationPath.length > 0 ? (
                  <TouchableOpacity onPress={handleBackLevel}>
                    <Text style={[styles.backText, { color: colors.accent }]}>{t("stockPicker.catalogBack")}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.breadcrumbs}>
                <Text style={[styles.breadcrumbBadge, { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary }]}>
                  {selectedCatalog?.name ?? t("stockPicker.catalogNoCatalog")}
                </Text>
                {navigationPath.map((item) => (
                  <Text
                    key={item.catalogCategoryId}
                    style={[styles.breadcrumbBadge, { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                ))}
              </View>

              <FlatListScrollView style={styles.categoryList} contentContainerStyle={styles.categoryListContent}>
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
                      <TouchableOpacity
                        key={category.catalogCategoryId}
                        style={[
                          styles.categoryCard,
                          { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                          isLeafSelected && { borderColor: colors.accent, backgroundColor: colors.accent + "14" },
                        ]}
                        onPress={() => handleCategoryPress(category)}
                      >
                        <View style={styles.categoryCardHeader}>
                          <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                            {category.name}
                          </Text>
                          <Text
                            style={[
                              styles.categoryTypeBadge,
                              { color: category.hasChildren ? colors.textSecondary : colors.accent, backgroundColor: colors.card },
                            ]}
                          >
                            {category.hasChildren ? t("stockPicker.catalogSubCategory") : t("stockPicker.catalogLeafCategory")}
                          </Text>
                        </View>
                        <Text style={[styles.categoryCode, { color: colors.textMuted }]} numberOfLines={1}>
                          {category.code}
                        </Text>
                        <View style={styles.categoryMetaRow}>
                          <Text
                            style={[
                              styles.categoryMetaBadge,
                              { color: colors.textSecondary, backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                          >
                            {t("stockPicker.catalogLevelBadge", { level: category.level })}
                          </Text>
                          {category.fullPath ? (
                            <Text style={[styles.categoryMetaPath, { color: colors.textMuted }]} numberOfLines={1}>
                              {category.fullPath}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </FlatListScrollView>
            </View>

            <View style={styles.rightPane}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("stockPicker.catalogStocksTitle")}</Text>
                <Text style={[styles.sectionSubtle, { color: colors.textMuted }]} numberOfLines={1}>
                  {t("stockPicker.catalogSelectedLeaf")}: {selectedLeafLabel}
                </Text>
              </View>

              <View style={styles.selectionMetaWrap}>
                <Text
                  style={[
                    styles.selectionMetaBadge,
                    { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                  ]}
                  numberOfLines={1}
                >
                  {t("stockPicker.catalogCurrentPathLabel")}: {currentHierarchyPath}
                </Text>
                {selectedLeafCategory ? (
                  <Text
                    style={[
                      styles.selectionMetaBadge,
                      { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    ]}
                  >
                    {t("stockPicker.catalogLevelBadge", { level: selectedLeafCategory.level })}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.searchWrapper, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  value={stockSearch}
                  onChangeText={setStockSearch}
                  placeholder={t("stockPicker.catalogSearchPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  editable={!!selectedLeafCategory}
                />
              </View>

              <View style={[styles.helperCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.helperTitle, { color: colors.text }]}>
                  {!selectedLeafCategory
                    ? t("stockPicker.catalogSelectLeafTitle")
                    : tempSelectedStock
                      ? t("stockPicker.catalogSelectionReadyTitle")
                      : stocks.length > 0
                        ? t("stockPicker.catalogStocksFoundTitle", { count: stocks.length })
                        : t("stockPicker.catalogEmptyStocksTitle")}
                </Text>
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  {!selectedLeafCategory
                    ? t("stockPicker.catalogSelectLeafHint")
                    : tempSelectedStock
                      ? t("stockPicker.catalogSelectionReadyHint")
                      : stocks.length > 0
                        ? t("stockPicker.catalogStocksHint")
                        : t("stockPicker.catalogEmptyStocksHint")}
                </Text>
                {selectedLeafCategory ? (
                  <View style={[styles.helperPathBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <Text style={[styles.helperPathText, { color: colors.textSecondary }]}>
                      <Text style={[styles.helperPathLabel, { color: colors.text }]}>{t("stockPicker.catalogSelectedPathLabel")}: </Text>
                      {selectedLeafPathLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              {tempSelectedStock ? (
                <View style={[styles.selectedPanel, { borderColor: colors.accent + "40", backgroundColor: colors.accent + "10" }]}>
                  <View style={styles.selectedPanelHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedPanelTitle, { color: colors.text }]}>
                        {t("stockPicker.catalogSelectedPanelTitle")}
                      </Text>
                      <Text style={[styles.selectedPanelHint, { color: colors.textSecondary }]}>
                        {t("stockPicker.catalogSelectedPanelHint")}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setTempSelectedStock(undefined)}>
                      <Text style={[styles.removeText, { color: colors.accent }]}>{t("stockPicker.catalogRemoveSelection")}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.selectedStockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.selectedStockCode, { color: colors.accent }]}>{tempSelectedStock.erpStockCode}</Text>
                    <Text style={[styles.selectedStockName, { color: colors.text }]} numberOfLines={1}>
                      {tempSelectedStock.stockName}
                    </Text>
                  </View>
                </View>
              ) : null}

              <FlatListScrollView style={styles.stockList} contentContainerStyle={styles.stockListContent}>
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
                      const isSelected = tempSelectedStock?.erpStockCode === stock.erpStockCode;
                      return (
                        <TouchableOpacity
                          key={stock.stockCategoryId}
                          style={[
                            styles.stockCard,
                            { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                            isSelected && { borderColor: colors.accent, backgroundColor: colors.accent + "12" },
                          ]}
                          onPress={() => setTempSelectedStock(stock)}
                        >
                          <View style={styles.stockCardHeader}>
                            <Text style={[styles.stockCode, { color: colors.accent }]}>{stock.erpStockCode}</Text>
                            <Text style={[styles.stockSelectBadge, { color: isSelected ? "#fff" : colors.textSecondary, backgroundColor: isSelected ? colors.accent : colors.card }]}>
                              {isSelected ? t("stockPicker.catalogSelectedBadge") : t("stockPicker.catalogSelectStock")}
                            </Text>
                          </View>
                          <Text style={[styles.stockName, { color: colors.text }]} numberOfLines={2}>
                            {stock.stockName}
                          </Text>
                          <View style={styles.stockMetaGrid}>
                            <Text style={[styles.stockMeta, { color: colors.textMuted }]}>{t("stockPicker.group")}: {stock.grupKodu || "-"}</Text>
                            <Text style={[styles.stockMeta, { color: colors.textMuted }]}>{t("stockPicker.unit")}: {stock.unit || "-"}</Text>
                            <Text style={[styles.stockMeta, { color: colors.textMuted }]}>{t("stockPicker.code1")}: {stock.kod1 || "-"}</Text>
                            <Text style={[styles.stockMeta, { color: colors.textMuted }]}>{t("stockPicker.code2")}: {stock.kod2 || "-"}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {hasNextPage ? (
                      <TouchableOpacity
                        style={[styles.loadMoreButton, { borderColor: colors.border, backgroundColor: colors.card }]}
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
              </FlatListScrollView>
            </View>
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.footerHint, { color: colors.textMuted }]}>
              {t("stockPicker.catalogFooterHint")}
            </Text>
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={[styles.footerSecondaryButton, { borderColor: colors.border }]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={[styles.footerSecondaryText, { color: colors.text }]}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerPrimaryButton, { backgroundColor: colors.accent }, !tempSelectedStock && styles.disabledButton]}
                onPress={() => void handleApply()}
                disabled={submitting || !tempSelectedStock}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  container: {
    flex: 1,
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1 },
  handle: { alignSelf: "center", width: 42, height: 4, borderRadius: 999, marginBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerIconText: { fontSize: 18, fontWeight: "700" },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  closeButton: { padding: 4 },
  closeButtonText: { fontSize: 20, fontWeight: "300" },
  stepRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  stepCard: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10 },
  stepLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  stepTitle: { marginTop: 2, fontSize: 13, fontWeight: "700" },
  catalogPills: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, flexWrap: "wrap" },
  catalogPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  catalogPillName: { fontSize: 13, fontWeight: "700" },
  catalogPillCode: { fontSize: 11, marginTop: 2 },
  blueprintCard: { borderWidth: 1, borderRadius: 18, marginHorizontal: 16, marginTop: 12, padding: 14, gap: 10 },
  blueprintEyebrow: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  blueprintDescription: { fontSize: 13, lineHeight: 18 },
  blueprintExampleBox: { borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  blueprintExampleText: { fontSize: 12, lineHeight: 18 },
  blueprintExampleLabel: { fontWeight: "700" },
  blueprintStages: { gap: 8 },
  blueprintStageCard: { borderWidth: 1, borderRadius: 14, padding: 10 },
  blueprintStageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  blueprintStageIndex: { width: 24, height: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  blueprintStageIndexText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  blueprintStageTitle: { flex: 1, fontSize: 13, fontWeight: "700" },
  blueprintStageDescription: { marginTop: 6, fontSize: 12, lineHeight: 17 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  leftPane: { flex: 0.92, minHeight: 220 },
  rightPane: { flex: 1.2, minHeight: 260 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
  sectionSubtle: { fontSize: 12, flexShrink: 1, marginLeft: 8 },
  backText: { fontSize: 12, fontWeight: "700" },
  breadcrumbs: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  breadcrumbBadge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  categoryList: { maxHeight: 220 },
  categoryListContent: { gap: 8, paddingBottom: 4 },
  categoryCard: { borderWidth: 1, borderRadius: 18, padding: 12 },
  categoryCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  categoryName: { flex: 1, fontSize: 14, fontWeight: "700" },
  categoryTypeBadge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  categoryCode: { marginTop: 5, fontSize: 12 },
  categoryMetaRow: { marginTop: 8, gap: 6 },
  categoryMetaBadge: { alignSelf: "flex-start", fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden", borderWidth: 1 },
  categoryMetaPath: { fontSize: 11, lineHeight: 16 },
  searchWrapper: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { minHeight: 42, fontSize: 14 },
  selectionMetaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  selectionMetaBadge: { fontSize: 11, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden", borderWidth: 1, maxWidth: "100%" },
  helperCard: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 10 },
  helperTitle: { fontSize: 14, fontWeight: "700" },
  helperText: { marginTop: 4, fontSize: 12, lineHeight: 18 },
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
  stockList: { flex: 1 },
  stockListContent: { gap: 8, paddingBottom: 12 },
  stockCard: { borderWidth: 1, borderRadius: 18, padding: 12 },
  stockCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  stockCode: { fontSize: 12, fontWeight: "800" },
  stockSelectBadge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  stockName: { marginTop: 8, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  stockMetaGrid: { marginTop: 10, gap: 4 },
  stockMeta: { fontSize: 12 },
  loadMoreButton: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  loadMoreText: { fontSize: 13, fontWeight: "700" },
  emptyStateText: { fontSize: 13, lineHeight: 20, textAlign: "center", paddingVertical: 24 },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  footerHint: { fontSize: 12, lineHeight: 18 },
  footerActions: { flexDirection: "row", gap: 10 },
  footerSecondaryButton: { flex: 1, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", minHeight: 46 },
  footerSecondaryText: { fontSize: 14, fontWeight: "700" },
  footerPrimaryButton: { flex: 1.2, borderRadius: 14, alignItems: "center", justifyContent: "center", minHeight: 46 },
  footerPrimaryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  disabledButton: { opacity: 0.45 },
});
