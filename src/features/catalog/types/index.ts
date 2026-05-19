import type { PagedResponse } from "@/features/stocks/types";

export interface ProductCatalogDto {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  catalogType: number;
  branchCode?: number | null;
  sortOrder: number;
}

export interface CatalogCategoryNodeDto {
  catalogCategoryId: number;
  categoryId: number;
  parentCatalogCategoryId?: number | null;
  name: string;
  code: string;
  description?: string | null;
  level: number;
  fullPath?: string | null;
  isLeaf: boolean;
  hasChildren: boolean;
  sortOrder: number;
  visualPreset: number;
  imageUrl?: string | null;
  iconName?: string | null;
  colorHex?: string | null;
  isFavorite?: boolean;
  favoriteId?: number | null;
}

export interface CatalogStockItemDto {
  id: number;
  stockCategoryId: number;
  stockId: number;
  erpStockCode: string;
  stockName: string;
  imageUrl?: string | null;
  unit?: string | null;
  grupKodu?: string | null;
  grupAdi?: string | null;
  kod1?: string | null;
  kod1Adi?: string | null;
  kod2?: string | null;
  kod2Adi?: string | null;
  kod3?: string | null;
  kod3Adi?: string | null;
  isPrimaryCategory: boolean;
  isFavorite?: boolean;
  favoriteId?: number | null;
}

export type CatalogStockListResponse = PagedResponse<CatalogStockItemDto>;

export interface CatalogFavoriteToggleDto {
  stockId: number;
  isFavorite?: boolean;
}

export interface CatalogFavoriteToggleResultDto {
  catalogId: number;
  stockId: number;
  isFavorite: boolean;
  favoriteId?: number | null;
}

export interface CatalogCategoryFavoriteToggleDto {
  isFavorite?: boolean;
}

export interface CatalogCategoryFavoriteToggleResultDto {
  catalogId: number;
  catalogCategoryId: number;
  isFavorite: boolean;
  favoriteId?: number | null;
}
