import type { StockImageDto } from "../types";

export function sortStockImagesForDisplay(images: StockImageDto[] | undefined | null): StockImageDto[] {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }
  const withPath = images.filter((img) => img && typeof img.filePath === "string" && img.filePath.trim() !== "");
  return [...withPath].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1;
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}
