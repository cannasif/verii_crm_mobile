import { apiClient } from "../../../lib/axios";
import { buildPagedQueryPayload, extractPagedItems } from "../../../lib/paged";
import type { ApiResponse } from "../../auth/types";
import type { WindoDefinitionDto } from "../types";

type DefinitionListResponse = ApiResponse<WindoDefinitionDto[] | { items?: WindoDefinitionDto[]; Items?: WindoDefinitionDto[] } | null>;

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

export const windoDefinitionApi = {
  getProfilDefinitions: () => getDefinitions("/api/ProfilDefinition"),
  getDemirDefinitions: () => getDefinitions("/api/DemirDefinition"),
  getVidaDefinitions: () => getDefinitions("/api/VidaDefinition"),
  getBaskiDefinitions: () => getDefinitions("/api/BaskiDefinition"),
};
