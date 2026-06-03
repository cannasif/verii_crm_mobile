import type { useUIStore } from "@/store/ui";

export type StockBrowseThemeColors = ReturnType<typeof useUIStore.getState>["colors"];

export interface StockBrowseItemFields {
  erpStockCode: string;
  stockName: string;
  unit?: string;
  imageUrl?: string;
  grupKodu?: string;
  grupAdi?: string;
  kod1?: string;
  kod1Adi?: string;
}

export type StockNameTooltipPlacement = "above" | "below";
