import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { PagedResponse } from "@/features/stocks/types";
import {
  normalizeCatalogCategoryList,
  normalizeCatalogStockItemList,
  normalizeProductCatalogList,
} from "../utils/normalizeCatalogApi";
import type {
  CatalogCategoryFavoriteToggleDto,
  CatalogCategoryFavoriteToggleResultDto,
  CatalogFavoriteToggleDto,
  CatalogFavoriteToggleResultDto,
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
    return normalizeProductCatalogList(response.data.data);
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

    return normalizeCatalogCategoryList(response.data.data);
  },

  getCatalogCategoryStocks: async (
    catalogId: number,
    catalogCategoryId: number,
    params?: { pageNumber?: number; pageSize?: number; search?: string; includeDescendants?: boolean }
  ): Promise<PagedResponse<CatalogStockItemDto>> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("pageNumber", String(params.pageNumber));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search?.trim()) query.append("search", params.search.trim());
    if (params?.includeDescendants) query.append("includeDescendants", "true");

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

    const items = normalizeCatalogStockItemList(paged);

    return {
      items,
      totalCount: (paged as { totalCount?: number; TotalCount?: number }).totalCount
        ?? (paged as { TotalCount?: number }).TotalCount
        ?? items.length,
      pageNumber: (paged as { pageNumber?: number; PageNumber?: number }).pageNumber
        ?? (paged as { PageNumber?: number }).PageNumber
        ?? params?.pageNumber
        ?? 1,
      pageSize: (paged as { pageSize?: number; PageSize?: number }).pageSize
        ?? (paged as { PageSize?: number }).PageSize
        ?? params?.pageSize
        ?? items.length,
      totalPages: (paged as { totalPages?: number; TotalPages?: number }).totalPages
        ?? (paged as { TotalPages?: number }).TotalPages
        ?? 1,
      hasPreviousPage: (paged as { hasPreviousPage?: boolean; HasPreviousPage?: boolean }).hasPreviousPage
        ?? (paged as { HasPreviousPage?: boolean }).HasPreviousPage
        ?? false,
      hasNextPage: (paged as { hasNextPage?: boolean; HasNextPage?: boolean }).hasNextPage
        ?? (paged as { HasNextPage?: boolean }).HasNextPage
        ?? false,
    };
  },

  getCatalogFavorites: async (
    catalogId: number,
    params?: { catalogCategoryId?: number | null; pageNumber?: number; pageSize?: number; search?: string }
  ): Promise<PagedResponse<CatalogStockItemDto>> => {
    const query = new URLSearchParams();
    if (params?.catalogCategoryId != null) query.append("catalogCategoryId", String(params.catalogCategoryId));
    if (params?.pageNumber) query.append("pageNumber", String(params.pageNumber));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search?.trim()) query.append("search", params.search.trim());

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await apiClient.get<ApiResponse<PagedResponse<CatalogStockItemDto>>>(
      `/api/Catalog/${catalogId}/favorites${suffix}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Catalog favorites could not be loaded");
    }

    const paged = response.data.data as unknown as
      | PagedResponse<CatalogStockItemDto>
      | ({ data?: CatalogStockItemDto[] } & Partial<PagedResponse<CatalogStockItemDto>>);

    const items = normalizeCatalogStockItemList(paged);

    return {
      items,
      totalCount: (paged as { totalCount?: number; TotalCount?: number }).totalCount
        ?? (paged as { TotalCount?: number }).TotalCount
        ?? items.length,
      pageNumber: (paged as { pageNumber?: number; PageNumber?: number }).pageNumber
        ?? (paged as { PageNumber?: number }).PageNumber
        ?? params?.pageNumber
        ?? 1,
      pageSize: (paged as { pageSize?: number; PageSize?: number }).pageSize
        ?? (paged as { PageSize?: number }).PageSize
        ?? params?.pageSize
        ?? items.length,
      totalPages: (paged as { totalPages?: number; TotalPages?: number }).totalPages
        ?? (paged as { TotalPages?: number }).TotalPages
        ?? 1,
      hasPreviousPage: (paged as { hasPreviousPage?: boolean; HasPreviousPage?: boolean }).hasPreviousPage
        ?? (paged as { HasPreviousPage?: boolean }).HasPreviousPage
        ?? false,
      hasNextPage: (paged as { hasNextPage?: boolean; HasNextPage?: boolean }).hasNextPage
        ?? (paged as { HasNextPage?: boolean }).HasNextPage
        ?? false,
    };
  },

  toggleCatalogFavorite: async (
    catalogId: number,
    data: CatalogFavoriteToggleDto
  ): Promise<CatalogFavoriteToggleResultDto> => {
    const response = await apiClient.post<ApiResponse<CatalogFavoriteToggleResultDto>>(
      `/api/Catalog/${catalogId}/favorites/toggle`,
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Favorite status could not be updated");
    }

    return response.data.data;
  },

  toggleCatalogCategoryFavorite: async (
    catalogId: number,
    catalogCategoryId: number,
    data: CatalogCategoryFavoriteToggleDto
  ): Promise<CatalogCategoryFavoriteToggleResultDto> => {
    const response = await apiClient.post<ApiResponse<CatalogCategoryFavoriteToggleResultDto>>(
      `/api/Catalog/${catalogId}/categories/${catalogCategoryId}/favorite/toggle`,
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Category favorite status could not be updated");
    }

    return response.data.data;
  },
};
