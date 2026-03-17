import type { StockGetDto } from "../types";

function normalizeSearchText(value: string | undefined | null): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

function getStockSearchFields(stock: StockGetDto): string[] {
  return [
    stock.stockName,
    stock.erpStockCode,
    stock.grupKodu,
    stock.grupAdi,
    stock.ureticiKodu,
    stock.kod1,
    stock.kod1Adi,
    stock.kod2,
    stock.kod2Adi,
    stock.kod3,
    stock.kod3Adi,
    stock.kod4,
    stock.kod4Adi,
    stock.kod5,
    stock.kod5Adi,
  ]
    .map((field) => normalizeSearchText(field))
    .filter((field) => field.length > 0);
}

function scoreStock(stock: StockGetDto, rawQuery: string): number {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (normalizedQuery.length === 0) return 0;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const fields = getStockSearchFields(stock);
  const combined = fields.join(" ");

  if (tokens.length === 0) return 0;
  if (!tokens.every((token) => combined.includes(token))) return 0;

  let score = 0;

  tokens.forEach((token) => {
    if (normalizeSearchText(stock.erpStockCode).startsWith(token)) score += 12;
    if (normalizeSearchText(stock.stockName).startsWith(token)) score += 10;
    if (normalizeSearchText(stock.grupKodu).startsWith(token)) score += 8;
    if (normalizeSearchText(stock.grupAdi).startsWith(token)) score += 7;

    fields.forEach((field) => {
      if (field === token) score += 10;
      else if (field.startsWith(token)) score += 6;
      else if (field.includes(token)) score += 3;
    });
  });

  if (combined.startsWith(normalizedQuery)) score += 10;
  else if (combined.includes(normalizedQuery)) score += 5;

  return score;
}

export function filterAndRankStocks(stocks: StockGetDto[], rawQuery: string): StockGetDto[] {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (normalizedQuery.length < 2) return stocks;

  return [...stocks]
    .map((stock, index) => ({
      stock,
      index,
      score: scoreStock(stock, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    })
    .map((entry) => entry.stock);
}
