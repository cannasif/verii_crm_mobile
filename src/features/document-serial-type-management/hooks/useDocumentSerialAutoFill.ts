import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DocumentSerialTypeDto } from "../types";
import {
  getLastDocumentSerialTypeId,
  saveLastDocumentSerialTypeId,
} from "../utils/documentSerialPreferenceStore";

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

  const handleDocumentSerialTypeSelect = useCallback(
    (documentSerialTypeId: number | null) => {
      params.setDocumentSerialTypeId(documentSerialTypeId);

      if (documentSerialTypeId == null || documentSerialTypeId <= 0) {
        lastAppliedSerialTypeIdRef.current = null;
        return;
      }

      const serialType = filteredTypes.find((item) => item.id === documentSerialTypeId);
      if (!serialType) return;

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
      params.setDocumentSerialTypeId,
      params.userId,
    ]
  );

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

  return { handleDocumentSerialTypeSelect };
}
