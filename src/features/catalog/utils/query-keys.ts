import type { CatalogPricingRuleType } from "../types/catalog-picker";
import type { CatalogSpecialCodeSelections } from "./catalog-special-code-filter";

export const catalogQueryKeys = {
  all: () => ["catalog"] as const,
  catalogs: () => [...catalogQueryKeys.all(), "catalogs"] as const,
  categories: (catalogId: number | null, parentCatalogCategoryId: number | null) =>
    [...catalogQueryKeys.all(), "categories", catalogId, parentCatalogCategoryId] as const,
  categoryStocks: (
    catalogId: number | null,
    leafCategoryId: number | null,
    includeDescendants: boolean,
    search: string
  ) => [
    ...catalogQueryKeys.all(),
    "category-stocks",
    catalogId,
    leafCategoryId,
    includeDescendants,
    search,
  ] as const,
  categoryTree: (catalogId: number | null) =>
    [...catalogQueryKeys.all(), "category-tree", catalogId] as const,
  favorites: (catalogId: number | null, search: string) =>
    [...catalogQueryKeys.all(), "favorites", catalogId, search] as const,
  campaign: (
    pricingRuleType: CatalogPricingRuleType,
    customerId: number | null | undefined,
    erpCustomerCode: string | null | undefined
  ) => [...catalogQueryKeys.all(), "campaign", pricingRuleType, customerId, erpCustomerCode] as const,
  specialCodeFacetPool: () => [...catalogQueryKeys.all(), "special-code-facet-pool"] as const,
  specialCodeStocks: (selections: CatalogSpecialCodeSelections, search: string) =>
    [...catalogQueryKeys.all(), "special-code-stocks", selections, search] as const,
  stockRelations: (stockId: number) =>
    [...catalogQueryKeys.all(), "stock-relations", stockId] as const,
};
