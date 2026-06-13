import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profileApi";

export function useUserDetailByUserId(userId: number | null | undefined) {
  return useQuery({
    queryKey: ["profile", "detail", userId],
    queryFn: () => profileApi.getUserDetailByUserId(userId as number),
    enabled: typeof userId === "number" && userId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
