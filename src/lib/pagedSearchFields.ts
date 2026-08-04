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
  "Id",
  "ErpStockCode",
  "StockName",
  "EnglishStockName",
  "Unit",
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
  "Id",
  "CustomerCode",
  "CustomerName",
  "Email",
  "Phone1",
  "TaxNumber",
  "City.Name",
] as const;

export const CONTACT_LIST_SEARCH_FIELDS = [
  "Id",
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
  "Id",
  "ErpShippingCode",
  "ErpMainCustomerCode",
  "Name",
  "PostalCode",
  "Phone",
  "City.Name",
  "District.Name",
] as const;

export const ACTIVITY_LIST_SEARCH_FIELDS = [
  "Id",
  "Subject",
  "Description",
  "AssignedUser.FirstName",
  "AssignedUser.LastName",
] as const;
export const TITLE_LIST_SEARCH_FIELDS = ["Id", "TitleName", "Code"] as const;

export const SALES_DOCUMENT_LIST_SEARCH_FIELDS = [
  "Id",
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

export const TEMP_QUICK_QUOTATION_LIST_SEARCH_FIELDS = [
  "Id",
  "CustomerName",
  "Description",
  "CurrencyCode",
] as const;

export const ERP_ORDER_LIST_SEARCH_FIELDS = [
  "fatirsNo",
  "cariKodu",
  "cariIsim",
  "plasiyerKodu",
  "tarih",
  "teslimTarihi",
] as const;

export const DOCUMENT_SERIAL_SEARCH_FIELDS = [
  "Id",
  "SerialPrefix",
  "CustomerTypeName",
  "SalesRepFullName",
  "RuleType",
] as const;
export const USER_PICKER_SEARCH_FIELDS = ["Id", "FullName", "Email", "UserName"] as const;
export const WINDFORM_DEFINITION_SEARCH_FIELDS = ["Id", "Name"] as const;

export const asSearchFields = (fields: readonly string[]): string[] => [...fields];

const SEARCH_FIELD_LABELS: Readonly<Record<string, string>> = {
  Id: "Kayıt ID",
  ErpStockCode: "Stok kodu", StockName: "Stok adı", EnglishStockName: "İngilizce stok adı",
  Unit: "Birim", UreticiKodu: "Üretici kodu", GrupKodu: "Grup kodu", GrupAdi: "Grup adı",
  Kod1: "Kod 1", Kod1Adi: "Kod 1 adı", Kod2: "Kod 2", Kod2Adi: "Kod 2 adı",
  Kod3: "Kod 3", Kod3Adi: "Kod 3 adı", Kod4: "Kod 4", Kod4Adi: "Kod 4 adı",
  Kod5: "Kod 5", Kod5Adi: "Kod 5 adı", CustomerCode: "Müşteri kodu",
  CustomerName: "Müşteri", Email: "E-posta", Phone: "Telefon", Phone1: "Telefon",
  Phone2: "Telefon 2", TaxNumber: "Vergi no", FullName: "Ad soyad", FirstName: "Ad",
  LastName: "Soyad", Mobile: "Cep telefonu", "Customer.CustomerName": "Müşteri",
  "Title.TitleName": "Unvan", ErpShippingCode: "Sevk kodu",
  ErpMainCustomerCode: "Ana cari kodu", Name: "Ad", PostalCode: "Posta kodu",
  "City.Name": "Şehir", "District.Name": "İlçe", Subject: "Konu",
  Description: "Açıklama", "AssignedUser.FirstName": "Atanan kullanıcı adı",
  "AssignedUser.LastName": "Atanan kullanıcı soyadı", TitleName: "Unvan", Code: "Kod",
  OfferNo: "Belge no", RevisionNo: "Revizyon no", "PotentialCustomer.CustomerName": "Müşteri",
  ErpCustomerCode: "Cari kodu", "Representative.FirstName": "Temsilci adı",
  "Representative.LastName": "Temsilci soyadı", "KoliBaskiDefinition.Name": "Koli baskı",
  Currency: "Para birimi", ERPIntegrationNumber: "Netsis no", SerialPrefix: "Seri",
  CustomerTypeName: "Müşteri tipi", SalesRepFullName: "Satış temsilcisi", RuleType: "Kural tipi",
  UserName: "Kullanıcı adı", AssignedUserName: "Atanan kullanıcı", CurrencyCode: "Para birimi",
  fatirsNo: "Netsis no", cariKodu: "Cari kodu", cariIsim: "Cari unvanı",
  plasiyerKodu: "Plasiyer kodu", tarih: "Sipariş tarihi", teslimTarihi: "Teslim tarihi",
};

export function buildSearchFieldOptions(fields: readonly string[]) {
  return fields.map((key) => ({ key, label: SEARCH_FIELD_LABELS[key] ?? key }));
}

export const STOCK_PICKER_AVAILABLE_SEARCH_FIELDS = STOCK_LIST_SEARCH_FIELDS;
export const STOCK_PICKER_SEARCH_FIELD_LABELS: Readonly<Record<string, string>> = {
  Id: "Kayıt ID",
  ErpStockCode: "Stok kodu", StockName: "Stok adı", EnglishStockName: "İngilizce stok adı",
  Unit: "Birim", UreticiKodu: "Üretici kodu", GrupKodu: "Grup kodu", GrupAdi: "Grup adı",
  Kod1: "Kod 1", Kod1Adi: "Kod 1 adı", Kod2: "Kod 2", Kod2Adi: "Kod 2 adı",
  Kod3: "Kod 3", Kod3Adi: "Kod 3 adı", Kod4: "Kod 4", Kod4Adi: "Kod 4 adı",
  Kod5: "Kod 5", Kod5Adi: "Kod 5 adı",
};
export const CUSTOMER_PICKER_AVAILABLE_SEARCH_FIELDS = [
  "Id", "CustomerCode", "CustomerName", "TaxOffice", "TaxNumber", "TcknNumber",
  "SalesRepCode", "GroupCode", "AccountingCode", "Notes", "Email", "Website",
  "Phone1", "Phone2",
  "Address",
  "PostalCode",
  "Country.Name",
  "City.Name",
  "District.Name",
  "CustomerType.Name",
] as const;
