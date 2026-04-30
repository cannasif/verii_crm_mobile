import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type { WindoDefinitionDto } from "../types";

interface PagedDefinitionPayload {
  items?: WindoDefinitionDto[];
  Items?: WindoDefinitionDto[];
}

type DefinitionListResponse = ApiResponse<WindoDefinitionDto[] | PagedDefinitionPayload | null>;

function extractDefinitions(payload: DefinitionListResponse["data"]): WindoDefinitionDto[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const pagedItems = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.Items)
        ? payload.Items
        : [];

    return pagedItems;
  }

  return [];
}

async function getDefinitions(endpoint: string): Promise<WindoDefinitionDto[]> {
  const response = await apiClient.get<DefinitionListResponse>(endpoint, {
    params: {
      pageNumber: 1,
      pageSize: 1000,
      sortBy: "Name",
      sortDirection: "asc",
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || response.data.exceptionMessage || "Tanım listesi alınamadı");
  }

  return extractDefinitions(response.data.data);
}

export const windoDefinitionApi = {
  getProfilDefinitions: () => getDefinitions("/api/ProfilDefinition"),
  getDemirDefinitions: () => getDefinitions("/api/DemirDefinition"),
  getVidaDefinitions: () => getDefinitions("/api/VidaDefinition"),
};
