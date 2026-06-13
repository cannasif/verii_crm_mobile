import { apiClient } from "../../../lib/axios";
import type { ApiResponse } from "../../auth/types";
import type { NetsisOrderHeader, NetsisOrderLine } from "../types";

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (value == null || value === "") continue;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function normalizeHeader(raw: unknown): NetsisOrderHeader | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const fatirsNo = readString(item, "fatirsNo", "FatirsNo");
  if (!fatirsNo) return null;

  return {
    subeKodu: readNumber(item, "subeKodu", "SubeKodu"),
    fatirsNo,
    cariKodu: readString(item, "cariKodu", "CariKodu"),
    cariIsim: readString(item, "cariIsim", "CariIsim"),
    tarih: readString(item, "tarih", "Tarih"),
    teslimTarihi: readString(item, "teslimTarihi", "TeslimTarihi"),
    brutTutar: readNumber(item, "brutTutar", "BrutTutar"),
    kdv: readNumber(item, "kdv", "Kdv"),
    genelToplam: readNumber(item, "genelToplam", "GenelToplam"),
    plasiyerKodu: readString(item, "plasiyerKodu", "PlasiyerKodu"),
  };
}

function normalizeLine(raw: unknown): NetsisOrderLine | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const fatirsNo = readString(item, "fatirsNo", "FatirsNo");
  if (!fatirsNo) return null;

  return {
    subeKodu: readNumber(item, "subeKodu", "SubeKodu"),
    fatirsNo,
    sira: readNumber(item, "sira", "Sira"),
    stokKodu: readString(item, "stokKodu", "StokKodu"),
    stokAdi: readString(item, "stokAdi", "StokAdi"),
    miktar: readNumber(item, "miktar", "Miktar"),
    olcuBr1: readString(item, "olcuBr1", "OlcuBr1"),
    netFiyat: readNumber(item, "netFiyat", "NetFiyat"),
    kdvOrani: readNumber(item, "kdvOrani", "KdvOrani"),
    depoKodu: readNumber(item, "depoKodu", "DepoKodu"),
  };
}

function assertSuccess<T>(body: ApiResponse<T>, fallbackMessage: string): T {
  if (body.success !== true || body.data == null) {
    const message =
      [body.message, body.exceptionMessage].filter(Boolean).join(" — ") || fallbackMessage;
    throw new Error(message);
  }
  return body.data;
}

export const erpOrderApi = {
  getNetsisOrders: async (): Promise<NetsisOrderHeader[]> => {
    const response = await apiClient.get<ApiResponse<unknown[]>>("/api/NetsisRead/getNetsisOrders");
    const data = assertSuccess(response.data, "ERP siparişleri yüklenemedi");
    const rows = Array.isArray(data) ? data : [];
    return rows.map(normalizeHeader).filter((item): item is NetsisOrderHeader => item != null);
  },

  getNetsisOrderLines: async (fatirsNo: string): Promise<NetsisOrderLine[]> => {
    const response = await apiClient.get<ApiResponse<unknown[]>>(
      "/api/NetsisRead/getNetsisOrderLines",
      { params: { fatirsNo } }
    );
    const data = assertSuccess(response.data, "Sipariş kalemleri yüklenemedi");
    const rows = Array.isArray(data) ? data : [];
    return rows.map(normalizeLine).filter((item): item is NetsisOrderLine => item != null);
  },
};
