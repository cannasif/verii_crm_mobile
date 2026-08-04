/**
 * Server-side paged search allow-lists used by mobile screens.
 *
 * Keep picker/dropdown lists deliberately narrow: only fields rendered in the
 * option row may be searched. Full list screens may expose every visible text
 * column. Field names are API contract names and are matched case-insensitively
 * by QueryHelper.
 */
export const STOCK_PICKER_SEARCH_FIELDS = ["ErpStockCode", "StockName"] as const;
export const STOCK_LIST_SEARCH_FIELDS = [
  "ErpStockCode",
  "StockName",
  "EnglishStockName",
  "UreticiKodu",
  "GrupKodu",
  "GrupAdi",
  "Kod1",
  "Kod1Adi",
  "Kod2",
  "Kod2Adi",
  "Kod3",
  "Kod3Adi",
  "Kod4",
  "Kod4Adi",
  "Kod5",
  "Kod5Adi",
] as const;

export const CUSTOMER_PICKER_SEARCH_FIELDS = ["CustomerCode", "CustomerName"] as const;
export const CUSTOMER_LIST_SEARCH_FIELDS = [
  "CustomerCode",
  "CustomerName",
  "Email",
  "Phone1",
  "TaxNumber",
  "City.Name",
] as const;

export const CONTACT_LIST_SEARCH_FIELDS = [
  "FullName",
  "FirstName",
  "LastName",
  "Email",
  "Phone",
  "Mobile",
  "Customer.CustomerName",
  "Title.TitleName",
] as const;

export const SHIPPING_ADDRESS_LIST_SEARCH_FIELDS = [
  "ErpShippingCode",
  "ErpMainCustomerCode",
  "Name",
  "PostalCode",
  "Phone",
  "City.Name",
  "District.Name",
] as const;

export const ACTIVITY_LIST_SEARCH_FIELDS = [
  "Subject",
  "Description",
  "AssignedUser.FirstName",
  "AssignedUser.LastName",
] as const;
export const TITLE_LIST_SEARCH_FIELDS = ["TitleName", "Code"] as const;

export const SALES_DOCUMENT_LIST_SEARCH_FIELDS = [
  "OfferNo",
  "RevisionNo",
  "PotentialCustomer.CustomerName",
  "ErpCustomerCode",
  "Representative.FirstName",
  "Representative.LastName",
  "KoliBaskiDefinition.Name",
  "Currency",
  "ERPIntegrationNumber",
] as const;

export const DOCUMENT_SERIAL_SEARCH_FIELDS = [
  "SerialPrefix",
  "CustomerTypeName",
  "SalesRepFullName",
  "RuleType",
] as const;
export const USER_PICKER_SEARCH_FIELDS = ["FullName", "Email", "UserName"] as const;
export const WINDFORM_DEFINITION_SEARCH_FIELDS = ["Name"] as const;

export const asSearchFields = (fields: readonly string[]): string[] => [...fields];
