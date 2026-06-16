import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListAndDetailHeader } from "../../../lib/documentListQueryInvalidation";
import { orderApi } from "../api";
import type { CreateOrderLineDto, OrderLineDetailGetDto } from "../types";
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
      await invalidateDocumentListAndDetailHeader(queryClient, "order", orderId);
      queryClient.invalidateQueries({ queryKey: ["order", "detail", "lines", orderId] });
      showToast("success", t("order.linesAdded"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.linesAddError"), 10000);
    },
  });
}
