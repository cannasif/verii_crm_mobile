import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProductSelectionKey, type ProductSelectionResult } from "@/features/stocks/types";
import { stockApi } from "@/features/stocks/api/stockApi";
import type { StockRelationDto } from "@/features/stocks/types";
import { getCurrentLanguage } from "@/locales";
import { buildCategoryBranchPath } from "../utils/fetchCatalogCategoryTreeFlat";
import { catalogStockToSelectionResult } from "../utils/catalogStockMapping";
import { stockMatchesDraftSnapshot } from "../utils/stockMatchesDraftSnapshot";
import { catalogStockMatchesQuery } from "@/lib/catalogStockSearch";
import { normalizeSearchText } from "@/lib/normalizeSearchText";
import type {
  CatalogLeftPanelTab,
  CatalogSessionPick,
  CatalogStockBrowseMode,
  CatalogStockLayoutMode,
  CatalogStockPickerParams,
} from "../types/catalogPicker";
import type { CatalogCategoryNodeDto, CatalogStockItemDto, ProductCatalogDto } from "../types";
import {
  CATALOG_FILTER_DIMENSIONS,
  createEmptySpecialCodeSelections,
  extractFilterDimensionOptions,
  hasSpecialCodeSelection,
  toggleSpecialCodeValue,
  type CatalogFilterDimension,
  type CatalogSpecialCodeOption,
} from "../utils/catalog-special-code-filter";
import { useCatalogSpecialCodeFacetPoolQuery } from "./useCatalogSpecialCodeFacetPoolQuery";
import { useCatalogSpecialCodeStocksQuery } from "./useCatalogSpecialCodeStocksQuery";
import { useCatalogCampaignStocksQuery } from "./useCatalogCampaignStocksQuery";
import { useCatalogCategoriesQuery } from "./useCatalogCategoriesQuery";
import { useCatalogCategoryStocksQuery } from "./useCatalogCategoryStocksQuery";
import { useCatalogCategoryTreeQuery } from "./useCatalogCategoryTreeQuery";
import { useCatalogFavoritesQuery } from "./useCatalogFavoritesQuery";
import { buildCatalogRelationMap, useCatalogStockRelationsQuery } from "./useCatalogStockRelationsQuery";
import { useCatalogsQuery } from "./useCatalogsQuery";

const PAGE_SIZE = 24;
const STOCK_SEARCH_DEBOUNCE_MS = 300;
const CATEGORY_SEARCH_DEBOUNCE_MS = 320;

const createPickId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createExpandedSpecialCodeSections = (): Record<CatalogFilterDimension, boolean> => ({
  grupKodu: true,
  kod1: false,
  kod2: false,
  kod3: false,
  kod4: false,
  kod5: false,
});

const createInitialState = () => ({
  activeTab: "codeFilters" as CatalogLeftPanelTab,
  specialCodeSelections: createEmptySpecialCodeSelections(),
  appliedSpecialCodeSelections: createEmptySpecialCodeSelections(),
  specialCodeFilterSearch: "",
  expandedSpecialCodeSections: createExpandedSpecialCodeSections(),
  mobileFiltersOpen: true,
  selectedCatalog: null as ProductCatalogDto | null,
  navigationPath: [] as CatalogCategoryNodeDto[],
  selectedLeafCategory: null as CatalogCategoryNodeDto | null,
  confirmedLeafCategory: null as CatalogCategoryNodeDto | null,
  catalogPaths: {} as Record<number, CatalogCategoryNodeDto[]>,
  expandedCatalogIds: new Set<number>(),
  includeDescendants: false,
  confirmedIncludeDescendants: false,
  stockBrowseMode: "specialCodes" as CatalogStockBrowseMode,
  stockLayoutMode: "cards" as CatalogStockLayoutMode,
  stockSearch: "",
  debouncedStockSearch: "",
  categoryClientSearch: "",
  debouncedCategoryClientSearch: "",
  categorySearchShowBranches: false,
  pageNumber: 1,
  sessionPicks: [] as CatalogSessionPick[],
  mobileCategoriesOpen: false,
  mobileStocksOpen: true,
  mobileCategoryToolsOpen: false,
  helperStripOpen: false,
  hierarchyInfoOpen: false,
  relatedDialogOpen: false,
  relatedDialogStock: null as CatalogStockItemDto | null,
  relatedDialogRelations: [] as StockRelationDto[],
});

export function useCatalogStockPicker(params: CatalogStockPickerParams) {
  const {
    open,
    multiSelect,
    pricingRuleType,
    pricingRuleCustomerId = null,
    pricingRuleErpCustomerCode = null,
    initialDraftSnapshot = [],
    existingLineStockMarkers = [],
    onSelect,
    onMultiSelect,
    onClose,
  } = params;

  const [state, setState] = useState(createInitialState);
  const initialDraftSnapshotRef = useRef<ProductSelectionResult[]>([]);
  const documentLinesSnapshotRef = useRef<ProductSelectionResult[]>([]);

  useEffect(() => {
    if (!open) {
      setState(createInitialState());
      initialDraftSnapshotRef.current = [];
      documentLinesSnapshotRef.current = [];
      return;
    }

    initialDraftSnapshotRef.current = [...initialDraftSnapshot];
    documentLinesSnapshotRef.current = [...existingLineStockMarkers];
    setState((prev) => ({
      ...createInitialState(),
      mobileStocksOpen: true,
    }));
  }, [existingLineStockMarkers, initialDraftSnapshot, open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, debouncedStockSearch: prev.stockSearch }));
    }, STOCK_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, state.stockSearch]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, debouncedCategoryClientSearch: prev.categoryClientSearch }));
    }, CATEGORY_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, state.categoryClientSearch]);

  useEffect(() => {
    if (!open) return;
    setState((prev) => ({ ...prev, pageNumber: 1 }));
  }, [
    open,
    state.activeTab,
    state.appliedSpecialCodeSelections,
    state.confirmedLeafCategory?.catalogCategoryId,
    state.debouncedStockSearch,
    state.confirmedIncludeDescendants,
    state.stockBrowseMode,
  ]);

  const catalogsQuery = useCatalogsQuery(open);
  const activeCatalogPath = state.selectedCatalog ? state.catalogPaths[state.selectedCatalog.id] ?? [] : [];
  const activeParentCategoryId =
    activeCatalogPath.length > 0
      ? activeCatalogPath[activeCatalogPath.length - 1]?.catalogCategoryId ?? null
      : null;

  const categoriesQuery = useCatalogCategoriesQuery({
    catalogId: state.selectedCatalog?.id ?? null,
    parentCatalogCategoryId: activeParentCategoryId,
    enabled:
      open &&
      state.selectedCatalog != null &&
      state.expandedCatalogIds.has(state.selectedCatalog.id),
  });

  const categoryTreeQuery = useCatalogCategoryTreeQuery({
    catalogId: state.selectedCatalog?.id ?? null,
    enabled: open && state.debouncedCategoryClientSearch.trim().length > 0,
  });

  const categoryStocksQuery = useCatalogCategoryStocksQuery({
    catalogId: state.selectedCatalog?.id ?? null,
    leafCategoryId: state.confirmedLeafCategory?.catalogCategoryId ?? null,
    includeDescendants: state.confirmedIncludeDescendants,
    search: state.debouncedStockSearch,
    enabled:
      open &&
      state.stockBrowseMode === "category" &&
      state.selectedCatalog != null &&
      state.confirmedLeafCategory != null,
  });

  const favoriteCatalogId =
    state.selectedCatalog?.id ?? catalogsQuery.data?.[0]?.id ?? null;

  const favoritesQuery = useCatalogFavoritesQuery({
    catalogId: favoriteCatalogId,
    search: state.debouncedStockSearch,
    enabled: open && state.stockBrowseMode === "favorites" && favoriteCatalogId != null,
  });

  const campaignQuery = useCatalogCampaignStocksQuery({
    enabled: open && state.stockBrowseMode === "campaign",
    pricingRuleType,
    customerId: pricingRuleCustomerId,
    erpCustomerCode: pricingRuleErpCustomerCode,
  });

  const facetPoolQuery = useCatalogSpecialCodeFacetPoolQuery(open && state.activeTab === "codeFilters");

  const specialCodeFacetOptions = useMemo(() => {
    const stocks = facetPoolQuery.data ?? [];
    const result = {} as Record<CatalogFilterDimension, CatalogSpecialCodeOption[]>;
    for (const dimension of CATALOG_FILTER_DIMENSIONS) {
      result[dimension] = extractFilterDimensionOptions(stocks, dimension);
    }
    return result;
  }, [facetPoolQuery.data]);

  const hasAppliedSpecialCodeSelection = hasSpecialCodeSelection(state.appliedSpecialCodeSelections);
  const hasDraftSpecialCodeSelection = hasSpecialCodeSelection(state.specialCodeSelections);

  const specialCodeStocksQuery = useCatalogSpecialCodeStocksQuery({
    enabled: open && state.activeTab === "codeFilters" && state.stockBrowseMode === "specialCodes",
    selections: state.appliedSpecialCodeSelections,
    search: state.debouncedStockSearch,
  });

  const specialCodeAllRows = useMemo(
    () => specialCodeStocksQuery.data?.rows ?? [],
    [specialCodeStocksQuery.data]
  );

  const specialCodeStockItems = useMemo(() => {
    return specialCodeAllRows.slice(0, state.pageNumber * PAGE_SIZE);
  }, [specialCodeAllRows, state.pageNumber]);

  const categoryStockItems = useMemo(
    () => categoryStocksQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [categoryStocksQuery.data]
  );

  const favoriteStockItems = useMemo(
    () => favoritesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [favoritesQuery.data]
  );

  const [favoriteItemsWithImages, setFavoriteItemsWithImages] = useState<CatalogStockItemDto[]>([]);

  useEffect(() => {
    if (!open || state.stockBrowseMode !== "favorites") {
      setFavoriteItemsWithImages([]);
      return;
    }

    let cancelled = false;

    const enrichImages = async (): Promise<void> => {
      const missingCodes = favoriteStockItems
        .filter((item) => !item.imageUrl)
        .map((item) => item.erpStockCode)
        .filter((code) => code.trim().length > 0);

      if (missingCodes.length === 0) {
        setFavoriteItemsWithImages(favoriteStockItems);
        return;
      }

      try {
        const stocks = await stockApi.getListByErpStockCodes(missingCodes);
        const imageByCode = new Map<string, string | null>();
        for (const stock of stocks) {
          const primary = stock.stockImages?.find((image) => image.isPrimary) ?? stock.stockImages?.[0];
          imageByCode.set(stock.erpStockCode.trim().toLowerCase(), primary?.filePath ?? null);
        }

        if (cancelled) return;

        setFavoriteItemsWithImages(
          favoriteStockItems.map((item) => {
            if (item.imageUrl) return item;
            const imageUrl = imageByCode.get(item.erpStockCode.trim().toLowerCase()) ?? null;
            return imageUrl ? { ...item, imageUrl } : item;
          })
        );
      } catch {
        if (!cancelled) {
          setFavoriteItemsWithImages(favoriteStockItems);
        }
      }
    };

    void enrichImages();

    return () => {
      cancelled = true;
    };
  }, [favoriteStockItems, open, state.stockBrowseMode]);

  const campaignFilteredItems = useMemo(() => {
    const items = campaignQuery.data?.items ?? [];
    const query = state.debouncedStockSearch.trim();
    if (!query) return items;
    return items.filter((item) => catalogStockMatchesQuery(item, query));
  }, [campaignQuery.data?.items, state.debouncedStockSearch]);

  const searchFilteredCategoryItems = useMemo(() => {
    const query = state.debouncedStockSearch.trim();
    if (!query) return categoryStockItems;
    return categoryStockItems.filter((item) => catalogStockMatchesQuery(item, query));
  }, [categoryStockItems, state.debouncedStockSearch]);

  const searchFilteredFavoriteItems = useMemo(() => {
    const query = state.debouncedStockSearch.trim();
    if (!query) return favoriteItemsWithImages;
    return favoriteItemsWithImages.filter((item) => catalogStockMatchesQuery(item, query));
  }, [favoriteItemsWithImages, state.debouncedStockSearch]);

  const campaignDisplayItems = useMemo(() => {
    const start = (state.pageNumber - 1) * PAGE_SIZE;
    return campaignFilteredItems.slice(start, start + PAGE_SIZE);
  }, [campaignFilteredItems, state.pageNumber]);

  const activeStockRows = useMemo(() => {
    if (state.stockBrowseMode === "campaign") return campaignDisplayItems;
    if (state.stockBrowseMode === "favorites") return searchFilteredFavoriteItems;
    if (state.activeTab === "codeFilters" && state.stockBrowseMode === "specialCodes") {
      return specialCodeStockItems;
    }
    return searchFilteredCategoryItems;
  }, [
    campaignDisplayItems,
    searchFilteredCategoryItems,
    searchFilteredFavoriteItems,
    specialCodeStockItems,
    state.activeTab,
    state.stockBrowseMode,
  ]);

  const relationsEnabled =
    open &&
    activeStockRows.length > 0 &&
    (state.stockBrowseMode === "campaign" ||
      state.stockBrowseMode === "favorites" ||
      (state.activeTab === "codeFilters" &&
        state.stockBrowseMode === "specialCodes" &&
        hasAppliedSpecialCodeSelection) ||
      (state.stockBrowseMode === "category" && state.confirmedLeafCategory != null));

  const relationQueries = useCatalogStockRelationsQuery({
    enabled: relationsEnabled,
    stocks: activeStockRows,
  });

  const relationMap = useMemo(
    () => buildCatalogRelationMap(activeStockRows, relationQueries),
    [activeStockRows, relationQueries]
  );

  const selectedKeys = useMemo(
    () => new Set(state.sessionPicks.map((pick) => getProductSelectionKey(pick.result))),
    [state.sessionPicks]
  );

  const selectCategoryInCatalog = useCallback(
    (catalog: ProductCatalogDto, category: CatalogCategoryNodeDto, branchPath?: CatalogCategoryNodeDto[]) => {
      setState((prev) => {
        const pathBase = prev.catalogPaths[catalog.id] ?? [];
        const nextPath = branchPath ?? (category.hasChildren ? [...pathBase, category] : pathBase);
        const nextExpanded = new Set(prev.expandedCatalogIds);
        nextExpanded.add(catalog.id);

        return {
          ...prev,
          stockBrowseMode: "category",
          selectedCatalog: catalog,
          selectedLeafCategory: category,
          includeDescendants: category.hasChildren,
          catalogPaths: { ...prev.catalogPaths, [catalog.id]: nextPath },
          navigationPath: nextPath,
          expandedCatalogIds: nextExpanded,
          mobileCategoriesOpen: true,
          mobileStocksOpen: true,
        };
      });
    },
    []
  );

  const confirmCategorySelection = useCallback(() => {
    setState((prev) => {
      if (!prev.selectedCatalog || !prev.selectedLeafCategory) return prev;

      return {
        ...prev,
        confirmedLeafCategory: prev.selectedLeafCategory,
        confirmedIncludeDescendants: prev.includeDescendants,
        stockLayoutMode: "cards",
        stockSearch: "",
        debouncedStockSearch: "",
        pageNumber: 1,
        mobileCategoriesOpen: false,
        mobileStocksOpen: true,
      };
    });
  }, []);

  const toggleCatalogExpanded = useCallback((catalog: ProductCatalogDto) => {
    setState((prev) => {
      const nextExpanded = new Set(prev.expandedCatalogIds);
      const isExpanded = nextExpanded.has(catalog.id);

      if (isExpanded) {
        nextExpanded.delete(catalog.id);
        const nextPaths = { ...prev.catalogPaths };
        delete nextPaths[catalog.id];

        const resetsSelected =
          prev.selectedCatalog?.id === catalog.id
            ? {
                selectedCatalog: null,
                navigationPath: [],
                selectedLeafCategory: null,
                confirmedLeafCategory: null,
                includeDescendants: false,
                confirmedIncludeDescendants: false,
                stockSearch: "",
                debouncedStockSearch: "",
                pageNumber: 1,
              }
            : {};

        return {
          ...prev,
          expandedCatalogIds: nextExpanded,
          catalogPaths: nextPaths,
          ...resetsSelected,
        };
      }

      const singleExpanded = new Set<number>([catalog.id]);
      const savedPath = prev.catalogPaths[catalog.id] ?? [];
      const leafFromPath = savedPath[savedPath.length - 1] ?? null;

      return {
        ...prev,
        expandedCatalogIds: singleExpanded,
        selectedCatalog: catalog,
        navigationPath: savedPath,
        selectedLeafCategory: leafFromPath,
        includeDescendants: leafFromPath?.hasChildren ?? false,
        categoryClientSearch: "",
        debouncedCategoryClientSearch: "",
        pageNumber: 1,
      };
    });
  }, []);

  const handleBreadcrumbPress = useCallback((endIndex: number) => {
    setState((prev) => {
      const nextPath = prev.navigationPath.slice(0, endIndex + 1);
      const leaf = nextPath[nextPath.length - 1] ?? null;
      const catalogId = prev.selectedCatalog?.id;
      return {
        ...prev,
        navigationPath: nextPath,
        selectedLeafCategory: leaf,
        includeDescendants: leaf?.hasChildren ?? false,
        stockBrowseMode: "category",
        stockLayoutMode: "cards",
        stockSearch: "",
        debouncedStockSearch: "",
        pageNumber: 1,
        catalogPaths: catalogId != null ? { ...prev.catalogPaths, [catalogId]: nextPath } : prev.catalogPaths,
      };
    });
  }, []);

  const handleCategoryBack = useCallback(() => {
    setState((prev) => {
      const nextPath = prev.navigationPath.slice(0, -1);
      const leaf = nextPath[nextPath.length - 1] ?? null;
      const catalogId = prev.selectedCatalog?.id;
      return {
        ...prev,
        navigationPath: nextPath,
        selectedLeafCategory: leaf,
        includeDescendants: leaf?.hasChildren ?? false,
        stockBrowseMode: "category",
        stockLayoutMode: "cards",
        stockSearch: "",
        debouncedStockSearch: "",
        pageNumber: 1,
        catalogPaths: catalogId != null ? { ...prev.catalogPaths, [catalogId]: nextPath } : prev.catalogPaths,
      };
    });
  }, []);

  const resetCategoryBranch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedCatalog: null,
      navigationPath: [],
      selectedLeafCategory: null,
      confirmedLeafCategory: null,
      catalogPaths: {},
      expandedCatalogIds: new Set<number>(),
      includeDescendants: false,
      confirmedIncludeDescendants: false,
      stockBrowseMode: "category",
      stockLayoutMode: "cards",
      stockSearch: "",
      debouncedStockSearch: "",
      categoryClientSearch: "",
      debouncedCategoryClientSearch: "",
      pageNumber: 1,
    }));
  }, []);

  const setStockBrowseMode = useCallback((mode: CatalogStockBrowseMode) => {
    setState((prev) => {
      const baseMode: CatalogStockBrowseMode =
        prev.activeTab === "codeFilters" ? "specialCodes" : "category";

      const nextMode: CatalogStockBrowseMode =
        mode === "category" || mode === "specialCodes"
          ? mode
          : prev.stockBrowseMode === mode
            ? baseMode
            : mode;

      const returningToBase = nextMode === "category" || nextMode === "specialCodes";

      return {
        ...prev,
        stockBrowseMode: nextMode,
        stockLayoutMode: "cards",
        pageNumber: 1,
        mobileCategoriesOpen: nextMode === "category" ? prev.mobileCategoriesOpen : false,
        mobileFiltersOpen: returningToBase ? prev.mobileFiltersOpen : false,
        mobileStocksOpen: true,
      };
    });
  }, []);

  const setActiveTab = useCallback((tab: CatalogLeftPanelTab) => {
    setState((prev) => {
      if (prev.activeTab === tab) return prev;

      if (tab === "codeFilters") {
        return {
          ...prev,
          activeTab: "codeFilters",
          stockBrowseMode: "specialCodes",
          stockLayoutMode: "cards",
          stockSearch: "",
          debouncedStockSearch: "",
          pageNumber: 1,
          mobileCategoriesOpen: false,
          mobileFiltersOpen: !hasSpecialCodeSelection(prev.appliedSpecialCodeSelections),
          mobileStocksOpen: true,
        };
      }

      return {
        ...prev,
        activeTab: "catalogTree",
        stockBrowseMode: prev.stockBrowseMode === "specialCodes" ? "category" : prev.stockBrowseMode,
        stockLayoutMode: "cards",
        stockSearch: "",
        debouncedStockSearch: "",
        pageNumber: 1,
        mobileFiltersOpen: false,
      };
    });
  }, []);

  const toggleSpecialCodeSelection = useCallback(
    (dimension: CatalogFilterDimension, value: string) => {
      setState((prev) => ({
        ...prev,
        specialCodeSelections: toggleSpecialCodeValue(prev.specialCodeSelections, dimension, value),
      }));
    },
    []
  );

  const toggleSpecialCodeSection = useCallback((dimension: CatalogFilterDimension) => {
    setState((prev) => ({
      ...prev,
      expandedSpecialCodeSections: {
        ...prev.expandedSpecialCodeSections,
        [dimension]: !prev.expandedSpecialCodeSections[dimension],
      },
    }));
  }, []);

  const setSpecialCodeFilterSearch = useCallback((value: string) => {
    setState((prev) => ({ ...prev, specialCodeFilterSearch: value }));
  }, []);

  const applySpecialCodeSelections = useCallback(() => {
    setState((prev) => {
      if (!hasSpecialCodeSelection(prev.specialCodeSelections)) {
        return { ...prev, mobileFiltersOpen: false };
      }

      return {
        ...prev,
        appliedSpecialCodeSelections: {
          grupKodu: [...prev.specialCodeSelections.grupKodu],
          kod1: [...prev.specialCodeSelections.kod1],
          kod2: [...prev.specialCodeSelections.kod2],
          kod3: [...prev.specialCodeSelections.kod3],
          kod4: [...prev.specialCodeSelections.kod4],
          kod5: [...prev.specialCodeSelections.kod5],
        },
        stockBrowseMode: "specialCodes",
        stockLayoutMode: "cards",
        stockSearch: "",
        debouncedStockSearch: "",
        pageNumber: 1,
        mobileFiltersOpen: false,
        mobileStocksOpen: true,
      };
    });
  }, []);

  const clearSpecialCodeSelections = useCallback(() => {
    setState((prev) => ({
      ...prev,
      specialCodeSelections: createEmptySpecialCodeSelections(),
      appliedSpecialCodeSelections: createEmptySpecialCodeSelections(),
      specialCodeFilterSearch: "",
      pageNumber: 1,
    }));
  }, []);

  const openSpecialCodeFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTab: "codeFilters",
      stockBrowseMode: "specialCodes",
      mobileCategoriesOpen: false,
      mobileFiltersOpen: true,
    }));
  }, []);

  const toggleSpecialCodeFiltersPanel = useCallback(() => {
    setState((prev) => {
      if (prev.mobileFiltersOpen && prev.activeTab === "codeFilters" && prev.stockBrowseMode === "specialCodes") {
        return { ...prev, mobileFiltersOpen: false };
      }

      return {
        ...prev,
        activeTab: "codeFilters",
        stockBrowseMode: "specialCodes",
        stockLayoutMode: "cards",
        mobileCategoriesOpen: false,
        mobileFiltersOpen: true,
        mobileStocksOpen: true,
      };
    });
  }, []);

  const closeSpecialCodeFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mobileFiltersOpen: false,
    }));
  }, []);

  const toggleCategoriesPanel = useCallback(() => {
    setState((prev) => {
      if (prev.mobileCategoriesOpen && prev.stockBrowseMode === "category") {
        return { ...prev, mobileCategoriesOpen: false };
      }

      return {
        ...prev,
        stockBrowseMode: "category",
        stockLayoutMode: "cards",
        mobileCategoriesOpen: true,
        mobileStocksOpen: true,
      };
    });
  }, []);

  const goToCategoryRoot = useCallback(() => {
    setState((prev) => {
      if (!prev.selectedCatalog) return prev;

      const catalogId = prev.selectedCatalog.id;
      return {
        ...prev,
        navigationPath: [],
        selectedLeafCategory: null,
        includeDescendants: false,
        catalogPaths: { ...prev.catalogPaths, [catalogId]: [] },
        categoryClientSearch: "",
        debouncedCategoryClientSearch: "",
        pageNumber: 1,
      };
    });
  }, []);

  const upsertSessionPickByStockKey = useCallback((result: ProductSelectionResult, pickId?: string) => {
    const key = getProductSelectionKey(result);
    setState((prev) => {
      const existingIndex = prev.sessionPicks.findIndex((pick) => getProductSelectionKey(pick.result) === key);
      if (existingIndex >= 0) {
        const next = [...prev.sessionPicks];
        next[existingIndex] = {
          pickId: next[existingIndex].pickId,
          result,
        };
        return { ...prev, sessionPicks: next };
      }

      return {
        ...prev,
        sessionPicks: [...prev.sessionPicks, { pickId: pickId ?? createPickId(), result }],
      };
    });
  }, []);

  const removeSessionPickById = useCallback((pickId: string) => {
    setState((prev) => ({
      ...prev,
      sessionPicks: prev.sessionPicks.filter((pick) => pick.pickId !== pickId),
    }));
  }, []);

  const duplicateSessionPickById = useCallback((pickId: string) => {
    setState((prev) => {
      const source = prev.sessionPicks.find((pick) => pick.pickId === pickId);
      if (!source) return prev;
      return {
        ...prev,
        sessionPicks: [...prev.sessionPicks, { pickId: createPickId(), result: source.result }],
      };
    });
  }, []);

  const addSessionPick = useCallback((result: ProductSelectionResult) => {
    setState((prev) => ({
      ...prev,
      sessionPicks: [...prev.sessionPicks, { pickId: createPickId(), result }],
    }));
  }, []);

  const getStockSelectionCount = useCallback(
    (stock: CatalogStockItemDto): number => {
      const key = getProductSelectionKey({ id: stock.stockId, code: stock.erpStockCode });
      return state.sessionPicks.filter((pick) => getProductSelectionKey(pick.result) === key).length;
    },
    [state.sessionPicks]
  );

  const incrementStockPick = useCallback(
    (stock: CatalogStockItemDto) => {
      const relations = relationMap[stock.stockId] ?? [];
      const result = catalogStockToSelectionResult(stock, undefined, getCurrentLanguage());
      const key = getProductSelectionKey(result);
      const matchingPick = state.sessionPicks.find((pick) => getProductSelectionKey(pick.result) === key);

      if (relations.length > 0 && !matchingPick) {
        setState((prev) => ({
          ...prev,
          relatedDialogOpen: true,
          relatedDialogStock: stock,
          relatedDialogRelations: relations,
        }));
        return;
      }

      if (matchingPick) {
        duplicateSessionPickById(matchingPick.pickId);
        return;
      }

      addSessionPick(result);
    },
    [addSessionPick, duplicateSessionPickById, relationMap, state.sessionPicks]
  );

  const decrementStockPick = useCallback(
    (stock: CatalogStockItemDto) => {
      const key = getProductSelectionKey({ id: stock.stockId, code: stock.erpStockCode });
      const matchingPicks = state.sessionPicks.filter((pick) => getProductSelectionKey(pick.result) === key);
      const lastPick = matchingPicks[matchingPicks.length - 1];
      if (!lastPick) return;
      removeSessionPickById(lastPick.pickId);
    },
    [removeSessionPickById, state.sessionPicks]
  );

  const handleRelatedConfirm = useCallback(
    (selectedIds: number[]) => {
      const stock = state.relatedDialogStock;
      if (!stock) return;

      const result = catalogStockToSelectionResult(stock, selectedIds, getCurrentLanguage());
      if (multiSelect) {
        upsertSessionPickByStockKey(result);
        setState((prev) => ({
          ...prev,
          relatedDialogOpen: false,
          relatedDialogStock: null,
          relatedDialogRelations: [],
        }));
        return;
      }

      void Promise.resolve(onSelect?.(result)).then(() => {
        onClose();
      });
    },
    [multiSelect, onClose, onSelect, state.relatedDialogStock, upsertSessionPickByStockKey]
  );

  const handleStockPress = useCallback(
    (stock: CatalogStockItemDto) => {
      const relations = relationMap[stock.stockId] ?? [];
      if (relations.length > 0) {
        setState((prev) => ({
          ...prev,
          relatedDialogOpen: true,
          relatedDialogStock: stock,
          relatedDialogRelations: relations,
        }));
        return;
      }

      const result = catalogStockToSelectionResult(stock, undefined, getCurrentLanguage());
      if (!multiSelect) {
        void Promise.resolve(onSelect?.(result)).then(() => {
          onClose();
        });
        return;
      }

      if (getStockSelectionCount(stock) === 0) {
        addSessionPick(result);
      }
    },
    [addSessionPick, getStockSelectionCount, multiSelect, onClose, onSelect, relationMap]
  );

  const handleConfirmMulti = useCallback(async () => {
    const merged = [
      ...initialDraftSnapshotRef.current,
      ...state.sessionPicks.map((pick) => pick.result),
    ];

    if (merged.length === 0 || !onMultiSelect) return;
    await Promise.resolve(onMultiSelect(merged));
    onClose();
  }, [onClose, onMultiSelect, state.sessionPicks]);

  const handleCategorySearchSelect = useCallback(
    (categoryId: number) => {
      if (!state.selectedCatalog || !categoryTreeQuery.data) return;
      const chain = buildCategoryBranchPath(categoryTreeQuery.data, categoryId);
      const target = chain[chain.length - 1];
      if (!target) return;
      const branchPath = target.hasChildren ? chain : chain.slice(0, -1);
      selectCategoryInCatalog(state.selectedCatalog, target, branchPath);
      setState((prev) => ({ ...prev, categoryClientSearch: "", debouncedCategoryClientSearch: "" }));
    },
    [categoryTreeQuery.data, selectCategoryInCatalog, state.selectedCatalog]
  );

  const categorySearchResults = useMemo(() => {
    const query = normalizeSearchText(state.debouncedCategoryClientSearch);
    if (!query || !categoryTreeQuery.data) return [];
    return categoryTreeQuery.data
      .filter((node) => normalizeSearchText(node.name).includes(query))
      .slice(0, 30);
  }, [categoryTreeQuery.data, state.debouncedCategoryClientSearch]);

  const isSpecialCodeMode =
    state.activeTab === "codeFilters" && state.stockBrowseMode === "specialCodes";

  const activeStockLoading =
    state.stockBrowseMode === "campaign"
      ? campaignQuery.isLoading
      : state.stockBrowseMode === "favorites"
        ? favoritesQuery.isLoading
        : isSpecialCodeMode
          ? specialCodeStocksQuery.isLoading || specialCodeStocksQuery.isFetching
          : categoryStocksQuery.isLoading;

  const activeStockHasNextPage =
    state.stockBrowseMode === "campaign"
      ? state.pageNumber * PAGE_SIZE < campaignFilteredItems.length
      : state.stockBrowseMode === "favorites"
        ? Boolean(favoritesQuery.hasNextPage)
        : isSpecialCodeMode
          ? state.pageNumber * PAGE_SIZE < specialCodeAllRows.length
          : Boolean(categoryStocksQuery.hasNextPage);

  const loadMoreStocks = useCallback(() => {
    if (state.stockBrowseMode === "campaign") {
      setState((prev) => ({ ...prev, pageNumber: prev.pageNumber + 1 }));
      return;
    }

    if (isSpecialCodeMode) {
      setState((prev) => ({ ...prev, pageNumber: prev.pageNumber + 1 }));
      return;
    }

    if (state.stockBrowseMode === "favorites") {
      if (favoritesQuery.hasNextPage && !favoritesQuery.isFetchingNextPage) {
        void favoritesQuery.fetchNextPage();
      }
      return;
    }

    if (categoryStocksQuery.hasNextPage && !categoryStocksQuery.isFetchingNextPage) {
      void categoryStocksQuery.fetchNextPage();
    }
  }, [categoryStocksQuery, favoritesQuery, isSpecialCodeMode, state.stockBrowseMode]);

  const isAlreadyInDraft = useCallback(
    (stock: CatalogStockItemDto) => stockMatchesDraftSnapshot(stock, initialDraftSnapshotRef.current),
    []
  );

  const isAlreadyOnLine = useCallback(
    (stock: CatalogStockItemDto) => stockMatchesDraftSnapshot(stock, documentLinesSnapshotRef.current),
    []
  );

  const isSelected = useCallback(
    (stock: CatalogStockItemDto) => selectedKeys.has(getProductSelectionKey({ id: stock.stockId, code: stock.erpStockCode })),
    [selectedKeys]
  );

  const canConfirmMulti =
    initialDraftSnapshotRef.current.length > 0 || state.sessionPicks.length > 0;

  return {
    catalogs: catalogsQuery.data ?? [],
    catalogsLoading: catalogsQuery.isLoading,
    categories: categoriesQuery.data ?? [],
    categoriesLoading: categoriesQuery.isLoading,
    categorySearchResults,
    categoryTreeLoading: categoryTreeQuery.isLoading,
    activeStockRows,
    activeStockLoading,
    activeStockHasNextPage,
    activeStockFetchingNextPage:
      state.stockBrowseMode === "favorites"
        ? favoritesQuery.isFetchingNextPage
        : categoryStocksQuery.isFetchingNextPage,
    campaignPricingByCodeLower: campaignQuery.data?.pricingByCodeLower ?? {},
    relationMap,
    selectedKeys,
    canConfirmMulti,
    specialCodeFacetOptions,
    specialCodeFacetLoading: facetPoolQuery.isLoading,
    specialCodeTotalCount: specialCodeAllRows.length,
    hasAppliedSpecialCodeSelection,
    hasDraftSpecialCodeSelection,
    ...state,
    setStockSearch: (value: string) => setState((prev) => ({ ...prev, stockSearch: value })),
    setCategoryClientSearch: (value: string) => setState((prev) => ({ ...prev, categoryClientSearch: value })),
    setStockLayoutMode: (mode: CatalogStockLayoutMode) => setState((prev) => ({ ...prev, stockLayoutMode: mode })),
    setMobileCategoriesOpen: (value: boolean) => setState((prev) => ({ ...prev, mobileCategoriesOpen: value })),
    setHelperStripOpen: (value: boolean) => setState((prev) => ({ ...prev, helperStripOpen: value })),
    setHierarchyInfoOpen: (value: boolean) => setState((prev) => ({ ...prev, hierarchyInfoOpen: value })),
    toggleCatalogExpanded,
    selectCategoryInCatalog,
    confirmCategorySelection,
    handleBreadcrumbPress,
    handleCategoryBack,
    resetCategoryBranch,
    setStockBrowseMode,
    setActiveTab,
    toggleSpecialCodeSelection,
    toggleSpecialCodeSection,
    setSpecialCodeFilterSearch,
    applySpecialCodeSelections,
    clearSpecialCodeSelections,
    openSpecialCodeFilters,
    toggleSpecialCodeFiltersPanel,
    closeSpecialCodeFilters,
    toggleCategoriesPanel,
    goToCategoryRoot,
    handleStockPress,
    handleConfirmMulti,
    handleRelatedConfirm,
    removeSessionPickById,
    duplicateSessionPickById,
    getStockSelectionCount,
    incrementStockPick,
    decrementStockPick,
    loadMoreStocks,
    handleCategorySearchSelect,
    closeRelatedDialog: () =>
      setState((prev) => ({
        ...prev,
        relatedDialogOpen: false,
        relatedDialogStock: null,
        relatedDialogRelations: [],
      })),
    isAlreadyInDraft,
    isAlreadyOnLine,
    isSelected,
    onClose,
  };
}
