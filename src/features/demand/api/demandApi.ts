import { apiClient } from "../../../lib/axios";
import { extractPagedItems } from "../../../lib/paged";
import type {
  WaitingApprovalsResponse,
  ApproveResponse,
  RejectResponse,
  DemandListResponse,
  DemandResponse,
  DemandBulkCreateResponse,
  DemandDetailResponse,
  DemandLineDetailListResponse,
  DemandExchangeRateDetailListResponse,
  PriceRuleResponse,
  UserDiscountLimitResponse,
  PriceOfProductResponse,
  ExchangeRateResponse,
  CurrencyOptionsResponse,
  PaymentTypesResponse,
  DocumentSerialTypesResponse,
  RelatedUsersResponse,
  UserListResponse,
  ApproveActionDto,
  RejectActionDto,
  ApprovalActionGetDto,
  DemandGetDto,
  DemandDetailGetDto,
  DemandLineDetailGetDto,
  DemandExchangeRateDetailGetDto,
  DemandExchangeRateUpdateDto,
  DemandExchangeRateUpdateResponse,
  DemandApprovalFlowReportDto,
  DemandApprovalFlowReportResponse,
  DemandBulkCreateDto,
  CreateDemandDto,
  CreateDemandLineDto,
  DemandExchangeRateCreateDto,
  DemandLineUpdateDto,
  PricingRuleLineGetDto,
  UserDiscountLimitDto,
  PriceOfProductDto,
  ExchangeRateDto,
  CurrencyOptionDto,
  PaymentTypeDto,
  DocumentSerialTypeDto,
  ApprovalScopeUserDto,
  UserDto,
  PagedParams,
  PagedResponse,
} from "../types";
import type { ApiResponse } from "../../auth/types";

function normalizeKurDto(item: unknown): ExchangeRateDto {
  const o = item && typeof item === "object" ? item as Record<string, unknown> : {};
  return {
    dovizTipi: Number((o.dovizTipi ?? o.DovizTipi) ?? 0),
    dovizIsmi: ((o.dovizIsmi ?? o.DovizIsmi) as string) ?? null,
    kurDegeri: Number((o.kurDegeri ?? o.KurDegeri) ?? 0),
    tarih: String(o.tarih ?? o.Tarih ?? ""),
  };
}

export const demandApi = {
  canEditWhileWaiting: async (demandId: number): Promise<boolean> => {
    const response = await apiClient.get<ApproveResponse>(
      `/api/approval/demand/${demandId}/can-edit`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Düzenleme yetkisi kontrol edilemedi"
      );
    }

    return response.data.data === true;
  },

  getWaitingApprovals: async (): Promise<ApprovalActionGetDto[]> => {
    const response = await apiClient.get<WaitingApprovalsResponse>(
      "/api/demand/waiting-approvals"
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Onay bekleyen listesi alınamadı"
      );
    }

    return extractPagedItems<ApprovalActionGetDto>(response.data.data);
  },

  approve: async (data: ApproveActionDto): Promise<boolean> => {
    const response = await apiClient.post<ApproveResponse>("/api/demand/approve", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Onay işlemi gerçekleştirilemedi"
      );
    }

    return response.data.data ?? false;
  },

  reject: async (data: RejectActionDto): Promise<boolean> => {
    const response = await apiClient.post<RejectResponse>("/api/demand/reject", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Red işlemi gerçekleştirilemedi"
      );
    }

    return response.data.data ?? false;
  },

  startApprovalFlow: async (data: {
    entityId: number;
    documentType: number;
    totalAmount: number;
  }): Promise<boolean> => {
    const response = await apiClient.post<ApproveResponse>(
      "/api/demand/start-approval-flow",
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Onay süreci başlatılamadı"
      );
    }

    return response.data.data ?? false;
  },

  getApprovalFlowReport: async (demandId: number): Promise<DemandApprovalFlowReportDto> => {
    const response = await apiClient.get<DemandApprovalFlowReportResponse>(
      `/api/Demand/${demandId}/approval-flow-report`
    );
    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Onay akışı raporu alınamadı"
      );
    }
    const data = response.data.data;
    if (!data) {
      throw new Error("Onay akışı raporu alınamadı");
    }
    return data;
  },

  getById: async (id: number): Promise<DemandDetailGetDto> => {
    const response = await apiClient.get<DemandDetailResponse>(`/api/Demand/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Talep detayı alınamadı"
      );
    }

    const data = response.data.data;
    if (!data) {
      throw new Error("Talep detayı alınamadı");
    }
    return data;
  },

  updateHeader: async (id: number, data: CreateDemandDto): Promise<DemandGetDto> => {
    const response = await apiClient.put<DemandResponse>(`/api/demand/${id}`, data);
    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Talep başlığı güncellenemedi"
      );
    }
    return response.data.data;
  },

  getLinesByDemand: async (demandId: number): Promise<DemandLineDetailGetDto[]> => {
    const response = await apiClient.get<DemandLineDetailListResponse>(
      `/api/DemandLine/by-demand/${demandId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Talep satırları alınamadı"
      );
    }

    return response.data.data ?? [];
  },

  getExchangeRatesByDemand: async (
    demandId: number
  ): Promise<DemandExchangeRateDetailGetDto[]> => {
    const response = await apiClient.get<DemandExchangeRateDetailListResponse>(
      `/api/DemandExchangeRate/demand/${demandId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Talep döviz kurları alınamadı"
      );
    }

    return response.data.data ?? [];
  },

  updateExchangeRateInDemand: async (
    body: DemandExchangeRateUpdateDto[]
  ): Promise<boolean> => {
    const response = await apiClient.put<DemandExchangeRateUpdateResponse>(
      "/api/DemandExchangeRate/update-exchange-rate-in-demand",
      body
    );
    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Döviz kurları güncellenemedi"
      );
    }
    return response.data.data ?? false;
  },

  createDemandExchangeRate: async (
    body: DemandExchangeRateCreateDto
  ): Promise<DemandExchangeRateDetailGetDto> => {
    const response = await apiClient.post<ApiResponse<DemandExchangeRateDetailGetDto>>(
      "/api/DemandExchangeRate",
      body
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Döviz kuru eklenemedi"
      );
    }
    return response.data.data;
  },

  updateDemandExchangeRate: async (
    id: number,
    body: DemandExchangeRateCreateDto
  ): Promise<DemandExchangeRateDetailGetDto> => {
    const response = await apiClient.put<ApiResponse<DemandExchangeRateDetailGetDto>>(
      `/api/DemandExchangeRate/${id}`,
      body
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Döviz kuru güncellenemedi"
      );
    }
    return response.data.data;
  },

  deleteDemandExchangeRate: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<unknown>>(`/api/DemandExchangeRate/${id}`);
    if (response.data?.success === false) {
      throw new Error(response.data.message || "Döviz kuru silinemedi");
    }
  },

  deleteDemandLine: async (lineId: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<unknown>>(
      `/api/DemandLine/${lineId}`
    );
    const data = response.data as { success?: boolean; message?: string };
    if (data.success === false) {
      throw new Error(data.message || "Satır silinemedi");
    }
  },

  createDemandLines: async (
    body: CreateDemandLineDto[]
  ): Promise<DemandLineDetailGetDto[]> => {
    const response = await apiClient.post<DemandLineDetailListResponse>(
      "/api/DemandLine/create-multiple",
      body
    );
    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Talep satırları eklenemedi"
      );
    }
    return response.data.data ?? [];
  },

  updateDemandLines: async (
    body: DemandLineUpdateDto[]
  ): Promise<DemandLineDetailGetDto[]> => {
    const response = await apiClient.put<DemandLineDetailListResponse>(
      "/api/DemandLine/update-multiple",
      body
    );
    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Talep satırları güncellenemedi"
      );
    }
    return response.data.data ?? [];
  },

  getList: async (params: PagedParams = {}): Promise<PagedResponse<DemandGetDto>> => {
    const response = await apiClient.post<DemandListResponse>("/api/Demand/related/query", {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 20,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "Id",
      sortDirection: params.sortDirection ?? "asc",
      filterLogic: params.filterLogic ?? "and",
      filters: params.filters ?? [],
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Talep listesi alınamadı"
      );
    }

    const backendData = response.data.data;

    if (backendData && "data" in backendData && Array.isArray(backendData.data)) {
      return {
        items: backendData.data,
        totalCount: backendData.totalCount,
        pageNumber: backendData.pageNumber,
        pageSize: backendData.pageSize,
        totalPages: backendData.totalPages,
        hasPreviousPage: backendData.hasPreviousPage,
        hasNextPage: backendData.hasNextPage,
      };
    }

    return backendData;
  },

  createRevision: async (demandId: number): Promise<DemandGetDto> => {
    const response = await apiClient.post<DemandResponse>(
      "/api/Demand/revision-of-demand",
      demandId
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Talep revizyonu oluşturulurken bir hata oluştu"
      );
    }

    return response.data.data;
  },

  createBulk: async (data: DemandBulkCreateDto): Promise<DemandGetDto> => {
    const response = await apiClient.post<DemandBulkCreateResponse>(
      "/api/demand/bulk-demand",
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Talep oluşturulamadı"
      );
    }

    return response.data.data;
  },

  updateBulk: async (id: number, data: DemandBulkCreateDto): Promise<DemandGetDto> => {
    const response = await apiClient.post<DemandBulkCreateResponse>(
      `/api/demand/bulk-demand/update?id=${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Talep güncellenemedi"
      );
    }

    return response.data.data;
  },

  cancelByCustomer: async (id: number, reason?: string | null): Promise<boolean> => {
    const response = await apiClient.post<ApiResponse<boolean>>(
      `/api/demand/${id}/customer-cancel`,
      { reason: reason?.trim() || null }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Talep müşteri tarafından iptal edilemedi"
      );
    }

    return response.data.data === true;
  },

  getPriceRuleOfDemand: async (params: {
    customerCode: string;
    salesmenId: number;
    demandDate: string;
  }): Promise<PricingRuleLineGetDto[]> => {
    const response = await apiClient.get<PriceRuleResponse>(
      "/api/demand/price-rule-of-demand",
      {
        params,
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Fiyat kuralları alınamadı"
      );
    }

    return response.data.data || [];
  },

  getUserDiscountLimitsBySalesperson: async (
    salespersonId: number
  ): Promise<UserDiscountLimitDto[]> => {
    const response = await apiClient.get<UserDiscountLimitResponse>(
      `/api/UserDiscountLimit/salesperson/${salespersonId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "İndirim limitleri alınamadı"
      );
    }

    return response.data.data || [];
  },

  getPriceOfProduct: async (products: Array<{ productCode: string; groupCode: string }>): Promise<PriceOfProductDto[]> => {
    const params: Record<string, string> = {};
    products.forEach((product, index) => {
      params[`request[${index}].productCode`] = product.productCode;
      params[`request[${index}].groupCode`] = product.groupCode;
    });

    const response = await apiClient.get<PriceOfProductResponse>(
      "/api/demand/price-of-product",
      { params }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Ürün fiyatı alınamadı"
      );
    }

    return response.data.data || [];
  },

  getExchangeRate: async (params?: { tarih?: string; fiyatTipi?: number }): Promise<ExchangeRateDto[]> => {
    const response = await apiClient.get<ExchangeRateResponse>("/api/NetsisRead/getExchangeRate", {
      params,
    });

    const body = response.data as {
      success?: boolean;
      message?: string;
      exceptionMessage?: string;
      data?: ExchangeRateDto[] | { success?: boolean; message?: string; data?: ExchangeRateDto[] };
    };
    const inner = body.data;
    const apiResponse = Array.isArray(inner) ? null : inner && typeof inner === "object" ? inner : null;
    const success = body.success ?? apiResponse?.success ?? true;
    const message = body.message ?? apiResponse?.message ?? body.exceptionMessage;
    if (success === false) {
      throw new Error(message || "Döviz kurları alınamadı");
    }

    const rawList: unknown[] = Array.isArray(inner)
      ? inner
      : apiResponse && Array.isArray(apiResponse.data)
        ? apiResponse.data
        : [];
    return rawList.map((item) => normalizeKurDto(item));
  },

  getCurrencyOptions: async (params?: { tarih?: string; fiyatTipi?: number }): Promise<CurrencyOptionDto[]> => {
    const exchangeRates = await demandApi.getExchangeRate(params);

    return exchangeRates.map((rate) => ({
      code: String(rate.dovizTipi),
      dovizTipi: rate.dovizTipi,
      dovizIsmi: rate.dovizIsmi ?? `DOVIZ_${rate.dovizTipi}`,
    }));
  },

  getRelatedUsers: async (userId: number): Promise<ApprovalScopeUserDto[]> => {
    const response = await apiClient.get<RelatedUsersResponse>(
      `/api/Demand/related-users/${userId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Satış temsilcisi listesi alınamadı"
      );
    }

    return response.data.data || [];
  },

  getPaymentTypes: async (): Promise<PaymentTypeDto[]> => {
    const response = await apiClient.post<ApiResponse<PagedResponse<PaymentTypeDto>>>("/api/PaymentType/query", {
        pageNumber: 1,
        pageSize: 1000,
        search: "",
        sortBy: "Name",
        sortDirection: "asc",
        filterLogic: "and",
        filters: [],
      });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Ödeme tipleri alınamadı"
      );
    }

    const paged = response.data.data;
    return (paged && "items" in paged ? paged.items : []) || [];
  },

  getDocumentSerialTypes: async (params?: {
    customerTypeId?: number;
    salesRepId?: number;
    ruleType?: number;
  }): Promise<DocumentSerialTypeDto[]> => {
    const { customerTypeId, salesRepId, ruleType = 2 } = params ?? {};
    if (customerTypeId == null || salesRepId == null) return [];

    const response = await apiClient.get<DocumentSerialTypesResponse>(
      `/api/DocumentSerialType/avaible/customer/${customerTypeId}/salesrep/${salesRepId}/rule/${ruleType}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Belge seri tipleri alınamadı"
      );
    }

    return response.data.data || [];
  },

  getDocumentSerialTypeList: async (params: PagedParams = {}): Promise<DocumentSerialTypeDto[]> => {
    const response = await apiClient.post<ApiResponse<PagedResponse<DocumentSerialTypeDto>>>(
      "/api/DocumentSerialType/query",
      {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 100,
        search: params.search ?? "",
        sortBy: params.sortBy ?? "Id",
        sortDirection: params.sortDirection ?? "asc",
        filterLogic: params.filterLogic ?? "and",
        filters: params.filters ?? [],
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Belge seri tipi listesi alınamadı"
      );
    }

    const paged = response.data.data;
    return (paged && "items" in paged ? paged.items : []) || [];
  },

  getUserList: async (params: PagedParams = {}): Promise<UserDto[]> => {
    const response = await apiClient.post<UserListResponse>("/api/User/query", {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 100,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "Id",
      sortDirection: params.sortDirection ?? "asc",
      filterLogic: params.filterLogic ?? "and",
      filters: params.filters ?? [],
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Kullanıcı listesi alınamadı"
      );
    }

    const paged = response.data.data;
    return (paged && "items" in paged ? paged.items : []) || [];
  },
};
