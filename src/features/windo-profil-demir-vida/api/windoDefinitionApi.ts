import { apiClient } from "../../../lib/axios";
import { buildPagedQueryPayload, extractPagedItems } from "../../../lib/paged";
import type { ApiResponse } from "../../auth/types";
import type { WindoDefinitionDto } from "../types";

type DefinitionListResponse = ApiResponse<WindoDefinitionDto[] | { items?: WindoDefinitionDto[]; Items?: WindoDefinitionDto[] } | null>;
type DefinitionCreateResponse = ApiResponse<WindoDefinitionDto | null>;

export interface WindoDefinitionCreateDto {
  name: string;
  profilDefinitionId?: number | null;
}

async function getDefinitions(endpoint: string): Promise<WindoDefinitionDto[]> {
  const response = await apiClient.post<DefinitionListResponse>(
    `${endpoint}/query`,
    buildPagedQueryPayload({
      pageNumber: 1,
      pageSize: 1000,
      search: "",
      sortBy: "Name",
      sortDirection: "asc",
    })
  );

  if (!response.data.success) {
    throw new Error(response.data.message || response.data.exceptionMessage || "Tanım listesi alınamadı");
  }

  return extractPagedItems(response.data.data);
}

async function createDefinition(endpoint: string, payload: WindoDefinitionCreateDto): Promise<WindoDefinitionDto> {
  const response = await apiClient.post<DefinitionCreateResponse>(endpoint, payload);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || response.data.exceptionMessage || "Tanım oluşturulamadı");
  }

  return response.data.data;
}

export const windoDefinitionApi = {
  getProfilDefinitions: () => getDefinitions("/api/ProfilDefinition"),
  getDemirDefinitions: () => getDefinitions("/api/DemirDefinition"),
  getVidaDefinitions: () => getDefinitions("/api/VidaDefinition"),
  getBaskiDefinitions: () => getDefinitions("/api/BaskiDefinition"),
  getKoliBaskiDefinitions: () => getDefinitions("/api/KoliBaskiDefinition"),
  createBaskiDefinition: (payload: WindoDefinitionCreateDto) => createDefinition("/api/BaskiDefinition", payload),
};
