import { orderQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentDetailHeaderQuery } from "../../../lib/documentListQueryInvalidation";
import { orderApi } from "../api/order-api";
import { syncOrderListGrandTotal } from "../utils/sync-order-list-grand-total";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useDeleteOrderLine() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<void, Error, { orderId: number; lineId: number }>({
    mutationFn: ({ lineId }) => orderApi.deleteOrderLine(lineId),
    onSuccess: async (_, { orderId }) => {
      await invalidateDocumentDetailHeaderQuery(queryClient, "order", orderId);
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.lines(orderId) });
      await syncOrderListGrandTotal(queryClient, orderId);
      showToast("success", t("order.lineDeleted"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.lineDeleteError"), 10000);
    },
  });
}
