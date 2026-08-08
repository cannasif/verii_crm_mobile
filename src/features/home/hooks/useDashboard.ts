import { useQuery, type QueryObserverResult } from "@tanstack/react-query";
import { homeApi } from "../api/home-api";
import type { DashboardData } from "../types/home-types";
import { homeQueryKeys } from "../utils/query-keys";

interface UseDashboardReturn {
  data: DashboardData | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<QueryObserverResult<DashboardData, Error>>;
}

export function useDashboard(): UseDashboardReturn {
  const { data, isLoading, error, refetch } = useQuery<DashboardData, Error>({
    queryKey: homeQueryKeys.dashboard(),
    queryFn: homeApi.fetchDashboardData,
    staleTime: 1000 * 60 * 5,
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
