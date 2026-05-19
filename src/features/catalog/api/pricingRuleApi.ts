import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/features/auth/types";
import type { PagedFilter, PagedResponse } from "@/features/stocks/types";
import type { CatalogPricingRuleType } from "../types/catalogPicker";

export interface PricingRuleHeaderDto {
  id: number;
  ruleType: number;
  isActive: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  customerId?: number | null;
  erpCustomerCode?: string | null;
}

export interface PricingRuleLineDto {
  id: number;
  pricingRuleHeaderId: number;
  stokCode: string;
  fixedUnitPrice?: number | null;
  currencyCode?: string | null;
  discountRate1?: number | null;
  discountRate2?: number | null;
  discountRate3?: number | null;
  discountAmount1?: number | null;
  discountAmount2?: number | null;
  discountAmount3?: number | null;
}

const pricingRuleTypeToNumber: Record<CatalogPricingRuleType, number> = {
  Demand: 1,
  Quotation: 2,
  Order: 3,
};

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

const normalizeHeader = (raw: unknown): PricingRuleHeaderDto | null => {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = toNumber(item.id ?? item.Id);
  if (id == null) return null;

  return {
    id,
    ruleType: toNumber(item.ruleType ?? item.RuleType) ?? 0,
    isActive: toBoolean(item.isActive ?? item.IsActive),
    validFrom: (item.validFrom ?? item.ValidFrom ?? null) as string | null,
    validTo: (item.validTo ?? item.ValidTo ?? null) as string | null,
    customerId: toNumber(item.customerId ?? item.CustomerId) ?? null,
    erpCustomerCode: (item.erpCustomerCode ?? item.ErpCustomerCode ?? null) as string | null,
  };
};

const normalizeLine = (raw: unknown): PricingRuleLineDto | null => {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = toNumber(item.id ?? item.Id);
  const pricingRuleHeaderId = toNumber(item.pricingRuleHeaderId ?? item.PricingRuleHeaderId);
  const stokCode = String(item.stokCode ?? item.StokCode ?? item.stockCode ?? item.StockCode ?? "").trim();
  if (id == null || pricingRuleHeaderId == null || stokCode === "") return null;

  return {
    id,
    pricingRuleHeaderId,
    stokCode,
    fixedUnitPrice: toNumber(item.fixedUnitPrice ?? item.FixedUnitPrice) ?? null,
    currencyCode: (item.currencyCode ?? item.CurrencyCode ?? null) as string | null,
    discountRate1: toNumber(item.discountRate1 ?? item.DiscountRate1) ?? null,
    discountRate2: toNumber(item.discountRate2 ?? item.DiscountRate2) ?? null,
    discountRate3: toNumber(item.discountRate3 ?? item.DiscountRate3) ?? null,
    discountAmount1: toNumber(item.discountAmount1 ?? item.DiscountAmount1) ?? null,
    discountAmount2: toNumber(item.discountAmount2 ?? item.DiscountAmount2) ?? null,
    discountAmount3: toNumber(item.discountAmount3 ?? item.DiscountAmount3) ?? null,
  };
};

const extractItems = <T>(payload: unknown, mapper: (raw: unknown) => T | null): T[] => {
  if (!payload || typeof payload !== "object") return [];
  const shaped = payload as { items?: unknown[]; data?: unknown[]; Items?: unknown[]; Data?: unknown[] };
  const rawItems = Array.isArray(shaped.items)
    ? shaped.items
    : Array.isArray(shaped.data)
      ? shaped.data
      : Array.isArray(shaped.Items)
        ? shaped.Items
        : Array.isArray(shaped.Data)
          ? shaped.Data
          : Array.isArray(payload)
            ? payload
            : [];

  return rawItems.map(mapper).filter((item): item is T => item != null);
};

const normalizePagedHeaders = (
  payload: unknown,
  fallbackPageNumber: number,
  fallbackPageSize: number
): PagedResponse<PricingRuleHeaderDto> => {
  const items = extractItems(payload, normalizeHeader);
  const shaped = (payload ?? {}) as Partial<PagedResponse<PricingRuleHeaderDto>>;

  return {
    items,
    totalCount: shaped.totalCount ?? items.length,
    pageNumber: shaped.pageNumber ?? fallbackPageNumber,
    pageSize: shaped.pageSize ?? fallbackPageSize,
    totalPages: shaped.totalPages ?? 1,
    hasPreviousPage: shaped.hasPreviousPage ?? false,
    hasNextPage: shaped.hasNextPage ?? false,
  };
};

export const pricingRuleApi = {
  queryHeaders: async (params: {
    pageNumber?: number;
    pageSize?: number;
    filters?: PagedFilter[];
    filterLogic?: "and" | "or";
  }): Promise<PagedResponse<PricingRuleHeaderDto>> => {
    const pageNumber = params.pageNumber ?? 1;
    const pageSize = params.pageSize ?? 100;

    const response = await apiClient.post<ApiResponse<unknown>>("/api/PricingRuleHeader/query", {
      pageNumber,
      pageSize,
      sortBy: "Id",
      sortDirection: "desc",
      filterLogic: params.filterLogic ?? "and",
      filters: params.filters ?? [],
    });

    if (!response.data.success) {
      throw new Error(response.data.message || "Pricing rule headers could not be loaded");
    }

    return normalizePagedHeaders(response.data.data, pageNumber, pageSize);
  },

  getLinesByHeaderId: async (headerId: number): Promise<PricingRuleLineDto[]> => {
    const response = await apiClient.get<ApiResponse<unknown>>(`/api/PricingRuleLine/header/${headerId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || "Pricing rule lines could not be loaded");
    }

    return extractItems(response.data.data, normalizeLine);
  },

  getRuleTypeValue: (ruleType: CatalogPricingRuleType): number => pricingRuleTypeToNumber[ruleType],
};
