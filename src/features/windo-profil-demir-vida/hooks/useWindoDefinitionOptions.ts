import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { windoDefinitionApi } from "../api/windoDefinitionApi";
import type { WindoDefinitionDto, WindoDefinitionOption } from "../types";

function toOptions(items: WindoDefinitionDto[]): WindoDefinitionOption[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code ?? undefined,
    profilDefinitionId: item.profilDefinitionId ?? null,
  }));
}

function toMap(items: WindoDefinitionDto[]): Record<number, string> {
  return items.reduce<Record<number, string>>((acc, item) => {
    acc[item.id] = item.name;
    return acc;
  }, {});
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
  const results = useQueries({
    queries: [
      {
        queryKey: ["windo-definitions", "profil"],
        queryFn: windoDefinitionApi.getProfilDefinitions,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["windo-definitions", "demir"],
        queryFn: windoDefinitionApi.getDemirDefinitions,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["windo-definitions", "vida"],
        queryFn: windoDefinitionApi.getVidaDefinitions,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["windo-definitions", "baski"],
        queryFn: windoDefinitionApi.getBaskiDefinitions,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["windo-definitions", "koli-baski"],
        queryFn: windoDefinitionApi.getKoliBaskiDefinitions,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [profilResult, demirResult, vidaResult, baskiResult, koliBaskiResult] = results;

  const profilDefinitions = profilResult.data ?? [];
  const demirDefinitions = demirResult.data ?? [];
  const vidaDefinitions = vidaResult.data ?? [];
  const baskiDefinitions = baskiResult.data ?? [];
  const koliBaskiDefinitions = koliBaskiResult.data ?? [];

  return useMemo(
    () => ({
      profilDefinitions,
      demirDefinitions,
      vidaDefinitions,
      baskiDefinitions,
      koliBaskiDefinitions,
      profilOptions: toOptions(profilDefinitions),
      demirOptions: toOptions(demirDefinitions).filter((option) => {
        if (selectedProfilDefinitionId == null) return true;
        if (option.profilDefinitionId === selectedProfilDefinitionId) return true;
        return option.id === preserveSelection?.demirDefinitionId;
      }),
      vidaOptions: toOptions(vidaDefinitions).filter((option) => {
        if (selectedProfilDefinitionId == null) return true;
        if (option.profilDefinitionId === selectedProfilDefinitionId) return true;
        return option.id === preserveSelection?.vidaDefinitionId;
      }),
      baskiOptions: toOptions(baskiDefinitions),
      koliBaskiOptions: toOptions(koliBaskiDefinitions),
      profilMap: toMap(profilDefinitions),
      demirMap: toMap(demirDefinitions),
      vidaMap: toMap(vidaDefinitions),
      baskiMap: toMap(baskiDefinitions),
      koliBaskiMap: toMap(koliBaskiDefinitions),
      isLoading: results.some((result) => result.isLoading),
    }),
    [
      baskiDefinitions,
      demirDefinitions,
      koliBaskiDefinitions,
      preserveSelection?.demirDefinitionId,
      preserveSelection?.vidaDefinitionId,
      profilDefinitions,
      results,
      selectedProfilDefinitionId,
      vidaDefinitions,
    ]
  );
}
