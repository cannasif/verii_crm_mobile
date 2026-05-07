import { useQuery } from "@tanstack/react-query";
import { salesman360Api, SALESMEN_360_VISIBLE_USERS_STALE_MS } from "../api";
import type { Salesmen360VisibleUserDto } from "../types";

export function useSalesman360VisibleUsers(): ReturnType<typeof useQuery<Salesmen360VisibleUserDto[], Error>> {
  return useQuery<Salesmen360VisibleUserDto[], Error>({
    queryKey: ["salesman360", "visible-users"],
    queryFn: salesman360Api.getVisibleUsers,
    staleTime: SALESMEN_360_VISIBLE_USERS_STALE_MS,
  });
}
