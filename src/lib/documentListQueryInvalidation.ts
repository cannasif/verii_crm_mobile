import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { DocumentApprovalModule } from "./documentApprovalStatus";

interface PagedListSlice {
  items?: Array<{
    id: number;
    total?: number;
    grandTotal?: number;
    grandTotalDisplay?: string | null;
  } | null> | null;
}

const DOCUMENT_LIST_QUERY_ROOT: Record<DocumentApprovalModule, readonly [string, string]> = {
  quotation: ["quotation", "quotations"],
  demand: ["demand", "demands"],
  order: ["order", "orders"],
};

export function invalidateDocumentListQueries(
  queryClient: QueryClient,
  module: DocumentApprovalModule
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [...DOCUMENT_LIST_QUERY_ROOT[module]] });
}

export function invalidateDocumentDetailHeaderQuery(
  queryClient: QueryClient,
  module: DocumentApprovalModule,
  id: number
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: [module, "detail", id] });
}

export async function invalidateDocumentListAndDetailHeader(
  queryClient: QueryClient,
  module: DocumentApprovalModule,
  id: number
): Promise<void> {
  await Promise.all([
    invalidateDocumentListQueries(queryClient, module),
    invalidateDocumentDetailHeaderQuery(queryClient, module, id),
  ]);
}

export function patchDocumentListItemGrandTotal(
  queryClient: QueryClient,
  module: DocumentApprovalModule,
  documentId: number,
  grandTotal: number
): void {
  const roundedTotal = Math.round(grandTotal * 100) / 100;
  queryClient.setQueriesData<InfiniteData<PagedListSlice>>(
    { queryKey: [...DOCUMENT_LIST_QUERY_ROOT[module]] },
    (current) => {
      if (!current?.pages?.length) return current;
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items:
            page.items?.map((item) =>
              item?.id === documentId
                ? {
                    ...item,
                    total: roundedTotal,
                    grandTotal: roundedTotal,
                    grandTotalDisplay: null,
                  }
                : item
            ) ?? [],
        })),
      };
    }
  );
}
