import {
  buildOrBranchFilterSets,
  buildSingleValueFilters,
  countOrBranches,
  getOrDimensions,
  MAX_OR_BRANCH_REQUESTS,
  SPECIAL_CODE_MERGE_FETCH_SIZE,
  stockMatchesIndependentFacetSelections,
  toCatalogStockApiSearch,
  type CatalogSpecialCodeSelections,
} from "@/features/catalog";
import { stockApi } from "../api/stockApi";
import type { PagedFilter, PagedResponse, StockGetDto } from "../types";

export interface FetchStockListWithCodeFiltersParams {
  pageNumber: number;
  pageSize: number;
  search?: string;
  additionalFilters?: PagedFilter[];
  filterLogic?: "and" | "or";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

function resolveSortValue(stock: StockGetDto, sortBy: string): string | number {
  if (sortBy === "createdDate") {
    return stock.createdDate ?? "";
  }
  if (sortBy === "stockName") {
    return stock.stockName ?? "";
  }
  if (sortBy === "Id" || sortBy === "id") {
    return stock.id;
  }
  return stock.stockName ?? "";
}

function sortStockRows(
  stocks: StockGetDto[],
  sortBy: string,
  sortDirection: "asc" | "desc"
): StockGetDto[] {
  const direction = sortDirection === "asc" ? 1 : -1;
  return [...stocks].sort((left, right) => {
    const leftValue = resolveSortValue(left, sortBy);
    const rightValue = resolveSortValue(right, sortBy);
    if (leftValue < rightValue) return -1 * direction;
    if (leftValue > rightValue) return 1 * direction;
    return left.id - right.id;
  });
}

async function fetchAllMatchingStocks(
  selections: CatalogSpecialCodeSelections,
  options: Pick<FetchStockListWithCodeFiltersParams, "search" | "additionalFilters" | "filterLogic">
): Promise<StockGetDto[]> {
  const search = toCatalogStockApiSearch(options.search ?? "");
  const additionalFilters = options.additionalFilters ?? [];
  const filterLogic = options.filterLogic ?? "and";
  const baseFilters = [...buildSingleValueFilters(selections), ...additionalFilters];
  const orDimensions = getOrDimensions(selections);

  const dedupeAndFinalize = (stocks: StockGetDto[]): StockGetDto[] => {
    const byId = new Map<number, StockGetDto>();
    for (const stock of stocks) {
      if (!byId.has(stock.id)) {
        byId.set(stock.id, stock);
      }
    }
    return Array.from(byId.values()).filter((stock) =>
      stockMatchesIndependentFacetSelections(stock, selections)
    );
  };

  const requestPage = (filters: PagedFilter[]) =>
    stockApi.getListWithImages({
      pageNumber: 1,
      pageSize: SPECIAL_CODE_MERGE_FETCH_SIZE,
      search,
      sortBy: "Id",
      sortDirection: "desc",
      filterLogic,
      filters,
    });

  if (orDimensions.length === 0) {
    const response = await requestPage(baseFilters);
    return dedupeAndFinalize(response.items);
  }

  if (countOrBranches(selections) > MAX_OR_BRANCH_REQUESTS) {
    const response = await requestPage(baseFilters);
    return dedupeAndFinalize(response.items);
  }

  const branchFilterSets = buildOrBranchFilterSets(orDimensions, selections);
  const branchResponses = await Promise.all(
    branchFilterSets.map((branchFilters) => requestPage([...baseFilters, ...branchFilters]))
  );

  return dedupeAndFinalize(branchResponses.flatMap((response) => response.items));
}

export async function fetchStockListWithCodeFilters(
  selections: CatalogSpecialCodeSelections,
  params: FetchStockListWithCodeFiltersParams
): Promise<PagedResponse<StockGetDto>> {
  const matched = await fetchAllMatchingStocks(selections, params);
  const sorted = sortStockRows(matched, params.sortBy ?? "createdDate", params.sortDirection ?? "desc");
  const totalCount = sorted.length;
  const pageNumber = params.pageNumber;
  const pageSize = params.pageSize;
  const start = (pageNumber - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    items,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
    hasPreviousPage: pageNumber > 1,
    hasNextPage: start + pageSize < totalCount,
  };
}
