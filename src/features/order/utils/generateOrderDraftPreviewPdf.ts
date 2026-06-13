import type { TFunction } from "i18next";
import { resolveCurrencyIsoCode } from "../../../lib/currencyDisplay";
import { resolveOrderCustomerLabelForPdf } from "./resolveOrderCustomerLabelForPdf";
import type { Branch } from "../../auth/types/index";
import { orderApi } from "../api/orderApi";
import type { OrderGetDto } from "../types";
import { buildOrderPreviewPdfInput } from "./buildOrderPreviewPdfInput";
import { buildOrderPreviewPdfLabels } from "./buildOrderPreviewPdfLabels";
import { createV3riiOrderPreviewPdf } from "./createV3riiOrderPreviewPdf";
import { mapDetailLinesToFormState } from "./orderDetailMappers";

function resolveLocale(language: string): string {
  if (language.startsWith("tr")) return "tr-TR";
  if (language.startsWith("de")) return "de-DE";
  return "en-US";
}

export async function generateOrderDraftPreviewPdf(
  order: OrderGetDto,
  branch: Branch | null,
  language: string,
  t: TFunction
): Promise<string> {
  const [header, lineDetails] = await Promise.all([
    orderApi.getById(order.id),
    orderApi.getLinesByOrder(order.id),
  ]);

  const formLines = mapDetailLinesToFormState(lineDetails);
  if (formLines.length === 0) {
    throw new Error("ORDER_PDF_NO_LINES");
  }

  const labels = buildOrderPreviewPdfLabels(t);
  const customerName = await resolveOrderCustomerLabelForPdf({
    potentialCustomerId: header.potentialCustomerId ?? order.potentialCustomerId,
    potentialCustomerName: header.potentialCustomerName ?? order.potentialCustomerName,
    erpCustomerCode: header.erpCustomerCode ?? order.erpCustomerCode,
    selectedCustomerName: order.potentialCustomerName,
    t,
  });

  const headerRecord = header as unknown as Record<string, unknown>;
  const generalDiscountRate =
    (headerRecord.generalDiscountRate as number | null | undefined) ?? null;
  const generalDiscountAmount =
    (headerRecord.generalDiscountAmount as number | null | undefined) ?? null;

  const input = buildOrderPreviewPdfInput({
    offerDate: header.offerDate ?? order.offerDate,
    offerNo: header.offerNo ?? order.offerNo,
    customerName,
    branch,
    currency: header.currency ?? order.currency,
    currencyCode: resolveCurrencyIsoCode(
      header.currency ?? order.currencyCode ?? order.currency
    ),
    generalDiscountRate,
    generalDiscountAmount,
    draft: true,
    lines: formLines,
    locale: resolveLocale(language),
    t,
  });

  return createV3riiOrderPreviewPdf(input);
}

export function buildOrderPdfFileName(order: OrderGetDto): string {
  const offerPart = (order.offerNo ?? `siparis-${order.id}`)
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 48);
  return `siparis-${offerPart}-${order.id}.pdf`;
}
