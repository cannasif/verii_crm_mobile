import { stockApi } from "@/features/stocks/api/stockApi";
import type { StockGetDto } from "@/features/stocks/types";
import type { CatalogStockItemDto } from "../types";
import { mapStockGetToCatalogItem } from "./catalogStockMapping";
import {
  buildOrBranchFilterSets,
  buildSingleValueFilters,
  CATALOG_SPECIAL_CODE_FACET_POOL_SIZE,
  countOrBranches,
  getOrDimensions,
  MAX_OR_BRANCH_REQUESTS,
  SPECIAL_CODE_MERGE_FETCH_SIZE,
  stockMatchesIndependentFacetSelections,
  toCatalogStockApiSearch,
  type CatalogSpecialCodeSelections,
} from "./catalog-special-code-filter";

export interface CatalogSpecialCodeStockResult {
  rows: CatalogStockItemDto[];
  totalCount: number;
}

export async function fetchCatalogSpecialCodeFacetPool(): Promise<StockGetDto[]> {
  const response = await stockApi.getList({
    pageNumber: 1,
    pageSize: CATALOG_SPECIAL_CODE_FACET_POOL_SIZE,
    search: "",
    sortBy: "Id",
    sortDirection: "desc",
    filterLogic: "and",
    filters: [],
  });

  return response.items;
}

export async function fetchCatalogSpecialCodeStocks(
  selections: CatalogSpecialCodeSelections,
  rawSearch: string
): Promise<CatalogSpecialCodeStockResult> {
  const search = toCatalogStockApiSearch(rawSearch);
  const singleFilters = buildSingleValueFilters(selections);
  const orDimensions = getOrDimensions(selections);

  const dedupeAndFinalize = (stocks: StockGetDto[]): CatalogSpecialCodeStockResult => {
    const byId = new Map<number, StockGetDto>();
    for (const stock of stocks) {
      if (!byId.has(stock.id)) {
        byId.set(stock.id, stock);
      }
    }

    const matched = Array.from(byId.values()).filter((stock) =>
      stockMatchesIndependentFacetSelections(stock, selections)
    );

    return {
      rows: matched.map(mapStockGetToCatalogItem),
      totalCount: matched.length,
    };
  };

  if (orDimensions.length === 0) {
    const response = await stockApi.getListWithImages({
      pageNumber: 1,
      pageSize: SPECIAL_CODE_MERGE_FETCH_SIZE,
      search,
      sortBy: "Id",
      sortDirection: "desc",
      filterLogic: "and",
      filters: singleFilters,
    });

    return dedupeAndFinalize(response.items);
  }

  const branchCount = countOrBranches(selections);

  if (branchCount > MAX_OR_BRANCH_REQUESTS) {
    const response = await stockApi.getListWithImages({
      pageNumber: 1,
      pageSize: SPECIAL_CODE_MERGE_FETCH_SIZE,
      search,
      sortBy: "Id",
      sortDirection: "desc",
      filterLogic: "and",
      filters: singleFilters,
    });

    return dedupeAndFinalize(response.items);
  }

  const branchFilterSets = buildOrBranchFilterSets(orDimensions, selections);

  const branchResponses = await Promise.all(
    branchFilterSets.map((branchFilters) =>
      stockApi.getListWithImages({
        pageNumber: 1,
        pageSize: SPECIAL_CODE_MERGE_FETCH_SIZE,
        search,
        sortBy: "Id",
        sortDirection: "desc",
        filterLogic: "and",
        filters: [...singleFilters, ...branchFilters],
      })
    )
  );

  const mergedStocks = branchResponses.flatMap((response) => response.items);
  return dedupeAndFinalize(mergedStocks);
}
