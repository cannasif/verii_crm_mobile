import type {
  QuotationPreviewDocumentTotals,
  QuotationPreviewPdfLineInput,
} from "./quotationPreviewPdf.types";

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getDiscountedUnitPrice(
  unitPrice: number,
  rate1: number,
  rate2: number,
  rate3: number
): number {
  let price = unitPrice;
  for (const rate of [rate1, rate2, rate3]) {
    price = round2(price - round2((price * rate) / 100));
  }
  return price;
}

export function hasLineDiscount(lines: QuotationPreviewPdfLineInput[]): boolean {
  return lines.some(
    (line) =>
      (line.discountRate1 ?? 0) > 0 ||
      (line.discountRate2 ?? 0) > 0 ||
      (line.discountRate3 ?? 0) > 0
  );
}

export function computeDocumentTotals(
  lines: QuotationPreviewPdfLineInput[],
  generalDiscountRate: number | null | undefined,
  generalDiscountAmount: number | null | undefined
): QuotationPreviewDocumentTotals {
  let grossTotal = 0;
  let lineDiscountTotal = 0;
  let netTotal = 0;
  let totalVat = 0;

  for (const line of lines) {
    grossTotal += (line.quantity || 0) * (line.unitPrice || 0);
    lineDiscountTotal +=
      (line.discountAmount1 || 0) + (line.discountAmount2 || 0) + (line.discountAmount3 || 0);
    netTotal += line.lineTotal || 0;
    totalVat += line.vatAmount || 0;
  }

  grossTotal = round2(grossTotal);
  lineDiscountTotal = round2(lineDiscountTotal);
  netTotal = round2(netTotal);
  totalVat = round2(totalVat);

  let generalDiscount = 0;
  if (generalDiscountAmount != null && generalDiscountAmount > 0) {
    generalDiscount = round2(Math.min(generalDiscountAmount, netTotal));
  } else if (generalDiscountRate != null && generalDiscountRate > 0) {
    generalDiscount = round2((netTotal * generalDiscountRate) / 100);
  }

  const discountedNetTotal = round2(netTotal - generalDiscount);
  const adjustedVat =
    netTotal > 0 ? round2(totalVat * (discountedNetTotal / netTotal)) : 0;
  const grandTotal = round2(discountedNetTotal + adjustedVat);

  return {
    grossTotal,
    lineDiscountTotal,
    netTotal,
    generalDiscount,
    discountedNetTotal,
    totalVat: adjustedVat,
    grandTotal,
  };
}
