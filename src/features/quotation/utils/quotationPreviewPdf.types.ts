export interface QuotationPreviewPdfLabels {
  documentTitle: string;
  senderLabel: string;
  recipientLabel: string;
  metaDate: string;
  metaOfferNo: string;
  notSpecified: string;
  lineImage: string;
  productCode: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  unitPriceNet: string;
  lineTotal: string;
  priceDetail: string;
  grossTotal: string;
  generalDiscount: string;
  netSubtotal: string;
  totalVat: string;
  grandTotalWithVat: string;
  draftWatermark: string;
}

export const QUOTATION_PREVIEW_PDF_LABELS_TR: QuotationPreviewPdfLabels = {
  documentTitle: "FİYAT TEKLİFİ",
  senderLabel: "Teklif Veren",
  recipientLabel: "Teklif Verilen",
  metaDate: "Tarih",
  metaOfferNo: "Teklif No",
  notSpecified: "—",
  lineImage: "Görsel",
  productCode: "Ürün Kodu",
  productName: "Ürün Adı",
  quantity: "Miktar",
  unitPrice: "Birim Fiyat",
  unitPriceNet: "Net Birim",
  lineTotal: "Toplam",
  priceDetail: "Fiyat Detayı",
  grossTotal: "Brüt Toplam",
  generalDiscount: "Genel İskonto",
  netSubtotal: "Net Ara Toplam",
  totalVat: "KDV",
  grandTotalWithVat: "Genel Toplam (KDV Dahil)",
  draftWatermark: "TASLAK",
};

export interface QuotationPreviewPdfLineInput {
  productCode: string | null;
  productName: string;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  discountAmount1: number;
  discountAmount2: number;
  discountAmount3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  imagePath: string | null;
  imageDataUri?: string | null;
}

export interface QuotationPreviewPdfInput {
  offerDate: string | null;
  offerNo: string | null;
  customerName: string;
  branchName: string;
  branchCode: string | null;
  currencyCode: string;
  locale: string;
  generalDiscountRate: number | null;
  generalDiscountAmount: number | null;
  draft: boolean;
  lines: QuotationPreviewPdfLineInput[];
  labels?: QuotationPreviewPdfLabels;
}

export interface QuotationPreviewDocumentTotals {
  grossTotal: number;
  lineDiscountTotal: number;
  netTotal: number;
  generalDiscount: number;
  discountedNetTotal: number;
  totalVat: number;
  grandTotal: number;
}
