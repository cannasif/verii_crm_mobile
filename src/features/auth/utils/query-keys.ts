export const authQueryKeys = {
  all: () => ["auth"] as const,
  branches: () => [...authQueryKeys.all(), "branches"] as const,
};
