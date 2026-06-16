import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { orderApi } from "../api";
import type { OrderBulkCreateDto, OrderGetDto } from "../types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateOrderBulk() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<
    OrderGetDto,
    Error,
    { id: number; data: OrderBulkCreateDto }
  >({
    mutationFn: ({ id, data }) => orderApi.updateBulk(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateDocumentListQueries(queryClient, "order");
      queryClient.invalidateQueries({ queryKey: ["order", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["order", "detail", "lines", id] });
      queryClient.invalidateQueries({ queryKey: ["order", "detail", "exchangeRates", id] });
      showToast("success", t("order.updateSuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.updateError"), 10000);
    },
  });
}
