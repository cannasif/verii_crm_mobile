import { getCurrentLanguage } from "../locales";
import type { StockGetDto } from "../features/stocks/types/stock";

export function isTurkishUiLanguage(language?: string | null): boolean {
  const normalized = (language ?? getCurrentLanguage() ?? "tr").split("-")[0].toLowerCase();
  return normalized === "tr";
}

export function getLocalizedStockName(params: {
  stockName: string;
  englishStockName?: string | null;
  uiLanguage?: string | null;
}): string {
  const trName = params.stockName.trim();
  const enName = (params.englishStockName ?? "").trim();
  if (isTurkishUiLanguage(params.uiLanguage)) {
    return trName;
  }
  return enName.length > 0 ? enName : trName;
}

export function getLocalizedStockNameFromStock(
  stock: Pick<StockGetDto, "stockName" | "englishStockName">,
  uiLanguage?: string | null
): string {
  return getLocalizedStockName({
    stockName: stock.stockName,
    englishStockName: stock.englishStockName,
    uiLanguage,
  });
}

export interface DocumentLineProductFields {
  productCode?: string | null;
  productName: string;
}

export function localizeLoadedLineProductName(
  line: DocumentLineProductFields,
  stockByCodeLower: Map<string, Pick<StockGetDto, "stockName" | "englishStockName">>,
  uiLanguage?: string | null
): string {
  const code = line.productCode?.trim().toLowerCase() ?? "";
  if (code.length > 0 && stockByCodeLower.has(code)) {
    const stock = stockByCodeLower.get(code)!;
    return getLocalizedStockName({
      stockName: stock.stockName,
      englishStockName: stock.englishStockName,
      uiLanguage,
    });
  }
  return line.productName?.trim() ?? "";
}

export function mergeCreatedLineProductName<T extends DocumentLineProductFields>(
  apiLine: T,
  localLine: DocumentLineProductFields
): T {
  const localName = localLine.productName?.trim();
  if (!localName) return apiLine;
  return { ...apiLine, productName: localName };
}

export type LocalizableLineFormState = DocumentLineProductFields & {
  relatedLines?: LocalizableLineFormState[];
};

export function collectProductCodesFromLines(lines: LocalizableLineFormState[]): string[] {
  const codes = new Set<string>();

  const visit = (line: LocalizableLineFormState): void => {
    const code = line.productCode?.trim();
    if (code) codes.add(code);
    line.relatedLines?.forEach(visit);
  };

  lines.forEach(visit);
  return [...codes];
}

export function localizeDocumentLineFormStatesWithStockMap<T extends LocalizableLineFormState>(
  lines: T[],
  stockMap: Map<string, Pick<StockGetDto, "stockName" | "englishStockName">>,
  uiLanguage?: string | null
): T[] {
  const lang = uiLanguage ?? getCurrentLanguage();

  const localizeOne = (line: LocalizableLineFormState): LocalizableLineFormState => {
    const productName = localizeLoadedLineProductName(line, stockMap, lang);
    const relatedLines = line.relatedLines?.map(localizeOne);
    return relatedLines != null ? { ...line, productName, relatedLines } : { ...line, productName };
  };

  return lines.map((line) => localizeOne(line) as T);
}
