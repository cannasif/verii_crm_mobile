export interface ProductSelectionResult {
  id?: number;
  code: string;
  name: string;
  unit?: string | null;
  vatRate?: number | null;
  groupCode?: string | null;
  relatedStockIds?: number[];
}

export function getProductSelectionKey(result: Pick<ProductSelectionResult, "id" | "code">): string {
  if (result.id != null) {
    return `id:${result.id}`;
  }

  return `code:${String(result.code ?? "").trim().toUpperCase()}`;
}
