import React, { useCallback, useState, useMemo, useEffect, memo, useImperativeHandle, useRef, forwardRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import { CatalogStockPickerModal } from "@/components/shared/CatalogStockPickerModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "../../../components/ui/text";
import type { ThemeColors } from "../../../constants/theme";
import { useUIStore } from "../../../store/ui";
import { VoiceSearchButton } from "./VoiceSearchButton";
import { useStocks } from "../../stocks/hooks";
import type { StockGetDto, StockRelationDto } from "../../stocks/types";

export interface ProductPickerRef {
  close: () => void;
}

export interface RelatedStocksSelectionProps {
  stock: StockGetDto & { parentRelations: StockRelationDto[] };
  onCancel: () => void;
  onApply: (selectedIds: number[]) => void;
}

interface ProductPickerProps {
  value?: string;
  productName?: string;
  onChange: (stock: StockGetDto | undefined) => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  parentVisible?: boolean;
  relatedStocksSelection?: RelatedStocksSelectionProps | null;
}

const SEARCH_DEBOUNCE_MS = 700;

function formatStockBalance(item: StockGetDto): string | null {
  if (item.balanceText?.trim()) return item.balanceText.trim();
  if (typeof item.balance === "number" && Number.isFinite(item.balance)) {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(item.balance);
  }
  return null;
}

function getStockMetaRows(item: StockGetDto, t: (key: string) => string): Array<{ label: string; value: string }> {
  return [
    item.unit ? { label: t("stockPicker.unit"), value: item.unit } : null,
    item.grupKodu || item.grupAdi
      ? { label: t("stockPicker.group"), value: [item.grupKodu, item.grupAdi].filter(Boolean).join(" · ") }
      : null,
    item.kod1 || item.kod1Adi
      ? { label: t("stockPicker.code1"), value: [item.kod1, item.kod1Adi].filter(Boolean).join(" · ") }
      : null,
    item.kod2 || item.kod2Adi
      ? { label: t("stockPicker.code2"), value: [item.kod2, item.kod2Adi].filter(Boolean).join(" · ") }
      : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
}

function StockListItem({
  item,
  isSelected,
  colors,
  onSelect,
  onShowRelationDetail,
}: {
  item: StockGetDto;
  isSelected: boolean;
  colors: ThemeColors;
  onSelect: () => void;
  onShowRelationDetail: (stock: StockGetDto, relations: StockRelationDto[]) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const metaRows = useMemo(() => getStockMetaRows(item, t), [item, t]);
  const balance = formatStockBalance(item);
  const relationsList = item.parentRelations ?? [];

  const relationCount = relationsList.length;
  const showBadge = relationCount > 0;

  return (
    <View
      style={[
        styles.stockItem,
        { borderBottomColor: colors.border },
        isSelected && { backgroundColor: colors.accent + "15" },
      ]}
    >
      <TouchableOpacity
        style={styles.stockItemTouchable}
        onPress={onSelect}
        activeOpacity={0.7}
      >
        <View style={styles.stockInfo}>
          <Text style={[styles.stockName, { color: colors.text }]} numberOfLines={1}>
            {item.stockName}
          </Text>
          <Text style={[styles.stockCode, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.erpStockCode}
          </Text>
          {metaRows.map((row) => (
            <Text key={row.label} style={[styles.stockMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {row.label}: {row.value}
            </Text>
          ))}
          {balance ? (
            <Text style={[styles.stockMeta, { color: colors.accent }]} numberOfLines={1}>
              {t("stockPicker.balance")}: {balance}
            </Text>
          ) : null}
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: colors.accent }]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
      {showBadge && (
        <TouchableOpacity
          style={[styles.relatedStockBadge, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "50" }]}
          onPress={() => onShowRelationDetail(item, relationsList)}
          activeOpacity={0.7}
        >
          <Text style={[styles.relatedStockBadgeText, { color: colors.accent }]}>
            {relationCount} {t("order.relatedStocks")} ›
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const MemoizedStockListItem = memo(StockListItem);

function ProductPickerInner(
  {
    value,
    productName,
    onChange,
    disabled = false,
    label,
    required = false,
    parentVisible = true,
    relatedStocksSelection = null,
  }: ProductPickerProps,
  ref: React.Ref<ProductPickerRef>
): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useUIStore();
  const insets = useSafeAreaInsets();

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [relationDetailStock, setRelationDetailStock] = useState<StockGetDto | null>(null);
  const [relationDetailVisible, setRelationDetailVisible] = useState(false);
  const [relationDetailData, setRelationDetailData] = useState<StockRelationDto[]>([]);
  const [relatedSelectedIds, setRelatedSelectedIds] = useState<Set<number>>(new Set());
  const [tempCodeFilter, setTempCodeFilter] = useState("");
  const [tempNameFilter, setTempNameFilter] = useState("");
  const [tempGroupCodeFilter, setTempGroupCodeFilter] = useState("");
  const [tempGroupNameFilter, setTempGroupNameFilter] = useState("");
  const [appliedCodeFilter, setAppliedCodeFilter] = useState("");
  const [appliedNameFilter, setAppliedNameFilter] = useState("");
  const [appliedGroupCodeFilter, setAppliedGroupCodeFilter] = useState("");
  const [appliedGroupNameFilter, setAppliedGroupNameFilter] = useState("");
  const [tempFilterLogic, setTempFilterLogic] = useState<"and" | "or">("and");
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<"and" | "or">("and");

  const relatedMandatory = useMemo(
    () => (relatedStocksSelection?.stock.parentRelations ?? []).filter((r) => r.isMandatory),
    [relatedStocksSelection]
  );
  const relatedOptional = useMemo(
    () => (relatedStocksSelection?.stock.parentRelations ?? []).filter((r) => !r.isMandatory),
    [relatedStocksSelection]
  );

  useEffect(() => {
    if (relatedStocksSelection) {
      setRelatedSelectedIds(new Set(relatedMandatory.map((r) => r.relatedStockId)));
    }
  }, [relatedStocksSelection, relatedMandatory]);

  const toggleRelatedOptional = useCallback((relatedStockId: number) => {
    setRelatedSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(relatedStockId)) next.delete(relatedStockId);
      else next.add(relatedStockId);
      return next;
    });
  }, []);

  const handleRelatedApply = useCallback(() => {
    if (!relatedStocksSelection) return;
    const orderedIds: number[] = [];
    relatedMandatory.forEach((r) => orderedIds.push(r.relatedStockId));
    relatedOptional.forEach((r) => {
      if (relatedSelectedIds.has(r.relatedStockId)) orderedIds.push(r.relatedStockId);
    });
    relatedStocksSelection.onApply(orderedIds);
  }, [relatedStocksSelection, relatedMandatory, relatedOptional, relatedSelectedIds]);

  const handleRelatedCancel = useCallback(() => {
    relatedStocksSelection?.onCancel();
  }, [relatedStocksSelection]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    if (!parentVisible) {
      setIsOpen(false);
      setSearchText("");
      setDebouncedSearchText("");
      setIsFilterModalVisible(false);
      setTempFilterLogic("and");
      setAppliedFilterLogic("and");
    }
  }, [parentVisible]);

  const apiFilters = useMemo(() => {
    const filters: Array<{ column: string; operator: string; value: string }> = [];
    if (appliedCodeFilter.trim()) {
      filters.push({ column: "ErpStockCode", operator: "contains", value: appliedCodeFilter.trim() });
    }
    if (appliedNameFilter.trim()) {
      filters.push({ column: "StockName", operator: "contains", value: appliedNameFilter.trim() });
    }
    if (appliedGroupCodeFilter.trim()) {
      filters.push({ column: "GrupKodu", operator: "contains", value: appliedGroupCodeFilter.trim() });
    }
    if (appliedGroupNameFilter.trim()) {
      filters.push({ column: "GrupAdi", operator: "contains", value: appliedGroupNameFilter.trim() });
    }
    return filters;
  }, [appliedCodeFilter, appliedNameFilter, appliedGroupCodeFilter, appliedGroupNameFilter]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useStocks({
    filters: apiFilters,
    filterLogic: appliedFilterLogic,
    search: debouncedSearchText || undefined,
    enabled: isOpen && parentVisible,
  });

  const stocks = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      setSearchText("");
    }
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchText("");
    setDebouncedSearchText("");
    setIsFilterModalVisible(false);
  }, []);

  const handleOpenCatalog = useCallback(() => {
    setCatalogModalVisible(true);
  }, []);

  const handleCloseCatalog = useCallback(() => {
    setCatalogModalVisible(false);
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedCodeFilter(tempCodeFilter);
    setAppliedNameFilter(tempNameFilter);
    setAppliedGroupCodeFilter(tempGroupCodeFilter);
    setAppliedGroupNameFilter(tempGroupNameFilter);
    setAppliedFilterLogic(tempFilterLogic);
    setIsFilterModalVisible(false);
  }, [tempCodeFilter, tempNameFilter, tempGroupCodeFilter, tempGroupNameFilter, tempFilterLogic]);

  const handleClearFilters = useCallback(() => {
    setTempCodeFilter("");
    setTempNameFilter("");
    setTempGroupCodeFilter("");
    setTempGroupNameFilter("");
    setAppliedCodeFilter("");
    setAppliedNameFilter("");
    setAppliedGroupCodeFilter("");
    setAppliedGroupNameFilter("");
    setTempFilterLogic("and");
    setAppliedFilterLogic("and");
  }, []);

  useImperativeHandle(ref, () => ({ close: handleClose }), [handleClose]);

  const handleSelect = useCallback(
    async (stock: StockGetDto) => {
      const result = await Promise.resolve(onChange(stock));
      if (result !== false) {
        handleClose();
      }
    },
    [onChange, handleClose]
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleShowRelationDetail = useCallback((stock: StockGetDto, relations: StockRelationDto[]) => {
    setRelationDetailStock(stock);
    setRelationDetailData(relations);
    setRelationDetailVisible(true);
  }, []);

  const handleCloseRelationDetail = useCallback(() => {
    setRelationDetailVisible(false);
    setRelationDetailStock(null);
    setRelationDetailData([]);
  }, []);

  const renderStockItem = useCallback(
    ({ item }: { item: StockGetDto }) => (
      <MemoizedStockListItem
        item={item}
        isSelected={value === item.erpStockCode}
        colors={colors}
        onSelect={() => handleSelect(item)}
        onShowRelationDetail={handleShowRelationDetail}
      />
    ),
    [value, colors, handleSelect, handleShowRelationDetail]
  );

  return (
    <>
      <View style={styles.container}>
        {label && (
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            {required && <Text style={[styles.required, { color: colors.error }]}>*</Text>}
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.pickerButton,
            {
              backgroundColor: productName ? colors.backgroundSecondary : colors.backgroundSecondary,
              borderColor: productName ? colors.border : colors.accent + "60",
              borderWidth: productName ? 1 : 2,
              borderStyle: productName ? "solid" : "dashed",
            },
            disabled && styles.pickerButtonDisabled,
          ]}
          onPress={handleOpen}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View style={styles.pickerButtonContent}>
            <Text
              style={[
                styles.pickerText,
                { color: productName ? colors.text : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {productName || t("stockPicker.tapToSelectProduct")}
            </Text>
            {productName ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              >
                <Text style={[styles.clearButtonText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.chevronDown, { borderTopColor: colors.accent }]} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={relatedStocksSelection ? handleRelatedCancel : relationDetailVisible ? handleCloseRelationDetail : handleClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={relatedStocksSelection ? handleRelatedCancel : relationDetailVisible ? handleCloseRelationDetail : handleClose}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {relatedStocksSelection ? (
              <View style={styles.relatedSelectWrapper}>
                <View style={[styles.modalHeader, styles.relationDetailHeaderRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }, styles.relationDetailTitle]} numberOfLines={1}>
                    {t("order.relatedStocksSelectTitle")}
                  </Text>
                </View>
                <Text style={[styles.relatedSelectDesc, { color: colors.textSecondary }]}>
                  {t("order.relatedStocksSelectDesc")}
                </Text>
                <FlatListScrollView
                  style={styles.relatedSelectScroll}
                  contentContainerStyle={styles.relatedSelectScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {relatedMandatory.length > 0 && (
                    <View style={styles.relatedSelectBlock}>
                      <Text style={[styles.relatedSelectBlockTitle, { color: colors.textSecondary }]}>{t("order.mandatory")}</Text>
                      {relatedMandatory.map((r) => (
                        <View key={r.id} style={[styles.relatedSelectRow, { borderBottomColor: colors.border }]}>
                          <View style={[styles.relatedSelectCheckbox, { borderColor: colors.border, backgroundColor: colors.accent + "30" }]}>
                            <Text style={[styles.relatedSelectCheckmark, { color: colors.accent }]}>✓</Text>
                          </View>
                          <View style={styles.relatedSelectRowContent}>
                            <Text style={[styles.relatedSelectRowName, { color: colors.text }]} numberOfLines={1}>
                              {r.relatedStockName || r.relatedStockCode || `#${r.relatedStockId}`}
                            </Text>
                            <Text style={[styles.relatedSelectRowMeta, { color: colors.textSecondary }]}>
                              {t("order.quantity")}: {r.quantity}
                              {r.description ? ` · ${r.description}` : ""}
                            </Text>
                          </View>
                          <View style={[styles.relatedSelectBadge, { backgroundColor: "#10B98120" }]}>
                            <Text style={[styles.relatedSelectBadgeText, { color: "#10B981" }]}>{t("order.mandatory")}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {relatedOptional.length > 0 && (
                    <View style={styles.relatedSelectBlock}>
                      <Text style={[styles.relatedSelectBlockTitle, { color: colors.textSecondary }]}>{t("order.optional")}</Text>
                      {relatedOptional.map((r) => {
                        const isChecked = relatedSelectedIds.has(r.relatedStockId);
                        return (
                          <TouchableOpacity
                            key={r.id}
                            style={[styles.relatedSelectRow, { borderBottomColor: colors.border }]}
                            onPress={() => toggleRelatedOptional(r.relatedStockId)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.relatedSelectCheckbox, { borderColor: colors.border, backgroundColor: isChecked ? colors.accent + "30" : "transparent" }]}>
                              {isChecked && <Text style={[styles.relatedSelectCheckmark, { color: colors.accent }]}>✓</Text>}
                            </View>
                            <View style={styles.relatedSelectRowContent}>
                              <Text style={[styles.relatedSelectRowName, { color: colors.text }]} numberOfLines={1}>
                                {r.relatedStockName || r.relatedStockCode || `#${r.relatedStockId}`}
                              </Text>
                              <Text style={[styles.relatedSelectRowMeta, { color: colors.textSecondary }]}>
                                {t("order.quantity")}: {r.quantity}
                                {r.description ? ` · ${r.description}` : ""}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </FlatListScrollView>
                <View style={[styles.relatedSelectFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={[styles.relatedSelectCancelBtn, { borderColor: colors.border }]} onPress={handleRelatedCancel}>
                    <Text style={[styles.relatedSelectCancelText, { color: colors.text }]}>{t("common.cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.relatedSelectApplyBtn, { backgroundColor: colors.accent }]} onPress={handleRelatedApply}>
                    <Text style={styles.relatedSelectApplyText}>{t("order.apply")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : relationDetailVisible ? (
              <View style={styles.relationDetailWrapper}>
                <View
                  style={[
                    styles.modalHeader,
                    styles.relationDetailHeaderRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <TouchableOpacity onPress={handleCloseRelationDetail} style={styles.backButton}>
                    <Text style={[styles.backButtonText, { color: colors.accent }]}>←</Text>
                  </TouchableOpacity>
                  <Text
                    style={[styles.modalTitle, { color: colors.text }, styles.relationDetailTitle]}
                    numberOfLines={1}
                  >
                    {relationDetailStock
                      ? `${relationDetailStock.erpStockCode} – Bağlı Stoklar`
                      : "Bağlı Stoklar"}
                  </Text>
                  <TouchableOpacity onPress={handleCloseRelationDetail} style={styles.closeButton}>
                    <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                {relationDetailData.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      Bu ürünün bağlı stoğu bulunmuyor
                    </Text>
                  </View>
                ) : (
                  <FlatListScrollView
                    style={styles.relationDetailScroll}
                    contentContainerStyle={styles.relationDetailScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={[styles.relationDetailCount, { color: colors.textSecondary }]}>
                      {relationDetailData.length} {t("order.relatedStocks").toLowerCase()}
                    </Text>
                    {relationDetailData.map((r) => {
                      const isInverse = relationDetailStock && r.relatedStockId === relationDetailStock.id;
                      const name =
                        r.relatedStockName ||
                        r.relatedStockCode ||
                        (isInverse ? `Stok #${r.stockId}` : `#${r.relatedStockId}`);
                      return (
                        <View
                          key={r.id}
                          style={[styles.relationDetailRow, { borderBottomColor: colors.border }]}
                        >
                          <View style={styles.relationDetailRowContent}>
                            <Text style={[styles.relationDetailRowName, { color: colors.text }]} numberOfLines={1}>
                              {name}
                            </Text>
                            <Text style={[styles.relationDetailRowMeta, { color: colors.textSecondary }]}>
                              Miktar: {r.quantity}
                              {r.description ? ` · ${r.description}` : ""}
                              {r.isMandatory ? " · Zorunlu" : ""}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </FlatListScrollView>
                )}
              </View>
            ) : (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={[styles.handle, { backgroundColor: colors.border }]} />
                  <View style={styles.headerRow}>
                    <View style={[styles.productIcon, { backgroundColor: colors.accent }]}>
                      <Text style={styles.productIconText}>📦</Text>
                    </View>
                    <View style={styles.headerTitles}>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        {label || "Ürün"}
                      </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                        {t("order.selectProduct")}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                      <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.searchRow, { backgroundColor: colors.backgroundSecondary }]}>
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={t("stockPicker.searchPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    value={searchText}
                    onChangeText={setSearchText}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.filterButton, { borderColor: colors.border }]}
                    onPress={() => setIsFilterModalVisible(true)}
                  >
                    <Text style={[styles.filterButtonText, { color: colors.text }]}>
                      {t("common.filter")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.catalogButton, { borderColor: colors.accent, backgroundColor: colors.accent + "12" }]}
                    onPress={handleOpenCatalog}
                  >
                    <Text style={[styles.catalogButtonText, { color: colors.accent }]}>
                      {t("stockPicker.catalogOpenButton")}
                    </Text>
                  </TouchableOpacity>
                  <VoiceSearchButton onResult={setSearchText} />
                </View>

                {isLoading && stocks.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                  </View>
                ) : stocks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {searchText.trim().length >= 2
                        ? t("stockPicker.noSearchResults")
                        : t("stockPicker.minSearchChars")}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={stocks}
                    renderItem={renderStockItem}
                    keyExtractor={(item) => String(item.id)}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                      isFetchingNextPage ? (
                        <View style={styles.footerLoading}>
                          <ActivityIndicator size="small" color={colors.accent} />
                        </View>
                      ) : null
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
      <CatalogStockPickerModal
        visible={catalogModalVisible}
        selectedStock={{ code: value, name: productName }}
        onClose={handleCloseCatalog}
        onApply={async (stock) => {
          if (!stock) {
            handleClear();
            return;
          }
          await handleSelect(stock);
        }}
      />
      <Modal visible={isFilterModalVisible} transparent animationType="fade" onRequestClose={() => setIsFilterModalVisible(false)}>
        <View style={styles.filterModalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setIsFilterModalVisible(false)} />
          <View style={[styles.filterModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>
              {t("stockPicker.advancedFilterTitle")}
            </Text>
            <TextInput
              style={[styles.filterInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t("stockPicker.filterCode")}
              placeholderTextColor={colors.textMuted}
              value={tempCodeFilter}
              onChangeText={setTempCodeFilter}
            />
            <TextInput
              style={[styles.filterInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t("stockPicker.filterName")}
              placeholderTextColor={colors.textMuted}
              value={tempNameFilter}
              onChangeText={setTempNameFilter}
            />
            <TextInput
              style={[styles.filterInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t("stockPicker.filterGroupCode")}
              placeholderTextColor={colors.textMuted}
              value={tempGroupCodeFilter}
              onChangeText={setTempGroupCodeFilter}
            />
            <TextInput
              style={[styles.filterInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={t("stockPicker.filterGroupName")}
              placeholderTextColor={colors.textMuted}
              value={tempGroupNameFilter}
              onChangeText={setTempGroupNameFilter}
            />
            <View style={styles.logicRow}>
              <Text style={[styles.logicLabel, { color: colors.textMuted }]}>{t("common.logic")}</Text>
              <View style={styles.logicButtons}>
                <TouchableOpacity
                  style={[
                    styles.logicButton,
                    { borderColor: colors.border },
                    tempFilterLogic === "and" && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => setTempFilterLogic("and")}
                >
                  <Text style={[styles.logicButtonText, { color: tempFilterLogic === "and" ? "#fff" : colors.text }]}>
                    {t("common.and")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.logicButton,
                    { borderColor: colors.border },
                    tempFilterLogic === "or" && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => setTempFilterLogic("or")}
                >
                  <Text style={[styles.logicButtonText, { color: tempFilterLogic === "or" ? "#fff" : colors.text }]}>
                    {t("common.or")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.filterActions}>
              <TouchableOpacity style={[styles.filterSecondaryButton, { borderColor: colors.border }]} onPress={handleClearFilters}>
                <Text style={[styles.filterSecondaryText, { color: colors.textMuted }]}>{t("common.clear")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterSecondaryButton, { borderColor: colors.border }]} onPress={() => setIsFilterModalVisible(false)}>
                <Text style={[styles.filterSecondaryText, { color: colors.textMuted }]}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterPrimaryButton, { backgroundColor: colors.accent }]} onPress={handleApplyFilters}>
                <Text style={styles.filterPrimaryText}>{t("common.apply")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export const ProductPicker = forwardRef<ProductPickerRef, ProductPickerProps>(ProductPickerInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  required: {
    fontSize: 14,
    marginLeft: 4,
  },
  pickerButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  pickerButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chevronDown: {
    width: 0,
    height: 0,
    marginLeft: 8,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  pickerButtonDisabled: {
    opacity: 0.6,
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
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
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  productIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  productIconText: {
    fontSize: 18,
  },
  headerTitles: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 20,
  },
  relationDetailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  relationDetailTitle: {
    flex: 1,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  catalogButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catalogButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  stockItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  stockItemTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockInfo: {
    flex: 1,
    marginRight: 12,
  },
  relatedStockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  relatedStockBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stockName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  stockCode: {
    fontSize: 13,
  },
  stockMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  filterModalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  filterModalContent: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  logicRow: {
    gap: 8,
  },
  logicLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  logicButtons: {
    flexDirection: "row",
    gap: 10,
  },
  logicButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  logicButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterSecondaryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterSecondaryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterPrimaryButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterPrimaryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  relationDetailWrapper: {
    flex: 1,
  },
  relationDetailContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  relationDetailScroll: {
    flex: 1,
  },
  relationDetailScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  relationDetailCount: {
    fontSize: 13,
    marginBottom: 12,
  },
  relationDetailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  relationDetailRowContent: {
    flex: 1,
  },
  relationDetailRowName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  relationDetailRowMeta: {
    fontSize: 13,
  },
  relatedSelectWrapper: {
    flex: 1,
  },
  relatedSelectDesc: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 12,
    lineHeight: 20,
  },
  relatedSelectScroll: {
    flex: 1,
  },
  relatedSelectScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  relatedSelectBlock: {
    marginBottom: 20,
  },
  relatedSelectBlockTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  relatedSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  relatedSelectCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  relatedSelectCheckmark: {
    fontSize: 14,
    fontWeight: "700",
  },
  relatedSelectRowContent: {
    flex: 1,
  },
  relatedSelectRowName: {
    fontSize: 15,
    fontWeight: "500",
  },
  relatedSelectRowMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  relatedSelectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  relatedSelectBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  relatedSelectFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  relatedSelectCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  relatedSelectCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  relatedSelectApplyBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  relatedSelectApplyText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
