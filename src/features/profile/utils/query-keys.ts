export const profileQueryKeys = {
  all: () => ["profile"] as const,
  me: () => [...profileQueryKeys.all(), "me"] as const,
  detail: (userId: number | null | undefined) =>
    [...profileQueryKeys.all(), "detail", userId] as const,
};
