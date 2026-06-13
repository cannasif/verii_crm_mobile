import type { TempQuotattionGetDto } from "../models/tempQuotattion.model";

export function resolveTempQuickQuotationCustomerLabel(
  item: TempQuotattionGetDto,
  fallbackLabel: string
): string {
  const customerName = item.customerName?.trim();
  if (customerName && customerName.length > 0) {
    return customerName;
  }
  return fallbackLabel;
}
