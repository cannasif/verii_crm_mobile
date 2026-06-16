export interface SalesDocumentPreviewPdfLabels {
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
  footerNote?: string;
}

import type { PreviewPdfFooterDetailBlock } from "./buildPreviewPdfFooterDetails";
import type {
  PreviewPdfLineDetailLabels,
  PreviewPdfLineDetailMaps,
  PreviewPdfLineDetailSource,
} from "./previewPdfLineDetails";

export interface SalesDocumentPreviewPdfLineInput
  extends PreviewPdfLineDetailSource {
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

export interface SalesDocumentPreviewPdfInput {
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
  lines: SalesDocumentPreviewPdfLineInput[];
  labels?: SalesDocumentPreviewPdfLabels;
  footerDetails?: PreviewPdfFooterDetailBlock[];
  lineDetailLabels?: PreviewPdfLineDetailLabels;
  lineDetailMaps?: PreviewPdfLineDetailMaps;
}

export interface SalesDocumentPreviewDocumentTotals {
  grossTotal: number;
  lineDiscountTotal: number;
  netTotal: number;
  generalDiscount: number;
  discountedNetTotal: number;
  totalVat: number;
  grandTotal: number;
}
