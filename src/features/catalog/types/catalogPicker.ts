import type { ProductSelectionResult } from "@/features/stocks/types";
import type { CatalogCategoryNodeDto, CatalogStockItemDto, ProductCatalogDto } from "./index";
import type {
  CatalogFilterDimension,
  CatalogSpecialCodeSelections,
} from "../utils/catalog-special-code-filter";

export type CatalogStockBrowseMode = "category" | "specialCodes" | "campaign" | "favorites";
export type CatalogStockLayoutMode = "cards" | "list";
export type CatalogPricingRuleType = "Demand" | "Quotation" | "Order";
export type CatalogLeftPanelTab = "codeFilters" | "catalogTree";

export interface CatalogSessionPick {
  pickId: string;
  result: ProductSelectionResult;
}

export interface CatalogCampaignPricingDisplay {
  referencePrice?: number | null;
  netPrice?: number | null;
  discountRate1?: number | null;
  discountRate2?: number | null;
  discountRate3?: number | null;
  discountAmount1?: number | null;
  discountAmount2?: number | null;
  discountAmount3?: number | null;
  currencyCode?: string | null;
}

export interface CatalogStockPickerParams {
  open: boolean;
  multiSelect: boolean;
  pricingRuleType: CatalogPricingRuleType;
  pricingRuleCustomerId?: number | null;
  pricingRuleErpCustomerCode?: string | null;
  initialDraftSnapshot?: ProductSelectionResult[];
  existingLineStockMarkers?: ProductSelectionResult[];
  onSelect?: (result: ProductSelectionResult) => void | Promise<void>;
  onMultiSelect?: (results: ProductSelectionResult[]) => void | Promise<void>;
  onClose: () => void;
}

export interface CatalogStockPickerState {
  activeTab: CatalogLeftPanelTab;
  specialCodeSelections: CatalogSpecialCodeSelections;
  appliedSpecialCodeSelections: CatalogSpecialCodeSelections;
  specialCodeFilterSearch: string;
  expandedSpecialCodeSections: Record<CatalogFilterDimension, boolean>;
  mobileFiltersOpen: boolean;
  selectedCatalog: ProductCatalogDto | null;
  navigationPath: CatalogCategoryNodeDto[];
  selectedLeafCategory: CatalogCategoryNodeDto | null;
  confirmedLeafCategory: CatalogCategoryNodeDto | null;
  catalogPaths: Record<number, CatalogCategoryNodeDto[]>;
  expandedCatalogIds: Set<number>;
  includeDescendants: boolean;
  confirmedIncludeDescendants: boolean;
  stockBrowseMode: CatalogStockBrowseMode;
  stockLayoutMode: CatalogStockLayoutMode;
  stockSearch: string;
  debouncedStockSearch: string;
  categoryClientSearch: string;
  debouncedCategoryClientSearch: string;
  categorySearchShowBranches: boolean;
  pageNumber: number;
  sessionPicks: CatalogSessionPick[];
  mobileCategoriesOpen: boolean;
  mobileStocksOpen: boolean;
  mobileCategoryToolsOpen: boolean;
  helperStripOpen: boolean;
  hierarchyInfoOpen: boolean;
  relatedDialogOpen: boolean;
  relatedDialogStock: CatalogStockItemDto | null;
}

export interface CatalogCategoryTreeNode extends CatalogCategoryNodeDto {
  parentCatalogCategoryId: number | null;
  children: CatalogCategoryTreeNode[];
}
