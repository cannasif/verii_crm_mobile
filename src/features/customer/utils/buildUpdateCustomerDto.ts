import type { CustomerDto, UpdateCustomerDto } from "../types";

export function buildUpdateCustomerDtoFromCustomer(
  customer: CustomerDto,
  overrides: Partial<UpdateCustomerDto> = {}
): UpdateCustomerDto {
  return {
    customerCode: customer.customerCode,
    name: customer.name,
    taxNumber: customer.taxNumber,
    taxOffice: customer.taxOffice,
    tcknNumber: customer.tcknNumber,
    address: customer.address,
    postalCode: customer.postalCode,
    latitude: customer.latitude,
    longitude: customer.longitude,
    phone: customer.phone,
    phone2: customer.phone2,
    email: customer.email,
    website: customer.website,
    notes: customer.notes,
    countryId: customer.countryId,
    cityId: customer.cityId,
    districtId: customer.districtId,
    customerTypeId: customer.customerTypeId,
    erpCariType: customer.erpCariType === "S" ? "S" : "A",
    salesRepCode: customer.salesRepCode,
    groupCode: customer.groupCode,
    accountingCode: customer.accountingCode,
    creditLimit: customer.creditLimit,
    erpCurrencyType: customer.erpCurrencyType,
    paymentTermDays: customer.paymentTermDays,
    defaultShippingAddressId: customer.defaultShippingAddressId,
    branchCode: customer.branchCode ?? 0,
    businessUnitCode: customer.businessUnitCode ?? 0,
    isCompleted: customer.isCompleted ?? false,
    ...overrides,
  };
}
