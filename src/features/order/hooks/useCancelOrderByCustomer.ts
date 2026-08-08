import { orderQueryKeys } from "../utils/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDocumentListQueries } from "../../../lib/documentListQueryInvalidation";
import { useTranslation } from "react-i18next";
import { orderApi } from "../api/order-api";
import { useToastStore } from "../../../store/toast";

export function useCancelOrderByCustomer() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useTranslation();

  return useMutation<boolean, Error, { id: number; reason?: string | null }>({
    mutationFn: ({ id, reason }) => orderApi.cancelByCustomer(id, reason),
    onSuccess: async (_, variables) => {
      await invalidateDocumentListQueries(queryClient, "order");
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.approvalFlowReportLegacy(variables.id) });
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.waitingApprovals() });
      showToast("success", t("common.orderCancelledByCustomer", "Sipariş müşteri tarafından iptal edildi"));
    },
    onError: (error) => {
      showToast(
        "error",
        `${t("common.orderCancelByCustomerFailed", "Sipariş iptal edilemedi")}: ${error.message ?? t("common.unknownError")}`,
        10000
      );
    },
  });
}
