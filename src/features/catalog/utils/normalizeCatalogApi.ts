import type { CatalogCategoryNodeDto, CatalogStockItemDto, ProductCatalogDto } from "../types";

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  if (typeof value === "number") return value === 1;
  return Boolean(value);
};

const toStringOrEmpty = (value: unknown): string => String(value ?? "").trim();

export function extractApiList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload == null || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const nestedKeys = ["items", "Items", "data", "Data", "results", "Results", "categories", "Categories", "value", "Value"];

  for (const key of nestedKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (value != null && typeof value === "object") {
      const nested = extractApiList(value);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

export function normalizeProductCatalog(raw: unknown): ProductCatalogDto | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = toNumber(item.id ?? item.Id);
  if (id == null) return null;

  const name = toStringOrEmpty(item.name ?? item.Name);
  const code = toStringOrEmpty(item.code ?? item.Code);

  return {
    id,
    name: name || code || `Catalog ${id}`,
    code: code || String(id),
    description: (item.description ?? item.Description ?? null) as string | null,
    catalogType: toNumber(item.catalogType ?? item.CatalogType) ?? 0,
    branchCode: toNumber(item.branchCode ?? item.BranchCode) ?? null,
    sortOrder: toNumber(item.sortOrder ?? item.SortOrder) ?? 0,
  };
}

export function normalizeCatalogCategory(raw: unknown): CatalogCategoryNodeDto | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const catalogCategoryId = toNumber(item.catalogCategoryId ?? item.CatalogCategoryId);
  const categoryId = toNumber(item.categoryId ?? item.CategoryId) ?? catalogCategoryId;
  if (catalogCategoryId == null) return null;

  const isLeaf = toBoolean(item.isLeaf ?? item.IsLeaf);
  const hasChildrenRaw = item.hasChildren ?? item.HasChildren;
  const hasChildren =
    hasChildrenRaw != null ? toBoolean(hasChildrenRaw) : !isLeaf;

  const name = toStringOrEmpty(item.name ?? item.Name);
  const code = toStringOrEmpty(item.code ?? item.Code);

  return {
    catalogCategoryId,
    categoryId: categoryId ?? catalogCategoryId,
    parentCatalogCategoryId: toNumber(item.parentCatalogCategoryId ?? item.ParentCatalogCategoryId) ?? null,
    name: name || code || `Category ${catalogCategoryId}`,
    code: code || String(catalogCategoryId),
    description: (item.description ?? item.Description ?? null) as string | null,
    level: toNumber(item.level ?? item.Level) ?? 0,
    fullPath: (item.fullPath ?? item.FullPath ?? null) as string | null,
    isLeaf: hasChildren ? false : isLeaf,
    hasChildren,
    sortOrder: toNumber(item.sortOrder ?? item.SortOrder) ?? 0,
    visualPreset: toNumber(item.visualPreset ?? item.VisualPreset) ?? 0,
    imageUrl: (item.imageUrl ?? item.ImageUrl ?? null) as string | null,
    iconName: (item.iconName ?? item.IconName ?? null) as string | null,
    colorHex: (item.colorHex ?? item.ColorHex ?? null) as string | null,
    isFavorite: item.isFavorite != null || item.IsFavorite != null ? toBoolean(item.isFavorite ?? item.IsFavorite) : undefined,
    favoriteId: toNumber(item.favoriteId ?? item.FavoriteId) ?? null,
  };
}

export function normalizeCatalogStockItem(raw: unknown): CatalogStockItemDto | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const stockId = toNumber(item.stockId ?? item.StockId ?? item.id ?? item.Id);
  const erpStockCode = toStringOrEmpty(item.erpStockCode ?? item.ErpStockCode);
  if (stockId == null || erpStockCode === "") return null;

  const stockName = toStringOrEmpty(item.stockName ?? item.StockName) || erpStockCode;

  return {
    id: toNumber(item.id ?? item.Id) ?? stockId,
    stockCategoryId: toNumber(item.stockCategoryId ?? item.StockCategoryId) ?? 0,
    stockId,
    erpStockCode,
    stockName,
    imageUrl: (item.imageUrl ?? item.ImageUrl ?? null) as string | null,
    unit: (item.unit ?? item.Unit ?? null) as string | null,
    grupKodu: (item.grupKodu ?? item.GrupKodu ?? null) as string | null,
    grupAdi: (item.grupAdi ?? item.GrupAdi ?? null) as string | null,
    kod1: (item.kod1 ?? item.Kod1 ?? null) as string | null,
    kod1Adi: (item.kod1Adi ?? item.Kod1Adi ?? null) as string | null,
    kod2: (item.kod2 ?? item.Kod2 ?? null) as string | null,
    kod2Adi: (item.kod2Adi ?? item.Kod2Adi ?? null) as string | null,
    kod3: (item.kod3 ?? item.Kod3 ?? null) as string | null,
    kod3Adi: (item.kod3Adi ?? item.Kod3Adi ?? null) as string | null,
    isPrimaryCategory: toBoolean(item.isPrimaryCategory ?? item.IsPrimaryCategory),
    isFavorite:
      item.isFavorite != null || item.IsFavorite != null ? toBoolean(item.isFavorite ?? item.IsFavorite) : undefined,
    favoriteId: toNumber(item.favoriteId ?? item.FavoriteId) ?? null,
  };
}

export function normalizeProductCatalogList(payload: unknown): ProductCatalogDto[] {
  return extractApiList(payload)
    .map((item) => normalizeProductCatalog(item))
    .filter((item): item is ProductCatalogDto => item != null);
}

export function normalizeCatalogCategoryList(payload: unknown): CatalogCategoryNodeDto[] {
  return extractApiList(payload)
    .map((item) => normalizeCatalogCategory(item))
    .filter((item): item is CatalogCategoryNodeDto => item != null);
}

export function normalizeCatalogStockItemList(payload: unknown): CatalogStockItemDto[] {
  return extractApiList(payload)
    .map((item) => normalizeCatalogStockItem(item))
    .filter((item): item is CatalogStockItemDto => item != null);
}
