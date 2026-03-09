import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api";

export function useResetPassword() {
  return useMutation({
    mutationFn: authApi.resetPassword,
  });
}
