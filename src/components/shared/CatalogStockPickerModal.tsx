import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type StyleProp,
  type ViewStyle,
  type ViewToken,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { FlatListScrollView } from "@/components/FlatListScrollView";
import {
  STOCK_BROWSE_CARD_GAP,
  StockBrowseGridCard,
  StockBrowseListRow,
  StockBrowseListSeparator,
  stockBrowseStyles,
  type StockBrowseItemFields,
} from "@/components/shared/stock-browse";
import { Text } from "@/components/ui/text";
import { useUIStore } from "@/store/ui";
import {
  CatalogCampaignPricingRow,
  CatalogRelatedStocksDialog,
  CatalogSpecialCodeFilterPanel,
  useCatalogStockPicker,
  type CatalogCampaignPricingDisplay,
  type CatalogPricingRuleType,
} from "@/features/catalog";
import { WarehouseBalanceBadge } from "@/features/warehouse-stock-balances";
import type { CatalogCategoryNodeDto, CatalogStockItemDto, ProductCatalogDto } from "@/features/catalog/types";
import type { ProductSelectionResult } from "@/features/stocks/types";

const CARD_GAP = STOCK_BROWSE_CARD_GAP;
const HIERARCHY_STAGES = ["root", "subcategory", "brand", "series", "products"] as const;
const CAMPAIGN_CHIP_GLOW = "#FF4D57";
const FAVORITES_CHIP_GLOW = "#F2C14E";
type ModeBrowseChipVariant = "category" | "campaign" | "favorites";

const ModeBrowseChip = memo(function ModeBrowseChip({
  variant,
  active,
  label,
  onPress,
  colors,
  isDark,
}: {
  variant: ModeBrowseChipVariant;
  active: boolean;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useUIStore.getState>["colors"];
  isDark: boolean;
}): React.ReactElement {
  const glowColor =
    variant === "campaign" ? CAMPAIGN_CHIP_GLOW : variant === "favorites" ? FAVORITES_CHIP_GLOW : colors.accent;
  const idleShell = {
    borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : colors.border,
    backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : colors.backgroundSecondary,
  };
  const idleAccentBorder =
    variant === "campaign"
      ? "rgba(255, 77, 87, 0.34)"
      : variant === "favorites"
        ? "rgba(242, 193, 78, 0.34)"
        : idleShell.borderColor;

  const resolveChipStyle = useCallback(
    (pressed: boolean): StyleProp<ViewStyle> => {
      const highlighted = active || pressed;
      const shouldGlow = variant !== "category" && highlighted;

      return [
        styles.modeChip,
        highlighted
          ? {
              borderColor: glowColor,
              backgroundColor:
                variant === "campaign"
                  ? "rgba(255, 77, 87, 0.22)"
                  : variant === "favorites"
                    ? "rgba(242, 193, 78, 0.24)"
                    : colors.accent + "18",
            }
          : {
              borderColor: idleAccentBorder,
              backgroundColor: idleShell.backgroundColor,
            },
        shouldGlow ? styles.modeChipGlow : null,
        shouldGlow
          ? {
              shadowColor: glowColor,
              shadowOpacity: pressed ? 0.72 : 0.5,
              shadowRadius: pressed ? 14 : 10,
              shadowOffset: { width: 0, height: 0 },
              elevation: pressed ? 8 : 5,
            }
          : null,
      ];
    },
    [active, colors.accent, glowColor, idleAccentBorder, idleShell.backgroundColor, variant]
  );

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => {
        const highlighted = active || pressed;
        const iconColor =
          highlighted || variant === "category"
            ? glowColor
            : variant === "campaign"
              ? CAMPAIGN_CHIP_GLOW
              : FAVORITES_CHIP_GLOW;

        return (
          <View style={resolveChipStyle(pressed)}>
            {variant === "category" ? (
              <MaterialCommunityIcons name="folder-outline" size={16} color={iconColor} />
            ) : variant === "campaign" ? (
              <MaterialCommunityIcons name="fire" size={16} color={iconColor} />
            ) : (
              <Ionicons name="star-outline" size={16} color={iconColor} />
            )}
            <Text style={[styles.modeChipText, { color: highlighted ? glowColor : colors.text }]}>{label}</Text>
          </View>
        );
      }}
    </Pressable>
  );
});

function CatalogHierarchyGuideModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const { t } = useTranslation();
  const isDark = themeMode === "dark";
  const guideBackdropColor = isDark ? "rgba(8, 6, 14, 0.88)" : "rgba(0, 0, 0, 0.55)";
  const guideCardBackground = isDark
    ? "rgba(20, 11, 34, 0.96)"
    : colors.card.startsWith("rgba")
      ? colors.backgroundSecondary
      : colors.card;
  const nestedCardBackground = isDark
    ? "rgba(255, 255, 255, 0.06)"
    : colors.card.startsWith("rgba")
      ? "rgba(255,255,255,0.06)"
      : colors.backgroundSecondary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.guideOverlay}>
        <TouchableOpacity
          style={[styles.guideBackdrop, { backgroundColor: guideBackdropColor }]}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.guideCard, { backgroundColor: guideCardBackground, borderColor: colors.border }]}>
          <View style={styles.guideHeader}>
            <Text style={[styles.guideTitle, { color: colors.text }]}>{t("stockPicker.catalogHierarchyTitle")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.guideCloseButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatListScrollView style={styles.guideScroll} contentContainerStyle={styles.guideScrollContent}>
            <Text style={[styles.guideDescription, { color: colors.textSecondary }]}>
              {t("stockPicker.catalogHierarchyDescription")}
            </Text>
            <View style={[styles.guideExampleBox, { borderColor: colors.border, backgroundColor: nestedCardBackground }]}>
              <Text style={[styles.guideExampleText, { color: colors.textSecondary }]}>
                <Text style={[styles.guideExampleLabel, { color: colors.text }]}>
                  {t("stockPicker.catalogHierarchyExampleLabel")}:{" "}
                </Text>
                {t("stockPicker.catalogHierarchyExampleValue")}
              </Text>
            </View>
            {HIERARCHY_STAGES.map((stage, index) => (
              <View
                key={stage}
                style={[styles.guideStageCard, { borderColor: colors.border, backgroundColor: nestedCardBackground }]}
              >
                <View style={[styles.guideStageAccent, { backgroundColor: colors.accent + "66" }]} />
                <View style={styles.guideStageHeader}>
                  <View style={[styles.guideStageIndex, { backgroundColor: colors.text }]}>
                    <Text style={styles.guideStageIndexText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.guideStageTitle, { color: colors.text }]}>
                    {t(`stockPicker.catalogHierarchyStages.${stage}.title`)}
                  </Text>
                </View>
                <Text style={[styles.guideStageDescription, { color: colors.textSecondary }]}>
                  {t(`stockPicker.catalogHierarchyStages.${stage}.description`)}
                </Text>
              </View>
            ))}
          </FlatListScrollView>
        </View>
      </View>
    </Modal>
  );
}

const StockCartControls = memo(function StockCartControls({
  quantity,
  onIncrease,
  onDecrease,
  colors,
  variant = "circle",
}: {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  colors: ReturnType<typeof useUIStore.getState>["colors"];
  variant?: "circle" | "compact";
}): React.ReactElement {
  if (quantity <= 0) {
    return (
      <Pressable
        style={[
          variant === "circle" ? styles.stockAddCircle : styles.cartShellCompact,
          variant === "circle"
            ? {
                borderWidth: 1,
                borderColor: colors.accent + "4A",
                backgroundColor: colors.accent + "12",
              }
            : { borderColor: colors.accent + "40", backgroundColor: colors.accent + "10" },
        ]}
        onPress={(event) => {
          event.stopPropagation();
          onIncrease();
        }}
        hitSlop={8}
      >
        <Ionicons name="add" size={variant === "circle" ? 16 : 14} color={colors.accent} />
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.cartQuantityPill, { backgroundColor: colors.accent + "0C", borderColor: colors.accent + "30" }]}
      onStartShouldSetResponder={() => true}
    >
      <Pressable
        style={styles.cartIconButton}
        onPress={(event) => {
          event.stopPropagation();
          onDecrease();
        }}
        hitSlop={6}
      >
        <Ionicons name="remove" size={13} color={colors.text} />
      </Pressable>
      <Text unstyled disableThemeColor style={[styles.cartQuantity, { color: colors.text }]}>
        {quantity}
      </Text>
      <Pressable
        style={styles.cartIconButton}
        onPress={(event) => {
          event.stopPropagation();
          onIncrease();
        }}
        hitSlop={6}
      >
        <Ionicons name="add" size={13} color={colors.accent} />
      </Pressable>
    </View>
  );
});

interface CatalogStockPickerModalProps {
  visible: boolean;
  onClose: () => void;
  multiSelect?: boolean;
  onSelect?: (result: ProductSelectionResult) => void | Promise<void>;
  onMultiSelect?: (results: ProductSelectionResult[]) => void | Promise<void>;
  initialDraftSnapshot?: ProductSelectionResult[];
  existingLineStockMarkers?: ProductSelectionResult[];
  pricingRuleType?: CatalogPricingRuleType;
  pricingRuleCustomerId?: number | null;
  pricingRuleErpCustomerCode?: string | null;
}

const StockMetaPill = memo(function StockMetaPill({
  label,
  tone,
}: {
  label: string;
  tone: "amber" | "indigo" | "orange";
}) {
  const toneStyle =
    tone === "amber"
      ? { backgroundColor: "rgba(245, 158, 11, 0.92)", borderColor: "rgba(251, 191, 36, 0.55)" }
      : tone === "indigo"
        ? { backgroundColor: "rgba(99, 102, 241, 0.92)", borderColor: "rgba(129, 140, 248, 0.45)" }
        : { backgroundColor: "rgba(249, 115, 22, 0.92)", borderColor: "rgba(251, 146, 60, 0.45)" };

  return (
    <View style={[styles.cardMetaPill, toneStyle]}>
      <Text unstyled disableThemeColor style={styles.cardMetaPillText}>
        {label}
      </Text>
    </View>
  );
});

function mapCatalogItemToBrowseItem(item: CatalogStockItemDto): StockBrowseItemFields {
  return {
    erpStockCode: item.erpStockCode,
    stockName: item.stockName,
    unit: item.unit ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
    grupKodu: item.grupKodu ?? undefined,
    grupAdi: item.grupAdi ?? undefined,
    kod1: item.kod1 ?? undefined,
    kod1Adi: item.kod1Adi ?? undefined,
  };
}

const StockCard = memo(function StockCard({
  item,
  selected,
  inDraft,
  onLine,
  relationCount,
  pricing,
  colors,
  surfaceColor,
  frameColor,
  isDark,
  onPress,
  multiSelect,
  quantity,
  onIncrease,
  onDecrease,
  balanceFetchEnabled = false,
}: {
  item: CatalogStockItemDto;
  selected: boolean;
  inDraft: boolean;
  onLine: boolean;
  relationCount: number;
  pricing?: CatalogCampaignPricingDisplay;
  colors: ReturnType<typeof useUIStore.getState>["colors"];
  surfaceColor: string;
  frameColor: string;
  isDark: boolean;
  onPress: () => void;
  multiSelect: boolean;
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  balanceFetchEnabled?: boolean;
}) {
  const { t } = useTranslation();
  const hasImageOverlayMeta = inDraft || onLine || relationCount > 0;
  const balanceBadge = (
    <WarehouseBalanceBadge
      stockId={item.stockId}
      unit={item.unit}
      isDark={isDark}
      fetchEnabled={balanceFetchEnabled}
    />
  );

  return (
    <StockBrowseGridCard
      item={mapCatalogItemToBrowseItem(item)}
      colors={colors}
      isDark={isDark}
      frameColor={frameColor}
      surfaceColor={surfaceColor}
      onPress={onPress}
      selected={selected}
      showSelectedBadge
      imageOverlay={
        <>
          {balanceBadge}
          {hasImageOverlayMeta ? (
            <>
              {inDraft ? <StockMetaPill label={t("stockPicker.catalogDraftBadge")} tone="amber" /> : null}
              {onLine ? <StockMetaPill label={t("stockPicker.catalogLineBadge")} tone="indigo" /> : null}
              {relationCount > 0 ? <StockMetaPill label={`×${relationCount}`} tone="orange" /> : null}
            </>
          ) : null}
        </>
      }
      bodyExtra={
        pricing != null ? (
          <CatalogCampaignPricingRow
            pricing={pricing}
            textColor={colors.text}
            mutedColor={colors.textMuted}
            accentColor={colors.accent}
            compact
          />
        ) : undefined
      }
      footer={
        multiSelect ? (
          <>
            <View style={styles.cardUnitSpacer} />
            <StockCartControls
              quantity={quantity}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              colors={colors}
              variant="circle"
            />
          </>
        ) : undefined
      }
    />
  );
});

const StockListRow = memo(function StockListRow({
  item,
  selected,
  inDraft,
  onLine,
  relationCount,
  pricing,
  colors,
  frameColor,
  isDark,
  onPress,
  multiSelect,
  quantity,
  onIncrease,
  onDecrease,
  balanceFetchEnabled = false,
}: {
  item: CatalogStockItemDto;
  selected: boolean;
  inDraft: boolean;
  onLine: boolean;
  relationCount: number;
  pricing?: CatalogCampaignPricingDisplay;
  colors: ReturnType<typeof useUIStore.getState>["colors"];
  frameColor: string;
  isDark: boolean;
  onPress: () => void;
  multiSelect: boolean;
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  balanceFetchEnabled?: boolean;
}) {
  const { t } = useTranslation();
  const hasMetaRow = pricing != null || inDraft || onLine || relationCount > 0;
  const balanceBadge = (
    <WarehouseBalanceBadge
      stockId={item.stockId}
      unit={item.unit}
      isDark={isDark}
      compact
      fetchEnabled={balanceFetchEnabled}
    />
  );

  return (
    <StockBrowseListRow
      item={mapCatalogItemToBrowseItem(item)}
      colors={colors}
      frameColor={frameColor}
      isDark={isDark}
      onPress={onPress}
      selected={selected}
      trailing={
        multiSelect ? (
          <StockCartControls
            quantity={quantity}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
            colors={colors}
            variant="circle"
          />
        ) : undefined
      }
      prefixActions={balanceBadge}
      metaRow={
        hasMetaRow ? (
          <>
            <CatalogCampaignPricingRow
              pricing={pricing}
              textColor={colors.text}
              mutedColor={colors.textMuted}
              accentColor={colors.accent}
              compact
            />
            <View style={styles.badgeRow}>
              {inDraft ? (
                <Text unstyled disableThemeColor style={[styles.metaBadge, { color: colors.accent }]}>
                  {t("stockPicker.catalogDraftBadge")}
                </Text>
              ) : null}
              {onLine ? (
                <Text unstyled disableThemeColor style={[styles.metaBadge, { color: colors.textSecondary }]}>
                  {t("stockPicker.catalogLineBadge")}
                </Text>
              ) : null}
              {relationCount > 0 ? (
                <Text unstyled disableThemeColor style={[styles.metaBadge, { color: colors.accent }]}>
                  x{relationCount}
                </Text>
              ) : null}
            </View>
          </>
        ) : undefined
      }
    />
  );
});

export function CatalogStockPickerModal({
  visible,
  onClose,
  multiSelect = false,
  onSelect,
  onMultiSelect,
  initialDraftSnapshot = [],
  existingLineStockMarkers = [],
  pricingRuleType = "Quotation",
  pricingRuleCustomerId = null,
  pricingRuleErpCustomerCode = null,
}: CatalogStockPickerModalProps): React.ReactElement {
  const { colors, themeMode } = useUIStore();
  const isDark = themeMode === "dark";
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - 32 - CARD_GAP) / 2;

  const picker = useCatalogStockPicker({
    open: visible,
    multiSelect,
    pricingRuleType,
    pricingRuleCustomerId,
    pricingRuleErpCustomerCode,
    initialDraftSnapshot,
    existingLineStockMarkers,
    onSelect,
    onMultiSelect,
    onClose,
  });

  const isCodeTab = picker.activeTab === "codeFilters";
  const codeFiltersPanelOpen = isCodeTab && picker.mobileFiltersOpen;
  const codeNeedsSelection =
    isCodeTab && picker.stockBrowseMode === "specialCodes" && !picker.hasAppliedSpecialCodeSelection;
  const categoryNeedsLeaf =
    picker.stockBrowseMode === "category" && (!picker.selectedCatalog || !picker.confirmedLeafCategory);

  const stockSearchDisabled = isCodeTab
    ? picker.stockBrowseMode === "specialCodes" && !picker.hasAppliedSpecialCodeSelection
    : categoryNeedsLeaf;

  const handleOpenCategories = useCallback(() => {
    picker.toggleCategoriesPanel();
  }, [picker]);

  const handleSelectCodeTab = useCallback(() => {
    picker.setActiveTab("codeFilters");
  }, [picker]);

  const handleSelectCatalogTab = useCallback(() => {
    picker.setActiveTab("catalogTree");
  }, [picker]);

  const categoryPathLabel = useMemo(() => {
    if (!picker.selectedCatalog) return "";
    const parts = [
      picker.selectedCatalog.name,
      ...picker.navigationPath.map((node) => node.name),
      picker.selectedLeafCategory?.name,
    ].filter(Boolean);
    return parts.join(" / ");
  }, [picker.navigationPath, picker.selectedCatalog, picker.selectedLeafCategory?.name]);

  const searchSurfaceColor = colors.card;
  const panelSurfaceColor = colors.card;
  const pickerBorder = isDark ? "rgba(255, 255, 255, 0.2)" : colors.border;
  const pickerBorderSoft = isDark ? "rgba(255, 255, 255, 0.12)" : colors.cardBorder;
  const stockFrameColor = pickerBorder;
  const stockSurfaceColor = isDark ? "rgba(255, 255, 255, 0.06)" : colors.card;
  const categoryPathSurface = isDark ? "rgba(255, 255, 255, 0.06)" : colors.backgroundSecondary;
  const categoryActionShellSurface = isDark ? "rgba(255, 255, 255, 0.07)" : colors.card;
  const categoryConfirmSurface = isDark ? colors.accent + "2E" : colors.accent + "18";
  const categoryConfirmBorder = colors.accent + (isDark ? "55" : "40");
  const tabActiveSurface = colors.accent + (isDark ? "24" : "12");
  const tabActiveBorder = colors.accent + (isDark ? "66" : "44");
  const stockListBottomInset = multiSelect ? 58 : 16;

  const isStockListLayout = picker.stockLayoutMode === "list";
  const [viewableStockIds, setViewableStockIds] = useState<number[]>([]);
  const viewableStockIdSet = useMemo(() => new Set(viewableStockIds), [viewableStockIds]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 35 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const ids: number[] = [];
      for (const token of viewableItems) {
        const item = token.item as CatalogStockItemDto | undefined;
        if (item && typeof item.stockId === "number" && item.stockId > 0) {
          ids.push(item.stockId);
        }
      }
      setViewableStockIds(ids);
    }
  ).current;

  const renderListSeparator = useCallback(
    () => <StockBrowseListSeparator color={pickerBorder} />,
    [pickerBorder]
  );

  const handleStockListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < 100 && picker.activeStockHasNextPage && !picker.activeStockFetchingNextPage) {
        picker.loadMoreStocks();
      }
    },
    [picker]
  );

  const renderStockItem = useCallback(
    ({ item }: { item: CatalogStockItemDto }) => {
      const pricing = picker.campaignPricingByCodeLower[item.erpStockCode.toLowerCase()];
      const relationCount = picker.relationMap[item.stockId]?.length ?? 0;
      const quantity = picker.getStockSelectionCount(item);
      const common = {
        item,
        selected: picker.isSelected(item),
        inDraft: picker.isAlreadyInDraft(item),
        onLine: picker.isAlreadyOnLine(item),
        relationCount,
        pricing: picker.stockBrowseMode === "campaign" ? pricing : undefined,
        colors,
        surfaceColor: stockSurfaceColor,
        frameColor: stockFrameColor,
        isDark,
        onPress: () => picker.handleStockPress(item),
        multiSelect,
        quantity,
        onIncrease: () => picker.incrementStockPick(item),
        onDecrease: () => picker.decrementStockPick(item),
        balanceFetchEnabled: viewableStockIdSet.has(item.stockId),
      };

      if (picker.stockLayoutMode === "list") {
        return (
          <View style={stockBrowseStyles.listItemWrap}>
            <StockListRow {...common} />
          </View>
        );
      }

      return (
        <View style={[stockBrowseStyles.cardCell, { width: cardWidth }]}>
          <StockCard {...common} />
        </View>
      );
    },
    [cardWidth, colors, isDark, multiSelect, picker, stockFrameColor, stockSurfaceColor, viewableStockIdSet]
  );

  const keyExtractor = useCallback((item: CatalogStockItemDto) => `${item.stockId}-${item.erpStockCode}`, []);

  const listHeader = useMemo(
    () => {
      const resultCount =
        isCodeTab && picker.stockBrowseMode === "specialCodes"
          ? picker.specialCodeTotalCount
          : picker.activeStockRows.length;

      return (
        <View style={styles.resultsHeader}>
          <View style={styles.resultsLeft}>
            <Ionicons name={isCodeTab ? "pricetag" : "star"} size={14} color={colors.accent} />
            <Text unstyled disableThemeColor style={[styles.resultsText, { color: colors.text }]}>
              {t("stockPicker.catalogStocksFoundTitle", { count: resultCount })}
            </Text>
          </View>
          <View style={styles.resultsActions}>
            {isCodeTab && picker.stockBrowseMode === "specialCodes" ? (
              <TouchableOpacity
                onPress={picker.toggleSpecialCodeFiltersPanel}
                style={[styles.editFiltersButton, { borderColor: colors.accent + "55", backgroundColor: colors.accent + "12" }]}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="filter-variant" size={14} color={colors.accent} />
                <Text unstyled disableThemeColor style={[styles.editFiltersText, { color: colors.accent }]}>
                  {t("stockPicker.specialCodesEditFilters")}
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.layoutToggle}>
              <TouchableOpacity
                onPress={() => picker.setStockLayoutMode("list")}
                style={[styles.layoutButton, picker.stockLayoutMode === "list" && { backgroundColor: colors.accent + "22" }]}
              >
                <Ionicons name="list" size={18} color={picker.stockLayoutMode === "list" ? colors.accent : colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => picker.setStockLayoutMode("cards")}
                style={[styles.layoutButton, picker.stockLayoutMode === "cards" && { backgroundColor: colors.accent + "22" }]}
              >
                <Ionicons name="grid" size={18} color={picker.stockLayoutMode === "cards" ? colors.accent : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [colors.accent, colors.text, colors.textMuted, isCodeTab, picker, t]
  );

  const stockListEmptyComponent = useMemo(() => {
    if (picker.activeStockLoading) return null;
    return (
      <View style={styles.listEmptyState}>
        <MaterialCommunityIcons name="package-variant-closed" size={30} color={colors.textMuted} />
        <Text style={[styles.listEmptyText, { color: colors.textSecondary }]}>
          {t("stockPicker.specialCodesNoResults")}
        </Text>
      </View>
    );
  }, [colors.textMuted, colors.textSecondary, picker.activeStockLoading, t]);

  const renderCategoryRow = useCallback(
    (category: CatalogCategoryNodeDto) => {
      const isActive = picker.selectedLeafCategory?.catalogCategoryId === category.catalogCategoryId;
      const isInPath = picker.navigationPath.some((node) => node.catalogCategoryId === category.catalogCategoryId);

      return (
        <TouchableOpacity
          key={category.catalogCategoryId}
          style={[styles.categoryRow, (isActive || isInPath) && { backgroundColor: colors.accent + "12" }]}
          onPress={() => {
            if (!picker.selectedCatalog) return;
            picker.selectCategoryInCatalog(picker.selectedCatalog, category);
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={category.hasChildren ? "folder-outline" : "file-document-outline"}
            size={18}
            color={isActive ? colors.accent : colors.textMuted}
          />
          <Text style={[styles.categoryName, { color: isActive ? colors.accent : colors.text }]} numberOfLines={1}>
            {category.name}
          </Text>
          <Ionicons
            name={category.hasChildren ? "chevron-down" : isActive ? "ellipse" : "chevron-forward"}
            size={16}
            color={isActive ? colors.accent : colors.textMuted}
          />
        </TouchableOpacity>
      );
    },
    [colors, picker]
  );

  const renderCatalogSection = useCallback(
    (catalog: ProductCatalogDto) => {
      const expanded = picker.expandedCatalogIds.has(catalog.id);
      const active = picker.selectedCatalog?.id === catalog.id;
      const showCategories = expanded && active && !picker.categoryClientSearch.trim();

      return (
        <View key={catalog.id} style={styles.catalogSection}>
          <TouchableOpacity
            style={[
            styles.catalogChip,
            {
              borderColor: active ? colors.accent + "88" : pickerBorder,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : colors.backgroundSecondary,
            },
            active && { backgroundColor: colors.accent + "18" },
            ]}
            onPress={() => picker.toggleCatalogExpanded(catalog)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="folder-outline" size={16} color={active ? colors.accent : colors.textMuted} />
            <Text style={[styles.catalogChipText, { color: active ? colors.accent : colors.text }]} numberOfLines={1}>
              {catalog.name}
            </Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
          </TouchableOpacity>
          {showCategories ? (
            <View style={[styles.catalogAccordionBody, { borderLeftColor: colors.accent + "44" }]}>
              {picker.navigationPath.length > 0 ? (
                <TouchableOpacity style={styles.backRow} onPress={picker.handleCategoryBack}>
                  <Ionicons name="arrow-back" size={16} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: "700" }}>{t("stockPicker.catalogBack")}</Text>
                </TouchableOpacity>
              ) : null}
              {picker.categoriesLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
              {picker.categories.length === 0 && !picker.categoriesLoading ? (
                <Text style={[styles.catalogEmptyHint, { color: colors.textSecondary }]}>
                  {t("stockPicker.catalogNoCategories")}
                </Text>
              ) : null}
              {picker.categories.map(renderCategoryRow)}
            </View>
          ) : null}
        </View>
      );
    },
    [colors, isDark, picker, pickerBorder, renderCategoryRow, t]
  );

  return (
    <>
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              if (codeFiltersPanelOpen) {
                picker.closeSpecialCodeFilters();
                return;
              }
              if (picker.mobileCategoriesOpen) {
                picker.setMobileCategoriesOpen(false);
                return;
              }
              onClose();
            }}
            style={styles.headerIconButton}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {picker.mobileCategoriesOpen
              ? t("stockPicker.catalogCategoryScreenTitle")
              : codeFiltersPanelOpen
                ? t("stockPicker.specialCodesPanelTitle")
                : t("stockPicker.catalogMobileTitle")}
          </Text>
          <TouchableOpacity onPress={() => picker.setHierarchyInfoOpen(true)} style={styles.headerIconButton}>
            <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.tabBar, { borderColor: pickerBorder, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.backgroundSecondary }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              isCodeTab && {
                backgroundColor: tabActiveSurface,
                borderColor: tabActiveBorder,
                borderWidth: 1,
              },
            ]}
            onPress={handleSelectCodeTab}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={16}
              color={isCodeTab ? colors.accent : colors.textSecondary}
            />
            <Text
              unstyled
              disableThemeColor
              style={[styles.tabButtonText, { color: isCodeTab ? colors.accent : colors.textSecondary }]}
            >
              {t("stockPicker.catalogTabCodeFilters")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              !isCodeTab && {
                backgroundColor: tabActiveSurface,
                borderColor: tabActiveBorder,
                borderWidth: 1,
              },
            ]}
            onPress={handleSelectCatalogTab}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="file-tree-outline"
              size={16}
              color={!isCodeTab ? colors.accent : colors.textSecondary}
            />
            <Text
              unstyled
              disableThemeColor
              style={[styles.tabButtonText, { color: !isCodeTab ? colors.accent : colors.textSecondary }]}
            >
              {t("stockPicker.catalogTabCatalogTree")}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: searchSurfaceColor, borderColor: pickerBorder },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, backgroundColor: "transparent" }]}
            underlineColorAndroid="transparent"
            placeholder={
              codeFiltersPanelOpen
                ? t("stockPicker.specialCodesFilterSearchPlaceholder")
                : picker.mobileCategoriesOpen
                  ? t("stockPicker.catalogCategorySearchPlaceholder")
                  : t("stockPicker.catalogStockSearchPlaceholder")
            }
            placeholderTextColor={colors.textMuted}
            value={
              codeFiltersPanelOpen
                ? picker.specialCodeFilterSearch
                : picker.mobileCategoriesOpen
                  ? picker.categoryClientSearch
                  : picker.stockSearch
            }
            onChangeText={
              codeFiltersPanelOpen
                ? picker.setSpecialCodeFilterSearch
                : picker.mobileCategoriesOpen
                  ? picker.setCategoryClientSearch
                  : picker.setStockSearch
            }
            editable={codeFiltersPanelOpen || picker.mobileCategoriesOpen ? true : !stockSearchDisabled}
          />
        </View>

        <FlatListScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          {isCodeTab ? (
            <ModeBrowseChip
              variant="category"
              active={picker.mobileFiltersOpen && picker.stockBrowseMode === "specialCodes"}
              label={t("stockPicker.specialCodesFiltersChip")}
              onPress={picker.toggleSpecialCodeFiltersPanel}
              colors={colors}
              isDark={isDark}
            />
          ) : (
            <ModeBrowseChip
              variant="category"
              active={picker.stockBrowseMode === "category" && picker.mobileCategoriesOpen}
              label={t("stockPicker.catalogSelectCatalogChip")}
              onPress={handleOpenCategories}
              colors={colors}
              isDark={isDark}
            />
          )}
          <ModeBrowseChip
            variant="campaign"
            active={picker.stockBrowseMode === "campaign"}
            label={t("stockPicker.catalogCampaignChip")}
            onPress={() => picker.setStockBrowseMode("campaign")}
            colors={colors}
            isDark={isDark}
          />
          <ModeBrowseChip
            variant="favorites"
            active={picker.stockBrowseMode === "favorites"}
            label={t("stockPicker.catalogFavoritesChip")}
            onPress={() => picker.setStockBrowseMode("favorites")}
            colors={colors}
            isDark={isDark}
          />
        </FlatListScrollView>

        {codeFiltersPanelOpen ? (
          <View style={styles.codeFilterPanel}>
            <CatalogSpecialCodeFilterPanel
              facetOptions={picker.specialCodeFacetOptions}
              selections={picker.specialCodeSelections}
              expandedSections={picker.expandedSpecialCodeSections}
              filterSearch={picker.specialCodeFilterSearch}
              loading={picker.specialCodeFacetLoading}
              hasDraftSelection={picker.hasDraftSpecialCodeSelection}
              onToggleSelection={picker.toggleSpecialCodeSelection}
              onToggleSection={picker.toggleSpecialCodeSection}
              onApply={picker.applySpecialCodeSelections}
              onClear={picker.clearSpecialCodeSelections}
            />
          </View>
        ) : picker.mobileCategoriesOpen ? (
          <View style={styles.categoryPanel}>
            {picker.catalogsLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
            <FlatListScrollView
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {picker.categoryClientSearch.trim() ? (
                <View
                  style={[
                    styles.categorySearchBlock,
                    { backgroundColor: panelSurfaceColor, borderColor: pickerBorder, borderWidth: 1 },
                  ]}
                >
                  {picker.categorySearchResults.length === 0 && !picker.categoryTreeLoading ? (
                    <Text style={[styles.catalogEmptyHint, { color: colors.textSecondary }]}>
                      {t("stockPicker.catalogNoSearchResults")}
                    </Text>
                  ) : null}
                  {picker.categorySearchResults.map((node) => (
                    <TouchableOpacity
                      key={node.catalogCategoryId}
                      style={styles.categoryRow}
                      onPress={() => picker.handleCategorySearchSelect(node.catalogCategoryId)}
                    >
                      <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>
                        {node.fullPath ?? node.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {picker.categoryTreeLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
                </View>
              ) : (
                <>
                  {picker.selectedCatalog ? (
                    <View
                      style={[
                        styles.categoryPathBar,
                        {
                          backgroundColor: categoryPathSurface,
                          borderColor: pickerBorder,
                        },
                      ]}
                    >
                      <Text unstyled disableThemeColor style={[styles.categoryPathLabel, { color: colors.textMuted }]}>
                        {t("stockPicker.catalogSelectedPathLabel")}
                      </Text>
                      <Text
                        unstyled
                        disableThemeColor
                        style={[styles.categoryPathText, { color: isDark ? colors.textMuted : colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {categoryPathLabel || picker.selectedCatalog.name}
                      </Text>
                    </View>
                  ) : null}
                  {picker.catalogs.map(renderCatalogSection)}
                </>
              )}
            </FlatListScrollView>
            <View
              style={[
                styles.categoryActionShell,
                {
                  backgroundColor: categoryActionShellSurface,
                  borderColor: pickerBorder,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.categoryActionButton,
                  {
                    borderColor: pickerBorderSoft,
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : colors.backgroundSecondary,
                  },
                ]}
                onPress={picker.goToCategoryRoot}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="backup-restore" size={16} color={colors.textMuted} />
                <Text unstyled disableThemeColor style={[styles.categoryActionButtonText, { color: colors.textSecondary }]}>
                  {t("stockPicker.catalogResetBranch")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryActionButton,
                  styles.categoryConfirmButton,
                  {
                    backgroundColor: categoryConfirmSurface,
                    borderColor: categoryConfirmBorder,
                  },
                  !picker.selectedLeafCategory && styles.categoryConfirmButtonDisabled,
                ]}
                onPress={picker.confirmCategorySelection}
                disabled={!picker.selectedLeafCategory}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={16} color={colors.accent} />
                <Text unstyled disableThemeColor style={[styles.categoryConfirmButtonText, { color: colors.accent }]}>
                  {t("stockPicker.catalogConfirmBranch")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.stockPanel}>
            {codeNeedsSelection ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { borderColor: colors.accent + "55" }]}>
                  <MaterialCommunityIcons name="filter-variant" size={34} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("stockPicker.specialCodesEmptyTitle")}</Text>
                <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>{t("stockPicker.specialCodesPickHint")}</Text>
                <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={picker.openSpecialCodeFilters}>
                  <MaterialCommunityIcons name="filter-variant" size={18} color="#fff" />
                  <Text style={styles.emptyButtonText}>{t("stockPicker.specialCodesOpenFilters")}</Text>
                </TouchableOpacity>
              </View>
            ) : !isCodeTab && categoryNeedsLeaf ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { borderColor: colors.accent + "55" }]}>
                  <MaterialCommunityIcons name="shopping-outline" size={34} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("stockPicker.catalogSelectLeafTitle")}</Text>
                <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>{t("stockPicker.catalogSelectLeafHint")}</Text>
                <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.accent }]} onPress={handleOpenCategories}>
                  <MaterialCommunityIcons name="folder-outline" size={18} color="#fff" />
                  <Text style={styles.emptyButtonText}>{t("stockPicker.catalogOpenCategories")}</Text>
                </TouchableOpacity>
              </View>
            ) : isStockListLayout ? (
              <FlatListScrollView
                style={styles.stockPanelScroll}
                contentContainerStyle={{ paddingBottom: stockListBottomInset }}
                onScroll={handleStockListScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
              >
                {picker.stockBrowseMode === "favorites" ? (
                  <Text style={[styles.favoritesHint, { color: colors.textSecondary }]}>
                    {t("stockPicker.specialStockListPlaceholderHint")}
                  </Text>
                ) : null}
                {listHeader}
                {picker.activeStockLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
                <View
                  style={[
                    stockBrowseStyles.stockListShell,
                    styles.stockListShellHug,
                    { borderColor: pickerBorder, backgroundColor: panelSurfaceColor },
                  ]}
                >
                  <FlatList
                    style={styles.stockListHug}
                    data={picker.activeStockRows}
                    keyExtractor={keyExtractor}
                    renderItem={renderStockItem}
                    numColumns={1}
                    scrollEnabled={false}
                    contentContainerStyle={stockBrowseStyles.listContentInset}
                    ItemSeparatorComponent={renderListSeparator}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={stockListEmptyComponent}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    ListFooterComponent={
                      picker.activeStockFetchingNextPage ? (
                        <ActivityIndicator color={colors.accent} style={styles.loader} />
                      ) : null
                    }
                  />
                </View>
              </FlatListScrollView>
            ) : (
              <View style={styles.stockPanelFill}>
                {picker.stockBrowseMode === "favorites" ? (
                  <Text style={[styles.favoritesHint, { color: colors.textSecondary }]}>
                    {t("stockPicker.specialStockListPlaceholderHint")}
                  </Text>
                ) : null}
                {listHeader}
                {picker.activeStockLoading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
                <View style={styles.stockListShellCards}>
                  <FlatList
                    style={styles.stockList}
                    data={picker.activeStockRows}
                    keyExtractor={keyExtractor}
                    renderItem={renderStockItem}
                    numColumns={2}
                    key="cards"
                    columnWrapperStyle={stockBrowseStyles.cardRow}
                    contentContainerStyle={[styles.listContent, { paddingBottom: stockListBottomInset }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={stockListEmptyComponent}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    onEndReached={() => {
                      if (picker.activeStockHasNextPage) {
                        picker.loadMoreStocks();
                      }
                    }}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                      picker.activeStockFetchingNextPage ? (
                        <ActivityIndicator color={colors.accent} style={styles.loader} />
                      ) : null
                    }
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {multiSelect && !picker.mobileCategoriesOpen && !codeFiltersPanelOpen ? (
          <View
            style={[
              styles.footer,
              {
                borderTopColor: pickerBorder,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Text unstyled disableThemeColor style={[styles.footerCountText, { color: colors.textSecondary }]}>
              {t("stockPicker.catalogSelectedCount", { count: picker.sessionPicks.length })}
            </Text>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: categoryConfirmSurface,
                  borderColor: categoryConfirmBorder,
                },
                !picker.canConfirmMulti && styles.confirmButtonDisabled,
              ]}
              disabled={!picker.canConfirmMulti}
              onPress={() => {
                void picker.handleConfirmMulti();
              }}
              activeOpacity={0.85}
            >
              <Text unstyled disableThemeColor style={[styles.confirmButtonText, { color: colors.accent }]}>
                {t("stockPicker.catalogApplySelection")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

    </Modal>
    <CatalogHierarchyGuideModal
      visible={visible && picker.hierarchyInfoOpen}
      onClose={() => picker.setHierarchyInfoOpen(false)}
    />
    <CatalogRelatedStocksDialog
      visible={picker.relatedDialogOpen}
      relations={picker.relatedDialogRelations}
      onClose={picker.closeRelatedDialog}
      onConfirm={picker.handleRelatedConfirm}
    />
  </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  headerIconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800" },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 13 },
  chipsScroll: { flexGrow: 0, marginBottom: 4 },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 24,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexShrink: 0,
  },
  modeChipGlow: { borderWidth: 1.5 },
  modeChipText: { fontSize: 12, fontWeight: "700" },
  categoryPanel: { flex: 1, minHeight: 0, paddingHorizontal: 16 },
  categoryScroll: { flex: 1 },
  categoryScrollContent: { paddingBottom: 12, gap: 8 },
  catalogSection: { gap: 0 },
  catalogAccordionBody: {
    marginLeft: 10,
    marginTop: 4,
    marginBottom: 10,
    paddingLeft: 8,
    borderLeftWidth: 2,
    gap: 2,
  },
  catalogEmptyHint: { fontSize: 12, paddingHorizontal: 14, paddingVertical: 10 },
  categorySearchBlock: { borderRadius: 12, overflow: "hidden", marginBottom: 8 },
  catalogChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catalogChipText: { flex: 1, fontSize: 14, fontWeight: "700" },
  categoryPathBar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 2,
  },
  categoryPathLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.45 },
  categoryPathText: { fontSize: 10, lineHeight: 14, fontWeight: "500" },
  categoryActionShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryActionButton: {
    flex: 1,
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  categoryActionButtonText: { fontSize: 12, fontWeight: "600" },
  categoryConfirmButton: { borderWidth: StyleSheet.hairlineWidth },
  categoryConfirmButtonDisabled: { opacity: 0.4 },
  categoryConfirmButtonText: { fontSize: 12, fontWeight: "700" },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  categoryName: { flex: 1, fontSize: 15, fontWeight: "700" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  stockPanel: { flex: 1, paddingHorizontal: 16 },
  stockPanelScroll: { flex: 1 },
  stockPanelFill: { flex: 1 },
  stockList: { flex: 1 },
  stockListHug: { flexGrow: 0 },
  favoritesHint: { fontSize: 13, marginBottom: 8 },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  resultsLeft: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  resultsText: { fontSize: 12, fontWeight: "600" },
  resultsActions: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  editFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editFiltersText: { fontSize: 11, fontWeight: "700" },
  tabBar: {
    flexDirection: "row",
    gap: 4,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabButtonText: { fontSize: 13, fontWeight: "700" },
  codeFilterPanel: { flex: 1, minHeight: 0 },
  listEmptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  listEmptyText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  layoutToggle: { flexDirection: "row", gap: 4 },
  layoutButton: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stockListShellHug: { alignSelf: "stretch", flexGrow: 0 },
  stockListShellCards: { flex: 1 },
  listContent: { gap: CARD_GAP, paddingTop: 2 },
  cardMetaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  cardMetaPillText: {
    color: "#fff",
    fontSize: 7,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  cardFooter: { marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  cardUnitSpacer: { flex: 1 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  metaBadge: { fontSize: 9, fontWeight: "600" },
  stockAddCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cartShellCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cartQuantityPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
    gap: 0,
  },
  cartIconButton: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  cartQuantity: { minWidth: 16, textAlign: "center", fontSize: 11, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  emptyHint: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyButton: { marginTop: 8, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  emptyButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, gap: 4 },
  footerCountText: { fontSize: 11, fontWeight: "500" },
  confirmButton: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  confirmButtonDisabled: { opacity: 0.45 },
  confirmButtonText: { fontWeight: "700", fontSize: 14 },
  loader: { marginVertical: 12 },
  guideOverlay: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  guideBackdrop: { ...StyleSheet.absoluteFillObject },
  guideCard: { borderWidth: 1, borderRadius: 18, maxHeight: "82%", overflow: "hidden" },
  guideHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  guideTitle: { flex: 1, fontSize: 18, fontWeight: "800" },
  guideCloseButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  guideScroll: { maxHeight: 520 },
  guideScrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  guideDescription: { fontSize: 14, lineHeight: 20 },
  guideExampleBox: { borderWidth: 1, borderStyle: "dashed", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  guideExampleText: { fontSize: 13, lineHeight: 18 },
  guideExampleLabel: { fontWeight: "700" },
  guideStageCard: { borderWidth: 1, borderRadius: 12, padding: 12, overflow: "hidden" },
  guideStageAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  guideStageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  guideStageIndex: { width: 24, height: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  guideStageIndexText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  guideStageTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  guideStageDescription: { marginTop: 6, fontSize: 13, lineHeight: 18 },
});
