import { useInfiniteQuery } from "@tanstack/react-query";
import { stockApi } from "../api/stockApi";
import type { StockGetDto, PagedFilter, PagedResponse } from "../types";

interface UseStocksParams {
  filters?: PagedFilter[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  filterLogic?: "and" | "or";
}

// Hook artık hem parametreleri hem de arama metnini alıyor
export function useStocks(params: UseStocksParams = {}, searchQuery?: string) {
  const { 
    filters = [], 
    sortBy = "stockName", 
    sortDirection = "asc", 
    pageSize = 20,
    filterLogic: requestedFilterLogic = "or",
  } = params;

  // Generic Tip Tanımlaması: <BackenddenDönenVeriTipi, HataTipi>
  return useInfiniteQuery<PagedResponse<StockGetDto>, Error>({
    
    // Arama metni değiştiğinde liste sıfırlansın diye queryKey'e ekledik
    queryKey: ["stock", "list", { filters, sortBy, sortDirection, pageSize, searchQuery, requestedFilterLogic }],
    
    queryFn: ({ pageParam = 1 }) => {
      // Filtre dizisini kopyalıyoruz (State mutation olmasın diye)
      const activeFilters: PagedFilter[] = [...filters];
      let filterLogic: "and" | "or" | undefined = requestedFilterLogic;

      if (searchQuery && searchQuery.trim().length >= 2) {
        const queryTokens = searchQuery.trim().split(/\s+/).filter(Boolean);
        const searchableColumns = [
          "StockName",
          "ErpStockCode",
          "GrupKodu",
          "GrupAdi",
          "Kod1",
          "Kod1Adi",
          "Kod2",
          "Kod2Adi",
          "Kod3",
          "Kod3Adi",
          "Kod4",
          "Kod4Adi",
          "Kod5",
          "Kod5Adi",
          "UreticiKodu",
        ];

        searchableColumns.forEach((column) => {
          queryTokens.forEach((token) => {
            activeFilters.push({
              column,
              operator: "contains",
              value: token,
            });
          });
        });
        filterLogic = "or";
      }

      return stockApi.getList({
        pageNumber: pageParam as number,
        pageSize,
        sortBy,
        sortDirection,
        filters: activeFilters,
        filterLogic,
      });
    },
    
    initialPageParam: 1,
    
    // Tip güvenliği sayesinde 'lastPage' artık PagedResponse tipinde.
    // .hasNextPage ve .pageNumber özellikleri otomatik geliyor.
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.pageNumber + 1 : undefined;
    },
    
    staleTime: 30 * 1000,
  });
}
