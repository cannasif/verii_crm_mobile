import { catalogApi } from "../api/catalogApi";
import type { CatalogCategoryNodeDto } from "../types";

export interface CatalogCategoryTreeFlatNode extends CatalogCategoryNodeDto {
  parentCatalogCategoryId: number | null;
}

export async function fetchCatalogCategoryTreeFlat(catalogId: number): Promise<CatalogCategoryTreeFlatNode[]> {
  const flat: CatalogCategoryTreeFlatNode[] = [];
  const queue: Array<{ parentId: number | null }> = [{ parentId: null }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const children = await catalogApi.getCatalogCategories(catalogId, current.parentId);
    for (const child of children) {
      flat.push({
        ...child,
        parentCatalogCategoryId: current.parentId,
      });

      if (child.hasChildren) {
        queue.push({ parentId: child.catalogCategoryId });
      }
    }
  }

  return flat;
}

export function buildCategoryBranchPath(
  flat: CatalogCategoryTreeFlatNode[],
  targetCategoryId: number
): CatalogCategoryNodeDto[] {
  const byId = new Map(flat.map((node) => [node.catalogCategoryId, node]));
  const chain: CatalogCategoryNodeDto[] = [];
  let current = byId.get(targetCategoryId);

  while (current) {
    chain.unshift(current);
    current = current.parentCatalogCategoryId != null ? byId.get(current.parentCatalogCategoryId) : undefined;
  }

  return chain;
}
