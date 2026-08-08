import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profile-api";
import { profileQueryKeys } from "../utils/query-keys";

export function useUserDetailByUserId(userId: number | null | undefined) {
  return useQuery({
    queryKey: profileQueryKeys.detail(userId),
    queryFn: () => profileApi.getUserDetailByUserId(userId as number),
    enabled: typeof userId === "number" && userId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
