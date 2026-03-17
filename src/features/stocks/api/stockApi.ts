import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type {
  StockGetDto,
  StockGroupDto,
  StockRelationDto,
  StockRelationCreateDto,
  PagedParams,
  PagedResponse,
  PagedApiResponse,
} from "../types";

// --- YARDIMCI FONKSİYONLAR (Aynen Korundu) ---
const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toNullableNumber = (value: unknown): number | null | undefined => {
  if (value == null) return null;
  return toNumber(value);
};

const normalizeStock = (raw: unknown): StockGetDto | null => {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = toNumber(item.id ?? item.Id);
  if (id == null) return null;
  const erpStockCode = String(item.erpStockCode ?? item.ErpStockCode ?? "");
  const stockName = String(item.stockName ?? item.StockName ?? erpStockCode ?? "").trim();
  const branchCode = toNumber(item.branchCode ?? item.BranchCode) ?? 0;

  return {
    id,
    erpStockCode,
    stockName,
    unit: (item.unit ?? item.Unit ?? undefined) as string | undefined,
    balance: toNullableNumber(item.balance ?? item.Balance ?? item.bakiye ?? item.Bakiye ?? item.stockBalance ?? item.StockBalance),
    balanceText: (item.balanceText ?? item.BalanceText ?? item.bakiyeText ?? item.BakiyeText ?? undefined) as string | undefined,
    ureticiKodu: (item.ureticiKodu ?? item.UreticiKodu ?? undefined) as string | undefined,
    branchCode,
    stockImages: (item.stockImages ?? item.StockImages ?? []) as StockGetDto["stockImages"],
    parentRelations: (item.parentRelations ?? item.ParentRelations ?? []) as StockGetDto["parentRelations"],
    grupKodu: (item.grupKodu ?? item.GrupKodu ?? undefined) as string | undefined,
    grupAdi: (item.grupAdi ?? item.GrupAdi ?? undefined) as string | undefined,
    kod1: (item.kod1 ?? item.Kod1 ?? undefined) as string | undefined,
    kod1Adi: (item.kod1Adi ?? item.Kod1Adi ?? undefined) as string | undefined,
    kod2: (item.kod2 ?? item.Kod2 ?? undefined) as string | undefined,
    kod2Adi: (item.kod2Adi ?? item.Kod2Adi ?? undefined) as string | undefined,
    kod3: (item.kod3 ?? item.Kod3 ?? undefined) as string | undefined,
    kod3Adi: (item.kod3Adi ?? item.Kod3Adi ?? undefined) as string | undefined,
    kod4: (item.kod4 ?? item.Kod4 ?? undefined) as string | undefined,
    kod4Adi: (item.kod4Adi ?? item.Kod4Adi ?? undefined) as string | undefined,
    kod5: (item.kod5 ?? item.Kod5 ?? undefined) as string | undefined,
    kod5Adi: (item.kod5Adi ?? item.Kod5Adi ?? undefined) as string | undefined,
    stockDetail: (item.stockDetail ?? item.StockDetail ?? undefined) as StockGetDto["stockDetail"],
    createdDate: (item.createdDate ?? item.CreatedDate ?? undefined) as string | undefined,
    updatedDate: (item.updatedDate ?? item.UpdatedDate ?? undefined) as string | undefined,
    deletedDate: (item.deletedDate ?? item.DeletedDate ?? undefined) as string | undefined,
    isDeleted: (item.isDeleted ?? item.IsDeleted ?? false) as boolean,
    createdByFullUser: (item.createdByFullUser ?? item.CreatedByFullUser ?? undefined) as string | undefined,
    updatedByFullUser: (item.updatedByFullUser ?? item.UpdatedByFullUser ?? undefined) as string | undefined,
    deletedByFullUser: (item.deletedByFullUser ?? item.DeletedByFullUser ?? undefined) as string | undefined,
  };
};

export const stockApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<StockGetDto>> => {
    
    // 1. Temel URL Parametreleri
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append("PageNumber", params.pageNumber.toString());
    if (params.pageSize) queryParams.append("PageSize", params.pageSize.toString());
    if (params.search) queryParams.append("Search", params.search);
    queryParams.append("SortBy", params.sortBy || "StockName"); // Sıralama dinamik olsun
    queryParams.append("SortDirection", params.sortDirection || "asc");
    if (params.filterLogic) queryParams.append("FilterLogic", params.filterLogic);

    // 2. FİLTRELERİ EKLEME (BURASI EKSİKTİ!)
    // Backend'in anladığı dil: Filters[0].Column=StockName&Filters[0].Value=dene
    if (params.filters && params.filters.length > 0) {
      params.filters.forEach((filter, index) => {
        queryParams.append(`Filters[${index}].Column`, filter.column);
        queryParams.append(`Filters[${index}].Operator`, filter.operator);
        queryParams.append(`Filters[${index}].Value`, filter.value);
      });
    }

    const fullPath = `/api/Stock?${queryParams.toString()}`;
    console.log("📡 API REQUEST (Filtreli):", fullPath); // Log'da artık filtreleri göreceksin

    const response = await apiClient.get<PagedApiResponse<StockGetDto>>(fullPath);

    if (!response.data.success) {
      throw new Error(response.data.message || "Hata");
    }

    const payload = response.data.data as unknown;
    if (!payload || typeof payload !== "object") {
      return { items: [], totalCount: 0, pageNumber: 1, pageSize: 20, totalPages: 0, hasPreviousPage: false, hasNextPage: false };
    }

    const shaped = payload as any;
    const rawItems = Array.isArray(shaped.items) ? shaped.items : (shaped.Items || []);
    
    // Type Safe Mapping
    const items = rawItems
      .map((item: any) => normalizeStock(item))
      .filter((item: any): item is StockGetDto => item !== null);

    return {
      items,
      totalCount: shaped.totalCount ?? shaped.TotalCount ?? items.length,
      pageNumber: shaped.pageNumber ?? shaped.PageNumber ?? 1,
      pageSize: shaped.pageSize ?? shaped.PageSize ?? 20,
      totalPages: shaped.totalPages ?? shaped.TotalPages ?? 1,
      hasPreviousPage: shaped.hasPreviousPage ?? false,
      hasNextPage: shaped.hasNextPage ?? false,
    };
  },
  
  // --- Diğer metodlar aynı ---
  getById: async (id: number): Promise<StockGetDto> => {
    const response = await apiClient.get<ApiResponse<StockGetDto>>(`/api/Stock/${id}`);
    if (!response.data.success) throw new Error("Stok bulunamadı");
    const normalized = normalizeStock(response.data.data);
    if (!normalized) throw new Error("Veri hatası");
    return normalized;
  },

  getRelations: async (stockId: number, params: PagedParams = {}): Promise<PagedResponse<StockRelationDto>> => {
    const response = await apiClient.get<PagedApiResponse<StockRelationDto>>(`/api/Stock/${stockId}/relations`);
    return response.data.data;
  },

  getRelationsAsRelatedStock: async (relatedStockId: number, params: PagedParams = {}): Promise<PagedResponse<StockRelationDto>> => {
    const response = await apiClient.get<PagedApiResponse<StockRelationDto>>(`/api/Stock/${relatedStockId}/relations?asRelated=true`);
    const raw = response.data.data;
    const items = Array.isArray(raw) ? raw : ((raw as any)?.items || []);
    return { items, totalCount: items.length, pageNumber: 1, pageSize: 100, totalPages: 1, hasPreviousPage: false, hasNextPage: false };
  },

  createRelation: async (data: StockRelationCreateDto): Promise<StockRelationDto> => {
    const response = await apiClient.post<ApiResponse<StockRelationDto>>(`/api/Stock/${data.stockId}/relations`, data);
    return response.data.data;
  },

  deleteRelation: async (stockId: number, relationId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/api/Stock/${stockId}/relations/${relationId}`);
  },

  getGroups: async (): Promise<StockGroupDto[]> => {
    const response = await apiClient.get<ApiResponse<StockGroupDto[]>>("/api/Erp/getStokGroup");
    if (!response.data.success) {
      throw new Error(response.data.message || "Stok gruplari alinamadi");
    }

    return (response.data.data ?? [])
      .map((item) => {
        const raw = item as StockGroupDto & Record<string, unknown>;
        return {
          isletmeKodu: Number(raw.isletmeKodu ?? raw.IsletmeKodu ?? 0),
          subeKodu: Number(raw.subeKodu ?? raw.SubeKodu ?? 0),
          grupKodu: (raw.grupKodu ?? raw.GrupKodu ?? undefined) as string | undefined,
          grupAdi: (raw.grupAdi ?? raw.GrupAdi ?? undefined) as string | undefined,
        };
      })
      .filter((item) => Boolean(item.grupKodu || item.grupAdi));
  },
};
