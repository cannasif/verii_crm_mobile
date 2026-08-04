import { useMemo } from "react";
import { buildSearchFieldOptions } from "../lib/pagedSearchFields";
import { useAuthStore } from "../store/auth";
import { usePersistedSearchFields } from "./usePersistedSearchFields";

export function usePagedListSearchFields(
  pageKey: string,
  availableFields: readonly string[],
  defaultFields: readonly string[] = availableFields,
) {
  const userId = useAuthStore((state) => state.user?.id);
  const [selectedFields, setSelectedFields] = usePersistedSearchFields(
    `paged-list:${pageKey}:${userId ?? "anonymous"}`,
    availableFields,
    defaultFields,
  );
  const options = useMemo(
    () => buildSearchFieldOptions(availableFields),
    [availableFields],
  );

  return { selectedFields, setSelectedFields, options } as const;
}
