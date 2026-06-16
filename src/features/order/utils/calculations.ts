import type { OrderLineFormState, CalculationTotals } from "../types";
import {
  computeGrandTotalAfterGeneralDiscount,
  round2,
  type GeneralDiscountOptions,
} from "../../../lib/salesDocumentTotals";

export function calculateLineTotals(line: OrderLineFormState): OrderLineFormState {
  const baseAmount = line.quantity * line.unitPrice;

  let currentAmount = baseAmount;
  const discount1Amount = currentAmount * (line.discountRate1 / 100);
  currentAmount = currentAmount - discount1Amount;

  const discount2Amount = currentAmount * (line.discountRate2 / 100);
  currentAmount = currentAmount - discount2Amount;

  const discount3Amount = currentAmount * (line.discountRate3 / 100);
  currentAmount = currentAmount - discount3Amount;

  const subtotal = Math.max(0, currentAmount);

  const vatAmount = subtotal * (line.vatRate / 100);

  const grandTotal = subtotal + vatAmount;

  return {
    ...line,
    discountAmount1: Math.max(0, discount1Amount),
    discountAmount2: Math.max(0, discount2Amount),
    discountAmount3: Math.max(0, discount3Amount),
    lineTotal: subtotal,
    vatAmount: Math.max(0, vatAmount),
    lineGrandTotal: Math.max(0, grandTotal),
  };
}

export function calculateTotals(
  lines: OrderLineFormState[],
  options?: GeneralDiscountOptions
): CalculationTotals {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const totalVat = round2(lines.reduce((sum, line) => sum + line.vatAmount, 0));
  const grandTotal = round2(lines.reduce((sum, line) => sum + line.lineGrandTotal, 0));
  const discountTotals = computeGrandTotalAfterGeneralDiscount(subtotal, totalVat, options);

  return {
    subtotal,
    totalVat,
    grandTotal,
    netTotal: discountTotals.netTotal,
    discountedNetTotal: discountTotals.discountedNetTotal,
    generalDiscountAmount: discountTotals.generalDiscountAmount,
    totalVatAfterDiscount: discountTotals.totalVatAfterDiscount,
    grandTotalAfterDiscount: discountTotals.grandTotalAfterDiscount,
  };
}
