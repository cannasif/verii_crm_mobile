import type { QueryClient } from "@tanstack/react-query";
import type { DocumentApprovalModule } from "./documentApprovalStatus";

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
