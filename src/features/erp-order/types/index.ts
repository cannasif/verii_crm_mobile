export interface NetsisOrderHeader {
  subeKodu: number;
  fatirsNo: string;
  cariKodu: string;
  cariIsim: string;
  tarih: string;
  teslimTarihi: string;
  brutTutar: number;
  kdv: number;
  genelToplam: number;
  plasiyerKodu: string;
}

export interface NetsisOrderLine {
  subeKodu: number;
  fatirsNo: string;
  sira: number;
  stokKodu: string;
  stokAdi: string;
  miktar: number;
  olcuBr1: string;
  netFiyat: number;
  kdvOrani: number;
  depoKodu: number;
}

export type ErpOrderSortField =
  | "subeKodu"
  | "fatirsNo"
  | "cariKodu"
  | "cariIsim"
  | "tarih"
  | "teslimTarihi"
  | "brutTutar"
  | "kdv"
  | "genelToplam"
  | "plasiyerKodu";

export const ERP_ORDER_PAGE_SIZE = 20;

export const ERP_ORDER_NUMERIC_SORT_FIELDS: ReadonlySet<ErpOrderSortField> = new Set([
  "subeKodu",
  "brutTutar",
  "kdv",
  "genelToplam",
]);
