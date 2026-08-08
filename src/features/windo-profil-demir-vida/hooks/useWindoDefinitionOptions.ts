import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/auth";
import { EMPTY_CATALOG, windoDefinitionApi } from "../api/windo-definition-api";
import type {
  WindoDefinitionDto,
  WindoDefinitionOption,
} from "../types/windo-definition-types";
import { windoDefinitionQueryKeys } from "../utils/query-keys";

function toOptions(items: WindoDefinitionDto[]): WindoDefinitionOption[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code ?? undefined,
    profilDefinitionId: item.profilDefinitionId ?? null,
    profilDefinitionName: item.profilDefinitionName ?? null,
  }));
}

function toMap(items: WindoDefinitionDto[]): Record<number, string> {
  return items.reduce<Record<number, string>>((acc, item) => {
    acc[item.id] = item.name;
    return acc;
  }, {});
}

function matchesProfilFilter(
  option: WindoDefinitionOption,
  selectedProfilDefinitionId: number,
  preserveSelectionId?: number | null
): boolean {
  if (option.profilDefinitionId === selectedProfilDefinitionId) {
    return true;
  }

  return preserveSelectionId != null && option.id === preserveSelectionId;
}

interface UseWindoDefinitionOptionsParams {
  selectedProfilDefinitionId?: number | null;
  preserveSelection?: {
    demirDefinitionId?: number | null;
    vidaDefinitionId?: number | null;
  };
}

export function useWindoDefinitionOptions({
  selectedProfilDefinitionId,
  preserveSelection,
}: UseWindoDefinitionOptionsParams = {}) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const canFetch = Boolean(isHydrated && token);

  const catalogQuery = useQuery({
    queryKey: windoDefinitionQueryKeys.catalog(),
    queryFn: windoDefinitionApi.fetchCatalog,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: canFetch,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const catalog = catalogQuery.data ?? EMPTY_CATALOG;
  const {
    profilDefinitions,
    demirDefinitions,
    vidaDefinitions,
    baskiDefinitions,
    koliBaskiDefinitions,
  } = catalog;

  const isLoading = canFetch && catalogQuery.isPending;
  const isError = catalogQuery.isError;

  return useMemo(
    () => ({
      profilDefinitions,
      demirDefinitions,
      vidaDefinitions,
      baskiDefinitions,
      koliBaskiDefinitions,
      profilOptions: toOptions(profilDefinitions),
      demirOptions: toOptions(demirDefinitions).filter((option) => {
        if (selectedProfilDefinitionId == null) {
          return true;
        }

        return matchesProfilFilter(option, selectedProfilDefinitionId, preserveSelection?.demirDefinitionId);
      }),
      vidaOptions: toOptions(vidaDefinitions).filter((option) => {
        if (selectedProfilDefinitionId == null) {
          return true;
        }

        return matchesProfilFilter(option, selectedProfilDefinitionId, preserveSelection?.vidaDefinitionId);
      }),
      baskiOptions: toOptions(baskiDefinitions),
      koliBaskiOptions: toOptions(koliBaskiDefinitions),
      profilMap: toMap(profilDefinitions),
      demirMap: toMap(demirDefinitions),
      vidaMap: toMap(vidaDefinitions),
      baskiMap: toMap(baskiDefinitions),
      koliBaskiMap: toMap(koliBaskiDefinitions),
      isLoading,
      isError,
      refetch: () =>
        queryClient.invalidateQueries({ queryKey: windoDefinitionQueryKeys.all() }),
    }),
    [
      baskiDefinitions,
      demirDefinitions,
      isError,
      isLoading,
      koliBaskiDefinitions,
      preserveSelection?.demirDefinitionId,
      preserveSelection?.vidaDefinitionId,
      profilDefinitions,
      queryClient,
      selectedProfilDefinitionId,
      vidaDefinitions,
    ]
  );
}
