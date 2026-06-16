import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListAndDetailHeader } from "../../../lib/documentListQueryInvalidation";
import { orderApi } from "../api";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useDeleteOrderLine() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<void, Error, { orderId: number; lineId: number }>({
    mutationFn: ({ lineId }) => orderApi.deleteOrderLine(lineId),
    onSuccess: async (_, { orderId }) => {
      await invalidateDocumentListAndDetailHeader(queryClient, "order", orderId);
      queryClient.invalidateQueries({ queryKey: ["order", "detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", "detail", "lines", orderId] });
      showToast("success", t("order.lineDeleted"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.lineDeleteError"), 10000);
    },
  });
}
