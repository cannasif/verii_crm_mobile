import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api";
import { useAuthStore } from "../../../store/auth";

export function useChangePassword() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: async (token: string) => {
      await setAuth(token);
    },
  });
}
