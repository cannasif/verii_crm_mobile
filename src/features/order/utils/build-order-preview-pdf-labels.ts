import type { TFunction } from "i18next";
import type { SalesDocumentPreviewPdfLabels } from "../../../lib/salesDocumentPreviewPdf";

export function buildOrderPreviewPdfLabels(t: TFunction): SalesDocumentPreviewPdfLabels {
  return {
    documentTitle: t("order.pdfExportTemplate.documentTitle"),
    senderLabel: t("order.pdfExportTemplate.senderLabel"),
    recipientLabel: t("order.pdfExportTemplate.recipientLabel"),
    metaDate: t("order.pdfExportTemplate.metaDate"),
    metaOfferNo: t("order.pdfExportTemplate.metaOrderNo"),
    notSpecified: t("order.pdfExportTemplate.notSpecified"),
    lineImage: t("order.pdfExportTemplate.lineImage"),
    productCode: t("order.pdfExportTemplate.productCode"),
    productName: t("order.pdfExportTemplate.productName"),
    quantity: t("order.pdfExportTemplate.quantity"),
    unitPrice: t("order.pdfExportTemplate.unitPrice"),
    unitPriceNet: t("order.pdfExportTemplate.unitPriceNet"),
    lineTotal: t("order.pdfExportTemplate.lineTotal"),
    priceDetail: t("order.pdfExportTemplate.priceDetail"),
    grossTotal: t("order.pdfExportTemplate.grossTotal"),
    generalDiscount: t("order.pdfExportTemplate.generalDiscount"),
    netSubtotal: t("order.pdfExportTemplate.netSubtotal"),
    totalVat: t("order.pdfExportTemplate.totalVat"),
    grandTotalWithVat: t("order.pdfExportTemplate.grandTotalWithVat"),
    draftWatermark: t("order.pdfExportTemplate.draftWatermark"),
    footerNote: t("order.pdfExportTemplate.footerNote"),
  };
}
