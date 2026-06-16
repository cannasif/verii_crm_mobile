export interface CustomerIntegrationFields {
  isIntegrated?: boolean;
  isERPIntegrated?: boolean;
}

export interface CustomerSelectLabelFields extends CustomerIntegrationFields {
  name: string;
  customerCode?: string | null;
}

export function isErpIntegratedCustomer(customer: CustomerIntegrationFields): boolean {
  return customer.isIntegrated === true || customer.isERPIntegrated === true;
}

export function resolveCustomerSelectKind(
  customer: CustomerIntegrationFields
): "erp" | "crm" {
  return isErpIntegratedCustomer(customer) ? "erp" : "crm";
}

export function formatCustomerSelectLabel(customer: CustomerSelectLabelFields): string {
  const code = customer.customerCode?.trim();
  if (isErpIntegratedCustomer(customer) && code) {
    return `ERP: ${code} - ${customer.name}`;
  }
  return `CRM: ${customer.name}`;
}

export function resolveErpCustomerCodeForSelection(
  customer: CustomerSelectLabelFields
): string | undefined {
  if (!isErpIntegratedCustomer(customer)) return undefined;
  const code = customer.customerCode?.trim();
  return code?.length ? code : undefined;
}

export function resolvePricingRuleCustomerCode(
  erpCustomerCode?: string | null
): string | undefined {
  const code = erpCustomerCode?.trim();
  return code?.length ? code : undefined;
}

export function resolveDocumentCustomerSelectLabel(params: {
  customer?: CustomerSelectLabelFields | null;
  erpCustomerCode?: string | null;
  placeholder: string;
}): string {
  const erpCode = params.erpCustomerCode?.trim();
  if (!params.customer?.name?.trim()) {
    if (erpCode) return `ERP: ${erpCode}`;
    return params.placeholder;
  }

  const integrated =
    isErpIntegratedCustomer(params.customer) || Boolean(erpCode);

  return formatCustomerSelectLabel({
    name: params.customer.name,
    customerCode: erpCode ?? params.customer.customerCode,
    isIntegrated: params.customer.isIntegrated ?? integrated,
    isERPIntegrated: params.customer.isERPIntegrated ?? integrated,
  });
}
