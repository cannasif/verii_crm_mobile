import { getLocalizedStockNameFromStock } from "@/lib/localizedStockName";
import type { ProductSelectionResult, StockGetDto } from "@/features/stocks/types";
import type { CatalogStockItemDto } from "../types";

export function mapStockGetToCatalogItem(stock: StockGetDto): CatalogStockItemDto {
  const primaryImage = stock.stockImages?.find((image) => image.isPrimary) ?? stock.stockImages?.[0];

  return {
    id: stock.id,
    stockCategoryId: 0,
    stockId: stock.id,
    erpStockCode: stock.erpStockCode,
    stockName: stock.stockName,
    englishStockName: stock.englishStockName ?? null,
    unit: stock.unit ?? null,
    grupKodu: stock.grupKodu ?? null,
    grupAdi: stock.grupAdi ?? null,
    kod1: stock.kod1 ?? null,
    kod1Adi: stock.kod1Adi ?? null,
    kod2: stock.kod2 ?? null,
    kod2Adi: stock.kod2Adi ?? null,
    kod3: stock.kod3 ?? null,
    kod3Adi: stock.kod3Adi ?? null,
    isPrimaryCategory: true,
    imageUrl: primaryImage?.filePath ?? null,
  };
}

export function catalogStockToSelectionResult(
  stock: CatalogStockItemDto,
  relatedStockIds?: number[],
  uiLanguage?: string | null
): ProductSelectionResult {
  return {
    id: stock.stockId,
    code: stock.erpStockCode,
    name: getLocalizedStockNameFromStock(stock, uiLanguage),
    unit: stock.unit ?? null,
    groupCode: stock.grupKodu ?? null,
    relatedStockIds,
  };
}
