import { useMutation, type UseMutateFunction } from "@tanstack/react-query";
import { authApi } from "../api";
import { authAccessApi } from "../../access-control/api/authAccessApi";
import { useAuthStore } from "../../../store/auth";
import type { LoginRequest, LoginResponseData, Branch } from "../types";

interface LoginWithBranchRequest {
  loginData: LoginRequest;
  branch: Branch;
}

interface UseLoginResult {
  login: UseMutateFunction<LoginResponseData, Error, LoginWithBranchRequest>;
  loginAsync: (data: LoginWithBranchRequest) => Promise<LoginResponseData>;
  isLoading: boolean;
  error: Error | null;
}

export function useLogin(): UseLoginResult {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setBranch = useAuthStore((state) => state.setBranch);
  const setPermissions = useAuthStore((state) => state.setPermissions);

  const mutation = useMutation({
    mutationFn: async ({ loginData }: LoginWithBranchRequest) => {
      return authApi.login(loginData);
    },
    onSuccess: async (data, { branch }) => {
      await setAuth(data.token);
      await setBranch(branch);
      try {
        const bootstrap = await authAccessApi.getBootstrap();
        await setPermissions(bootstrap.permissions);
      } catch {
        // Permissions are refreshed again on app bootstrap; login should not fail if this transient call errors.
      }
    },
  });

  return {
    login: mutation.mutate,
    loginAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
