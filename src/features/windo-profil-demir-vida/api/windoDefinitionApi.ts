import { apiClient } from "../../../lib/axios";
import { normalizePagedResponse } from "../../../lib/paged";
import type { PagedResponse } from "../../../lib/paged";
import type { ApiResponse } from "../../auth/types";
import type { WindoDefinitionDto } from "../types";
import { normalizeWindoDefinitionDto, normalizeWindoDefinitionList } from "../utils/normalizeWindoDefinitionDto";

const DROPDOWN_PAGE_SIZE = 500;

type DefinitionListResponse = ApiResponse<PagedResponse<WindoDefinitionDto> | WindoDefinitionDto[] | null>;
type DefinitionItemResponse = ApiResponse<WindoDefinitionDto | null>;

export interface WindoDefinitionCreateDto {
  name: string;
  profilDefinitionId?: number | null;
}

export interface WindoDefinitionCatalog {
  profilDefinitions: WindoDefinitionDto[];
  demirDefinitions: WindoDefinitionDto[];
  vidaDefinitions: WindoDefinitionDto[];
  baskiDefinitions: WindoDefinitionDto[];
  koliBaskiDefinitions: WindoDefinitionDto[];
}

export const EMPTY_CATALOG: WindoDefinitionCatalog = {
  profilDefinitions: [],
  demirDefinitions: [],
  vidaDefinitions: [],
  baskiDefinitions: [],
  koliBaskiDefinitions: [],
};

const ENDPOINTS = {
  profil: "/api/ProfilDefinition",
  demir: "/api/DemirDefinition",
  vida: "/api/VidaDefinition",
  baski: "/api/BaskiDefinition",
  koliBaski: "/api/KoliBaskiDefinition",
} as const;

async function getDefinitions(endpoint: string): Promise<WindoDefinitionDto[]> {
  const response = await apiClient.get<DefinitionListResponse>(endpoint, {
    params: {
      pageNumber: 1,
      pageSize: DROPDOWN_PAGE_SIZE,
      search: "",
      sortBy: "Name",
      sortDirection: "asc",
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || response.data.exceptionMessage || "Tanım listesi alınamadı");
  }

  const paged = normalizePagedResponse(response.data.data, {
    pageNumber: 1,
    pageSize: DROPDOWN_PAGE_SIZE,
  });

  return normalizeWindoDefinitionList(paged.items);
}

async function createDefinition(endpoint: string, payload: WindoDefinitionCreateDto): Promise<WindoDefinitionDto> {
  const response = await apiClient.post<DefinitionItemResponse>(endpoint, payload);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || response.data.exceptionMessage || "Tanım oluşturulamadı");
  }

  const normalized = normalizeWindoDefinitionDto(response.data.data);
  if (!normalized) {
    throw new Error("Tanım oluşturulamadı");
  }

  return normalized;
}

async function updateDefinition(
  endpoint: string,
  id: number,
  payload: WindoDefinitionCreateDto
): Promise<WindoDefinitionDto> {
  const response = await apiClient.post<DefinitionItemResponse>(`${endpoint}/${id}/update`, payload);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || response.data.exceptionMessage || "Tanım güncellenemedi");
  }

  const normalized = normalizeWindoDefinitionDto(response.data.data);
  if (!normalized) {
    throw new Error("Tanım güncellenemedi");
  }

  return normalized;
}

async function deleteDefinition(endpoint: string, id: number): Promise<void> {
  const response = await apiClient.delete<ApiResponse<null>>(`${endpoint}/${id}`);

  if (!response.data.success) {
    throw new Error(response.data.message || response.data.exceptionMessage || "Tanım silinemedi");
  }
}

export async function fetchWindoDefinitionCatalog(): Promise<WindoDefinitionCatalog> {
  const [profilDefinitions, demirDefinitions, vidaDefinitions, baskiDefinitions, koliBaskiDefinitions] =
    await Promise.all([
      getDefinitions(ENDPOINTS.profil),
      getDefinitions(ENDPOINTS.demir),
      getDefinitions(ENDPOINTS.vida),
      getDefinitions(ENDPOINTS.baski),
      getDefinitions(ENDPOINTS.koliBaski),
    ]);

  return {
    profilDefinitions,
    demirDefinitions,
    vidaDefinitions,
    baskiDefinitions,
    koliBaskiDefinitions,
  };
}

export async function createProfilBundle(payload: {
  profilName: string;
  demirName: string;
  vidaName: string;
}): Promise<{ profil: WindoDefinitionDto; demir: WindoDefinitionDto; vida: WindoDefinitionDto }> {
  const profil = await createDefinition(ENDPOINTS.profil, {
    name: payload.profilName.trim(),
    profilDefinitionId: null,
  });

  const [demir, vida] = await Promise.all([
    createDefinition(ENDPOINTS.demir, {
      name: payload.demirName.trim(),
      profilDefinitionId: profil.id,
    }),
    createDefinition(ENDPOINTS.vida, {
      name: payload.vidaName.trim(),
      profilDefinitionId: profil.id,
    }),
  ]);

  return { profil, demir, vida };
}

export const windoDefinitionApi = {
  endpoints: ENDPOINTS,
  fetchCatalog: fetchWindoDefinitionCatalog,
  getProfilDefinitions: () => getDefinitions(ENDPOINTS.profil),
  getDemirDefinitions: () => getDefinitions(ENDPOINTS.demir),
  getVidaDefinitions: () => getDefinitions(ENDPOINTS.vida),
  getBaskiDefinitions: () => getDefinitions(ENDPOINTS.baski),
  getKoliBaskiDefinitions: () => getDefinitions(ENDPOINTS.koliBaski),
  createProfilDefinition: (payload: WindoDefinitionCreateDto) => createDefinition(ENDPOINTS.profil, payload),
  createDemirDefinition: (payload: WindoDefinitionCreateDto) => createDefinition(ENDPOINTS.demir, payload),
  createVidaDefinition: (payload: WindoDefinitionCreateDto) => createDefinition(ENDPOINTS.vida, payload),
  createBaskiDefinition: (payload: WindoDefinitionCreateDto) => createDefinition(ENDPOINTS.baski, payload),
  createKoliBaskiDefinition: (payload: WindoDefinitionCreateDto) => createDefinition(ENDPOINTS.koliBaski, payload),
  updateProfilDefinition: (id: number, payload: WindoDefinitionCreateDto) =>
    updateDefinition(ENDPOINTS.profil, id, payload),
  updateDemirDefinition: (id: number, payload: WindoDefinitionCreateDto) =>
    updateDefinition(ENDPOINTS.demir, id, payload),
  updateVidaDefinition: (id: number, payload: WindoDefinitionCreateDto) =>
    updateDefinition(ENDPOINTS.vida, id, payload),
  updateBaskiDefinition: (id: number, payload: WindoDefinitionCreateDto) =>
    updateDefinition(ENDPOINTS.baski, id, payload),
  updateKoliBaskiDefinition: (id: number, payload: WindoDefinitionCreateDto) =>
    updateDefinition(ENDPOINTS.koliBaski, id, payload),
  deleteProfilDefinition: (id: number) => deleteDefinition(ENDPOINTS.profil, id),
  deleteDemirDefinition: (id: number) => deleteDefinition(ENDPOINTS.demir, id),
  deleteVidaDefinition: (id: number) => deleteDefinition(ENDPOINTS.vida, id),
  deleteBaskiDefinition: (id: number) => deleteDefinition(ENDPOINTS.baski, id),
  deleteKoliBaskiDefinition: (id: number) => deleteDefinition(ENDPOINTS.koliBaski, id),
  createProfilBundle,
};
