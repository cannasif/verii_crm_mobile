export type IntegrationProvider = "google" | "outlook";

export const integrationQueryKeys = {
  all: () => ["integrations"] as const,
  status: (provider: IntegrationProvider) =>
    [...integrationQueryKeys.all(), provider, "status"] as const,
};
