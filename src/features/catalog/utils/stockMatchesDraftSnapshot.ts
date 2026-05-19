import type { ProductSelectionResult } from "@/features/stocks/types";
import type { CatalogStockItemDto } from "../types";

export function stockMatchesDraftSnapshot(
  stock: Pick<CatalogStockItemDto, "id" | "stockId" | "erpStockCode">,
  snapshot: ProductSelectionResult[]
): boolean {
  return snapshot.some((item) => {
    const stockId = stock.stockId;
    if (item.id != null && stockId != null && item.id === stockId) {
      return true;
    }

    const itemCode = String(item.code ?? "").trim();
    const stockCode = String(stock.erpStockCode ?? "").trim();
    return itemCode !== "" && stockCode !== "" && itemCode === stockCode;
  });
}
