import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types/auth-types";
import type { CariDto } from "../types";

const normalizeCari = (raw: unknown): CariDto | null => {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const subeKodu = Number(item.subeKodu ?? item.SubeKodu ?? 0);
  const isletmeKodu = Number(item.isletmeKodu ?? item.IsletmeKodu ?? 0);
  const cariKod = String(item.cariKod ?? item.CariKod ?? "");

  if (!cariKod) return null;

  return {
    subeKodu,
    isletmeKodu,
    cariKod,
    cariIsim: item.cariIsim ? String(item.cariIsim) : (item.CariIsim ? String(item.CariIsim) : undefined),
    cariTel: item.cariTel ? String(item.cariTel) : (item.CariTel ? String(item.CariTel) : undefined),
    email: item.email ? String(item.email) : (item.Email ? String(item.Email) : undefined),
    cariIl: item.cariIl ? String(item.cariIl) : (item.CariIl ? String(item.CariIl) : undefined),
    cariIlce: item.cariIlce ? String(item.cariIlce) : (item.CariIlce ? String(item.CariIlce) : undefined),
    cariAdres: item.cariAdres ? String(item.cariAdres) : (item.CariAdres ? String(item.CariAdres) : undefined),
  };
};

export const erpCustomerApi = {
  getCaris: async (): Promise<CariDto[]> => {
    // Backend her şeyi gönderdiği için parametre yollamıyoruz
    const response = await apiClient.get<ApiResponse<unknown[]>>("/api/NetsisRead/getAllCustomers");

    if (!response.data.success) throw new Error("Veri çekilemedi");

    // Gelen data direkt array olduğu için onu süzüyoruz
    const rawData = response.data.data || [];
    
    return rawData
      .map(normalizeCari)
      .filter((item): item is CariDto => item !== null);
  },
};
