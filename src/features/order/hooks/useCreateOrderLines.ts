import { orderQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentDetailHeaderQuery } from "../../../lib/documentListQueryInvalidation";
import { orderApi } from "../api/order-api";
import type { CreateOrderLineDto, OrderLineDetailGetDto } from "../types/order-types";
import { syncOrderListGrandTotal } from "../utils/sync-order-list-grand-total";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useCreateOrderLines() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<
    OrderLineDetailGetDto[],
    Error,
    { orderId: number; body: CreateOrderLineDto[] }
  >({
    mutationFn: ({ body }) => orderApi.createOrderLines(body),
    onSuccess: async (_, { orderId }) => {
      await invalidateDocumentDetailHeaderQuery(queryClient, "order", orderId);
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.lines(orderId) });
      await syncOrderListGrandTotal(queryClient, orderId);
      showToast("success", t("order.linesAdded"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.linesAddError"), 10000);
    },
  });
}
