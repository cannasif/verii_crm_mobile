export function resolveDocumentSerialCustomerTypeId(params: {
  erpCustomerCode?: string | null;
  selectedCustomerId?: number | null;
  customerTypeId?: number | null;
}): number {
  const hasErpCustomerCode = (params.erpCustomerCode ?? "").trim().length > 0;
  if (hasErpCustomerCode) {
    return 0;
  }

  if (params.selectedCustomerId != null && params.selectedCustomerId > 0) {
    return params.customerTypeId ?? 0;
  }

  return 0;
}
