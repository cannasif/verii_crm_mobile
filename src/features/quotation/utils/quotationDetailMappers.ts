import type { CreateQuotationSchema } from "../schemas";
import { normalizeOfferType } from "../types";
import type {
  QuotationDetailGetDto,
  QuotationLineDetailGetDto,
  QuotationExchangeRateDetailGetDto,
  QuotationExchangeRateUpdateDto,
  QuotationLineFormState,
  QuotationExchangeRateFormState,
  CurrencyOptionDto,
  CreateQuotationLineDto,
  QuotationLineUpdateDto,
} from "../types";
import { calculateLineTotals } from "./calculations";

export interface LineGroup {
  key: string;
  main: QuotationLineDetailGetDto;
  related: QuotationLineDetailGetDto[];
}

export function groupQuotationLines(
  lines: QuotationLineDetailGetDto[]
): LineGroup[] {
  const map = new Map<string, QuotationLineDetailGetDto[]>();
  for (const line of lines) {
    const k = line.relatedProductKey?.trim()
      ? line.relatedProductKey.trim()
      : `standalone-${line.id}`;
    const list = map.get(k) ?? [];
    list.push(line);
    map.set(k, list);
  }
  const result: LineGroup[] = [];
  for (const [k, list] of map) {
    const sorted = [...list].sort((a, b) => {
      if (a.isMainRelatedProduct && !b.isMainRelatedProduct) return -1;
      if (!a.isMainRelatedProduct && b.isMainRelatedProduct) return 1;
      return a.id - b.id;
    });
    result.push({ key: k, main: sorted[0], related: sorted.slice(1) });
  }
  result.sort((a, b) => a.main.id - b.main.id);
  return result;
}

export function totalsFromDetailLines(
  lines: QuotationLineDetailGetDto[]
): { subtotal: number; totalVat: number; grandTotal: number } {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const totalVat = lines.reduce((s, l) => s + l.vatAmount, 0);
  const grandTotal = lines.reduce((s, l) => s + l.lineGrandTotal, 0);
  return { subtotal, totalVat, grandTotal };
}

function toDateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const s = iso.split("T")[0];
  return s || null;
}

export function mapDetailHeaderToForm(
  h: QuotationDetailGetDto
): CreateQuotationSchema["quotation"] {
  return {
    potentialCustomerId: h.potentialCustomerId ?? null,
    erpCustomerCode: h.erpCustomerCode ?? null,
    deliveryDate: toDateOnly(h.deliveryDate),
    shippingAddressId: h.shippingAddressId ?? null,
    representativeId: h.representativeId ?? null,
    status: h.status ?? null,
    description: h.description ?? null,
    paymentTypeId: h.paymentTypeId ?? null,
    documentSerialTypeId: h.documentSerialTypeId ?? 0,
    offerType: normalizeOfferType(h.offerType),
    offerDate: toDateOnly(h.offerDate),
    offerNo: h.offerNo ?? null,
    revisionNo: h.revisionNo ?? null,
    revisionId: h.revisionId ?? null,
    currency: h.currency || "",
    generalDiscountRate: (h as unknown as Record<string, unknown>).generalDiscountRate as number | null | undefined ?? null,
    generalDiscountAmount: (h as unknown as Record<string, unknown>).generalDiscountAmount as number | null | undefined ?? null,
    erpProjectCode: (h as unknown as Record<string, unknown>).erpProjectCode as string | null | undefined ?? null,
    salesTypeDefinitionId: (h as unknown as Record<string, unknown>).salesTypeDefinitionId as number | null | undefined ?? null,
  };
}

function mapDetailLineToFormState(d: QuotationLineDetailGetDto): QuotationLineFormState {
  const base: QuotationLineFormState = {
    id: `line-${d.id}`,
    productId: d.productId ?? null,
    productCode: d.productCode ?? "",
    productName: d.productName,
    unit: (d as { unit?: string | null }).unit ?? null,
    groupCode: d.groupCode ?? null,
    quantity: d.quantity,
    unitPrice: d.unitPrice,
    discountRate1: d.discountRate1,
    discountAmount1: d.discountAmount1,
    discountRate2: d.discountRate2,
    discountAmount2: d.discountAmount2,
    discountRate3: d.discountRate3,
    discountAmount3: d.discountAmount3,
    vatRate: d.vatRate,
    vatAmount: d.vatAmount,
    lineTotal: d.lineTotal,
    lineGrandTotal: d.lineGrandTotal,
    description: d.description ?? null,
    pricingRuleHeaderId: d.pricingRuleHeaderId ?? null,
    relatedStockId: d.relatedStockId ?? null,
    relatedProductKey: d.relatedProductKey ?? null,
    isMainRelatedProduct: d.isMainRelatedProduct,
    erpProjectCode: (d as unknown as Record<string, unknown>).erpProjectCode as string | null | undefined ?? null,
    approvalStatus: d.approvalStatus,
    isEditing: false,
  };
  return calculateLineTotals(base);
}

export function mapDetailLinesToFormState(
  lines: QuotationLineDetailGetDto[]
): QuotationLineFormState[] {
  const map = new Map<string, QuotationLineDetailGetDto[]>();
  for (const line of lines) {
    const k = line.relatedProductKey?.trim()
      ? line.relatedProductKey.trim()
      : `standalone-${line.id}`;
    const list = map.get(k) ?? [];
    list.push(line);
    map.set(k, list);
  }
  const groups: QuotationLineFormState[][] = [];
  for (const [, list] of map) {
    const sorted = [...list].sort((a, b) => {
      if (a.isMainRelatedProduct && !b.isMainRelatedProduct) return -1;
      if (!a.isMainRelatedProduct && b.isMainRelatedProduct) return 1;
      return a.id - b.id;
    });
    const main = mapDetailLineToFormState(sorted[0]);
    const related = sorted.slice(1).map(mapDetailLineToFormState);
    if (related.length > 0) main.relatedLines = related;
    groups.push([main, ...related]);
  }
  groups.sort((ga, gb) => {
    const a = parseInt(String(ga[0]?.id ?? "").replace(/^line-(\d+).*/, "$1"), 10) || 0;
    const b = parseInt(String(gb[0]?.id ?? "").replace(/^line-(\d+).*/, "$1"), 10) || 0;
    return a - b;
  });
  return groups.flat();
}

export function mapDetailRatesToFormState(
  rates: QuotationExchangeRateDetailGetDto[],
  currencyOptions: CurrencyOptionDto[]
): QuotationExchangeRateFormState[] {
  return rates.map((r) => {
    const opt = currencyOptions.find(
      (c) => c.code === r.currency || String(c.dovizTipi) === r.currency
    );
    const dovizTipi = opt?.dovizTipi;
    const currency = opt ? String(opt.dovizTipi) : r.currency;
    return {
      id: `rate-${r.id}`,
      currency,
      exchangeRate: r.exchangeRate,
      exchangeRateDate: r.exchangeRateDate.split("T")[0] || r.exchangeRateDate,
      isOfficial: r.isOfficial,
      dovizTipi,
    };
  });
}

function parseRateId(formId: string): number {
  const match = formId.match(/^rate-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export function mapExchangeRateFormStateToUpdateDtos(
  rates: QuotationExchangeRateFormState[],
  quotationId: number,
  quotationOfferNo: string | null
): QuotationExchangeRateUpdateDto[] {
  return rates.map((r) => ({
    id: parseRateId(r.id),
    quotationId,
    quotationOfferNo,
    currency: r.currency,
    exchangeRate: r.exchangeRate,
    exchangeRateDate: r.exchangeRateDate,
    isOfficial: r.isOfficial ?? false,
  }));
}

export function parseLineId(formLineId: string): number {
  const match = String(formLineId).match(/^line-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function mapQuotationLineFormStateToCreateDto(
  line: QuotationLineFormState,
  quotationId: number
): CreateQuotationLineDto {
  return {
    quotationId,
    productId: line.productId ?? null,
    productCode: line.productCode,
    productName: line.productName,
    groupCode: line.groupCode ?? null,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountRate1: line.discountRate1,
    discountAmount1: line.discountAmount1,
    discountRate2: line.discountRate2,
    discountAmount2: line.discountAmount2,
    discountRate3: line.discountRate3,
    discountAmount3: line.discountAmount3,
    vatRate: line.vatRate,
    vatAmount: line.vatAmount,
    lineTotal: line.lineTotal,
    lineGrandTotal: line.lineGrandTotal,
    description: line.description ?? null,
    pricingRuleHeaderId: line.pricingRuleHeaderId ?? null,
    relatedStockId: line.relatedStockId ?? null,
    relatedProductKey: line.relatedProductKey ?? null,
    isMainRelatedProduct: line.isMainRelatedProduct ?? false,
    erpProjectCode: line.erpProjectCode ?? null,
    approvalStatus: line.approvalStatus ?? 0,
  };
}

export function mapQuotationLineFormStateToUpdateDto(
  line: QuotationLineFormState,
  quotationId: number
): QuotationLineUpdateDto | null {
  const id = parseLineId(line.id);
  if (id <= 0) return null;
  return {
    id,
    quotationId,
    productId: line.productId ?? null,
    productCode: line.productCode,
    productName: line.productName,
    groupCode: line.groupCode ?? null,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountRate1: line.discountRate1,
    discountAmount1: line.discountAmount1,
    discountRate2: line.discountRate2,
    discountAmount2: line.discountAmount2,
    discountRate3: line.discountRate3,
    discountAmount3: line.discountAmount3,
    vatRate: line.vatRate,
    vatAmount: line.vatAmount,
    lineTotal: line.lineTotal,
    lineGrandTotal: line.lineGrandTotal,
    description: line.description ?? null,
    pricingRuleHeaderId: line.pricingRuleHeaderId ?? null,
    relatedStockId: line.relatedStockId ?? null,
    relatedProductKey: line.relatedProductKey ?? null,
    isMainRelatedProduct: line.isMainRelatedProduct ?? false,
    erpProjectCode: line.erpProjectCode ?? null,
    approvalStatus: line.approvalStatus ?? 0,
    createdAt: null,
  };
}
