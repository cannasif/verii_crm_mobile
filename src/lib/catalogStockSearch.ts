import { normalizeSearchText } from "./normalizeSearchText";

type CatalogStockSearchFields = {
  erpStockCode: string;
  stockName: string;
  englishStockName?: string | null;
  grupKodu?: string | null;
};

export function catalogStockMatchesQuery(item: CatalogStockSearchFields, rawQuery: string): boolean {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;

  const tokens = query.split(/\s+/).filter(Boolean);
  const fields = [
    normalizeSearchText(item.erpStockCode),
    normalizeSearchText(item.stockName),
    normalizeSearchText(String(item.englishStockName ?? "")),
    normalizeSearchText(String(item.grupKodu ?? "")),
  ];

  return tokens.every((token) => fields.some((field) => field.includes(token)));
}
