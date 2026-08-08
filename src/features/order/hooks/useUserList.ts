import { userQueryKeys } from "../utils/query-keys";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { UserDto } from "../types/order-types";

const STALE_TIME_MS = 60 * 1000;

export function useUserList(): {
  data: UserDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery<UserDto[], Error>({
    queryKey: userQueryKeys.list(),
    queryFn: () => orderApi.getUserList(),
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
