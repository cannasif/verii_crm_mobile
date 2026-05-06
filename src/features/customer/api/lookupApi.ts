import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type {
  CountryDto,
  CityDto,
  DistrictDto,
  CustomerTypeDto,
  TitleDto,
  PagedFilter,
  PagedResponse,
} from "../types";

const buildFilterParam = (filters: PagedFilter[]): string => {
  return JSON.stringify(filters);
};

interface LookupApiResponse<T> {
  success: boolean;
  message: string;
  exceptionMessage: string;
  data: T[] | PagedResponse<T>;
  errors: string[];
  timestamp: string;
  statusCode: number;
  className: string;
}

function extractItems<T>(data: T[] | PagedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === "object" && "items" in data) {
    return data.items;
  }
  return [];
}


const PAGE_PARAMS = { pageNumber: 1, pageSize: 10000, sorting: "Name ASC"};

export const lookupApi = {
  getCountries: async (): Promise<CountryDto[]> => {
    const response = await apiClient.get<LookupApiResponse<CountryDto>>("/api/Country", {
      params: { ...PAGE_PARAMS } 
    });

    if (!response.data.success) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Ülke listesi alınamadı");
    }

    return extractItems(response.data.data);
  },

  getCities: async (countryId?: number): Promise<CityDto[]> => {
    const params: Record<string, any> = { ...PAGE_PARAMS }; 

    if (countryId) {
      params.filters = buildFilterParam([
        { column: "countryId", operator: "equals", value: String(countryId) },
      ]);
    }

    const response = await apiClient.get<LookupApiResponse<CityDto>>("/api/City", { params });

    if (!response.data.success) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Şehir listesi alınamadı");
    }

    return extractItems(response.data.data);
  },

  getDistricts: async (cityId?: number): Promise<DistrictDto[]> => {
    const params: Record<string, any> = { ...PAGE_PARAMS }; 

    if (cityId) {
      params.filters = buildFilterParam([
        { column: "cityId", operator: "equals", value: String(cityId) },
      ]);
    }

    const response = await apiClient.get<LookupApiResponse<DistrictDto>>("/api/District", { params });

    if (!response.data.success) {
      throw new Error(response.data.message || response.data.exceptionMessage || "İlçe listesi alınamadı");
    }

    return extractItems(response.data.data);
  },

  getCustomerTypes: async (): Promise<CustomerTypeDto[]> => {
    const response = await apiClient.post<LookupApiResponse<CustomerTypeDto>>("/api/CustomerType/query", {
      pageNumber: 1,
      pageSize: 10000,
      search: "",
      sortBy: "Name",
      sortDirection: "asc",
      filterLogic: "and",
      filters: [],
    });

    if (!response.data.success) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Müşteri tipi listesi alınamadı");
    }

    return extractItems(response.data.data);
  },

  getTitles: async (): Promise<TitleDto[]> => {
    const response = await apiClient.get<LookupApiResponse<TitleDto>>("/api/Title", {
      params: { ...PAGE_PARAMS } 
    });

    if (!response.data.success) {
      throw new Error(response.data.message || response.data.exceptionMessage || "Ünvan listesi alınamadı");
    }

    return extractItems(response.data.data);
  },
};
