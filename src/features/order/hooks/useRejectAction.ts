import { orderQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { RejectActionDto } from "../types/order-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useRejectAction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: RejectActionDto) => orderApi.reject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.waitingApprovals() });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all() });
      showToast("success", t("order.rejectSuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.rejectError"));
    },
  });
}
