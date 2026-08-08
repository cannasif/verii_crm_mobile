export const erpCustomerQueryKeys = {
  all: () => ["erpCustomers"] as const,
  fullList: () => [...erpCustomerQueryKeys.all(), "fullList"] as const,
};
