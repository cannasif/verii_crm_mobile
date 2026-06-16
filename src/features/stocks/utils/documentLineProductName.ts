import {
  collectProductCodesFromLines,
  getLocalizedStockNameFromStock,
  localizeDocumentLineFormStatesWithStockMap,
  type LocalizableLineFormState,
} from "../../../lib/localizedStockName";
import { stockApi } from "../api/stockApi";
import type { StockGetDto } from "../types/stock";

export interface ProductSelectionInput {
  stockId?: number | null;
  code?: string | null;
  name?: string | null;
}

export async function fetchStockMapByErpCodes(
  erpStockCodes: Iterable<string>
): Promise<Map<string, StockGetDto>> {
  const stocks = await stockApi.getListByErpStockCodes([...erpStockCodes]);
  const map = new Map<string, StockGetDto>();

  for (const stock of stocks) {
    const key = stock.erpStockCode.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, stock);
    }
  }

  return map;
}

export async function resolveDocumentLineProductName(
  product: ProductSelectionInput,
  uiLanguage?: string | null
): Promise<string> {
  if (product.stockId != null && product.stockId > 0) {
    try {
      const stock = await stockApi.getById(product.stockId);
      return getLocalizedStockNameFromStock(stock, uiLanguage);
    } catch {
    }
  }

  const code = product.code?.trim();
  if (code) {
    const stocks = await stockApi.getListByErpStockCodes([code]);
    const stock = stocks.find(
      (item) => item.erpStockCode.trim().toLowerCase() === code.toLowerCase()
    );
    if (stock) {
      return getLocalizedStockNameFromStock(stock, uiLanguage);
    }
  }

  return product.name?.trim() ?? code ?? "";
}

export async function localizeDocumentLineFormStates<T extends LocalizableLineFormState>(
  lines: T[],
  uiLanguage?: string | null
): Promise<T[]> {
  const codes = collectProductCodesFromLines(lines);
  if (codes.length === 0) return lines;

  const stockMap = await fetchStockMapByErpCodes(codes);
  return localizeDocumentLineFormStatesWithStockMap(lines, stockMap, uiLanguage);
}

export async function mapApiLinesToLocalizedFormState<TApi, T extends LocalizableLineFormState>(
  apiLines: TApi[],
  mapFn: (lines: TApi[]) => T[],
  uiLanguage?: string | null
): Promise<T[]> {
  const mapped = mapFn(apiLines);
  return localizeDocumentLineFormStates(mapped, uiLanguage);
}
