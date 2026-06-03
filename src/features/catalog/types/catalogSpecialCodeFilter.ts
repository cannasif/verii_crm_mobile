import type { CatalogFilterDimension } from "../utils/catalog-special-code-filter";

export type { CatalogFilterDimension };

export type CatalogSpecialCodeSelections = Record<CatalogFilterDimension, string[]>;

export interface CatalogSpecialCodeOption {
  value: string;
  label: string;
}
