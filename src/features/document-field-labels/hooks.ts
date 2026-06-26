import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDocumentFieldLabels } from "./api";
import type {
  DocumentContextKey,
  DocumentFieldLabelDocumentType,
  DocumentFieldLabelDto,
  DocumentFieldLabelScope,
} from "./types";
import { DOCUMENT_CONTEXT_TO_TYPE } from "./types";

export const DOCUMENT_FIELD_LABELS_QUERY_KEY = ["document-field-labels"] as const;

export function useDocumentFieldLabelsQuery(params?: {
  documentType?: DocumentFieldLabelDocumentType;
  scope?: DocumentFieldLabelScope;
}) {
  return useQuery({
    queryKey: [
      ...DOCUMENT_FIELD_LABELS_QUERY_KEY,
      params?.documentType ?? "all",
      params?.scope ?? "all",
    ],
    queryFn: () => getDocumentFieldLabels(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useDocumentFieldLabelMap(
  context: DocumentContextKey,
  scope: DocumentFieldLabelScope,
): Record<string, DocumentFieldLabelDto> {
  const documentType = DOCUMENT_CONTEXT_TO_TYPE[context];
  const { data } = useDocumentFieldLabelsQuery({ documentType, scope });

  return useMemo(() => {
    const map: Record<string, DocumentFieldLabelDto> = {};
    for (const item of data ?? []) {
      if (item.isActive) {
        map[item.fieldKey] = item;
      }
    }
    return map;
  }, [data]);
}
