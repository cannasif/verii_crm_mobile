export const erpOrderQueryKeys = {
  all: () => ["erp-orders"] as const,
  headers: () => [...erpOrderQueryKeys.all(), "headers"] as const,
  lines: (fatirsNo: string) => [...erpOrderQueryKeys.all(), "lines", fatirsNo] as const,
};
