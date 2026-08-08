import type { QueryClient } from "@tanstack/react-query";
import { patchDocumentListItemGrandTotal } from "../../../lib/documentListQueryInvalidation";
import { readGeneralDiscountOptions } from "../../../lib/salesDocumentTotals";
import { orderApi } from "../api";
import type { OrderDetailGetDto, OrderLineDetailGetDto } from "../types";
import { computeOrderTotalsFromDetailLines } from "./orderDetailMappers";

export function applyOrderListGrandTotalPatch(
  queryClient: QueryClient,
  orderId: number,
  lines: OrderLineDetailGetDto[],
  header: OrderDetailGetDto | undefined
): number {
  const totals = computeOrderTotalsFromDetailLines(
    lines,
    readGeneralDiscountOptions(header as unknown as Record<string, unknown> | undefined)
  );
  patchDocumentListItemGrandTotal(queryClient, "order", orderId, totals.grandTotalAfterDiscount);
  return totals.grandTotalAfterDiscount;
}

export async function syncOrderListGrandTotal(
  queryClient: QueryClient,
  orderId: number
): Promise<number> {
  const [lines, header] = await Promise.all([
    orderApi.getLinesByOrder(orderId),
    orderApi.getById(orderId),
  ]);
  return applyOrderListGrandTotalPatch(queryClient, orderId, lines, header);
}
