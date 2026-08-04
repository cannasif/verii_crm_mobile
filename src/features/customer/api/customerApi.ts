import { apiClient } from "../../../lib/axios";
import { normalizeApiRequestError } from "../../../lib/api-error";
import { appendMobileUploadFile, prepareMobileImageUpload } from "../../../lib/uploadMedia";
import i18n from "../../../locales";
import type { ApiResponse } from "../../auth/types";
import type {
  CustomerGetDto,
  CustomerDto,
  CustomerImageDto,
  CreateCustomerDto,
  CreateCustomerFromMobileDto,
  CreateCustomerFromMobileResultDto,
  UpdateCustomerDto,
  PagedParams,
  PagedResponse,
  PagedApiResponse,
} from "../types";

function normalizeMobileOcrCreateError(error: unknown): Error {
  if (error instanceof Error) {
    const enhanced = error as Error & {
      status?: number;
      response?: { data?: { message?: string; exceptionMessage?: string } };
    };

    const message = enhanced.message ?? "";
    const responseMessage = enhanced.response?.data?.message ?? "";
    const responseDetail = enhanced.response?.data?.exceptionMessage ?? "";
    const combined = `${message} ${responseMessage}`.trim();

    if (
      enhanced.status === 409 ||
      combined.includes("CustomerService.ConflictingCustomerMatches") ||
      responseMessage.includes("CustomerService.ConflictingCustomerMatches")
    ) {
      const fallback = i18n.t(
        "customer.ocrConflictMessage",
        "Aynı e-posta veya telefon bilgileri birden fazla müşteriyle eşleşti. Önce eşleşmeleri düzeltin, sonra tekrar kaydedin."
      );

      const detailIsResourceKey = responseDetail.includes("CustomerService.");
      const detail = responseDetail && !detailIsResourceKey ? responseDetail : "";

      return new Error(detail ? `${fallback}\n\n${detail}` : fallback);
    }
  }

  return normalizeApiRequestError(
    error,
    i18n.t("customer.ocrCreateError", "Kartvizitten müşteri oluşturulamadı"),
    "/api/Customer/mobile/create-from-ocr"
  );
}

export const customerApi = {
  getList: async (params: PagedParams = {}): Promise<PagedResponse<CustomerGetDto>> => {
    const response = await apiClient.post<PagedApiResponse<CustomerGetDto>>("/api/Customer/query", {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10,
      search: params.search ?? "",
      sortBy: params.sortBy ?? "Id",
      sortDirection: params.sortDirection ?? "asc",
      filterLogic: params.filterLogic ?? "and",
      filters: params.filters ?? [],
      ...(params.contextUserId != null ? { contextUserId: params.contextUserId } : {}),
    });

    if (!response.data.success) {
      const msg =
        [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
        "Müşteri listesi alınamadı";
      throw new Error(msg);
    }

    return response.data.data;
  },

  getById: async (id: number): Promise<CustomerGetDto> => {
    const response = await apiClient.get<ApiResponse<CustomerGetDto>>(`/api/Customer/${id}`);

    if (!response.data.success) {
      const msg =
        [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
        "Müşteri bulunamadı";
      throw new Error(msg);
    }

    return response.data.data;
  },

  create: async (data: CreateCustomerDto): Promise<CustomerGetDto> => {
    const response = await apiClient.post<ApiResponse<CustomerGetDto>>("/api/Customer", data);

    if (!response.data.success) {
      const msg =
        [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
        "Müşteri oluşturulamadı";
      throw new Error(msg);
    }

    return response.data.data;
  },

  createFromMobile: async (data: CreateCustomerFromMobileDto): Promise<CreateCustomerFromMobileResultDto> => {
    const formData = new FormData();

    const appendIfPresent = (key: string, value: string | number | undefined | null) => {
      if (value === undefined || value === null) return;
      const normalized = typeof value === "string" ? value.trim() : String(value);
      if (!normalized) return;
      formData.append(key, normalized);
    };

    appendIfPresent("name", data.name);
    appendIfPresent("contactName", data.contactName);
    appendIfPresent("contactFirstName", data.contactFirstName);
    appendIfPresent("contactMiddleName", data.contactMiddleName);
    appendIfPresent("contactLastName", data.contactLastName);
    appendIfPresent("title", data.title);
    appendIfPresent("customerCode", data.customerCode);
    appendIfPresent("taxNumber", data.taxNumber);
    appendIfPresent("taxOffice", data.taxOffice);
    appendIfPresent("tcknNumber", data.tcknNumber);
    appendIfPresent("email", data.email);
    appendIfPresent("phone", data.phone);
    appendIfPresent("phone2", data.phone2);
    appendIfPresent("address", data.address);
    appendIfPresent("postalCode", data.postalCode);
    appendIfPresent("website", data.website);
    appendIfPresent("notes", data.notes);
    appendIfPresent("countryId", data.countryId);
    appendIfPresent("cityId", data.cityId);
    appendIfPresent("districtId", data.districtId);
    appendIfPresent("customerTypeId", data.customerTypeId);
    appendIfPresent("erpCariType", data.erpCariType);
    appendIfPresent("salesRepCode", data.salesRepCode);
    appendIfPresent("groupCode", data.groupCode);
    appendIfPresent("accountingCode", data.accountingCode);
    appendIfPresent("creditLimit", data.creditLimit);
    appendIfPresent("erpCurrencyType", data.erpCurrencyType);
    appendIfPresent("paymentTermDays", data.paymentTermDays);
    appendIfPresent("branchCode", data.branchCode);
    appendIfPresent("businessUnitCode", data.businessUnitCode);
    appendIfPresent("imageDescription", data.imageDescription);

    if (data.imageUri) {
      const file = await prepareMobileImageUpload(data.imageUri, { namePrefix: "customer-card" });
      appendMobileUploadFile(formData, "imageFile", file);
    }

    try {
      const response = await apiClient.post<ApiResponse<CreateCustomerFromMobileResultDto>>(
        "/api/Customer/mobile/create-from-ocr",
        formData,
        {
          timeout: 120000,
        }
      );

      if (!response.data.success) {
        const msg =
          [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
          i18n.t("customer.ocrCreateError", "Kartvizitten müşteri oluşturulamadı");
        throw new Error(msg);
      }

      return response.data.data;
    } catch (error) {
      throw normalizeMobileOcrCreateError(error);
    }
  },

  update: async (id: number, data: UpdateCustomerDto): Promise<CustomerGetDto> => {
    const response = await apiClient.put<ApiResponse<CustomerGetDto>>(`/api/Customer/${id}`, data);

    if (!response.data.success) {
      const msg =
        [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
        "Müşteri güncellenemedi";
      throw new Error(msg);
    }

    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/Customer/${id}`);

    if (!response.data.success) {
      const msg =
        [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
        "Müşteri silinemedi";
      throw new Error(msg);
    }
  },

  uploadCustomerImage: async (
    customerId: number,
    imageUri: string,
    imageDescription?: string
  ): Promise<CustomerImageDto[]> => {
    const formData = new FormData();
    const file = await prepareMobileImageUpload(imageUri, { namePrefix: `customer-${customerId}` });
    appendMobileUploadFile(formData, "files", file);

    if (imageDescription?.trim()) {
      formData.append("imageDescriptions", imageDescription.trim());
    }

    const response = await apiClient.post<ApiResponse<CustomerImageDto[]>>(
      `/api/CustomerImage/upload/${customerId}`,
      formData
    );

    if (!response.data.success) {
      const msg =
        [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
        "Müşteri görseli yüklenemedi";
      throw new Error(msg);
    }

    return response.data.data;
  },

  getCustomerImages: async (customerId: number): Promise<CustomerImageDto[]> => {
    const response = await apiClient.get<ApiResponse<CustomerImageDto[]>>(
      `/api/CustomerImage/by-customer/${customerId}`
    );

    if (!response.data.success) {
      const msg =
        [response.data.message, response.data.exceptionMessage].filter(Boolean).join(" — ") ||
        "Müşteri görselleri alınamadı";
      throw new Error(msg);
    }

    return response.data.data ?? [];
  },
};
