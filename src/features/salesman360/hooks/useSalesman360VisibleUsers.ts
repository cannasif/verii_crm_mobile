import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_VISIBLE_USERS_STALE_MS } from "../api/salesman360-api";
import type { Salesmen360VisibleUserDto } from "../types/salesman360-types";
import { salesman360QueryKeys } from "../utils/query-keys";

export function useSalesman360VisibleUsers(): ReturnType<typeof useQuery<Salesmen360VisibleUserDto[], Error>> {
  return useQuery<Salesmen360VisibleUserDto[], Error>({
    queryKey: salesman360QueryKeys.visibleUsers(),
    queryFn: salesman360Api.getVisibleUsers,
    staleTime: SALESMEN_360_VISIBLE_USERS_STALE_MS,
  });
}
