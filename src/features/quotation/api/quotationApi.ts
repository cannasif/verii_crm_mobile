import { apiClient } from "../../../lib/axios";
import type {
  WaitingApprovalsResponse,
  ApproveResponse,
  RejectResponse,
  QuotationListResponse,
  QuotationResponse,
  QuotationBulkCreateResponse,
  QuotationDetailResponse,
  QuotationLineDetailListResponse,
  QuotationExchangeRateDetailListResponse,
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
  QuotationGetDto,
  QuotationDetailGetDto,
  QuotationLineDetailGetDto,
  QuotationExchangeRateDetailGetDto,
  QuotationExchangeRateUpdateDto,
  QuotationExchangeRateUpdateResponse,
  QuotationApprovalFlowReportDto,
  QuotationApprovalFlowReportResponse,
  QuotationBulkCreateDto,
  CreateQuotationLineDto,
  QuotationLineUpdateDto,
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
  ReportTemplateGetDto,
  GenerateReportPdfRequest,
} from "../types";
import type { ApiResponse } from "../../auth/types";
import type {
  ProjeDto,
  SalesTypeGetDto,
  QuotationNotesGetDto,
  UpdateQuotationNotesListDto,
} from "../types";

export interface ReportTemplateListResponse extends ApiResponse<PagedResponse<ReportTemplateGetDto>> {}
export interface PdfTemplateAssetDto {
  id: number;
  originalFileName: string;
  storedFileName: string;
  relativeUrl: string;
  contentType: string;
  sizeBytes: number;
  reportTemplateId?: number | null;
  elementId?: string | null;
  pageNumber?: number | null;
  tempQuotattionId?: number | null;
  tempQuotattionLineId?: number | null;
  productCode?: string | null;
}

export interface UploadReportAssetOptions {
  assetScope?: "quick-quotation" | "pdf-designer" | "report-builder" | "template";
  tempQuotattionId?: number;
  tempQuotattionLineId?: number;
  productCode?: string;
}

export type ErpProjectCodesResponse = ApiResponse<ProjeDto[]>;
export type SalesTypeListResponse = ApiResponse<PagedResponse<SalesTypeGetDto>>;

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

export const quotationApi = {
  getWaitingApprovals: async (): Promise<ApprovalActionGetDto[]> => {
    const response = await apiClient.get<WaitingApprovalsResponse>(
      "/api/quotation/waiting-approvals"
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
    const response = await apiClient.post<ApproveResponse>("/api/quotation/approve", data);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Onay işlemi gerçekleştirilemedi"
      );
    }

    return response.data.data ?? false;
  },

  reject: async (data: RejectActionDto): Promise<boolean> => {
    const response = await apiClient.post<RejectResponse>("/api/quotation/reject", data);

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
      "/api/Quotation/start-approval-flow",
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

  getApprovalFlowReport: async (quotationId: number): Promise<QuotationApprovalFlowReportDto> => {
    const response = await apiClient.get<QuotationApprovalFlowReportResponse>(
      `/api/Quotation/${quotationId}/approval-flow-report`
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

  getById: async (id: number): Promise<QuotationDetailGetDto> => {
    const response = await apiClient.get<QuotationDetailResponse>(`/api/Quotation/${id}`);

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Teklif detayı alınamadı"
      );
    }

    const data = response.data.data;
    if (!data) {
      throw new Error("Teklif detayı alınamadı");
    }
    return data;
  },

  getLinesByQuotation: async (quotationId: number): Promise<QuotationLineDetailGetDto[]> => {
    const response = await apiClient.get<QuotationLineDetailListResponse>(
      `/api/QuotationLine/by-quotation/${quotationId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Teklif satırları alınamadı"
      );
    }

    return response.data.data ?? [];
  },

  getExchangeRatesByQuotation: async (
    quotationId: number
  ): Promise<QuotationExchangeRateDetailGetDto[]> => {
    const response = await apiClient.get<QuotationExchangeRateDetailListResponse>(
      `/api/QuotationExchangeRate/quotation/${quotationId}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Teklif döviz kurları alınamadı"
      );
    }

    return response.data.data ?? [];
  },

  updateExchangeRateInQuotation: async (
    body: QuotationExchangeRateUpdateDto[]
  ): Promise<boolean> => {
    const response = await apiClient.put<QuotationExchangeRateUpdateResponse>(
      "/api/QuotationExchangeRate/update-exchange-rate-in-quotation",
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

  deleteQuotationLine: async (lineId: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<unknown>>(
      `/api/QuotationLine/${lineId}`
    );
    const data = response.data as { success?: boolean; message?: string };
    if (data.success === false) {
      throw new Error(data.message || "Satır silinemedi");
    }
  },

  createQuotationLines: async (
    body: CreateQuotationLineDto[]
  ): Promise<QuotationLineDetailGetDto[]> => {
    const response = await apiClient.post<QuotationLineDetailListResponse>(
      "/api/QuotationLine/create-multiple",
      body
    );
    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Teklif satırları eklenemedi"
      );
    }
    return response.data.data ?? [];
  },

  updateQuotationLines: async (
    body: QuotationLineUpdateDto[]
  ): Promise<QuotationLineDetailGetDto[]> => {
    const response = await apiClient.put<QuotationLineDetailListResponse>(
      "/api/QuotationLine/update-multiple",
      body
    );
    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Teklif satırları güncellenemedi"
      );
    }
    return response.data.data ?? [];
  },

  getList: async (params: PagedParams = {}): Promise<PagedResponse<QuotationGetDto>> => {
    const queryParams = buildQueryParams(params);
    const response = await apiClient.get<QuotationListResponse>("/api/quotation", {
      params: queryParams,
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Teklif listesi alınamadı"
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

  createRevision: async (quotationId: number): Promise<QuotationGetDto> => {
    const response = await apiClient.post<QuotationResponse>(
      "/api/Quotation/revision-of-quotation",
      quotationId
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Teklif revizyonu oluşturulurken bir hata oluştu"
      );
    }

    return response.data.data;
  },

  createBulk: async (data: QuotationBulkCreateDto): Promise<QuotationGetDto> => {
    const response = await apiClient.post<QuotationBulkCreateResponse>(
      "/api/quotation/bulk-quotation",
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Teklif oluşturulamadı"
      );
    }

    return response.data.data;
  },

  updateBulk: async (id: number, data: QuotationBulkCreateDto): Promise<QuotationGetDto> => {
    const response = await apiClient.put<QuotationBulkCreateResponse>(
      `/api/quotation/bulk-quotation/${id}`,
      data
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          response.data.exceptionMessage ||
          "Teklif güncellenemedi"
      );
    }

    return response.data.data;
  },

  getPriceRuleOfQuotation: async (params: {
    customerCode: string;
    salesmenId: number;
    quotationDate: string;
  }): Promise<PricingRuleLineGetDto[]> => {
    const response = await apiClient.get<PriceRuleResponse>(
      "/api/quotation/price-rule-of-quotation",
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
      "/api/quotation/price-of-product",
      { params }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Ürün fiyatı alınamadı"
      );
    }

    return response.data.data || [];
  },

  getProjectCodes: async (): Promise<ProjeDto[]> => {
    const response = await apiClient.get<ErpProjectCodesResponse>("/api/Erp/getProjectCodes");
    const body = response.data as { success?: boolean; data?: ProjeDto[]; message?: string };
    if (body.success === false) {
      throw new Error(body.message || "Proje kodları alınamadı");
    }
    const data = body.data;
    if (!Array.isArray(data)) return [];
    return data.map((p) => ({
      projeKod: p.projeKod ?? "",
      projeAciklama: p.projeAciklama ?? null,
    }));
  },

  getQuotationNotes: async (quotationId: number): Promise<QuotationNotesGetDto | null> => {
    const response = await apiClient.get<ApiResponse<QuotationNotesGetDto>>(
      `/api/QuotationNotes/by-quotation/${quotationId}`
    );
    const body = response.data as { success?: boolean; data?: QuotationNotesGetDto; message?: string };
    if (body.success === false) {
      throw new Error(body.message || "Teklif notları alınamadı");
    }
    return body.data ?? null;
  },

  updateQuotationNotesList: async (
    quotationId: number,
    data: UpdateQuotationNotesListDto
  ): Promise<void> => {
    const response = await apiClient.put<ApiResponse<null>>(
      `/api/QuotationNotes/by-quotation/${quotationId}/notes-list`,
      data
    );
    const body = response.data as { success?: boolean; message?: string };
    if (body.success === false) {
      throw new Error(body.message || "Teklif notları güncellenemedi");
    }
  },

  getSalesTypeList: async (params: {
    pageNumber?: number;
    pageSize?: number;
    filters?: Array<{ column: string; operator: string; value: string }>;
  }): Promise<SalesTypeGetDto[]> => {
    const queryParams: Record<string, string | number> = {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 500,
    };
    if (params.filters && params.filters.length > 0) {
      queryParams.filters = JSON.stringify(params.filters);
    }
    const response = await apiClient.get<SalesTypeListResponse>("/api/SalesType", {
      params: queryParams,
    });
    const body = response.data as { success?: boolean; data?: { items?: SalesTypeGetDto[] }; message?: string };
    if (body.success === false) {
      throw new Error(body.message || "Satış tipleri alınamadı");
    }
    const paged = body.data;
    const rawItems = paged && typeof paged === "object" && ("items" in paged || "Items" in paged)
      ? (paged as { items?: SalesTypeGetDto[]; Items?: SalesTypeGetDto[] }).items ??
        (paged as { items?: SalesTypeGetDto[]; Items?: SalesTypeGetDto[] }).Items
      : [];
    const items = Array.isArray(rawItems) ? rawItems : [];
    return items.map((item) => {
      const r = item as unknown as Record<string, unknown>;
      return {
        id: (r.id ?? r.Id ?? 0) as number,
        salesType: (r.salesType ?? r.SalesType ?? "") as string,
        name: (r.name ?? r.Name ?? "") as string,
      } as SalesTypeGetDto;
    });
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
    const exchangeRates = await quotationApi.getExchangeRate(params);

    return exchangeRates.map((rate) => ({
      code: String(rate.dovizTipi),
      dovizTipi: rate.dovizTipi,
      dovizIsmi: rate.dovizIsmi ?? `DOVIZ_${rate.dovizTipi}`,
    }));
  },

  getRelatedUsers: async (userId: number): Promise<ApprovalScopeUserDto[]> => {
    const response = await apiClient.get<RelatedUsersResponse>(
      `/api/Quotation/related-users/${userId}`
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

  getReportTemplates: async (): Promise<ReportTemplateGetDto[]> => {
    const response = await apiClient.get<ReportTemplateListResponse>("/api/ReportTemplate");
    if (!response.data.success) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Rapor şablonları alınamadı"
      );
    }
    const paged = response.data.data;
    return (paged && "items" in paged ? paged.items : []) ?? [];
  },

  uploadReportAsset: async (
    fileUri: string,
    options?: UploadReportAssetOptions
  ): Promise<PdfTemplateAssetDto> => {
    const cleanedUri = fileUri.split("?")[0]?.split("#")[0] ?? fileUri;
    const rawTail = decodeURIComponent(cleanedUri).split("/").pop()?.trim() || `fast_quotation_${Date.now()}.jpg`;
    const ext = rawTail.includes(".") ? rawTail.substring(rawTail.lastIndexOf(".") + 1).toLowerCase() : "jpg";
    const mimeType =
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      ext === "gif" ? "image/gif" :
      "image/jpeg";

    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: rawTail,
      type: mimeType,
    } as any);
    if (options?.assetScope) {
      formData.append("assetScope", options.assetScope);
    }
    if (typeof options?.tempQuotattionId === "number" && options.tempQuotattionId > 0) {
      formData.append("tempQuotattionId", String(options.tempQuotattionId));
    }
    if (typeof options?.tempQuotattionLineId === "number" && options.tempQuotattionLineId > 0) {
      formData.append("tempQuotattionLineId", String(options.tempQuotattionLineId));
    }
    if (options?.productCode) {
      formData.append("productCode", options.productCode);
    }

    const response = await apiClient.post<ApiResponse<PdfTemplateAssetDto>>(
      "/api/pdf-report-templates/assets/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || response.data.exceptionMessage || "Görsel yüklenemedi"
      );
    }

    return response.data.data;
  },

  generateReportPdf: async (
    body: GenerateReportPdfRequest
  ): Promise<ArrayBuffer> => {
    const response = await apiClient.post<ArrayBuffer>(
      "/api/ReportTemplate/generate-pdf",
      body,
      { responseType: "arraybuffer" }
    );
    return response.data;
  },
};
