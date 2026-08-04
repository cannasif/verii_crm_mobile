import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCustomerDocumentSerialSuggestion } from "../api/documentSerialTypeApi";
import type {
  CustomerDocumentSerialDocumentKindValue,
  DocumentSerialTypeDto,
} from "../types";
import {
  getLastDocumentSerialTypeId,
  saveLastDocumentSerialTypeId,
} from "../utils/documentSerialPreferenceStore";
import { formatSuggestedDocumentNumber } from "../utils/formatSuggestedDocumentNumber";

export interface UseDocumentSerialAutoFillParams {
  documentId?: number | null;
  readOnly?: boolean;
  ruleType: number;
  salesRepId: number | undefined | null;
  documentSerialTypeId: number | null | undefined;
  setDocumentSerialTypeId: (id: number | null) => void;
  availableSerialTypes: DocumentSerialTypeDto[];
  isAvailableListReady: boolean;
  userId?: number | null;
  branchCode?: string | null;
  customerId?: number | null;
  documentKind?: CustomerDocumentSerialDocumentKindValue | null;
  setOfferNo?: (offerNo: string) => void;
}

export function useDocumentSerialAutoFill(params: UseDocumentSerialAutoFillParams) {
  const lastAppliedSerialTypeIdRef = useRef<number | null>(null);
  const isCreateMode = params.documentId == null || params.documentId <= 0;

  const filteredTypes = useMemo(
    () =>
      params.availableSerialTypes.filter(
        (item) => item.serialPrefix != null && item.serialPrefix.trim() !== ""
      ),
    [params.availableSerialTypes]
  );
  const customerSuggestionQuery = useQuery({
    queryKey: [
      "document-serial-type-customer-suggestion",
      params.customerId ?? 0,
      params.documentKind ?? 0,
      params.branchCode ?? "",
    ],
    queryFn: () =>
      getCustomerDocumentSerialSuggestion({
        customerId: params.customerId!,
        documentKind: params.documentKind!,
        requestBranchCode: params.branchCode,
      }),
    enabled:
      !params.readOnly &&
      (params.customerId ?? 0) > 0 &&
      params.documentKind != null,
    staleTime: 30_000,
  });
  const customerSuggestedSerialType = useMemo(
    () =>
      customerSuggestionQuery.data?.documentSerialTypeId
        ? filteredTypes.find(
            (item) => item.id === customerSuggestionQuery.data?.documentSerialTypeId
          )
        : undefined,
    [customerSuggestionQuery.data?.documentSerialTypeId, filteredTypes]
  );

  const handleDocumentSerialTypeSelect = useCallback(
    (documentSerialTypeId: number | null) => {
      params.setDocumentSerialTypeId(documentSerialTypeId);

      if (documentSerialTypeId == null || documentSerialTypeId <= 0) {
        lastAppliedSerialTypeIdRef.current = null;
        return;
      }

      const serialType = filteredTypes.find((item) => item.id === documentSerialTypeId);
      if (!serialType) return;

      if (isCreateMode && !params.readOnly && params.setOfferNo) {
        params.setOfferNo(formatSuggestedDocumentNumber(serialType));
      }

      if (
        isCreateMode &&
        !params.readOnly &&
        params.userId != null &&
        params.userId > 0 &&
        params.salesRepId != null &&
        params.salesRepId > 0
      ) {
        void saveLastDocumentSerialTypeId(
          params.ruleType,
          params.userId,
          params.branchCode ?? "",
          params.salesRepId,
          documentSerialTypeId
        );
      }

      lastAppliedSerialTypeIdRef.current = documentSerialTypeId;
    },
    [
      filteredTypes,
      isCreateMode,
      params.branchCode,
      params.readOnly,
      params.ruleType,
      params.salesRepId,
      params.setOfferNo,
      params.setDocumentSerialTypeId,
      params.userId,
    ]
  );

  const applyCustomerSerialSuggestion = useCallback(() => {
    if (!customerSuggestedSerialType) return;
    handleDocumentSerialTypeSelect(customerSuggestedSerialType.id);
  }, [customerSuggestedSerialType, handleDocumentSerialTypeSelect]);

  useEffect(() => {
    if (!isCreateMode || params.readOnly) return;
    if (params.salesRepId == null || params.salesRepId <= 0) return;
    if (!params.isAvailableListReady || filteredTypes.length === 0) return;

    const currentId = params.documentSerialTypeId;
    if (currentId != null && currentId > 0) return;

    let cancelled = false;

    void (async () => {
      const preferredId =
        params.userId != null && params.userId > 0
          ? await getLastDocumentSerialTypeId(
              params.ruleType,
              params.userId,
              params.branchCode ?? "",
              params.salesRepId!
            )
          : null;

      if (cancelled) return;

      if (preferredId != null && filteredTypes.some((item) => item.id === preferredId)) {
        handleDocumentSerialTypeSelect(preferredId);
        return;
      }

      if (filteredTypes.length === 1) {
        handleDocumentSerialTypeSelect(filteredTypes[0].id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    filteredTypes,
    handleDocumentSerialTypeSelect,
    isCreateMode,
    params.branchCode,
    params.documentSerialTypeId,
    params.isAvailableListReady,
    params.readOnly,
    params.ruleType,
    params.salesRepId,
    params.userId,
  ]);

  return {
    handleDocumentSerialTypeSelect,
    customerSuggestion: customerSuggestionQuery.data ?? null,
    customerSuggestedSerialType,
    isCustomerSerialSuggestionLoading: customerSuggestionQuery.isLoading,
    applyCustomerSerialSuggestion,
  };
}
