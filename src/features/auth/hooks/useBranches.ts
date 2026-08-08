import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import type { Branch } from "../types/auth-types";
import { authQueryKeys } from "../utils/query-keys";

interface UseBranchesResult {
  branches: Branch[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBranches(): UseBranchesResult {
  const query = useQuery({
    queryKey: authQueryKeys.branches(),
    queryFn: authApi.getBranches,
    staleTime: 1000 * 60 * 5,
  });

  return {
    branches: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
