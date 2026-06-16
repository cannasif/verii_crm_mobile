import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListAndDetailHeader } from "../../../lib/documentListQueryInvalidation";
import { orderApi } from "../api";
import type { OrderLineUpdateDto, OrderLineDetailGetDto } from "../types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateOrderLines() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<
    OrderLineDetailGetDto[],
    Error,
    { orderId: number; body: OrderLineUpdateDto[] }
  >({
    mutationFn: ({ body }) => orderApi.updateOrderLines(body),
    onSuccess: async (_, { orderId }) => {
      await invalidateDocumentListAndDetailHeader(queryClient, "order", orderId);
      queryClient.invalidateQueries({ queryKey: ["order", "detail", "lines", orderId] });
      showToast("success", t("order.linesUpdated"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.linesUpdateError"), 10000);
    },
  });
}
