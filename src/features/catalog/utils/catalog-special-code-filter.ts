import type { PagedFilter, StockGetDto } from "@/features/stocks/types";
import { normalizeSearchText } from "@/lib/normalizeSearchText";

export type CatalogFilterDimension = "grupKodu" | "kod1" | "kod2" | "kod3" | "kod4" | "kod5";

export const CATALOG_FILTER_DIMENSIONS: readonly CatalogFilterDimension[] = [
  "grupKodu",
  "kod1",
  "kod2",
  "kod3",
  "kod4",
  "kod5",
] as const;

export type CatalogSpecialCodeSelections = Record<CatalogFilterDimension, string[]>;

export interface CatalogSpecialCodeOption {
  value: string;
  label: string;
}

export const CATALOG_SPECIAL_CODE_FACET_POOL_SIZE = 800;
export const SPECIAL_CODE_MERGE_FETCH_SIZE = 2000;
export const MAX_OR_BRANCH_REQUESTS = 20;
export const CATALOG_SPECIAL_CODE_PAGE_SIZE = 24;

export function createEmptySpecialCodeSelections(): CatalogSpecialCodeSelections {
  return {
    grupKodu: [],
    kod1: [],
    kod2: [],
    kod3: [],
    kod4: [],
    kod5: [],
  };
}

export function hasSpecialCodeSelection(selections: CatalogSpecialCodeSelections): boolean {
  return CATALOG_FILTER_DIMENSIONS.some((dimension) => selections[dimension].length > 0);
}

export function countSpecialCodeSelections(selections: CatalogSpecialCodeSelections): number {
  return CATALOG_FILTER_DIMENSIONS.reduce((total, dimension) => total + selections[dimension].length, 0);
}

export function toggleSpecialCodeValue(
  selections: CatalogSpecialCodeSelections,
  dimension: CatalogFilterDimension,
  value: string
): CatalogSpecialCodeSelections {
  const current = selections[dimension];
  const exists = current.includes(value);
  const nextValues = exists ? current.filter((entry) => entry !== value) : [...current, value];

  return {
    ...selections,
    [dimension]: nextValues,
  };
}

const DIMENSION_NAME_FIELD: Record<CatalogFilterDimension, keyof StockGetDto> = {
  grupKodu: "grupAdi",
  kod1: "kod1Adi",
  kod2: "kod2Adi",
  kod3: "kod3Adi",
  kod4: "kod4Adi",
  kod5: "kod5Adi",
};

export function getFilterDimensionValue(
  stock: StockGetDto,
  dimension: CatalogFilterDimension
): string {
  const raw = stock[dimension];
  return typeof raw === "string" ? raw.trim() : "";
}

function getFilterDimensionName(stock: StockGetDto, dimension: CatalogFilterDimension): string {
  const raw = stock[DIMENSION_NAME_FIELD[dimension]];
  return typeof raw === "string" ? raw.trim() : "";
}

export function stockMatchesIndependentFacetSelections(
  stock: StockGetDto,
  selections: CatalogSpecialCodeSelections
): boolean {
  return CATALOG_FILTER_DIMENSIONS.every((dimension) => {
    const selectedValues = selections[dimension];
    if (selectedValues.length === 0) return true;

    const value = getFilterDimensionValue(stock, dimension);
    if (!value) return false;

    return selectedValues.includes(value);
  });
}

export function extractFilterDimensionOptions(
  stocks: StockGetDto[],
  dimension: CatalogFilterDimension
): CatalogSpecialCodeOption[] {
  const labelByValue = new Map<string, string>();

  for (const stock of stocks) {
    const value = getFilterDimensionValue(stock, dimension);
    if (!value) continue;
    if (labelByValue.has(value)) continue;

    const name = getFilterDimensionName(stock, dimension);
    labelByValue.set(value, name ? `${value} - ${name}` : value);
  }

  return Array.from(labelByValue.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "tr"));
}

export function optionMatchesFilterSearch(
  option: CatalogSpecialCodeOption,
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return true;
  return (
    normalizeSearchText(option.label).includes(normalizedQuery) ||
    normalizeSearchText(option.value).includes(normalizedQuery)
  );
}

export function toCatalogStockApiSearch(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const normalized = normalizeSearchText(trimmed);
  return normalized || trimmed;
}

function buildEqualsFilter(dimension: CatalogFilterDimension, value: string): PagedFilter {
  return { column: dimension, operator: "Equals", value };
}

export function buildSingleValueFilters(selections: CatalogSpecialCodeSelections): PagedFilter[] {
  const filters: PagedFilter[] = [];

  for (const dimension of CATALOG_FILTER_DIMENSIONS) {
    const values = selections[dimension];
    if (values.length === 1) {
      filters.push(buildEqualsFilter(dimension, values[0]));
    }
  }

  return filters;
}

export function getOrDimensions(selections: CatalogSpecialCodeSelections): CatalogFilterDimension[] {
  return CATALOG_FILTER_DIMENSIONS.filter((dimension) => selections[dimension].length > 1);
}

export function buildOrBranchFilterSets(
  orDimensions: CatalogFilterDimension[],
  selections: CatalogSpecialCodeSelections
): PagedFilter[][] {
  let branches: PagedFilter[][] = [[]];

  for (const dimension of orDimensions) {
    const values = selections[dimension];
    const nextBranches: PagedFilter[][] = [];

    for (const branch of branches) {
      for (const value of values) {
        nextBranches.push([...branch, buildEqualsFilter(dimension, value)]);
      }
    }

    branches = nextBranches;
  }

  return branches;
}

export function countOrBranches(selections: CatalogSpecialCodeSelections): number {
  return getOrDimensions(selections).reduce(
    (total, dimension) => total * selections[dimension].length,
    1
  );
}
