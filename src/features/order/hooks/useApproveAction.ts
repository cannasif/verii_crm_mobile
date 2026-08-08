import { orderQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../api/order-api";
import type { ApproveActionDto } from "../types/order-types";
import { useToastStore } from "../../../store/toast";
import { useTranslation } from "react-i18next";

export function useApproveAction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: ApproveActionDto) => orderApi.approve(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.waitingApprovals() });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all() });
      showToast("success", t("order.approveSuccess"));
    },
    onError: (error: Error) => {
      showToast("error", error.message || t("order.approveError"));
    },
  });
}
