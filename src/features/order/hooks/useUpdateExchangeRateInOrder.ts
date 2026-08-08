import { orderQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { OrderExchangeRateUpdateDto } from "../types/order-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useUpdateExchangeRateInOrder() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<boolean, Error, { orderId: number; body: OrderExchangeRateUpdateDto[] }>({
    mutationFn: ({ body }) => orderApi.updateExchangeRateInOrder(body),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.lines(orderId) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.exchangeRates(orderId) });
      showToast("success", t("order.exchangeRatesUpdated"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.exchangeRatesUpdateError"), 10000);
    },
  });
}
