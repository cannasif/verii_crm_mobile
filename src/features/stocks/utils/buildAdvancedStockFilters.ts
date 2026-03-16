import type { PagedFilter, PagedParams } from "../types";

type FilterLogic = NonNullable<PagedParams["filterLogic"]>;

interface AdvancedFilterInput {
  column: string;
  operator: string;
  value: string;
}

interface AdvancedFilterResult {
  filters: PagedFilter[];
  filterLogic?: FilterLogic;
}

function splitTokens(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function buildAdvancedStockFilters(entries: AdvancedFilterInput[]): AdvancedFilterResult {
  const activeEntries = entries
    .map((entry) => ({
      column: entry.column,
      operator: entry.operator,
      value: entry.value.trim(),
    }))
    .filter((entry) => entry.value.length > 0);

  if (activeEntries.length !== 1) {
    return {
      filters: activeEntries,
      filterLogic: activeEntries.length > 0 ? "or" : undefined,
    };
  }

  const [singleEntry] = activeEntries;
  if (singleEntry.operator !== "contains") {
    return {
      filters: activeEntries,
      filterLogic: "or",
    };
  }

  const tokens = splitTokens(singleEntry.value);
  if (tokens.length <= 1) {
    return {
      filters: activeEntries,
      filterLogic: "or",
    };
  }

  return {
    filters: tokens.map((token) => ({
      column: singleEntry.column,
      operator: singleEntry.operator,
      value: token,
    })),
    filterLogic: "or",
  };
}
