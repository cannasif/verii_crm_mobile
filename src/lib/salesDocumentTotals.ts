export interface GeneralDiscountOptions {
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveGeneralDiscountAmount(
  netTotal: number,
  options?: GeneralDiscountOptions
): number {
  if (options?.generalDiscountAmount != null && !Number.isNaN(options.generalDiscountAmount)) {
    return round2(Math.min(Math.max(0, options.generalDiscountAmount), netTotal));
  }
  if (options?.generalDiscountRate != null && !Number.isNaN(options.generalDiscountRate)) {
    const rate = Math.min(100, Math.max(0, options.generalDiscountRate));
    return round2(Math.min(netTotal * (rate / 100), netTotal));
  }
  return 0;
}

export function computeGrandTotalAfterGeneralDiscount(
  subtotal: number,
  totalVat: number,
  options?: GeneralDiscountOptions
): {
  netTotal: number;
  generalDiscountAmount: number;
  discountedNetTotal: number;
  totalVatAfterDiscount: number;
  grandTotalAfterDiscount: number;
} {
  const netTotal = round2(subtotal);
  const totalVatRounded = round2(totalVat);
  const generalDiscountAmount = resolveGeneralDiscountAmount(netTotal, options);
  const discountedNetTotal = round2(Math.max(netTotal - generalDiscountAmount, 0));
  const totalVatAfterDiscount =
    netTotal > 0 ? round2(totalVatRounded * (discountedNetTotal / netTotal)) : 0;
  const grandTotalAfterDiscount = round2(discountedNetTotal + totalVatAfterDiscount);

  return {
    netTotal,
    generalDiscountAmount,
    discountedNetTotal,
    totalVatAfterDiscount,
    grandTotalAfterDiscount,
  };
}

export function readGeneralDiscountOptions(
  source: Record<string, unknown> | null | undefined
): GeneralDiscountOptions {
  const rate = source?.generalDiscountRate;
  const amount = source?.generalDiscountAmount;
  return {
    generalDiscountRate: typeof rate === "number" && Number.isFinite(rate) ? rate : null,
    generalDiscountAmount: typeof amount === "number" && Number.isFinite(amount) ? amount : null,
  };
}
