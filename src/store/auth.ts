import { create } from "zustand";
import { storage } from "../lib/storage";
import type { User, Branch, MyPermissionsDto } from "../features/auth/types";
import { ACCESS_TOKEN_KEY, USER_STORAGE_KEY, BRANCH_STORAGE_KEY, PERMISSIONS_STORAGE_KEY } from "../constants/storage";
import { isTokenValid, getUserFromToken } from "../features/auth/utils";
import { perfMark, perfMeasure } from "../lib/perf-metrics";

interface AuthState {
  user: User | null;
  token: string | null;
  branch: Branch | null;
  permissions: MyPermissionsDto | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (token: string) => Promise<void>;
  setBranch: (branch: Branch) => Promise<void>;
  setPermissions: (permissions: MyPermissionsDto | null) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
  hydrateBranch: () => Promise<Branch | null>;
}

let branchHydrationPromise: Promise<Branch | null> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  branch: null,
  permissions: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: async (token: string): Promise<void> => {
    const user = getUserFromToken(token);
    if (!user) {
      throw new Error("Invalid token");
    }

    await storage.set(ACCESS_TOKEN_KEY, token);
    await storage.set(USER_STORAGE_KEY, user);
    set({ user, token, isAuthenticated: true });
  },

  setBranch: async (branch: Branch): Promise<void> => {
    await storage.set(BRANCH_STORAGE_KEY, branch);
    set({ branch });
  },

  setPermissions: async (permissions: MyPermissionsDto | null): Promise<void> => {
    if (permissions) {
      await storage.set(PERMISSIONS_STORAGE_KEY, permissions);
    } else {
      await storage.remove(PERMISSIONS_STORAGE_KEY);
    }
    set({ permissions });
  },

  clearAuth: async (): Promise<void> => {
    await storage.remove(ACCESS_TOKEN_KEY);
    await storage.remove(USER_STORAGE_KEY);
    await storage.remove(BRANCH_STORAGE_KEY);
    await storage.remove(PERMISSIONS_STORAGE_KEY);
    branchHydrationPromise = null;
    set({ user: null, token: null, branch: null, permissions: null, isAuthenticated: false });
  },

  hydrateBranch: async (): Promise<Branch | null> => {
    const currentBranch = useAuthStore.getState().branch;
    if (currentBranch) {
      return currentBranch;
    }

    if (branchHydrationPromise) {
      return branchHydrationPromise;
    }

    branchHydrationPromise = (async () => {
      perfMark("auth:storage_branch_get_start");
      const branch = await storage.get<Branch>(BRANCH_STORAGE_KEY);
      perfMark("auth:storage_branch_get_end");
      void perfMeasure(
        "auth:storage_branch_get",
        "auth:storage_branch_get_start",
        "auth:storage_branch_get_end",
      );

      const currentState = useAuthStore.getState();
      if (currentState.isAuthenticated) {
        set({ branch });
      }

      return branch;
    })();

    try {
      return await branchHydrationPromise;
    } finally {
      branchHydrationPromise = null;
    }
  },

  hydrate: async (): Promise<void> => {
    try {
      perfMark("auth:storage_token_get_start");
      const token = await storage.get<string>(ACCESS_TOKEN_KEY);
      perfMark("auth:storage_token_get_end");
      void perfMeasure(
        "auth:storage_token_get",
        "auth:storage_token_get_start",
        "auth:storage_token_get_end",
      );

      if (token && isTokenValid(token)) {
        const permissions = await storage.get<MyPermissionsDto>(PERMISSIONS_STORAGE_KEY);
        perfMark("auth:user_decode_start");
        const user = getUserFromToken(token);
        perfMark("auth:user_decode_end");
        void perfMeasure("auth:user_decode", "auth:user_decode_start", "auth:user_decode_end");
        if (user) {
          set({
            user,
            token,
            permissions,
            isAuthenticated: true,
            isHydrated: true,
          });

          void useAuthStore.getState().hydrateBranch();

          return;
        }
      }

      await storage.remove(ACCESS_TOKEN_KEY);
      await storage.remove(USER_STORAGE_KEY);
      await storage.remove(PERMISSIONS_STORAGE_KEY);
      perfMark("auth:storage_branch_get_start");
      const branch = await storage.get<Branch>(BRANCH_STORAGE_KEY);
      perfMark("auth:storage_branch_get_end");
      void perfMeasure(
        "auth:storage_branch_get",
        "auth:storage_branch_get_start",
        "auth:storage_branch_get_end",
      );
      set({ isHydrated: true, branch, permissions: null });
    } catch {
      set({ isHydrated: true });
    }
  },
}));
