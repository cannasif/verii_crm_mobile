import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import { useAuthStore } from "../../../store/auth";

interface UseLogoutResult {
  logout: () => void;
  logoutAsync: () => Promise<void>;
  isLoading: boolean;
}

export function useLogout(): UseLogoutResult {
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const mutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      await clearAuth();
    },
    onError: async () => {
      await clearAuth();
    },
  });

  return {
    logout: mutation.mutate,
    logoutAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
