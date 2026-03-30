import { apiClient } from "../../../lib/axios";
import type {
  WaitingApprovalsResponse,
  ApproveResponse,
  RejectResponse,
  OrderListResponse,
  OrderResponse,
  OrderBulkCreateResponse,
  OrderDetailResponse,
  OrderLineDetailListResponse,
  OrderExchangeRateDetailListResponse,
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
  OrderGetDto,
  OrderDetailGetDto,
  OrderLineDetailGetDto,
  OrderExchangeRateDetailGetDto,
  OrderExchangeRateUpdateDto,
  OrderExchangeRateUpdateResponse,
  OrderApprovalFlowReportDto,
  OrderApprovalFlowReportResponse,
  OrderBulkCreateDto,
  CreateOrderLineDto,
  OrderLineUpdateDto,
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

const buildQueryParams = (params: PagedParams): Record<string, string | number> => {
  const queryParams: Record<string, string | number> = {};

  if (params.pageNumber) {
    queryParams.pageNumber = params.pageNumber;
  }
  if (params.pageSize) {
    queryParams.pageSize = params.pageSize;
  }
  if (params.search) {
    queryParams.search = params.search;
  }
  if (params.sortBy) {
    queryParams.sortBy = params.sortBy;
  }
  if (params.sortDirection) {
    queryParams.sortDirection = params.sortDirection;
  }
  if (params.filterLogic) {
    queryParams.filterLogic = params.filterLogic;
  }
  if (params.filters && params.filters.length > 0) {
    queryParams.filters = JSON.stringify(params.filters);
  }

  return queryParams;
};

export const orderApi = {
  getWaitingApprovals: async (): Promise<ApprovalActionGetDto[]> => {
    const response = await apiClient.get<WaitingApprovalsResponse>(
      "/api/order/waiting-approvals"
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Onay bekleyen listesi alınamadı"
      );
    }

    const payload = response.data.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && Array.isArray(payload.items)) {
      return payload.items;
    }
    return [];
  },

  approve: async (data: ApproveActionDto): Promise<boolean> => {
    const response = await apiClient.post<ApproveResponse>("/api/order/approve", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Onay işlemi gerçekleştirilemedi"
      );
    }

    return response.data.data ?? false;
  },

  reject: async (data: RejectActionDto): Promise<boolean> => {
    const response = await apiClient.post<RejectResponse>("/api/order/reject", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Red işlemi gerçekleştirilemedi"
      );
    }

    return response.data.data ?? false;
  },

  startApprovalFlow: async (orderId: number): Promise<boolean> => {
    const response = await apiClient.post<ApproveResponse>(
      `/api/Order/${orderId}/start-approval`,
      {}
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

  getApprovalFlowReport: async (orderId: number): Promise<OrderApprovalFlowReportDto> => {
    const response = await apiClient.get<OrderApprovalFlowReportResponse>(
      `/api/Order/${orderId}/approval-flow-report`
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

  getById: async (id: number): Promise<OrderDetailGetDto> => {
    const response = await apiClient.get<OrderDetailResponse>(`/api/Order/${id}`);

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

  getLinesByOrder: async (orderId: number): Promise<OrderLineDetailGetDto[]> => {
    const response = await apiClient.get<OrderLineDetailListResponse>(
      `/api/OrderLine/by-order/${orderId}`
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

  getExchangeRatesByOrder: async (
    orderId: number
  ): Promise<OrderExchangeRateDetailGetDto[]> => {
    const response = await apiClient.get<OrderExchangeRateDetailListResponse>(
      `/api/OrderExchangeRate/order/${orderId}`
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

  updateExchangeRateInOrder: async (
    body: OrderExchangeRateUpdateDto[]
  ): Promise<boolean> => {
    const response = await apiClient.put<OrderExchangeRateUpdateResponse>(
      "/api/OrderExchangeRate/update-exchange-rate-in-order",
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

  deleteOrderLine: async (lineId: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<unknown>>(
      `/api/OrderLine/${lineId}`
    );
    const data = response.data as { success?: boolean; message?: string };
    if (data.success === false) {
      throw new Error(data.message || "Satır silinemedi");
    }
  },

  createOrderLines: async (
    body: CreateOrderLineDto[]
  ): Promise<OrderLineDetailGetDto[]> => {
    const response = await apiClient.post<OrderLineDetailListResponse>(
      "/api/OrderLine/create-multiple",
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

  updateOrderLines: async (
    body: OrderLineUpdateDto[]
  ): Promise<OrderLineDetailGetDto[]> => {
    const response = await apiClient.put<OrderLineDetailListResponse>(
      "/api/OrderLine/update-multiple",
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

  getList: async (params: PagedParams = {}): Promise<PagedResponse<OrderGetDto>> => {
    const queryParams = buildQueryParams(params);
    const response = await apiClient.get<OrderListResponse>("/api/order", {
      params: queryParams,
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

  createRevision: async (orderId: number): Promise<OrderGetDto> => {
    const response = await apiClient.post<OrderResponse>(
      "/api/Order/revision-of-order",
      orderId
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

  createBulk: async (data: OrderBulkCreateDto): Promise<OrderGetDto> => {
    const response = await apiClient.post<OrderBulkCreateResponse>(
      "/api/order/bulk-order",
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Talep oluşturulamadı"
      );
    }

    return response.data.data;
  },

  updateBulk: async (id: number, data: OrderBulkCreateDto): Promise<OrderGetDto> => {
    const response = await apiClient.put<OrderBulkCreateResponse>(
      `/api/order/bulk-order/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Talep güncellenemedi"
      );
    }

    return response.data.data;
  },

  getPriceRuleOfOrder: async (params: {
    customerCode: string;
    salesmenId: number;
    orderDate: string;
  }): Promise<PricingRuleLineGetDto[]> => {
    const response = await apiClient.get<PriceRuleResponse>(
      "/api/order/price-rule-of-order",
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
      "/api/order/price-of-product",
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
    const response = await apiClient.get<ExchangeRateResponse>("/api/Erp/getExchangeRate", {
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
    const exchangeRates = await orderApi.getExchangeRate(params);

    return exchangeRates.map((rate) => ({
      code: String(rate.dovizTipi),
      dovizTipi: rate.dovizTipi,
      dovizIsmi: rate.dovizIsmi ?? `DOVIZ_${rate.dovizTipi}`,
    }));
  },

  getRelatedUsers: async (userId: number): Promise<ApprovalScopeUserDto[]> => {
    const response = await apiClient.get<RelatedUsersResponse>(
      `/api/Order/related-users/${userId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Satış temsilcisi listesi alınamadı"
      );
    }

    return response.data.data || [];
  },

  getPaymentTypes: async (): Promise<PaymentTypeDto[]> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<PaymentTypeDto>>>("/api/PaymentType", {
      params: {
        pageNumber: 1,
        pageSize: 1000,
        sortBy: "Name",
        sortDirection: "asc",
      },
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
    const queryParams = buildQueryParams({ pageNumber: 1, pageSize: 100, ...params });
    const response = await apiClient.get<ApiResponse<PagedResponse<DocumentSerialTypeDto>>>(
      "/api/DocumentSerialType",
      { params: queryParams }
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
    const queryParams = buildQueryParams({ pageNumber: 1, pageSize: 100, ...params });
    const response = await apiClient.get<UserListResponse>("/api/User", {
      params: queryParams,
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
