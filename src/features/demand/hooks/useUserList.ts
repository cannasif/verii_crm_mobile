import { demandUserQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { demandApi } from "../api/demand-api";
import type { UserDto } from "../types/demand-types";

const STALE_TIME_MS = 60 * 1000;

export function useUserList(): {
  data: UserDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery<UserDto[], Error>({
    queryKey: demandUserQueryKeys.list(),
    queryFn: () => demandApi.getUserList(),
    staleTime: STALE_TIME_MS,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: () => query.refetch(),
  };
}
