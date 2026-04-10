import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { PagedResponse } from "@/features/stocks/types";
import type {
  CatalogCategoryNodeDto,
  CatalogStockItemDto,
  ProductCatalogDto,
} from "../types";

export const catalogApi = {
  getCatalogs: async (): Promise<ProductCatalogDto[]> => {
    const response = await apiClient.get<ApiResponse<ProductCatalogDto[]>>("/api/Catalog");
    if (!response.data.success) {
      throw new Error(response.data.message || "Catalogs could not be loaded");
    }
    return response.data.data ?? [];
  },

  getCatalogCategories: async (
    catalogId: number,
    parentCatalogCategoryId?: number | null
  ): Promise<CatalogCategoryNodeDto[]> => {
    const query = new URLSearchParams();
    if (parentCatalogCategoryId != null) {
      query.append("parentCatalogCategoryId", String(parentCatalogCategoryId));
    }

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get<ApiResponse<CatalogCategoryNodeDto[]>>(
      `/api/Catalog/${catalogId}/categories${suffix}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Categories could not be loaded");
    }

    return response.data.data ?? [];
  },

  getCatalogCategoryStocks: async (
    catalogId: number,
    catalogCategoryId: number,
    params?: { pageNumber?: number; pageSize?: number; search?: string }
  ): Promise<PagedResponse<CatalogStockItemDto>> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("pageNumber", String(params.pageNumber));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search?.trim()) query.append("search", params.search.trim());

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get<ApiResponse<PagedResponse<CatalogStockItemDto>>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/stocks${suffix}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Catalog stocks could not be loaded");
    }

    const paged = response.data.data as unknown as
      | PagedResponse<CatalogStockItemDto>
      | ({ data?: CatalogStockItemDto[] } & Partial<PagedResponse<CatalogStockItemDto>>);

    const items = Array.isArray((paged as { items?: CatalogStockItemDto[] }).items)
      ? ((paged as { items: CatalogStockItemDto[] }).items)
      : Array.isArray((paged as { data?: CatalogStockItemDto[] }).data)
        ? ((paged as { data: CatalogStockItemDto[] }).data)
        : [];

    return {
      items,
      totalCount: paged.totalCount ?? items.length,
      pageNumber: paged.pageNumber ?? params?.pageNumber ?? 1,
      pageSize: paged.pageSize ?? params?.pageSize ?? items.length,
      totalPages: paged.totalPages ?? 1,
      hasPreviousPage: paged.hasPreviousPage ?? false,
      hasNextPage: paged.hasNextPage ?? false,
    };
  },
};
