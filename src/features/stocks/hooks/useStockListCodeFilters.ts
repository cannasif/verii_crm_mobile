import { useCallback, useMemo, useState } from "react";
import {
  CATALOG_FILTER_DIMENSIONS,
  countSpecialCodeSelections,
  createEmptySpecialCodeSelections,
  extractFilterDimensionOptions,
  fetchCatalogSpecialCodeFacetPool,
  hasSpecialCodeSelection,
  toggleSpecialCodeValue,
  type CatalogFilterDimension,
  type CatalogSpecialCodeOption,
  type CatalogSpecialCodeSelections,
} from "@/features/catalog";
import { useQuery } from "@tanstack/react-query";

interface UseStockListCodeFiltersParams {
  facetPoolEnabled?: boolean;
}

function cloneSelections(selections: CatalogSpecialCodeSelections): CatalogSpecialCodeSelections {
  return {
    grupKodu: [...selections.grupKodu],
    kod1: [...selections.kod1],
    kod2: [...selections.kod2],
    kod3: [...selections.kod3],
    kod4: [...selections.kod4],
    kod5: [...selections.kod5],
  };
}

function createDefaultExpandedSections(): Record<CatalogFilterDimension, boolean> {
  return {
    grupKodu: true,
    kod1: false,
    kod2: false,
    kod3: false,
    kod4: false,
    kod5: false,
  };
}

export function useStockListCodeFilters(params: UseStockListCodeFiltersParams = {}) {
  const { facetPoolEnabled = false } = params;
  const [draftSelections, setDraftSelections] = useState<CatalogSpecialCodeSelections>(
    createEmptySpecialCodeSelections()
  );
  const [appliedSelections, setAppliedSelections] = useState<CatalogSpecialCodeSelections>(
    createEmptySpecialCodeSelections()
  );
  const [filterSearch, setFilterSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState(createDefaultExpandedSections);

  const facetPoolQuery = useQuery({
    queryKey: ["stock", "list", "code-facet-pool"],
    queryFn: fetchCatalogSpecialCodeFacetPool,
    staleTime: 120_000,
    enabled: facetPoolEnabled,
  });

  const facetOptions = useMemo(() => {
    const stocks = facetPoolQuery.data ?? [];
    const result = {} as Record<CatalogFilterDimension, CatalogSpecialCodeOption[]>;
    for (const dimension of CATALOG_FILTER_DIMENSIONS) {
      result[dimension] = extractFilterDimensionOptions(stocks, dimension);
    }
    return result;
  }, [facetPoolQuery.data]);

  const appliedCount = countSpecialCodeSelections(appliedSelections);
  const draftCount = countSpecialCodeSelections(draftSelections);
  const hasAppliedSelection = hasSpecialCodeSelection(appliedSelections);
  const hasDraftSelection = hasSpecialCodeSelection(draftSelections);

  const syncDraftFromApplied = useCallback(() => {
    setDraftSelections(cloneSelections(appliedSelections));
  }, [appliedSelections]);

  const toggleSelection = useCallback((dimension: CatalogFilterDimension, value: string) => {
    setDraftSelections((prev) => toggleSpecialCodeValue(prev, dimension, value));
  }, []);

  const toggleSection = useCallback((dimension: CatalogFilterDimension) => {
    setExpandedSections((prev) => ({
      ...prev,
      [dimension]: !prev[dimension],
    }));
  }, []);

  const applyDraft = useCallback(() => {
    setAppliedSelections(cloneSelections(draftSelections));
  }, [draftSelections]);

  const clearCodeFilters = useCallback(() => {
    const empty = createEmptySpecialCodeSelections();
    setDraftSelections(empty);
    setAppliedSelections(empty);
    setFilterSearch("");
    setExpandedSections(createDefaultExpandedSections());
  }, []);

  return {
    draftSelections,
    appliedSelections,
    filterSearch,
    expandedSections,
    facetOptions,
    facetLoading: facetPoolQuery.isLoading,
    appliedCount,
    draftCount,
    hasAppliedSelection,
    hasDraftSelection,
    setFilterSearch,
    syncDraftFromApplied,
    toggleSelection,
    toggleSection,
    applyDraft,
    clearCodeFilters,
  };
}
