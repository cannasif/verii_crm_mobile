export const customer360QueryKeys = {
  all: () => ["customer360"] as const,
  overview: (customerId: number | undefined, currency: string | null) =>
    [...customer360QueryKeys.all(), "overview", customerId, currency ?? "ALL"] as const,
  summary: (customerId: number | undefined, currency: string | null) =>
    [...customer360QueryKeys.all(), "summary", customerId, currency ?? "ALL"] as const,
  charts: (
    customerId: number | undefined,
    months: number,
    currency: string | null
  ) => [...customer360QueryKeys.all(), "charts", customerId, months ?? 12, currency ?? "ALL"] as const,
  quickQuotations: (customerId: number | undefined) =>
    [...customer360QueryKeys.all(), "quick-quotations", customerId] as const,
  erpMovements: (customerId: number | undefined) =>
    [...customer360QueryKeys.all(), "erp-movements", customerId] as const,
  erpBalance: (customerId: number | undefined) =>
    [...customer360QueryKeys.all(), "erp-balance", customerId] as const,
  mailLogs: (
    provider: string,
    customerId: number,
    pageNumber: number,
    pageSize: number
  ) => [...customer360QueryKeys.all(), "mail-logs", provider, customerId, pageNumber, pageSize] as const,
};
