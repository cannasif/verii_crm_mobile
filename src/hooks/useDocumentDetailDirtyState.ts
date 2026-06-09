import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  flattenDocumentLinesForBulk,
  type DocumentLineWithRelations,
} from "@/lib/flattenDocumentLinesForBulk";

function serializeLines(lines: DocumentLineWithRelations[]): string {
  return JSON.stringify(
    flattenDocumentLinesForBulk(lines).map((line) => {
      const copy = { ...line } as Record<string, unknown>;
      delete copy.isEditing;
      delete copy.pendingImageUri;
      delete copy.relatedLines;
      delete copy.relationQuantity;
      return copy;
    })
  );
}

function serializeExchangeRates(
  rates: Array<{
    id?: string;
    dovizTipi?: number;
    currency: string;
    exchangeRate: number;
    exchangeRateDate: string;
    isOfficial?: boolean;
  }>
): string {
  return JSON.stringify(rates.map(({ id, dovizTipi, ...rest }) => rest));
}

export function buildDocumentDetailSnapshot(input: {
  formSnapshot: unknown;
  lines: DocumentLineWithRelations[];
  exchangeRates: Array<{
    id?: string;
    dovizTipi?: number;
    currency: string;
    exchangeRate: number;
    exchangeRateDate: string;
    isOfficial?: boolean;
  }>;
  notes?: string[];
}): string {
  return JSON.stringify({
    form: input.formSnapshot,
    lines: serializeLines(input.lines),
    rates: serializeExchangeRates(input.exchangeRates),
    notes: input.notes ?? [],
  });
}

export function useDocumentDetailDirtyState(input: {
  resetKey: string | number | undefined;
  isHydrated: boolean;
  formSnapshot: unknown;
  lines: DocumentLineWithRelations[];
  exchangeRates: Array<{
    id?: string;
    dovizTipi?: number;
    currency: string;
    exchangeRate: number;
    exchangeRateDate: string;
    isOfficial?: boolean;
  }>;
  notes?: string[];
}): {
  hasUnsavedChanges: boolean;
  markSaved: () => void;
  syncBaseline: () => void;
} {
  const [baseline, setBaseline] = useState<string | null>(null);
  const baselineRef = useRef<string | null>(null);

  const currentSnapshot = useMemo(
    () =>
      buildDocumentDetailSnapshot({
        formSnapshot: input.formSnapshot,
        lines: input.lines,
        exchangeRates: input.exchangeRates,
        notes: input.notes,
      }),
    [input.formSnapshot, input.lines, input.exchangeRates, input.notes]
  );

  useEffect(() => {
    baselineRef.current = null;
    setBaseline(null);
  }, [input.resetKey]);

  useEffect(() => {
    if (!input.isHydrated || baselineRef.current !== null) return;
    baselineRef.current = currentSnapshot;
    setBaseline(currentSnapshot);
  }, [input.isHydrated, currentSnapshot]);

  const markSaved = useCallback(() => {
    baselineRef.current = currentSnapshot;
    setBaseline(currentSnapshot);
  }, [currentSnapshot]);

  const syncBaseline = useCallback(() => {
    baselineRef.current = currentSnapshot;
    setBaseline(currentSnapshot);
  }, [currentSnapshot]);

  const hasUnsavedChanges =
    baseline !== null && currentSnapshot !== baseline;

  return { hasUnsavedChanges, markSaved, syncBaseline };
}
